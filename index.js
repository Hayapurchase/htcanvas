window.onload = function(){

    const canvasEL = document.querySelector('canvas');
    const context = canvasEL.getContext("2d");

    context.lineWidth = 5;

    
    function resizeCanvas(){
        canvasEL.width = window.innerWidth;  // Set canvas width to window width
        canvasEL.height = window.innerHeight;  // Set canvas height to window height
       
    }
    resizeCanvas();

    //variable
    let painting = false;

    // Object to hold the stroke color and width
    const strokeSettings = {
        strokeColor: '#ff0000', // Initial stroke color (red)
        lineWidth: 5            // Initial line width
    };

// Initialize dat.GUI
    const gui = new dat.GUI();

    // Add color control to change the stroke color
    gui.addColor(strokeSettings, 'strokeColor').onChange(function(value) {
        context.strokeStyle = value; // Change the stroke color dynamically
    });

    // Add number control to change the line width
    gui.add(strokeSettings, 'lineWidth', 1, 20).onChange(function(value) {
        context.lineWidth = value; // Change the stroke width dynamically
    });

    function startPosition(e){
        painting = true;
        draw(e);
    }
    function finishedPosition(){
        painting = false;
        context.beginPath();
    }
    function draw(e){
        if (!painting) return;
        
        context.lineCap = 'round';
        context.lineTo(e.clientX,e.clientY);
        context.stroke();
        context.beginPath();
        context.moveTo(e.clientX,e.clientY);

    }

    canvasEL.addEventListener('mousedown',startPosition);
    canvasEL.addEventListener('mouseup', finishedPosition);
    canvasEL.addEventListener('mousemove',draw);
    canvasEL.addEventListener('resize',resizeCanvas);
    

}
