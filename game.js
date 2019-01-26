
var delay = 30;
var canvas = document.getElementById('canvas');

init();

var KUP = 38;
var KDOWN = 40;
var KLEFT = 37;
var KRIGHT = 39;
var kdown = {};

var tick = 0;

var entities = [];
function Entity(options){
    this.trails = [];
    this.trail_ratio = .4; /* So like... if 1, trail will be unbroken. If 0, trail will be dots. */
    this.max_n_trails = 20;

    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.vx = 0;
    this.vy = 0;

    this.accel = .5;
    this.damp = .95;
    this.bounce = .5;
    this.radius = 10;
    this.color = 'green';

    /* Caller can override default attributes */
    for(key in options){
        this[key] = options[key];
    }

    /* Push onto global array of entities */
    entities.push(this);
}
Entity.prototype = {
    step: function(){
        if(tick % 3 === 0)this.trails.push({x:this.x, y:this.y});
        if(this.trails.length > this.max_n_trails)this.trails.shift();

        if(kdown[KUP])this.vy-=this.accel;
        if(kdown[KDOWN])this.vy+=this.accel;
        if(kdown[KLEFT])this.vx-=this.accel;
        if(kdown[KRIGHT])this.vx+=this.accel;

        this.x += this.vx;
        this.y += this.vy;
        if(this.x < 0){
            this.x = 0;
            this.vx *= -this.bounce;
        }else if(this.x >= canvas.width){
            this.x = canvas.width - 1;
            this.vx *= -this.bounce;
        }
        if(this.y < 0){
            this.y = 0;
            this.vy *= -this.bounce;
        }else if(this.y >= canvas.height){
            this.y = canvas.height - 1;
            this.vy *= -this.bounce;
        }

        this.vx *= this.damp;
        this.vy *= this.damp;
    },
    render: function(){
        var ctx = canvas.getContext('2d');

        /* Clear screen */
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        /* Render trails */
        for(var i = 0; i < this.trails.length - 1; i++){
            var trail = this.trails[i];
            var next_trail = this.trails[i+1];
            var mul = this.trail_ratio;
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
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
    },
}

var fly = new Entity();

function init(){
    $(document).on('keydown', keydown);
    $(document).on('keyup', keyup);
    $(document).on('click', click);
    setInterval(step, delay);
}

function step(){
    tick++;
    for(var i = 0; i < entities.length; i++){
        var entity = entities[i];
        entity.step();
    }
    render();
}

function render(){
    for(var i = 0; i < entities.length; i++){
        var entity = entities[i];
        entity.render();
    }
}

function keydown(event){
    //console.log("KEY DOWN", event.keyCode);
    kdown[event.keyCode] = true;
}

function keyup(event){
    kdown[event.keyCode] = false;
}

function click(event){
    //console.log(event);
    var target_x = event.offsetX;
    var target_y = event.offsetY;
    var mul = .1;
    var addx = (target_x - fly.x) * mul;
    var addy = (target_y - fly.y) * mul;
    fly.vx += addx;
    fly.vy += addy;
}


