
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


function interpolate(x0, x1, t){
    return x0 + x1 * t;
}

function interpolate_rgb(r0, g0, b0, r1, g1, b1, t){
    var r = parseInt(interpolate(r0, r1, t));
    var g = parseInt(interpolate(g0, g1, t));
    var b = parseInt(interpolate(b0, b1, t));

    /* Make a CSS rgb color value */
    return ['rgb(', r, ', ', g, ', ', b, ')'].join('');
}



var entities = [];
function Entity(options){
    this.trails = [];
    this.trail_ratio = .4; /* So like... if 1, trail will be unbroken. If 0, trail will be dots. */
    this.max_n_trails = 20;

    this.dead = false;
    this.age = 0;

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
    die: function(){
        /* We're not going to mess with the entities array here,
        since that would mess up code which was looping over it...
        So we just mark ourselves as dead, and rely on other code
        to periodically remove dead entities from the array */
        this.dead = true;
    },
    do_key_stuff: function(){
        if(kdown[KUP]||kdown[KW])this.vy-=this.accel;
        if(kdown[KDOWN]||kdown[KS])this.vy+=this.accel;
        if(kdown[KLEFT]||kdown[KA])this.vx-=this.accel;
        if(kdown[KRIGHT]||kdown[KD])this.vx+=this.accel;
    },
    step: function(){
        this.age++;

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

        /* You're considered on the ground if you're within 10 pixels of it */
        this.on_ground = this.y >= canvas.height - 10;

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
    options = options || {};
    options.accel = .85;
    Entity.call(this, options);

    this.min_stamina = 15; /* Go below this, and you can no longer fly!.. */
    this.max_stamina = 100;
    this.stamina = this.max_stamina;

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
        if(this.stamina < this.min_stamina){
            /* Not enough stamina to fly! */
            this.gravity = .75;
        }else{
            /* Always a tiny bit of gravity, otherwise when you're
            trying to rest on the ground you can accidentally rise off it */
            this.gravity = .05;
        }

        Entity.prototype.step.call(this);

        if(this.on_ground){
            /* While "resting" on the ground, you regain stamina slowly */
            this.stamina += 2;
            if(this.stamina > this.max_stamina)this.stamina = this.max_stamina;
        }else{
            /* While flying, you lose stamina */
            this.stamina -= .5;
            if(this.stamina < 0)this.stamina = 0;
        }

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
    options.max_age = 200;
    options.damp = .985;
    options.gravity = .3;
    options.radius = 10;
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
    step: function(){
        Entity.prototype.step.call(this);

        var FADE_TO_WHITE = false;
        if(FADE_TO_WHITE){
            /* Droplots start off blue, fade to white...
            There's probably a way to do this via transparency instead of
            fading to white, though... idunno */
            var t = Math.min(this.age / this.max_age, 1);
            this.color = interpolate_rgb(
                0, 0, 255, /* blue */
                255, 255, 255, /* white */
                t);
        }

        if(this.age > this.max_age){
            /* Old droplets "pop" by quickly expanding, then disappearing */
            this.radius += 2;
            if(this.radius > 30){
                this.die();
            }
        }else{
            /* Droplets slowly expand to give you an idea of their age */
            this.radius += .05;
        }
    },
});



var fly = new Fly();

function init(){
    $(document).on('keydown', keydown);
    $(document).on('keyup', keyup);
    $(document).on('click', click);
    setInterval(step, delay);
}

function step(){
    tick++;

    fly.do_key_stuff();

    if(tick % 25 === 0)new Droplet();

    /* Let entities do whatever it is they do each frame */
    for(var i = 0; i < entities.length; i++){
        var entity = entities[i];
        entity.step();
    }

    /* Remove "dead" entities */
    for(var i = 0; i < entities.length;){
        var entity = entities[i];
        if(entity.dead){
            /* Splice entity out of the array */
            entities.splice(i, 1);
        }else{
            i++;
        }
    }

    /* Render the world */
    render();
}

function render(){
    var ctx = canvas.getContext('2d');

    /* Clear screen */
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* Render entities */
    for(var i = 0; i < entities.length; i++){
        var entity = entities[i];
        entity.render();
    }

    /* Render stamina bar */
    var bar = {
        x: 10,
        y: 10,
        w: 200,
        h: 25,
    };
    var ratio = fly.stamina / fly.max_stamina;
    ctx.strokeStyle = 'black';
    ctx.strokeRect(bar.x, bar.y, bar.w, bar.h); /* unfilled rectangle */
    ctx.fillStyle = 'red';
    ctx.fillRect(bar.x, bar.y, bar.w * ratio, bar.h); /* filled rectangle */
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
