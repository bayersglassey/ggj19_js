
/*

Copyright GGJ team (c) 2019


Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


*/

var delay = 30;
var canvas = document.getElementById('canvas');

init();

var KUP = 38;
var KDOWN = 40;
var KLEFT = 37;
var KRIGHT = 39;
var KW = 87;
var KA = 65;
var KS = 83;
var KD = 68;
var KSPACE = 32;
var kdown = {};

var tick = 0;

function update(obj1, obj2){
    for(key in obj2){
        obj1[key] = obj2[key];
    }
}


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
    this.gravity = 0;
    this.color = 'green';
    this.trail_color = 'cyan';

    /* Caller can override default attributes */
    update(this, options);

    /* Push onto global array of entities */
    entities.push(this);
}
update(Entity.prototype, {
    type: 'entity',
    do_key_stuff: function(){
        if(kdown[KUP]||kdown[KW])this.vy-=this.accel;
        if(kdown[KDOWN]||kdown[KS])this.vy+=this.accel;
        if(kdown[KLEFT]||kdown[KA])this.vx-=this.accel;
        if(kdown[KRIGHT]||kdown[KD])this.vx+=this.accel;
    },
    step: function(){
        if(tick % 3 === 0)this.trails.push({x:this.x, y:this.y});
        if(this.trails.length > this.max_n_trails)this.trails.shift();

        this.vy += this.gravity;

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

        /* Render trails */
        for(var i = 0; i < this.trails.length - 1; i++){
            var trail = this.trails[i];
            var next_trail = this.trails[i+1];
            var mul = this.trail_ratio;
            var addx = (next_trail.x - trail.x) * mul;
            var addy = (next_trail.y - trail.y) * mul;

            ctx.strokeStyle = this.trail_color;
            ctx.beginPath();
            ctx.moveTo(trail.x, trail.y);
            ctx.lineTo(trail.x + addx, trail.y + addy);
            ctx.stroke();
        }

        /* Render a ...fly */
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
    },
    distance: function(other){
        /* The classic Pythagoreas! */
        return Math.sqrt(
            Math.pow(this.x - other.x, 2) +
            Math.pow(this.y - other.y, 2));
    },
    collide: function(other){
        return this.distance(other) < this.radius + other.radius;
    },
    get_collided_entites: function(){
        var collided_entities = [];
        for(var i = 0; i < entities.length; i++){
            var other = entities[i];
            if(this === other)continue;
            if(this.collide(other))collided_entities.push(other);
        }
        return collided_entities;
    },
});


function Fly(options){
    /* Javascript class inheritance?? */
    Entity.call(this, options);

    this.grab_springiness = .001;
    this.grab_cooldown = 0;
    this.grabbed_things = [];
}
update(Fly.prototype, Entity.prototype);
update(Fly.prototype, {
    type: 'fly',
    do_key_stuff: function(){
        Entity.prototype.do_key_stuff.call(this);
        if(kdown[KSPACE]){
            /* Drop everything we had picked up */
            this.grabbed_things = [];

            /* Wait 5 frames before picking stuff up again */
            this.grab_cooldown = 5;
        }
    },
    step: function(){
        Entity.prototype.step.call(this);

        if(this.grab_cooldown > 0){
            this.grab_cooldown--;
        }else{
            /* Pick up any droplets we touch */
            var collided_entities = this.get_collided_entites();
            for(var i = 0; i < collided_entities.length; i++){
                var other = collided_entities[i];
                if(other.type !== 'droplet')continue;
                if(this.grabbed_things.indexOf(other) >= 0)continue;
                this.grabbed_things.push(other);
            }
        }

        /* Swing stuff around which we've picked up */
        for(var i = 0; i < this.grabbed_things.length; i++){
            var other = this.grabbed_things[i];
            var distance = this.distance(other);
            var mul = distance * this.grab_springiness;
            var addx = (this.x - other.x) * mul;
            var addy = (this.y - other.y) * mul;
            other.vx += addx;
            other.vy += addy;
        }
    },
});


function Droplet(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.gravity = .5;
    options.color = 'blue';
    options.trail_color = 'lightgrey';
    options.max_n_trails = 5;
    options.x = Math.random() * canvas.width;
    options.y = 0;
    Entity.call(this, options);
}
update(Droplet.prototype, Entity.prototype);
update(Droplet.prototype, {
    type: 'droplet',
});



var fly = new Fly();

var n_droplets = 10;
for(var i = 0; i < n_droplets; i++){
    new Droplet();
}

function init(){
    $(document).on('keydown', keydown);
    $(document).on('keyup', keyup);
    $(document).on('click', click);
    setInterval(step, delay);
}

function step(){
    tick++;
    fly.do_key_stuff();
    for(var i = 0; i < entities.length; i++){
        var entity = entities[i];
        entity.step();
    }
    render();
}

function render(){
    var ctx = canvas.getContext('2d');

    /* Clear screen */
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
