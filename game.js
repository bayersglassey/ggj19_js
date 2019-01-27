
/*

Copyright GGJ team (c) 2019


Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


*/

'use strict';

var delay = 30;
var USE_BACKGROUND = true;
var ANIMATE_HOME = true;

var background = document.getElementById('background');
var canvas = document.getElementById('canvas');
var bee_sprite = {
    crawl: document.getElementById('bee_left_sprite'),
    fly: document.getElementById('bee_sprite'),
};
var seed_sprite = {
    unhatched: document.getElementById('seed_sprite'),
    hatched: document.getElementById('seed_hatched_sprite'),
};
var flower_sprite = {
    lily: document.getElementById('flower_lily_sprite'),
};
var home_sprite;
if(ANIMATE_HOME){
    home_sprite = {
        home: document.getElementById('home_animated_sprite'),
    };
}else{
    home_sprite = {
        home: document.getElementById('home_sprite'),
    };
}

var ground_height = 85;
var ground_y = canvas.height - ground_height;

var n_seeds = 10;

init();

var KUP = 38;
var KDOWN = 40;
var KLEFT = 37;
var KRIGHT = 39;
var KW = 87;
var KA = 65;
var KS = 83;
var KD = 68;
var KM = 77;
var KSPACE = 32;
var kdown = {};
var mdown = false;
var mousex;
var mousey;

var tick = 0;

var backgroundMusic = new sound("/music/ClapClapSlap.wav" , "bMsc", .5);
var collideSound = new sound("/sounds/BoopEffect.wav", "collideSnd");
var throwSound = collideSound;

function sound(src , ident, volume){
    volume = volume || 1;

    var muted = false;
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.id = ident;
    this.sound.setAttribute("preload","auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    this.sound.volume = volume;
    document.body.appendChild(this.sound);
    this.play = function(){
        this.sound.play();
    }
    this.stop = function(){
        this.sound.pause();
    }
}
function mute(){
    var bMsc = document.getElementById("bMsc");
    if(bMsc.muted == false){
        bMsc.muted = true;
        //bMsc.stop();//may replace this with pause
    }else{
        bMsc.muted = false;
        //bMsc.play();
    }
}

function update(obj1, obj2){
    for(var key in obj2){
        obj1[key] = obj2[key];
    }
}


function get_orientation(x, y){
    /*
        Math.atan values (they're in radians):
            0       ->  0
            1       ->  0.785 == PI/4 == 45 degrees
            9999999 ->  1.571 == PI/2 == 90 degrees

        Math.atan(-x) == -Math.atan(x)

        So Math.atan(x) is between -90 degrees to +90 degrees
    */
    var orientation = y === 0? 0: Math.atan(-y/x);
    if(x < 0)orientation += Math.PI;
    return orientation;
}

function to_degrees(radians){
    return radians / (Math.PI / 180);
}

function to_radians(degrees){
    return degrees * Math.PI / 180;
}

function interpolate(x0, x1, t){
    return x0 + x1 * t;
}

function interpolate_rgb(r0, g0, b0, a0, r1, g1, b1, a1, t){
    var r = parseInt(interpolate(r0, r1, t));
    var g = parseInt(interpolate(g0, g1, t));
    var b = parseInt(interpolate(b0, b1, t));
    var a = parseInt(interpolate(a0, a1, t));

    /* Make a CSS rgb color value */
    return ['rgba(', r, ', ', g, ', ', b, ')'].join('');
}

function interpolate_rgb(r0, g0, b0, r1, g1, b1, t){
    return interpolate_rgba(
        r0, g0, b0, 255,
        r1, g1, b1, 255,
        t);
}


function drawImage(ctx, image, x, y, scale, rotation){
    /* Lifted from https://stackoverflow.com/a/43155027 */
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
    ctx.rotate(rotation);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
}

function drawImageCenter(ctx, image, x, y, cx, cy, scale, rotation){
    /* Lifted from https://stackoverflow.com/a/43155027 */
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
    ctx.rotate(rotation);
    ctx.drawImage(image, -cx, -cy);
    ctx.restore();
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
    this.fillcolor = 'lightgreen';
    this.trail_color = 'cyan';

    this.sprite = null;
    /* If not null, sprite should be an object whose keys are frame names,
    and whose values are <img> elements */

    /* NOTE: if sprite_w, sprite_h are null, render() will use this.radius*2 instead */
    this.sprite_w = null;
    this.sprite_h = null;

    this.frame = 'fly'; /* Should be a key of this.sprite (if used) */

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

        if(mdown){
          var distx = this.x - mousex;
          var disty = this.y - mousey;
          var dist = Math.sqrt(distx * distx + disty * disty);
          this.vx-=this.accel * distx / dist;
          this.vy-=this.accel * disty / dist;
        };
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
        this.on_ground = this.y >= ground_y - 10;

        if(this.y < 0){
            this.y = 0;
            this.vy *= -this.bounce;
        }else if(this.y >= ground_y){
            this.y = ground_y - 1;
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

        var DRAW_CIRCLE = !this.sprite; /* If no sprite provided, draw a circle */
        //var DRAW_CIRCLE = true; /* For debugging, nice to see circle so you can tell when things will collide */
        if(DRAW_CIRCLE){
            ctx.strokeStyle = this.color;
            ctx.fillStyle = this.fillcolor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }

        if(this.sprite){
            /* Render sprite, if provided */

            var image = this.sprite[this.frame];
            var w = this.sprite_w? this.sprite_w: this.radius * 2;
            var h = this.sprite_h? this.sprite_h: this.radius * 2;

            var OLDSCHOOL = true;
            if(OLDSCHOOL){
                /* How we used to do it before copy-pasting magic stuff
                off StackOverflow */
                var dx = this.x - w / 2;
                var dy = this.y - h / 2;
                ctx.drawImage(image, dx, dy, w, h);
            }else{
                /* Now we are all pros */
                var dx = this.x;
                var dy = this.y;
                var scale = w / image.width;
                var rot = to_degrees(this.orientation);
                drawImage(ctx, image, dx, dy, scale, rot);
            }
        }
    },
    distance_xy: function(x, y){
        /* The classic Pythagoreas! */
        return Math.sqrt(
            Math.pow(this.x - x, 2) +
            Math.pow(this.y - y, 2));
    },
    distance: function(other){
        return this.distance_xy(other.x, other.y);
    },
    collide: function(other){
        return this.distance(other) < this.radius + other.radius;
    },
    get_collided_entities: function(){
        var collided_entities = [];
        for(var i = 0; i < entities.length; i++){
            var other = entities[i];
            if(this === other)continue;
            if(this.collide(other))collided_entities.push(other);
        }
        return collided_entities;
    },
    spring_xy: function(x, y, springiness){
        /* Changes our velocity so it's like we're connected to
        (x, y) by a spring... */
        var distance = this.distance_xy(x,y);
        var mul = distance * springiness;
        var addx = (x - this.x) * mul;
        var addy = (y - this.y) * mul;
        this.vx += addx;
        this.vy += addy;
    },
    spring: function(other, springiness){
        this.spring_xy(other.x, other.y, springiness);
    },
});

function Fly(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.radius = 10;
    options.accel = .85;
    options.sprite = bee_sprite;
    options.sprite_w = (options.radius + 20) * 2;
    options.sprite_h = (options.radius + 20) * 2;
    options.color = 'orange';
    options.fillcolor = 'yellow';
    options.trail_color = 'yellow';
    Entity.call(this, options);

    this.min_stamina = 15; /* Go below this, and you can no longer fly!.. */
    this.max_stamina = 100;
    this.stamina = this.max_stamina;

    this.orientation = 0; //0 to 2*Math.PI to rotate image!

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
            throwSound.play();

            /* Wait 5 frames before picking stuff up again */
            this.grab_cooldown = 5;
        }
    },
    step: function(){

        remove_dead_stuff(this.grabbed_things);

        if(this.vx){
            //rotates w motion
            this.orientation = get_orientation(this.vx, this.vy);
        }

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
            this.frame = 'crawl';
            this.stamina += 2;
            if(this.stamina > this.max_stamina)this.stamina = this.max_stamina;
        }else{
            /* While flying, you lose stamina */
            this.frame = 'fly';
            this.stamina -= .5;
            if(this.stamina < 0)this.stamina = 0;
        }

        if(this.grab_cooldown > 0){
            this.grab_cooldown--;
        }else{
            /* Pick up any droplets or hatched flowers we touch */
            var collided_entities = this.get_collided_entities();
            for(var i = 0; i < collided_entities.length; i++){
                var other = collided_entities[i];
                if(other.type !== 'droplet' && other.type !== 'flower')continue;
                if(this.grabbed_things.indexOf(other) >= 0)continue;

                /* Grab the thing! */
                this.grabbed_things.push(other);
                collideSound.play();
            }
        }

        /* Swing stuff around which we've picked up */
        for(var i = 0; i < this.grabbed_things.length; i++){
            var other = this.grabbed_things[i];
            other.spring(this, this.grab_springiness);
        }
    },
});


function Droplet(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.damp = .985;
    options.gravity = .3;
    options.color = 'rgba(0, 0, 255, .8)';
    options.fillcolor = 'rgba(128, 128, 255, .4)';
    options.trail_color = 'lightblue';
    options.max_n_trails = 5;
    Entity.call(this, options);

    /* Radius starts at start_radius, grows by add_radius_normal pixels
    per frame, once it hits pop_after_radius it grows by add_radius_popping
    pixels per frame, once it hits die_after_radius the droplet "dies" (is
    removed from game) */
    this.start_radius = 10;
    this.radius = this.start_radius;
    this.add_radius_normal = .02;
    this.add_radius_popping = 3;
    this.pop_after_radius = 20;
    this.die_after_radius = 50;
}
update(Droplet.prototype, Entity.prototype);
update(Droplet.prototype, {
    type: 'droplet',
    step: function(){
        Entity.prototype.step.call(this);
        if(this.radius >= this.pop_after_radius){
            /* Old droplets "pop" by quickly expanding, then disappearing */
            this.radius += this.add_radius_popping;
            if(this.radius > this.die_after_radius){
                this.die();
            }
        }else{
            /* Droplets slowly expand to give you an idea of their age */
            this.radius += this.add_radius_normal;
        }
    },
});



function Seed(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.radius = 5;
    options.max_radius = 25;
    options.damp = .99;
    options.gravity = .1;
    options.color = 'green';
    options.fillcolor = 'lightgreen';
    options.max_n_trails = 0;
    options.x = Math.random() * canvas.width;
    options.y = 0;
    options.sprite = seed_sprite;
    options.frame = 'unhatched';
    /* random velocity (vx, vy) so seeds are "scattered" from the sky
    on page load */
    options.vx = Math.random() * 20 - 10;
    options.vy = Math.random() * 10 - 5;

    Entity.call(this, options);
}
update(Seed.prototype, Entity.prototype);
update(Seed.prototype, {
    type: 'seed',
    step: function(){
        Entity.prototype.step.call(this);

        if(this.frame === 'unhatched'){
            /* If any droplets are touching the seed, it "sucks up" water
            from the droplet, and grows. */
            var collided_entities = this.get_collided_entities();
            for(var i = 0; i < collided_entities.length; i++){
                var other = collided_entities[i];
                if(other.type !== 'droplet')continue;

                /* Drain water from the droplet and add to seed's size */
                this.radius += 1;
                other.radius -= 2;
                if(other.radius < 5){
                    /* If the droplet gets small enough, remove it from game */
                    other.die();
                }
            }

            /* If seed sucks up enough water, it hatches a flower */
            if(this.radius > this.max_radius){
                this.frame = 'hatched';

                /* Fling a new flower upwards from ground */
                var new_vy = this.vy - 15;
                new Flower({x:this.x, y:this.y, vy:new_vy});
            }
        }
    },
});


function Flower(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.damp = .99;
    options.gravity = -.3;
    options.color = 'purple';
    options.fillcolor = 'lightsalmon';
    options.max_n_trails = 0;
    options.sprite = flower_sprite;
    options.frame = 'lily';
    Entity.call(this, options);

    /* The flower has a "base" from which it floats upwards...
    It's connected to the base with springy physics */
    this.base_x = this.x;
    this.base_y = this.y;
    this.base_springiness = .0001;

    /* When flowers are created, they "pop" into existence */
    this.radius = 5;
    this.max_radius = 35;
    this.add_radius = 4;
}
update(Flower.prototype, Entity.prototype);
update(Flower.prototype, {
    type: 'flower',
    step: function(){
        Entity.prototype.step.call(this);

        /* Flowers "pop" into existence */
        this.radius += this.add_radius;
        if(this.radius > this.max_radius)this.radius = this.max_radius;

        /* Flowers float upwards (gravity < 0) but are tethered to
        a "base" position with springy physics */
        this.spring_xy(this.base_x, this.base_y, this.base_springiness);
    },
});



/* HomeBG is the big thing which looks like a flower.
It doesn't do anything except look pretty. */
function HomeBG(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.gravity = 0;
    options.radius = 150;
    options.color = 'grey';
    options.fillcolor = 'white';
    options.max_n_trails = 0;
    options.sprite = home_sprite;
    options.frame = 'home';
    Entity.call(this, options);
}
update(HomeBG.prototype, Entity.prototype);
update(HomeBG.prototype, {
    type: 'home_bg',
    render: function(){
        if(!ANIMATE_HOME)return Entity.prototype.render.call(this);

        var ctx = canvas.getContext('2d');

        var image = this.sprite[this.frame];

        var n_frames_x = 5;
        var n_frames_y = 5;
        var n_frames = n_frames_x * n_frames_y;

        var frame_w = image.width / n_frames_x;
        var frame_h = image.height / n_frames_y;

        var frame_i = tick % n_frames;
        var frame_x = frame_i % n_frames_x;
        var frame_y = Math.floor(frame_i / n_frames_y);

        var w = this.sprite_w? this.sprite_w: this.radius * 2;
        var h = this.sprite_h? this.sprite_h: this.radius * 2;
        var dx = this.x - w / 2;
        var dy = this.y - h / 2;

        ctx.drawImage(image,
            frame_x*frame_w, frame_y*frame_h, frame_w, frame_h,
            dx, dy, w, h);
    },
});



/* Home is an invisible thing sitting near the top of the HomeBG
thing (which has the flower image).
Home sprays droplets, and you bring hatched flowers back to it. */
function Home(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.gravity = 0;
    options.radius = 30;
    options.color = 'transparent';
    options.fillcolor = 'transparent';
    options.max_n_trails = 0;
    Entity.call(this, options);
}
update(Home.prototype, Entity.prototype);
update(Home.prototype, {
    type: 'home',
    step: function(){
        Entity.prototype.step.call(this);

        /* When flowers are delivered to the Home, they disappear
        and it grows... */
        var collided_entities = this.get_collided_entities();
        for(var i = 0; i < collided_entities.length; i++){
            var other = collided_entities[i];
            if(other.type !== 'flower')continue;

            other.die(); /* I feel slightly guilty for telling a flower to "die"... */
            home_bg.radius += 15;
            this.reset_position();
        }
    },
    reset_position: function(){
        /* As home_bg grows in size, you can call this function to make
        sure home stays in the middle of home_bg's flower image */
        this.x = home_bg.x;
        this.y = home_bg.y - 60 * home_bg.radius/100;
    },
});



/* Create some entities at start of game... */
var home_bg = new HomeBG();
var home = new Home();
home.reset_position();
var fly = new Fly();
for(var i = 0; i < n_seeds; i++){
    new Seed();
}

backgroundMusic.play();
//this loops the music
document.getElementById("bMsc").addEventListener('ended', function(){
    this.currentTime = 0;
    this.play();
}, false);

function init(){
    $(document).on('keydown', keydown);
    $(document).on('keyup', keyup);
    //$(document).on('click', click);
    $(document).on('mousedown',mousedown);
    $(document).on('mouseup',mouseup);
    $(document).on('mousemove',mousemove);
    //$(document).on('mousemove',);

    // var intervalId;
    // $(document).on('mousedown', function(event) {
    //   intervalId = setInterval(click(event), 100);
    // }).mouseup(function() {
    //   clearInterval(intervalId);
    //   //console.log('up');
    // });
    setInterval(step, delay);
}

function remove_dead_stuff(entities){
    /* Removes "dead" entities from an array */
    for(var i = 0; i < entities.length;){
        var entity = entities[i];
        if(entity.dead){
            /* Splice entity out of the array */
            entities.splice(i, 1);
        }else{
            i++;
        }
    }
}

function step(){
    tick++;

    fly.do_key_stuff();

    if(tick % 25 === 0){
        new Droplet({
            x: home.x,
            y: home.y,
            vx: Math.random() * 20 - 10,
            vy: Math.random() * 20 - 20,
        });
    }

    /* Let entities do whatever it is they do each frame */
    for(var i = 0; i < entities.length; i++){
        var entity = entities[i];
        entity.step();
    }

    /* Remove "dead" entities */
    remove_dead_stuff(entities);

    /* Render the world */
    render();
}

function render(){
    var ctx = canvas.getContext('2d');

    if(USE_BACKGROUND){
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    }else{
        /* Old school... just clear the screen to white */
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /* Render entities */
    for(var i = 0; i < entities.length; i++){
        var entity = entities[i];
        entity.render();
    }

    /* Render stamina bar */
    var bar_padding_x = 20;
    var bar_padding_y = 10;
    var bar_h = 20;
    var bar = {
        x: bar_padding_x,
        y: canvas.height - bar_h - bar_padding_y,
        w: canvas.width - bar_padding_x * 2,
        h: bar_h,
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
    if(event.keyCode === KM) mute();
    kdown[event.keyCode] = false;
}

function mousedown(event){
    mdown = true;
}

function mouseup(event){
    mdown = false;
}

function mousemove(event){
    mousex = event.offsetX;
    mousey = event.offsetY;
}
