
var delay = 30;
var canvas = document.getElementById('canvas');

init();

var KUP = 38;
var KDOWN = 40;
var KLEFT = 37;
var KRIGHT = 39;
var kdown = {};

var speed = 1.5;
var x = 10;
var y = 10;

function init(){
    $(document).on('keydown', keydown);
    $(document).on('keyup', keyup);
    setInterval(step, delay);
}

function step(){
    if(kdown[KUP])y-=speed;
    if(kdown[KDOWN])y+=speed;
    if(kdown[KLEFT])x-=speed;
    if(kdown[KRIGHT])x+=speed;
    render();
}

function render(){
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'green';
    ctx.fillRect(x, y, 150, 100);
}

function keydown(event){
    //console.log("KEY DOWN", event.keyCode);
    kdown[event.keyCode] = true;
}

function keyup(event){
    kdown[event.keyCode] = false;
}


