# "It's a bug!"


## What

This was my entry for Global Game Jam 2019.
We were a team of 5, making a game from scratch in 3 days.
I was the programmer, and chose Javascript as an excuse to learn the < canvas > element.

[Entry page on globalgamejam.org](https://globalgamejam.org/2019/games/its-bug)

[Play on 000webhost.com](http://bigoldjuice.000webhostapp.com/)


## Controls

You're the bee.

WSAD or arrow keys: fly

Run into things: pick them up

Spacebar: drop whatever you've got picked up

Goals:

* Pick up water droplets and touch the little brown seeds with them until they grow and pop into flowers.

* Pick up the popped flowers and return them to the giant flower in the middle.

* For God's sake don't run into any spiders.

* Red bar at bottom is stamina. Rest on the ground, or pick up little blue flowers, to replenish it.


## Run it on your computer

Run a webserver and open index.html in a browser. For example with Python3:

    python3 -m http.server 8000
    # Now open localhost:8000 in your browser


## Comments

It uses classic JS prototype inheritance to implement a classic OOP
"everything inherits from Entity" game engine.

It's... playable. We certainly managed to get a lot of moving stuff on the screen,
with bouncy spring physics etc.


## Screenshots

![Screenshot](/screenshots/1.png)
![Screenshot](/screenshots/2.png)
![Screenshot](/screenshots/3.png)

