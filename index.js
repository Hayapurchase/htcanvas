window.onload = function(){

    const canvasEL = document.querySelector('canvas');
    const ctx       = canvasEL.getContext('2d');

    /* ---------- State ---------- */
    let painting      = false;
    let eraserActive  = false;
    let currentTool   = 'brush';       // brush | fill | rect | circle | line | text
    let shapeStart    = null;          // start-point for shape tools

    /* ---------- DOM Controls ---------- */
    const colorInput  = document.getElementById('strokeColor');
    const widthInput  = document.getElementById('lineWidth');
    const clearBtn    = document.getElementById('clearCanvas');
    const saveBtn     = document.getElementById('saveCanvas');
    const eraserBtn   = document.getElementById('toggleEraser');
    /* Tool buttons */
    document.querySelectorAll('[data-tool]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            currentTool = btn.dataset.tool;
            updateCursor();
        });
    });
    /* Filter controls */
    const filterSelect   = document.getElementById('filterSelect');
    const resetFilterBtn = document.getElementById('resetFilter');
    let   currentFilter  = 'none';           // css filter string
    /* ---------- SVG data ---------- */
    const strokes        = [];               // store finished strokes
    let   currentStroke  = null;             // stroke currently being drawn

    /* ---------- Canvas helpers ---------- */
    function resizeCanvas(){
        /* When using absolute positioning the <canvas> CSS size is
           controlled by `left:240px` and `width:calc(100% - 240px)`.
           Relying on `clientWidth/Height` works most of the time, but
           it can fall out of sync if the sidebar width or toolbar
           height change.  We therefore calculate the expected drawing
           buffer size from the actual viewport dimensions and the
           neighbouring absolute-sized elements. */

        const controlsEl = document.getElementById('controls');
        const sidebarEl  = document.getElementById('sidebar');

        const sidebarW   = sidebarEl ? sidebarEl.offsetWidth  : 0;
        const controlsH  = controlsEl ? controlsEl.offsetHeight : 0;

        canvasEL.width  = window.innerWidth  - sidebarW;
        canvasEL.height = window.innerHeight - controlsH;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /* ---------- Drawing helpers ---------- */
    function getPos(e){
        /* Normalise mouse/touch coordinates so they are
           relative to the canvas top-left corner            */
        const rect = canvasEL.getBoundingClientRect();
        if(e.touches && e.touches.length){
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /* ---------- Cursor helper ---------- */
    function updateCursor(){
        const map = {
            brush  : 'crosshair',
            fill   : 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAFUlEQVQokWNgGAUjDwQjA4MDAwMDAC8FA/y3zKtYAAAAAElFTkSuQmCC") 4 12, auto',
            rect   : 'crosshair',
            circle : 'crosshair',
            line   : 'crosshair',
            text   : 'text'
        };
        canvasEL.style.cursor = map[currentTool] || 'crosshair';
    }
    updateCursor();

    /* ---------- Flood-fill ---------- */
    function colorsMatch(data, idx, r,g,b,a=255){
        return data[idx  ]===r &&
               data[idx+1]===g &&
               data[idx+2]===b &&
               data[idx+3]===a;
    }
    function bucketFill(x,y, fillStyle){
        const img = ctx.getImageData(0,0,canvasEL.width,canvasEL.height);
        const data = img.data;
        const w = img.width;
        const idx = (y*w + x)*4;
        const startR=data[idx], startG=data[idx+1], startB=data[idx+2], startA=data[idx+3];
        // if clicking on same colour, abort
        ctx.fillStyle = fillStyle;
        const fillRGBA = ctx.fillStyle;
        // convert to rgba numbers
        ctx.fillRect(-1,-1,1,1); // dummy so style parses
        const c = ctx.fillStyle; // e.g. rgb(255,0,0)
        const match = c.match(/\d+/g).map(Number);
        const fr=match[0], fg=match[1], fb=match[2], fa=255;
        if(fr===startR && fg===startG && fb===startB) return;

        const stack=[[x,y]];
        while(stack.length){
            const [cx,cy]=stack.pop();
            if(cx<0||cy<0||cx>=w||cy>=img.height) continue;
            const i=(cy*w+cx)*4;
            if(!colorsMatch(data,i,startR,startG,startB,startA)) continue;
            data[i]=fr; data[i+1]=fg; data[i+2]=fb; data[i+3]=fa;
            stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
        }
        ctx.putImageData(img,0,0);
    }

    function beginStroke(e){
        painting = true;
        const {x, y} = getPos(e);
        // Tool branching -----------------------------
        if(currentTool==='fill'){
            bucketFill(Math.floor(x),Math.floor(y),ctx.strokeStyle);
            painting=false;
            return;
        }

        if(currentTool==='text'){
            const text = prompt('Enter text:', '');
            if(text){
                ctx.fillStyle = ctx.strokeStyle;
                ctx.textBaseline = 'top';
                ctx.font = `${parseInt(widthInput.value,10)*4}px sans-serif`;
                ctx.fillText(text, x, y);
            }
            painting=false;
            return;
        }

        if(['rect','circle','line'].includes(currentTool)){
            shapeStart={x,y};
            return; // wait for mouseup to draw
        }

        // default brush behaviour
        ctx.beginPath();
        ctx.moveTo(x, y);

        /* Start collecting a new stroke if NOT in eraser mode */
        if(!eraserActive){
            currentStroke = {
                color : ctx.strokeStyle,
                width : ctx.lineWidth,
                points: [{x, y}]
            };
        }else{
            currentStroke = null;
        }
        draw(e); // draw first point
    }

    function endStroke(e){
        painting = false;
        ctx.beginPath();
        if(shapeStart && ['rect','circle','line'].includes(currentTool)){
            const {x: sx, y: sy} = shapeStart;
            const {x: ex, y: ey} = getPos(e);
            ctx.lineWidth = widthInput.value;
            ctx.strokeStyle = colorInput.value;
            if(currentTool==='rect'){
                ctx.strokeRect(sx, sy, ex-sx, ey-sy);
            }else if(currentTool==='circle'){
                const radius = Math.hypot(ex-sx, ey-sy);
                ctx.beginPath();
                ctx.arc(sx, sy, radius, 0, Math.PI*2);
                ctx.stroke();
            }else if(currentTool==='line'){
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
            shapeStart=null;
        }

        /* Save completed stroke */
        if(currentStroke && currentStroke.points.length > 1){
            strokes.push(currentStroke);
        }
        currentStroke = null;
    }

    function draw(e){
        if(!painting) return;

        const {x, y} = getPos(e);
        ctx.lineCap  = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);

        /* Collect points for SVG */
        if(currentStroke){
            currentStroke.points.push({x, y});
        }
    }

    /* ---------- Event listeners ---------- */
    // Mouse
    canvasEL.addEventListener('mousedown', beginStroke);
    canvasEL.addEventListener('mouseup',   endStroke);
    canvasEL.addEventListener('mousemove', draw);
    // Touch
    canvasEL.addEventListener('touchstart', beginStroke, {passive: true});
    canvasEL.addEventListener('touchend',   endStroke);
    canvasEL.addEventListener('touchmove',  draw,        {passive: true});

    /* ---------- Controls behaviour ---------- */
    // color / width
    ctx.strokeStyle = colorInput.value;
    ctx.lineWidth   = widthInput.value;
    colorInput.addEventListener('input', e => {
        ctx.strokeStyle = e.target.value;
        if(!eraserActive) ctx.globalCompositeOperation = 'source-over';
    });
    widthInput.addEventListener('input', e => {
        ctx.lineWidth = e.target.value;
    });

    /* ---------- Filter helpers ---------- */
    function applyFilter(value){
        currentFilter           = value || 'none';
        canvasEL.style.filter   = currentFilter; // visual feedback
    }

    if(filterSelect){
        applyFilter(filterSelect.value); // initialise
        filterSelect.addEventListener('change', e => applyFilter(e.target.value));
    }
    if(resetFilterBtn){
        resetFilterBtn.addEventListener('click', () => {
            if(filterSelect) filterSelect.value = 'none';
            applyFilter('none');
        });
    }

    /* ---------- Eraser helper ---------- */
    function toggleEraser(){
        eraserActive = !eraserActive;
        if(eraserActive){
            ctx.globalCompositeOperation = 'destination-out';
            canvasEL.classList.add('erasing');
        }else{
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = colorInput.value;
            canvasEL.classList.remove('erasing');
        }
    }

    // button
    if(eraserBtn){
        eraserBtn.addEventListener('click', toggleEraser);
    }

    // clear
    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0,0,canvasEL.width,canvasEL.height);
        strokes.length = 0; // reset stored strokes
    });

    // save
    saveBtn.addEventListener('click', () => {
        /* We need the filter baked into the exported image.
           Draw to an off-screen canvas using ctx.filter. */
        const off = document.createElement('canvas');
        off.width  = canvasEL.width;
        off.height = canvasEL.height;
        const offCtx = off.getContext('2d');
        offCtx.filter = currentFilter;          // apply selected filter
        offCtx.drawImage(canvasEL, 0, 0);
        const dataURL = off.toDataURL('image/png');
        const link    = document.createElement('a');
        link.href     = dataURL;
        link.download = 'htcanvas.png';
        link.click();
    });

    /* ---------- SVG Export ---------- */
    const saveSvgBtn = document.getElementById('saveSVG');
    if(saveSvgBtn){
        saveSvgBtn.addEventListener('click', () => {
            const svgString = generateSVG();
            const blob      = new Blob([svgString], {type:'image/svg+xml'});
            const url       = URL.createObjectURL(blob);
            const link      = document.createElement('a');
            link.href       = url;
            link.download   = 'htcanvas.svg';
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    function generateSVG(){
        const w = canvasEL.width;
        const h = canvasEL.height;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
        // optional: background white if desired
        // svg += `<rect width="100%" height="100%" fill="white"/>`;
        for(const s of strokes){
            const d = s.points.map((p,i)=> (i===0?`M ${p.x} ${p.y}`:`L ${p.x} ${p.y}`)).join(' ');
            svg += `<path d="${d}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        svg += '</svg>';
        return svg;
    }

    /* ---------- Eraser ---------- */
    document.addEventListener('keydown', e => {
        if(e.key.toLowerCase() === 'e'){
            toggleEraser();
        }
    });

    /* prevent scrolling while drawing on touch devices */
    document.body.addEventListener('touchstart', e => {
        if(e.target === canvasEL) e.preventDefault();
    }, {passive:false});
    document.body.addEventListener('touchend',   e => {
        if(e.target === canvasEL) e.preventDefault();
    }, {passive:false});
    document.body.addEventListener('touchmove',  e => {
        if(e.target === canvasEL) e.preventDefault();
    }, {passive:false});
}
