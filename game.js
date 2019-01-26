
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
    setInterval(step, delay);
}

function step(){
    tick++;
    if(kdown[KUP])vy-=accel;
    if(kdown[KDOWN])vy+=accel;
    if(kdown[KLEFT])vx-=accel;
    if(kdown[KRIGHT])vx+=accel;
    if(tick % 3 === 0)trails.push({x:x, y:y});
    if(trails.length > max_n_trails)trails.shift();
    x += vx;
    y += vy;
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


