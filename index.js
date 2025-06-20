window.onload = function(){

    const canvasEL = document.querySelector('canvas');
    const ctx       = canvasEL.getContext('2d');

    /* ---------- State ---------- */
    let painting      = false;
    let eraserActive  = false;
    let currentTool   = 'brush';       // brush | fill | rect | circle | line | text | lasso | move
    let shapeStart    = null;          // start-point for shape tools
    
    /* ---------- Selection state ---------- */
    let selectionActive = false;       // whether there is an active selection
    let selectionPoints = [];          // points defining the lasso selection
    let selectionData   = null;        // ImageData of the selected region
    let selectionPos    = {x:0, y:0};  // current position of selection
    let selectionOrigin = {x:0, y:0};  // original position of selection
    let moveStart       = null;        // starting point for move operation
    let tempCanvas      = document.createElement('canvas'); // for selection operations
    let tempCtx         = tempCanvas.getContext('2d');

    /* ---------- DOM Controls ---------- */
    const colorInput  = document.getElementById('strokeColor');
    const widthInput  = document.getElementById('lineWidth');
    const clearBtn    = document.getElementById('clearCanvas');
    const saveBtn     = document.getElementById('saveCanvas');
    const eraserBtn   = document.getElementById('toggleEraser');
    /* ---------- Theme controls ---------- */
    const themeBtn    = document.getElementById('themeToggle');
    const THEMES      = ['light','dark','colourful'];   // keep in cycle order
    let   currentTheme;

    /**
     * Apply a visual theme by toggling a class on <body>.
     * The "light" theme is the baseline (no extra class).
     * Chosen theme is persisted to localStorage.
     */
    function applyTheme(name='light'){
        document.body.classList.remove('theme-dark','theme-colourful');
        if(name !== 'light'){
            document.body.classList.add(`theme-${name}`);
        }
        currentTheme = name;
        try{ localStorage.setItem('htcanvas-theme', name); }catch(e){}
        updateCursor(); // cursor may depend on theme colours
    }
    /* Tool buttons */
    document.querySelectorAll('[data-tool]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            // Reset any ongoing drawing when changing tools
            painting = false;
            ctx.beginPath(); // Clear any active path
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

    /* ---------- Vector paths (placeholder) ----------
       Full vector-editing logic will populate this array in
       follow-up patches.  Each entry will look like:
       {
         points: [{x,y}, …],   // path vertices
         stroke: '#000',
         width : 2,
         fill  : 'none',
         opacity: 1
       }
    ---------------------------------------------------*/
    const vectorPaths   = [];               // prevent ReferenceError in SVG export

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
        
        // Also resize temp canvas used for selections
        tempCanvas.width = canvasEL.width;
        tempCanvas.height = canvasEL.height;
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
            text   : 'text',
            lasso  : 'crosshair',
            move   : selectionActive ? 'move' : 'default'
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
        // Convert desired fill colour to RGBA components
        const [fr,fg,fb,fa] = parseColorToRGBA(fillStyle);
        // If clicking on the same colour, no need to fill
        if(fr===startR && fg===startG && fb===startB && fa===startA) return;

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

    /* ---------- Colour helpers ---------- */
    // Convert #rgb / #rrggbb to [r,g,b]
    function hexToRGB(hex){
        let h = hex.replace('#','');
        if(h.length===3){
            h = h.split('').map(c=>c+c).join('');
        }
        const r = parseInt(h.substring(0,2),16);
        const g = parseInt(h.substring(2,4),16);
        const b = parseInt(h.substring(4,6),16);
        return [r,g,b];
    }
    // Parse any common CSS colour into [r,g,b,a]
    function parseColorToRGBA(col){
        if(col.startsWith('#')){
            const [r,g,b] = hexToRGB(col);
            return [r,g,b,255];
        }
        const m = col.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d*\.?\d+))?\)/);
        if(m){
            const r = parseInt(m[1],10);
            const g = parseInt(m[2],10);
            const b = parseInt(m[3],10);
            const a = m[4]!==undefined ? Math.round(parseFloat(m[4])*255) : 255;
            return [r,g,b,a];
        }
        // Fallback to black
        return [0,0,0,255];
    }

    /* ---------- Selection helpers ---------- */
    function isPointInPolygon(point, polygon) {
        // Ray-casting algorithm to determine if point is inside polygon
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
    
    function createSelectionMask() {
        // Create a mask based on the lasso selection
        if (!selectionPoints.length) return null;
        
        // Clear temp canvas
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw selection path
        tempCtx.beginPath();
        tempCtx.moveTo(selectionPoints[0].x, selectionPoints[0].y);
        for (let i = 1; i < selectionPoints.length; i++) {
            tempCtx.lineTo(selectionPoints[i].x, selectionPoints[i].y);
        }
        tempCtx.closePath();
        tempCtx.fillStyle = 'rgba(255,255,255,1)';
        tempCtx.fill();
        
        return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    function captureSelection() {
        if (!selectionPoints.length) return;
        
        // Get the bounding box of selection
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        for (const pt of selectionPoints) {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
        }
        
        // Add padding
        minX = Math.max(0, Math.floor(minX) - 1);
        minY = Math.max(0, Math.floor(minY) - 1);
        maxX = Math.min(canvasEL.width, Math.ceil(maxX) + 1);
        maxY = Math.min(canvasEL.height, Math.ceil(maxY) + 1);
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Store selection origin
        selectionOrigin = {x: minX, y: minY};
        selectionPos = {x: minX, y: minY};
        
        // Capture the image data
        const fullImageData = ctx.getImageData(0, 0, canvasEL.width, canvasEL.height);
        
        // Create a new ImageData for the selection
        selectionData = ctx.createImageData(width, height);
        
        // Create mask from selection path
        const mask = createSelectionMask();
        
        // Copy only pixels inside the selection path
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const sourceIdx = ((minY + y) * canvasEL.width + (minX + x)) * 4;
                const targetIdx = (y * width + x) * 4;
                const maskIdx = ((minY + y) * canvasEL.width + (minX + x)) * 4;
                
                // Only copy if inside mask (white pixel)
                if (mask.data[maskIdx] > 0) {
                    selectionData.data[targetIdx] = fullImageData.data[sourceIdx];
                    selectionData.data[targetIdx + 1] = fullImageData.data[sourceIdx + 1];
                    selectionData.data[targetIdx + 2] = fullImageData.data[sourceIdx + 2];
                    selectionData.data[targetIdx + 3] = fullImageData.data[sourceIdx + 3];
                }
            }
        }
        
        // Clear the selected area if it's a cut operation
        clearSelection();
        
        selectionActive = true;
        updateCursor();
    }
    
    function clearSelection() {
        if (!selectionPoints.length) return;
        
        // Clear the area inside the selection
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(selectionPoints[0].x, selectionPoints[0].y);
        for (let i = 1; i < selectionPoints.length; i++) {
            ctx.lineTo(selectionPoints[i].x, selectionPoints[i].y);
        }
        ctx.closePath();
        ctx.clip();
        ctx.clearRect(0, 0, canvasEL.width, canvasEL.height);
        ctx.restore();
    }
    
    function drawSelectionOutline() {
        if (!selectionActive || !selectionPoints.length) return;
        
        // Draw the selection outline
        ctx.save();
        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        
        // Draw the outline at the current position
        const offsetX = selectionPos.x - selectionOrigin.x;
        const offsetY = selectionPos.y - selectionOrigin.y;
        
        ctx.moveTo(selectionPoints[0].x + offsetX, selectionPoints[0].y + offsetY);
        for (let i = 1; i < selectionPoints.length; i++) {
            ctx.lineTo(selectionPoints[i].x + offsetX, selectionPoints[i].y + offsetY);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
    
    function drawSelection() {
        if (!selectionActive || !selectionData) return;
        
        // Draw the selection at its current position
        ctx.putImageData(
            selectionData, 
            selectionPos.x, 
            selectionPos.y
        );
        
        // Draw outline
        drawSelectionOutline();
    }
    
    function commitSelection() {
        if (!selectionActive || !selectionData) return;
        
        // Permanently apply the selection to the canvas
        ctx.putImageData(
            selectionData, 
            selectionPos.x, 
            selectionPos.y
        );
        
        // Reset selection state
        cancelSelection();
    }
    
    function cancelSelection() {
        selectionActive = false;
        selectionPoints = [];
        selectionData = null;
        updateCursor();
        // Redraw the canvas to remove any selection outlines
        ctx.drawImage(canvasEL, 0, 0);
    }
    
    /* ---------- Clipboard operations ---------- */
    function copySelection() {
        if (!selectionActive) return;
        // Selection is already captured in selectionData
        console.log('Selection copied');
    }
    
    function cutSelection() {
        if (!selectionActive) return;
        copySelection();
        clearSelection();
        console.log('Selection cut');
    }
    
    function pasteSelection() {
        if (!selectionData) return;
        
        // Position the pasted content in the center of the viewport
        selectionPos = {
            x: Math.floor((canvasEL.width - selectionData.width) / 2),
            y: Math.floor((canvasEL.height - selectionData.height) / 2)
        };
        
        selectionActive = true;
        drawSelection();
        console.log('Selection pasted');
    }

    function beginStroke(e){
        // Always start with a fresh path
        ctx.beginPath();
        
        const {x, y} = getPos(e);
        
        // Tool branching -----------------------------
        if(currentTool==='fill'){
            bucketFill(Math.floor(x),Math.floor(y),ctx.strokeStyle);
            return; // No need to set painting=true for fill
        }

        if(currentTool==='text'){
            const text = prompt('Enter text:', '');
            if(text){
                ctx.fillStyle = ctx.strokeStyle;
                ctx.textBaseline = 'top';
                ctx.font = `${parseInt(widthInput.value,10)*4}px sans-serif`;
                ctx.fillText(text, x, y);
            }
            return; // No need to set painting=true for text
        }
        
        if(currentTool==='lasso'){
            // Start a new selection
            selectionPoints = [{x, y}];
            painting = true;
            return;
        }
        
        if(currentTool==='move'){
            if(selectionActive){
                // Check if click is inside the selection
                const offsetX = selectionPos.x - selectionOrigin.x;
                const offsetY = selectionPos.y - selectionOrigin.y;
                
                // Translate selection points
                const translatedPoints = selectionPoints.map(pt => ({
                    x: pt.x + offsetX,
                    y: pt.y + offsetY
                }));
                
                if(isPointInPolygon({x, y}, translatedPoints)){
                    moveStart = {x, y};
                    painting = true;
                } else {
                    // Commit the current selection if clicking outside
                    commitSelection();
                }
            }
            return;
        }

        if(['rect','circle','line'].includes(currentTool)){
            shapeStart={x,y};
            painting = true; // Only set painting=true for drawing operations
            return; // wait for mouseup to draw
        }

        // default brush behaviour
        painting = true;
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
        
        // For brush, we want to draw the first point
        if(currentTool === 'brush'){
            draw(e);
        }
    }

    function endStroke(e){
        if(!painting) return; // If we weren't painting, nothing to end
        
        painting = false;
        
        if(currentTool==='lasso'){
            // Complete the lasso selection
            if(selectionPoints.length > 2){
                // Close the path
                selectionPoints.push(selectionPoints[0]);
                // Capture the selection
                captureSelection();
            } else {
                // Not enough points for a valid selection
                selectionPoints = [];
            }
            return;
        }
        
        if(currentTool==='move'){
            moveStart = null;
            return;
        }
        
        if(shapeStart && ['rect','circle','line'].includes(currentTool)){
            const {x: sx, y: sy} = shapeStart;
            const {x: ex, y: ey} = getPos(e);
            
            // Save current context settings
            const prevLineWidth = ctx.lineWidth;
            const prevStrokeStyle = ctx.strokeStyle;
            
            // Apply current settings
            ctx.lineWidth = widthInput.value;
            ctx.strokeStyle = colorInput.value;
            
            // Always start with fresh path for shapes
            ctx.beginPath();
            
            if(currentTool==='rect'){
                ctx.rect(sx, sy, ex-sx, ey-sy);
                ctx.stroke();
            }else if(currentTool==='circle'){
                const radius = Math.hypot(ex-sx, ey-sy);
                ctx.arc(sx, sy, radius, 0, Math.PI*2);
                ctx.stroke();
            }else if(currentTool==='line'){
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
            
            // Reset path to prevent connecting to next shape
            ctx.beginPath();
            shapeStart = null;
            
            // Restore context if needed
            ctx.lineWidth = prevLineWidth;
            ctx.strokeStyle = prevStrokeStyle;
        }

        /* Save completed stroke */
        if(currentStroke && currentStroke.points.length > 1){
            strokes.push(currentStroke);
        }
        currentStroke = null;
        
        // Ensure path is reset
        ctx.beginPath();
    }

    function draw(e){
        if(!painting) return;
        
        const {x, y} = getPos(e);
        
        if(currentTool === 'lasso'){
            // Add point to lasso selection
            selectionPoints.push({x, y});
            
            // Draw the lasso as we go
            ctx.save();
            ctx.strokeStyle = '#2196f3';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            
            ctx.beginPath();
            ctx.moveTo(selectionPoints[0].x, selectionPoints[0].y);
            for (let i = 1; i < selectionPoints.length; i++) {
                ctx.lineTo(selectionPoints[i].x, selectionPoints[i].y);
            }
            ctx.stroke();
            ctx.restore();
            
            return;
        }
        
        if(currentTool === 'move' && moveStart){
            // Calculate the movement delta
            const dx = x - moveStart.x;
            const dy = y - moveStart.y;
            
            // Update the selection position
            selectionPos.x += dx;
            selectionPos.y += dy;
            
            // Update the move start position
            moveStart = {x, y};
            
            // Redraw the canvas and selection
            ctx.clearRect(0, 0, canvasEL.width, canvasEL.height);
            drawSelection();
            
            return;
        }
        
        if(currentTool !== 'brush') return; // Only continue for brush tool
        
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
    canvasEL.addEventListener('mouseleave', () => {
        // End stroke if mouse leaves canvas
        if(painting) endStroke();
    });
    
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
        // Reset any active path
        ctx.beginPath();
    }

    // button
    if(eraserBtn){
        eraserBtn.addEventListener('click', toggleEraser);
    }

    /* ---------- Theme toggle ---------- */
    if(themeBtn){
        // initial load
        const stored = localStorage.getItem('htcanvas-theme') || 'light';
        applyTheme(stored);

        themeBtn.addEventListener('click', () => {
            // find next theme in cycle
            const idx = THEMES.indexOf(currentTheme);
            const next = THEMES[(idx+1) % THEMES.length];
            applyTheme(next);
        });
    }

    // clear
    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0,0,canvasEL.width,canvasEL.height);
        strokes.length = 0; // reset stored strokes
        cancelSelection(); // clear any active selection
        ctx.beginPath(); // Reset any active path
    });

    // save
    saveBtn.addEventListener('click', () => {
        // Commit any active selection before saving
        if(selectionActive) commitSelection();
        
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
            // Commit any active selection before saving
            if(selectionActive) commitSelection();
            
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
        // ---- vector paths ----
        for(const p of vectorPaths){
            const d = p.points.map((pt,i)=> (i===0?`M ${pt.x} ${pt.y}`:`L ${pt.x} ${pt.y}`)).join(' ');
            svg += `<path d="${d}" stroke="${p.stroke}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        svg += '</svg>';
        return svg;
    }

    /* ---------- Keyboard shortcuts ---------- */
    document.addEventListener('keydown', e => {
        // Eraser toggle
        if(e.key.toLowerCase() === 'e'){
            toggleEraser();
        }
        
        // Selection operations
        if(e.key === 'Escape'){
            cancelSelection();
        }
        
        // Clipboard operations
        if(e.ctrlKey || e.metaKey){ // Ctrl on Windows/Linux, Command on Mac
            switch(e.key.toLowerCase()){
                case 'c': // Copy
                    if(selectionActive) copySelection();
                    break;
                case 'x': // Cut
                    if(selectionActive) cutSelection();
                    break;
                case 'v': // Paste
                    if(selectionData) pasteSelection();
                    break;
            }
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
