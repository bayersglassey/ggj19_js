
/*

Copyright GGJ team (c) 2019


Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


*/

'use strict';

var delay = 30;
var DEBUG_RENDER = false;

var render_priority = ['home_bg', 'home', 'daisy', 'seed', 'flower', 'droplet', 'spider', 'bee'];

var canvas = document.getElementById('canvas');

var backgrounds = [
    document.getElementById('background'),
    document.getElementById('background2'),
    document.getElementById('background3'),
    document.getElementById('background4'),
];
var background_i = 0;
function cycle_background(){
    /* This function is no longer used... current background image is
    determined by the level */
    background_i++;
    if(background_i >= backgrounds.length)background_i = 0;
}

var bee_sprite = {
    crawl: {image: document.getElementById('bee_left_sprite')},
    fly: {image: document.getElementById('bee_sprite')},
};
var seed_sprite = {
    unhatched: {image: document.getElementById('seed_sprite')},
    hatched: {image: document.getElementById('seed_hatched_sprite')},
};
var flower_sprite = {
    lily: {image: document.getElementById('flower_lily_sprite')},
};
var daisy_sprite = {
    daisy1: {
        animated: true,
        loop: true,
        n_frames_x: 5,
        n_frames_y: 5,
        image: document.getElementById('flower_daisy1_sprite'),
    },
    daisy2: {
        animated: true,
        loop: false,
        n_frames_x: 7,
        n_frames_y: 1,
        image: document.getElementById('flower_daisy2_sprite'),
    },
};
var home_sprite = {
    home: {
        animated: true,
        loop: true,
        n_frames_x: 5,
        n_frames_y: 5,
        image: document.getElementById('home_animated_sprite'),
    },
};
var droplet_sprite = {
    droplet: {
        animated: true,
        loop: true,
        n_frames_x: 5,
        n_frames_y: 5,
        image: document.getElementById('droplet_sprite'),
    },
};
var spider_sprite = {
    stay: {
        animated: true,
        loop: false,
        n_frames_x: 5,
        n_frames_y: 4,
        image: document.getElementById('spider_stay_sprite'),
    },
};

var ground_height = 75;
var ground_y = canvas.height - ground_height;



var KUP = 38;
var KDOWN = 40;
var KLEFT = 37;
var KRIGHT = 39;
var KW = 87;
var KA = 65;
var KS = 83;
var KD = 68;
var KM = 77;
var KB = 66;
var KR = 82;
var KN = 78;
var KSPACE = 32;
var kdown = {};
var mdown = false;
var mousex;
var mousey;

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


function draw_message(title, subtitles){
    var ctx = canvas.getContext('2d');

    var x = canvas.width / 2;
    var y = canvas.height / 2;
    var size = 60;

    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.font = "bold " + size + "px Georgia";
    ctx.fillText(title, x, y);

    subtitles = subtitles || [];
    for(var i = 0; i < subtitles.length; i++){
        var subtitle = subtitles[i];
        size = 25;
        y += 30;

        ctx.font = "bold " + size + "px Georgia";
        ctx.fillText(subtitle, x, y);
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
    var orientation = x === 0? Math.PI/2: Math.atan(-y/x);
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


function Entity(options){

    /* Each entitity has a unique created_i value, just so that we can
    sort them for rendering without a flicker bug...
    ...anyway, it fixes a bug. */
    this.created_i = n_entities_created;
    n_entities_created++;

    this.trails = [];
    this.trail_ratio = .4; /* So like... if 1, trail will be unbroken. If 0, trail will be dots. */
    this.max_n_trails = 20;

    this.dead = false;
    this.age = 0;
    this.frame_i = 0;

    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.vx = 0;
    this.vy = 0;

    this.accel = .5;
    this.damp = .95;
    this.bounce = .5;
    this.bounce_on_ground = true;
    this.radius = 10;
    this.gravity = 0;
    this.collide_with_map = true;
    this.color = 'green';
    this.fillcolor = 'lightgreen';
    this.trail_color = 'cyan';

    this.sprite = null;
    this.frame = 'fly';
        /* Should be a key of this.sprite (if this.sprite isn't null) */
    this.sprite_radius_multiplier = 1;
        /* In case sprite has extra space around the edge */

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
            if(dist){
                this.vx -= this.accel * distx / dist;
                this.vy -= this.accel * disty / dist;
            }
        };
    },
    step: function(){
        this.age++;
        this.frame_i++;

        if(this.age % 3 === 0)this.trails.push({x:this.x, y:this.y});
        if(this.trails.length > this.max_n_trails)this.trails.shift();

        this.vy += this.gravity;

        this.x += this.vx;
        this.y += this.vy;

        if(this.collide_with_map){
            var map_l = 0 + this.radius;
            var map_r = canvas.width - this.radius;
            var map_t = 0 + this.radius;
            var map_b = ground_y - this.radius;

            if(this.x < map_l){
                this.x = map_l;
                this.vx *= -this.bounce;
            }else if(this.x >= map_r){
                this.x = map_r - 1;
                this.vx *= -this.bounce;
            }

            if(this.y < map_t){
                this.y = map_t;
                this.vy *= -this.bounce;
            }else if(this.y >= map_b){
                this.y = map_b - 1;
                if(this.bounce_on_ground)this.vy *= -this.bounce;
                else this.vy = 0;
            }
        }

        /* You're considered on the ground if you're within 10 pixels of it */
        this.on_ground = this.y >= map_b - 10;

        this.vx *= this.damp;
        this.vy *= this.damp;
    },
    render: function(){
        this.render_trails();

        if(!this.sprite || DEBUG_RENDER){
            this.render_circle();
        }
        if(this.sprite){
            var spriteframe = this.sprite[this.frame];
            if(spriteframe.animated){
                this.render_animated(spriteframe);
            }else{
                this.render_static(spriteframe);
            }
        }
    },
    render_trails: function(){
        var ctx = canvas.getContext('2d');
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
    },
    render_circle: function(){
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.fillcolor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    },
    render_animated: function(spriteframe){
        var ctx = canvas.getContext('2d');
        var image = spriteframe.image;

        var n_frames_x = spriteframe.n_frames_x;
        var n_frames_y = spriteframe.n_frames_y;
        var n_frames = n_frames_x * n_frames_y;

        var frame_w = image.width / n_frames_x;
        var frame_h = image.height / n_frames_y;

        var frame_i = spriteframe.loop?
            this.frame_i % n_frames:
            Math.min(this.frame_i, n_frames - 1);
        var frame_x = frame_i % n_frames_x;
        var frame_y = Math.floor(frame_i / n_frames_x);

        var w = (this.radius * this.sprite_radius_multiplier) * 2;
        var h = (this.radius * this.sprite_radius_multiplier) * 2;
        var dx = this.x - w / 2;
        var dy = this.y - h / 2;

        ctx.drawImage(image,
            frame_x*frame_w, frame_y*frame_h, frame_w, frame_h,
            dx, dy, w, h);
    },
    render_static: function(spriteframe){
        var ctx = canvas.getContext('2d');
        var image = spriteframe.image;

        var w = (this.radius * this.sprite_radius_multiplier) * 2;
        var h = (this.radius * this.sprite_radius_multiplier) * 2;

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
    spring_xy: function(x, y, springiness, min_distance){
        /* Changes our velocity so it's like we're connected to
        (x, y) by a spring... */
        min_distance = min_distance || 0;
        var distance = this.distance_xy(x,y);
        if(distance >= min_distance){
            var mul = distance * springiness;
            var addx = (x - this.x) * mul;
            var addy = (y - this.y) * mul;
            this.vx += addx;
            this.vy += addy;
        }
    },
    spring: function(other, springiness, min_distance){
        this.spring_xy(other.x, other.y, springiness, min_distance);
    },
    pick_up: function(){
        /* Nothing happens by default when player picks something up,
        but "subclasses" of Entity can override this function to do
        something special */
    }
});

function Bee(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.radius = 13;
    options.accel = .85;
    options.bounce_on_ground = false;
    options.sprite = bee_sprite;
    options.sprite_radius_multiplier = 2;
    options.color = 'orange';
    options.fillcolor = 'yellow';
    options.trail_color = 'yellow';
    options.vy = -10;
        /* You start off with some vertical velocity, so you don't
        immediately run into a spider... */

    Entity.call(this, options);

    this.min_stamina = 15; /* Go below this, and you can no longer fly!.. */
    this.max_stamina = 100;
    this.stamina = this.max_stamina;

    this.orientation = 0; //0 to 2*Math.PI to rotate image!

    this.grab_springiness = .001;
    this.grab_cooldown = 0;
    this.grabbed_things = [];
}
update(Bee.prototype, Entity.prototype);
update(Bee.prototype, {
    type: 'bee',
    do_key_stuff: function(){
        Entity.prototype.do_key_stuff.call(this);
        if(kdown[KSPACE]){
            /* Drop everything we had picked up */
            this.grabbed_things = [];
            throwSound.play();

            /* Wait 5 frames before picking stuff up again */
            this.grab_cooldown = 10;
        }
    },
    add_stamina: function(amount){
        this.stamina += amount;
        if(this.stamina > this.max_stamina)this.stamina = this.max_stamina;
    },
    step: function(){

        remove_dead_stuff(this.grabbed_things);

        if(this.vx){
            //rotates w motion
            this.orientation = get_orientation(this.vx, this.vy);
        }

        if(this.stamina > 0){
            /* Always a tiny bit of gravity, otherwise when you're
            trying to rest on the ground you can accidentally rise off it */
            this.gravity = .05;
        }else{
            /* Not enough stamina to fly! */
            this.gravity = .85;
        }

        Entity.prototype.step.call(this);

        if(this.on_ground){
            this.frame = 'crawl';

            /* While "resting" on the ground, you regain stamina very slowly.
            (Pick up daisies to gain it faster.) */
            this.add_stamina(.25);
        }else{
            this.frame = 'fly';

            /* While flying, you lose stamina */
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
                if(
                    other.type === 'droplet' ||
                    other.type === 'flower'
                    //(other.type === 'seed' && other.frame === 'hatched')
                ){
                    if(this.grabbed_things.indexOf(other) >= 0)continue;

                    /* Grab the thing! */
                    this.grabbed_things.push(other);
                    collideSound.play();
                    other.pick_up();
                }else if(other.type === 'daisy' && other.frame === 'daisy2'){
                    /* Picking daisies gives you stamina... just like real life. */
                    this.add_stamina(10);

                    /* When a daisy is collected by player, it disappears, but a
                    new one should pop up somewhere else. */
                    other.die();
                    new Daisy();
                }
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
    options.gravity = 0;
    options.color = 'rgba(0, 0, 255, .8)';
    options.fillcolor = 'rgba(128, 128, 255, .4)';
    options.trail_color = 'lightblue';
    options.max_n_trails = 5;
    options.sprite = droplet_sprite;
    options.frame = 'droplet';
    options.sprite_radius_multiplier = 1.3;
    Entity.call(this, options);

    this.attached_to_home = true;
    this.home_spring_min_distance = 40;
    this.home_springiness = .0003;

    /* Radius starts at start_radius, grows by add_radius_normal pixels
    per frame, once it hits pop_after_radius it grows by add_radius_popping
    pixels per frame, once it hits die_after_radius the droplet "dies" (is
    removed from game) */
    this.start_radius = 13;
    this.radius = this.start_radius;
    this.add_radius_normal = .04;
    this.add_radius_popping = 3;
    this.pop_after_radius = 25;
    this.die_after_radius = 50;
}
update(Droplet.prototype, Entity.prototype);
update(Droplet.prototype, {
    type: 'droplet',
    is_popping: function(){
        return this.radius >= this.pop_after_radius;
    },
    step: function(){
        Entity.prototype.step.call(this);

        /* Droplets start off attached to the Home flower */
        if(this.attached_to_home){
            this.spring(home, this.home_springiness,
                this.home_spring_min_distance);
        }

        if(this.is_popping()){
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
    pick_up: function(){
        Entity.prototype.pick_up.call(this);

        /* Picking a droplet detaches it from the home flower */
        this.attached_to_home = false;
        this.gravity = .3;
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
    options.sprite_radius_multiplier = 1.25;
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
                if(other.is_popping())continue;

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
                this.gravity = .2;
                this.radius *= .8;

                /* Fling a new flower upwards from ground */
                new Flower({
                    x: this.x,
                    y: this.y,
                    vy: this.vy - 15,
                    base: this,
                });
            }
        }
    },
});


function Flower(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.damp = .99;
    options.gravity = -.5;
    options.color = 'purple';
    options.fillcolor = 'lightsalmon';
    options.max_n_trails = 0;
    options.sprite = flower_sprite;
    options.frame = 'lily';
    Entity.call(this, options);

    /* The flower has a "base" from which it floats upwards...
    It's connected to the base with springy physics.
    When bee picks up a flower, it gets detached from its "base".
    The base is presumably the seed the flower sprouted from... */
    this.attached_to_base = true;
    this.base_springiness = .0002;
    this.base_spring_min_distance = 30;

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

        if(this.attached_to_base){
            /* Flowers float upwards (gravity < 0) but are tethered to
            a "base" entity with springy physics */
            this.spring(this.base, this.base_springiness,
                this.base_spring_min_distance);
        }
    },
    pick_up: function(){
        Entity.prototype.pick_up.call(this);

        /* Picking a flower detaches it from its base */
        this.attached_to_base = false;
        this.gravity = .2;
    },
    die: function(){
        Entity.prototype.die.call(this);
        n_flowers_collected++;
    },
});


function Daisy(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.radius = 25;
    options.color = 'purple';
    options.fillcolor = 'lightsalmon';
    options.max_n_trails = 0;
    options.sprite = daisy_sprite;
    options.sprite_radius_multiplier = 1.5;
    options.frame = 'daisy1';
    options.x = Math.random() * canvas.width;
    options.y = ground_y;
    Entity.call(this, options);
}
update(Daisy.prototype, Entity.prototype);
update(Daisy.prototype, {
    type: 'daisy',
    get_n_frames: function(){
        /* Returns number of frames in current animation frame */
        var spriteframe = this.sprite[this.frame];
        return spriteframe.n_frames_x * spriteframe.n_frames_y;
    },
    step: function(){
        Entity.prototype.step.call(this);

        /* Daisy's sprite is unique, in that it comes in 2 separate image files...
        So we have to do switch from one to the other in order to have the animation
        work properly with our system. */
        var n_frames = this.get_n_frames();
        if(this.frame === 'daisy1'){
            /* Once 'daisy1' animation is done, switch to 'daisy2' */
            if(this.frame_i >= n_frames){
                this.frame_i = 0;
                this.frame = 'daisy2';
            }
        }
    },
});


function Spider(options){
    /* Javascript class inheritance?? */
    options = options || {};
    options.accel = 3;
    options.radius = 25;
    options.max_radius = 60;
    options.damp = .99;
    options.gravity = .1;
    options.color = 'red';
    options.fillcolor = 'black';
    options.max_n_trails = 0;
    options.x = Math.random() * canvas.width;
    options.y = ground_y;
    options.sprite = spider_sprite;
    options.sprite_radius_multiplier = 1.3;
    options.frame = 'stay';
    options.vx = Math.random() * 20 - 10;
    //options.vy = Math.random() * 10 - 5;

    Entity.call(this, options);
}
update(Spider.prototype, Entity.prototype);
update(Spider.prototype, {
    type: 'spider',
    step: function(){
        Entity.prototype.step.call(this);

        var collided_entities = this.get_collided_entities();
        for(var i = 0; i < collided_entities.length; i++) {
            var other = collided_entities[i];
            if (other.type !== 'bee')continue;

            //if spider eats bee then he gets bigger
            this.radius += 10;

            other.die();
            //may want to reload or generate button to restart
        }

        //this is rate at which a spider action occurs
        var randMover = Math.round(Math.random()*240);
        if(randMover == 1){
            this.vy-=this.accel;
        }
        if(randMover == 2){
            this.vx+=this.accel;
        }
        if(randMover == 3){
            this.vx-=this.accel;
        }
        if(randMover == 4){
            this.radius += 0.5;
            this.accel += 0.1;
        }
        if(randMover >= 5 && randMover <= 6 && this.frame === 'stay'){
            /* Replay the animation, spider rears back on its legs */
            this.frame_i = 0;
        }

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
    options.y = canvas.height / 2;
    options.collide_with_map = false;
    Entity.call(this, options);
}
update(HomeBG.prototype, Entity.prototype);
update(HomeBG.prototype, {
    type: 'home_bg',
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

        /* Periodically create new Droplets */
        if(this.age % 25 === 0){
            new Droplet({
                x: this.x,
                y: this.y,
                vx: Math.random() * 20 - 10,
                vy: Math.random() * 20 - 20,
            });
        }

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




var level = 0;
var n_levels = backgrounds.length;

/* Variables which reset each time you go to the next level */
var n_seeds;
var n_daisies;
var n_flowers_collected;
var n_spiders;
var win_timer;
var n_entities_created, entities;
var home_bg, home, bee;
game_start();
function game_start(){
    background_i = level;
    n_seeds = 4 + 2 * level;
    n_daisies = 5;
    n_flowers_collected = 0;
    n_spiders = level + 1;
    win_timer = 0;

    n_entities_created = 0;
    entities = [];

    /* Create some entities at start of game... */
    home_bg = new HomeBG();
    home = new Home();
    home.reset_position();
    bee = new Bee();
    for(var i = 0; i < n_seeds; i++){
        new Seed();
    }
    for(var i = 0; i < n_daisies; i++){
        new Daisy();
    }
    for(var i = 0; i < n_spiders; i++){
        new Spider();
    }
}
function game_won(){
    return n_seeds === n_flowers_collected;
}



backgroundMusic.play();
//this loops the music
document.getElementById("bMsc").addEventListener('ended', function(){
    this.currentTime = 0;
    this.play();
}, false);

init();
function init(){
    /* Set up event listeners & start main loop */

    $(document).on('keydown', keydown);
    $(document).on('keyup', keyup);
    //$(canvas).on('click', click);
    $(canvas).on('mousedown',mousedown);
    $(canvas).on('mouseup',mouseup);
    $(canvas).on('mousemove',mousemove);

    /* Start the main game loop */
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
    bee.do_key_stuff();

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

    /* Figure out current background image & draw it */
    var background = backgrounds[background_i];
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    /* Sort entities by render priority */
    entities.sort(function(e1, e2){
        var priority1 = render_priority.indexOf(e1.type);
        var priority2 = render_priority.indexOf(e2.type);
        if(priority1 === priority2){
            return e1.created_i < e2.created_i? -1: 1;
        }else{
            return priority1 < priority2? -1: 1;
        }
    });

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
    var ratio = bee.stamina / bee.max_stamina;
    ctx.strokeStyle = 'black';
    ctx.strokeRect(bar.x, bar.y, bar.w, bar.h); /* unfilled rectangle */
    ctx.fillStyle = 'red';
    ctx.fillRect(bar.x, bar.y, bar.w * ratio, bar.h); /* filled rectangle */

    /* Render a message */
    if(game_won()){
        if(level < n_levels - 1){
            draw_message("Congratulations", [
                "Because your home flower is huge now.",
                "Press N to go to the next level!",
            ]);
        }else{
            draw_message("Congratulations", [
                "Because your home flower is huge now.",
                "That was the whole game! Thanks for playing...",
            ]);
        }
    }else if(bee.dead){
        draw_message("Eaten by a spider",
            ["Press R to restart this level!"]);
    }
}

function keydown(event){
    //console.log("KEY DOWN", event.keyCode);
    kdown[event.keyCode] = true;
}

function keyup(event){
    if(event.keyCode === KM) mute();
    if(event.keyCode === KR) game_start();
    if(event.keyCode === KN){
        /* NOTE: shift+N is a cheat code to go to next level! */
        var won = event.shiftKey || game_won();
        if(won && level < n_levels - 1){
            /* Go to next level */
            level++;
            game_start();
        }
    }
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
