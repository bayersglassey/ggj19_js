
var delay = 30;
var canvas = document.getElementById('canvas');

init();

var KUP = 38;
var KDOWN = 40;
var KLEFT = 37;
var KRIGHT = 39;
var kdown = {};

var tick = 0;

var trails = [];
var max_n_trails = 20;

var x = 10;
var y = 10;
var vx = 0;
var vy = 0;

var accel = .5;
var damp = .95;
var fly_radius = 10;

function init(){
    $(document).on('keydown', keydown);
    $(document).on('keyup', keyup);
    $(document).on('click', click);
    setInterval(step, delay);
}

function step(){
    tick++;

    if(tick % 3 === 0)trails.push({x:x, y:y});
    if(trails.length > max_n_trails)trails.shift();

    if(kdown[KUP])vy-=accel;
    if(kdown[KDOWN])vy+=accel;
    if(kdown[KLEFT])vx-=accel;
    if(kdown[KRIGHT])vx+=accel;

    x += vx;
    y += vy;
    if(x < 0){
        x = 0;
        vx *= -.5;
    }else if(x >= canvas.width){
        x = canvas.width - 1;
        vx *= -.5;
    }
    if(y < 0){
        y = 0;
        vy *= -.5;
    }else if(y >= canvas.height){
        y = canvas.height - 1;
        vy *= -.5;
    }

    vx *= damp;
    vy *= damp;

    render();
}

function render(){
    var ctx = canvas.getContext('2d');

    /* Clear screen */
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* Render trails */
    for(var i = 0; i < trails.length - 1; i++){
        var trail = trails[i];
        var next_trail = trails[i+1];
        var mul = .4;
        var addx = (next_trail.x - trail.x) * mul;
        var addy = (next_trail.y - trail.y) * mul;

        ctx.strokeStyle = 'cyan';
        ctx.beginPath();
        ctx.moveTo(trail.x, trail.y);
        ctx.lineTo(trail.x + addx, trail.y + addy);
        ctx.stroke();
    }

    /* Render a ...fly */
    ctx.strokeStyle = 'green';
    ctx.beginPath();
    ctx.arc(x, y, fly_radius, 0, 2 * Math.PI);
    ctx.stroke();
}

function keydown(event){
    //console.log("KEY DOWN", event.keyCode);
    kdown[event.keyCode] = true;
}

function keyup(event){
    kdown[event.keyCode] = false;
}

function click(event){
    console.log(event);
    var target_x = event.offsetX;
    var target_y = event.offsetY;
    var mul = .1;
    var addx = (target_x - x) * mul;
    var addy = (target_y - y) * mul;
    vx += addx;
    vy += addy;
}


