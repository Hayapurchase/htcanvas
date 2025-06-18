window.onload = function(){

    const canvasEL = document.querySelector('canvas');
    const ctx       = canvasEL.getContext('2d');

    /* ---------- State ---------- */
    let painting      = false;
    let eraserActive  = false;

    /* ---------- DOM Controls ---------- */
    const colorInput  = document.getElementById('strokeColor');
    const widthInput  = document.getElementById('lineWidth');
    const clearBtn    = document.getElementById('clearCanvas');
    const saveBtn     = document.getElementById('saveCanvas');
    const eraserBtn   = document.getElementById('toggleEraser');
    /* Filter controls */
    const filterSelect   = document.getElementById('filterSelect');
    const resetFilterBtn = document.getElementById('resetFilter');
    let   currentFilter  = 'none';           // css filter string

    /* ---------- Canvas helpers ---------- */
    function resizeCanvas(){
        // Adapt to CSS-controlled size to avoid scrollbars
        canvasEL.width  = canvasEL.clientWidth;
        canvasEL.height = canvasEL.clientHeight;
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

    function beginStroke(e){
        painting = true;
        const {x, y} = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        draw(e); // draw first point
    }

    function endStroke(){
        painting = false;
        ctx.beginPath();
    }

    function draw(e){
        if(!painting) return;

        const {x, y} = getPos(e);
        ctx.lineCap  = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
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
