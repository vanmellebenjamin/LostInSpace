/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
var PATH_TO_ROOT = "http://localhost/HTML5Application/public_html/";

var world_width = 900;
var world_height = 640;
var world_ticker = createjs.Ticker;
var world;
var arrival;
var starfield_shape;

var original_player_x;
var original_player_y;

var ticker_counter = 0;
var anim_frame = 0;
var score_counter = 0;
var best_score = 0;
var marks = [];

var keys = {};

var objects = [];

var onClickDuringGame;

var has_game_started = false;
var has_collided_on_wall = false;
var has_fallen_in_black_hole = false;
var has_win = false;
var has_arrived = false;
var is_game_ready = false;
var awaiting_next_level = false;
var failed_attempts = [];
var current_attempt_path = [];
var replay_ghosts = [];
var replay_frame = 0;
var ui_layer;
var hud_text;
var message_text;
var next_level_button;
var is_aiming_pressed = false;
var DEFAULT_AIM_LENGTH = 120;
var level_array;
var level_design_mod = false;
var level_design_mod_black_holes = 3;
var current_level = 0;

// Paints a soft radial-gradient "orb" instead of a flat fill circle.
function drawGradientOrb(graphics, radius, innerColor, outerColor) {
    return graphics
        .beginRadialGradientFill([innerColor, outerColor], [0, 1], 0, 0, 0, 0, 0, radius)
        .drawCircle(0, 0, radius);
}

// Draws a small space-vehicle silhouette (hull + fins + cockpit window +
// engine flame) pointing along local +x, so rotating the shape later makes
// it face any direction. Finishes with an invisible drawCircle(0,0,radius)
// as the LAST command so .command.radius (read by the physics/collision
// code) still reports the real hit-radius — rotating a circle never changes
// its shape, so this stays safe.
function drawShipShape(graphics, radius) {
    // Hull: nose cone + body
    graphics
        .beginRadialGradientFill(["#eaffff", "#0b57d0"], [0, 1], radius * 0.6, 0, 0, radius * 0.2, 0, radius * 2.4)
        .moveTo(radius * 2.2, 0)
        .lineTo(radius * 0.9, radius * 0.55)
        .lineTo(-radius * 0.9, radius * 0.55)
        .lineTo(-radius * 0.9, -radius * 0.55)
        .lineTo(radius * 0.9, -radius * 0.55)
        .closePath();

    // Fins swept back from the body
    graphics
        .beginFill("#0b3d91")
        .moveTo(-radius * 0.5, radius * 0.55)
        .lineTo(-radius * 1.6, radius * 1.3)
        .lineTo(-radius * 0.9, radius * 0.55)
        .closePath()
        .moveTo(-radius * 0.5, -radius * 0.55)
        .lineTo(-radius * 1.6, -radius * 1.3)
        .lineTo(-radius * 0.9, -radius * 0.55)
        .closePath();

    // Cockpit window
    graphics
        .beginFill("rgba(255,255,255,0.95)")
        .drawCircle(radius * 1.1, 0, radius * 0.3);

    // Engine flame glow at the tail
    graphics
        .beginRadialGradientFill(["rgba(255,225,140,0.95)", "rgba(255,140,40,0)"], [0, 1], -radius * 0.95, 0, 0, -radius * 0.95, 0, radius * 0.85)
        .drawCircle(-radius * 0.95, 0, radius * 0.85);

    return graphics
        .beginFill("rgba(0,0,0,0)")
        .drawCircle(0, 0, radius);
}

function createStarfield(width, height) {
    var stars = new createjs.Shape();
    var nebulaColors = ["#2b1055", "#0a2a4a", "#1b0e34"];
    for (var n = 0; n < 4; n++) {
        var nx = Math.random() * width;
        var ny = Math.random() * height;
        var nr = 150 + Math.random() * 150;
        stars.graphics
            .beginRadialGradientFill([nebulaColors[n % nebulaColors.length], "rgba(0,0,0,0)"], [0, 1], nx, ny, 0, nx, ny, nr)
            .drawCircle(nx, ny, nr);
    }
    for (var i = 0; i < 260; i++) {
        var x = Math.random() * width;
        var y = Math.random() * height;
        var r = Math.random() * 1.4 + 0.3;
        var a = (Math.random() * 0.7 + 0.3).toFixed(2);
        stars.graphics.beginFill("rgba(255,255,255," + a + ")").drawCircle(x, y, r);
    }
    stars.cache(0, 0, width, height);
    return stars;
}

// Procedurally paints an Earth-like texture: ocean base, randomly scattered
// green/brown continent blobs, a few cloud wisps, and a simple sphere-shading
// pass (light from the upper-left) so it reads as a lit globe.
function createEarthTexture(radius) {
    var size = radius * 2;
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext("2d");

    ctx.save();
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.clip();

    var ocean = ctx.createRadialGradient(radius * 0.65, radius * 0.65, radius * 0.1, radius, radius, radius * 1.05);
    ocean.addColorStop(0, "#5aa9ea");
    ocean.addColorStop(0.5, "#1e6bb8");
    ocean.addColorStop(1, "#0a2f5c");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, size, size);

    var landColors = ["#3f8f3f", "#2f6b32", "#7a6236", "#5c8a3c"];
    var blobs = 5 + Math.floor(Math.random() * 3);
    ctx.globalAlpha = 0.85;
    for (var b = 0; b < blobs; b++) {
        var cx = Math.random() * size;
        var cy = Math.random() * size;
        var blobRadius = radius * (0.25 + Math.random() * 0.35);
        var points = 8;
        ctx.beginPath();
        for (var p = 0; p <= points; p++) {
            var ang = (p / points) * Math.PI * 2;
            var r = blobRadius * (0.6 + Math.random() * 0.5);
            var px = cx + Math.cos(ang) * r;
            var py = cy + Math.sin(ang) * r;
            if (p === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
        }
        ctx.closePath();
        ctx.fillStyle = landColors[Math.floor(Math.random() * landColors.length)];
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    var clouds = 6;
    for (var c = 0; c < clouds; c++) {
        var ccx = Math.random() * size;
        var ccy = Math.random() * size;
        var cw = radius * (0.3 + Math.random() * 0.3);
        var ch = cw * 0.4;
        ctx.beginPath();
        ctx.ellipse(ccx, ccy, cw, ch, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    var shade = ctx.createRadialGradient(radius * 0.6, radius * 0.6, radius * 0.1, radius * 0.6, radius * 0.6, radius * 1.4);
    shade.addColorStop(0, "rgba(255,255,255,0.25)");
    shade.addColorStop(0.5, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(0,0,10,0.55)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size, size);

    ctx.restore();
    return canvas;
}

// Earth bitmap + a soft blue atmosphere halo just outside the true edge.
function createEarthVisuals(x, y, radius) {
    var earth = new createjs.Bitmap(createEarthTexture(radius));
    earth.regX = radius;
    earth.regY = radius;
    earth.x = x;
    earth.y = y;

    // True edge sits at radius / outerR along this gradient's ratio axis —
    // the ramp starts slightly before it (still over the sphere) so the
    // glow visibly touches the surface instead of floating past a gap.
    var outerR = radius * 1.3;
    var edgeRatio = radius / outerR;
    var glow = new createjs.Shape();
    glow.graphics
        .beginRadialGradientFill(
            ["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(150,210,255,0.9)", "rgba(150,210,255,0.55)", "rgba(150,210,255,0)"],
            [0, edgeRatio * 0.8, edgeRatio, edgeRatio * 1.15, 1],
            0, 0, 0,
            0, 0, outerR
        )
        .drawCircle(0, 0, outerR);
    glow.x = x;
    glow.y = y;
    glow.shadow = new createjs.Shadow("rgba(150,210,255,0.6)", 0, 0, 16);

    return {earth: earth, glow: glow};
}

// Builds the lensing look for a black hole: samples the real starfield
// pixels behind it and warps/pulls them toward the center (gravitational
// lensing), darkening towards a true singularity and fading out at the
// edge so it blends into the background. A static ring marks the exact
// danger radius. The black hole's actual hit-circle is untouched by any
// of this — no lines are drawn, only the sampled background is distorted.
function createBlackHoleVisuals(x, y, radius) {
    var span = Math.ceil(radius * 2.6);
    var half = span / 2;

    var srcCanvas = starfield_shape.cacheCanvas;
    var srcX = Math.max(0, Math.min(world_width - span, x - half));
    var srcY = Math.max(0, Math.min(world_height - span, y - half));
    var srcData = srcCanvas.getContext("2d").getImageData(srcX, srcY, span, span).data;

    var canvas = document.createElement("canvas");
    canvas.width = span;
    canvas.height = span;
    var ctx = canvas.getContext("2d");
    var dst = ctx.createImageData(span, span);
    var dstData = dst.data;

    var maxDist = half;
    var swirlAmount = 3.2;

    for (var py = 0; py < span; py++) {
        for (var px = 0; px < span; px++) {
            var dx = px - half;
            var dy = py - half;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var di = (py * span + px) * 4;

            if (dist >= maxDist) {
                continue;
            }

            var falloff = 1 - dist / maxDist;
            var angle = Math.atan2(dy, dx) + swirlAmount * falloff * falloff;
            var pulledDist = dist * (1 - 0.55 * falloff);

            var sx = Math.max(0, Math.min(span - 1, Math.round(half + Math.cos(angle) * pulledDist)));
            var sy = Math.max(0, Math.min(span - 1, Math.round(half + Math.sin(angle) * pulledDist)));
            var si = (sy * span + sx) * 4;

            // Blackness ramps up fast so the core reads as a true black
            // singularity, not just a dark tint.
            var darken = Math.min(1, falloff * 1.8);
            dstData[di]     = srcData[si]     * (1 - darken);
            dstData[di + 1] = srcData[si + 1] * (1 - darken);
            dstData[di + 2] = srcData[si + 2] * (1 - darken);
            // Stay fully opaque through the core and mid-region; only fade
            // to transparent in a narrow band right at the true edge, so
            // the black core never gets washed out by the background.
            var edgeFade = 0.25;
            dstData[di + 3] = 255 * (falloff < edgeFade ? falloff / edgeFade : 1);
        }
    }
    ctx.putImageData(dst, 0, 0);

    var lens = new createjs.Bitmap(canvas);
    lens.regX = half;
    lens.regY = half;
    lens.x = x;
    lens.y = y;

    // Soft glowing rim right at the true boundary, fading to transparent
    // both inward and outward — a gradient glow instead of a hard line.
    var ring = new createjs.Shape();
    ring.graphics
        .beginRadialGradientFill(
            ["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(200,150,255,0.55)", "rgba(0,0,0,0)"],
            [0, 0.75, 0.92, 1],
            0, 0, 0,
            0, 0, radius * 1.1
        )
        .drawCircle(0, 0, radius * 1.1);
    ring.x = x;
    ring.y = y;
    ring.shadow = new createjs.Shadow("rgba(190,140,255,0.5)", 0, 0, 14);

    return {lens: lens, ring: ring};
}

// Very slowly drifts the warped patch so the lensing feels alive, without
// ever touching the hit-circle's size or position.
function animate_black_holes() {
    for (var i = 2; i < objects.length; i++) {
        if (objects[i].lens) {
            objects[i].lens.rotation += 0.15;
        }
    }
}

// Ages the player's exhaust trail: each dot cools from a bright fire color
// into dark smoke, growing slightly and fading out, instead of hard-cutting
// or staying a single flat color.
function fade_marks() {
    for (var i = marks.length - 1; i >= 0; i--) {
        var mark = marks[i];
        mark.age++;
        var t = Math.min(1, mark.age / mark.maxAge);

        var r = Math.round(255 + (40 - 255) * t);
        var g = Math.round(90 + (40 - 90) * t);
        var b = Math.round(20 + (40 - 20) * t);
        var radius = 2.2 + t * 3.5;

        mark.graphics.clear().beginFill("rgb(" + r + "," + g + "," + b + ")").drawCircle(0, 0, radius);
        mark.alpha = Math.max(0, 1 - t);
        if (mark.shadow) {
            mark.shadow.blur = Math.max(0, 6 * (1 - t / 0.3));
        }

        if (t >= 1) {
            world.removeChild(mark);
            marks.splice(i, 1);
        }
    }
}

// Builds the in-canvas HUD (top-right best/stage), the status message
// (top-center), and the Next Level button (bottom-center) — replacing the
// old HTML/jQuery/Bootstrap page chrome entirely. All three live in
// ui_layer, which is re-added to world every tick so it always renders on
// top of the starfield/level/replay content added afterwards.
function create_ui() {
    ui_layer = new createjs.Container();

    message_text = new createjs.Text(
        "Go back to earth !",
        "16px monospace", "#eaffff");
    message_text.textAlign = "center";
    message_text.x = world_width / 2;
    message_text.y = 15;

    hud_text = new createjs.Text("", "16px monospace", "#eaffff");
    hud_text.textAlign = "right";
    hud_text.x = world_width - 15;
    hud_text.y = 15;

    next_level_button = new createjs.Container();
    var btn_bg = new createjs.Shape();
    btn_bg.graphics.beginFill("rgba(20,90,200,0.85)").drawRoundRect(-70, -20, 140, 40, 8);
    var btn_label = new createjs.Text("Next Mission", "16px monospace", "#ffffff");
    btn_label.textAlign = "center";
    btn_label.textBaseline = "middle";
    next_level_button.addChild(btn_bg, btn_label);
    next_level_button.x = world_width / 2;
    next_level_button.y = world_height - 40;
    next_level_button.cursor = "pointer";
    next_level_button.visible = false;
    next_level_button.addEventListener("click", function() {
        next_level_button.visible = false;
        stop_replays();
        awaiting_next_level = false;
        load_level(current_level);
    });

    ui_layer.addChild(message_text, hud_text, next_level_button);
    world.addChild(ui_layer);
}

function update_hud() {
    hud_text.text = "Best: " + best_score + "   Stage " + (current_level + 1) + "/" + levels.length;
}

// Builds one "ghost": a faint static trace of the whole path, plus a
// bright dot that loops along it.
function build_ghost(path, traceColor, dotColor, glowColor) {
    var trace = new createjs.Shape();
    trace.graphics.setStrokeStyle(1.5).beginStroke(traceColor).moveTo(path[0].x, path[0].y);
    for (var i = 1; i < path.length; i++) {
        trace.graphics.lineTo(path[i].x, path[i].y);
    }
    world.addChild(trace);

    var dot = new createjs.Shape();
    dot.graphics.beginFill(dotColor).drawCircle(0, 0, 3);
    dot.shadow = new createjs.Shadow(glowColor, 0, 0, 6);
    world.addChild(dot);

    return {trace: trace, dot: dot, path: path};
}

// One ghost per failed attempt (fire-colored) plus one for the winning
// attempt (green-colored), all looping at once while waiting for the
// next level.
function start_replays(successPath) {
    replay_frame = 0;
    replay_ghosts = failed_attempts.map(function(path) {
        return build_ghost(path, "rgba(255,120,40,0.25)", "rgba(255,160,60,0.9)", "rgba(255,120,40,0.6)");
    });
    if (successPath && successPath.length > 1) {
        replay_ghosts.push(build_ghost(successPath, "rgba(90,255,140,0.35)", "rgba(150,255,190,0.95)", "rgba(90,255,140,0.7)"));
    }
}

function stop_replays() {
    replay_ghosts.forEach(function(g) {
        world.removeChild(g.trace);
        world.removeChild(g.dot);
    });
    replay_ghosts = [];
}

function animate_failed_attempt_replays() {
    replay_frame++;
    replay_ghosts.forEach(function(g) {
        var p = g.path[replay_frame % g.path.length];
        g.dot.x = p.x;
        g.dot.y = p.y;
    });
}

// The mid-flight abort listener only self-removes when the player actually
// clicks it. If the flight instead ends by winning or crashing, it stays
// armed and would fire on some later, unrelated click (e.g. the Next Level
// button), spuriously calling resetGame() and re-adding a stale vector.
function clear_abort_listener() {
    if (onClickDuringGame) {
        world.removeEventListener("stagemousedown", onClickDuringGame);
        onClickDuringGame = null;
    }
}

function resetGame() {
    clear_abort_listener();

    has_game_started = false;
    has_collided_on_wall = false;
    has_fallen_in_black_hole = false;
    has_win = false;
    has_arrived = false;

    current_attempt_path = [];
    score_counter = 0;

    player.object.x = original_player_x;
    player.object.y = original_player_y;

    player.is_free_to_move = false;

    player.speed = {x: 0, y: 0};
    player.acc =   {x: 0, y: 0};
    player.force = {x: 0, y: 0};

    player.real_coord = {  x: player.object.x, y: player.object.y};
    bounds = player.object.getBounds();
    player.center = {  x: bounds.width, y: bounds.height};

    is_aiming_pressed = false;
    world.addChild(vector);
    // press to start aiming, release to launch
    world.addEventListener("stagemousedown", onAimStart);
    world.addEventListener("stagemouseup", onAimEnd);
}

// Refresh fun
function handleTick(event) {
    anim_frame++;
    animate_black_holes();
    if (!is_game_ready) {
        prepare_game();
    } else if (awaiting_next_level) {
        animate_failed_attempt_replays();
    } else if (has_win) {
        clear_abort_listener();
        if (best_score < score_counter) {
            best_score = score_counter;
        }
        current_level++;
        update_hud();
        if (current_level < levels.length) {
            message_text.text = "Well done, you are back on earth! Try this one.";
            start_replays(current_attempt_path);
            awaiting_next_level = true;
            next_level_button.visible = true;
        } else {
            message_text.text = "Well done, you are back on earth! You finished the game!";
        }
    } else if (has_collided_on_wall) {
        message_text.text = "You are out of the galaxy";
        if (current_attempt_path.length > 1) {
            failed_attempts.push(current_attempt_path);
        }
        resetGame();
    } else if (has_fallen_in_black_hole) {
        message_text.text = "You fell in a black hole";
        if (current_attempt_path.length > 1) {
            failed_attempts.push(current_attempt_path);
        }
        resetGame();
    } else if (has_game_started) {
        if (onClickDuringGame === undefined || onClickDuringGame === null) {
            onClickDuringGame = function() {
                if (current_attempt_path.length > 1) {
                    failed_attempts.push(current_attempt_path);
                }
                resetGame();
                // This same press both aborts the flight and starts the next
                // aim, so the vector should immediately track the finger/
                // cursor that's already down, instead of waiting for a
                // fresh press.
                is_aiming_pressed = true;
                world.removeEventListener("stagemousedown", onClickDuringGame);
                onClickDuringGame = null;
            }
            // click event to start the game
            world.addEventListener("stagemousedown", onClickDuringGame);
        }
        compute_next_world_state();
        if (player.speed.x !== 0 || player.speed.y !== 0) {
            player.object.rotation = Math.atan2(player.speed.y, player.speed.x) * 180 / Math.PI;
        }
        current_attempt_path.push({x: player.object.x, y: player.object.y});
        ticker_counter++;
        score_counter++;
        if (ticker_counter % 3 == 0) {
            var mark = new createjs.Shape();
            mark.x = player.object.x;
            mark.y = player.object.y;
            mark.age = 0;
            mark.maxAge = 90;
            mark.graphics.beginFill("rgb(255,90,20)").drawCircle(0, 0, 2.2);
            mark.shadow = new createjs.Shadow("rgba(255,120,40,0.6)", 0, 0, 6);
            world.addChild(mark);
            marks.push(mark);
            if (marks.length > 250) {
                world.removeChild(marks[0]);
                marks.shift();
            }
        }
        fade_marks();
        check_if_win();
    } else {
        var aimTarget = is_aiming_pressed
            ? {x: world.mouseX, y: world.mouseY}
            : default_aim_target();
        compute_next_vector_shape(aimTarget.x, aimTarget.y);
        player.object.rotation = Math.atan2(vector.component_y, vector.component_x) * 180 / Math.PI;
    }
    // Keeps the HUD/message/button on top of anything else added this
    // tick (marks, replay ghosts, level objects) — addChild on an existing
    // child just moves it to the end of the render order.
    world.addChild(ui_layer);
    world.update();
}

// While not actively pressed, the aim vector defaults to pointing at the
// goal, capped to a fixed length — so it never becomes an absurdly long
// arrow, and an instant tap-and-release can't launch at a distance-scaled
// speed.
function default_aim_target() {
    var dx = arrival.x - vector.x;
    var dy = arrival.y - vector.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var scale = Math.min(DEFAULT_AIM_LENGTH, dist) / dist;
    return {x: vector.x + dx * scale, y: vector.y + dy * scale};
}

function check_if_win() {
    x = Math.abs(arrival.x - player.object.x)
    y = Math.abs(arrival.y - player.object.y)
    hyp = Math.sqrt(x * x + y * y);
    if (hyp <= arrival.graphics.command.radius) {
        has_win = true;
    }
}

function start_game() {
    // Create a new vector on stage press
    vector = new createjs.Shape().set({x:player.object.x, y:player.object.y});
    is_game_ready = true;
    is_aiming_pressed = false;
    world.addChild(vector);

    compute_next_world_state = physic_engine(objects, keys, true, false);

    compute_next_vector_shape = vector_shape (vector)

    // Press (mouse or touch) starts/updates aiming; releasing launches with
    // whatever vector was last drawn. Works for touch too since
    // createjs.Touch.enable(world) maps touch events onto these same
    // stage events.
    onAimStart = function() {
        is_aiming_pressed = true;
    }

    onAimEnd = function() {
        if (!is_aiming_pressed) {
            return;
        }
        is_aiming_pressed = false;
        player.speed.x = vector.component_x * 20
        player.speed.y = vector.component_y * 20
        player.is_free_to_move = true
        has_game_started = true;
        world.removeChild(vector);
        world.removeEventListener("stagemousedown", onAimStart);
        world.removeEventListener("stagemouseup", onAimEnd);
    }

    world.addEventListener("stagemousedown", onAimStart);
    world.addEventListener("stagemouseup", onAimEnd);

}

function load_level(levelNumber) {
    failed_attempts = [];
    current_attempt_path = [];

    for (i = 0; i < marks.length; i++) {
        world.removeChild(marks[i]);
    }
    for (i = 0; i < objects.length; i++) {
        world.removeChild(objects[i].object);
        if (objects[i].lens) world.removeChild(objects[i].lens);
        if (objects[i].ring) world.removeChild(objects[i].ring);
        if (objects[i].earth) world.removeChild(objects[i].earth);
        if (objects[i].glow) world.removeChild(objects[i].glow);
    }
    objects = [];

    level = levels[levelNumber];
    console.log(level)
    for (i = 0; i < level.length; i++) {
        var circle = new createjs.Shape();
        var blackHoleVisuals = null;
        var earthVisuals = null;
        if (i == 0) {
            drawShipShape(circle.graphics, level[i].radius);
            circle.shadow = new createjs.Shadow("rgba(120,190,255,0.7)", 0, 0, 10);
        } else if (i == 1) {
            // Invisible fill: keeps command.radius (used for hit-detection)
            // while the actual look comes from the earth bitmap below.
            circle.graphics.beginFill("rgba(0,0,0,0)").drawCircle(0, 0, level[i].radius);
            earthVisuals = createEarthVisuals(level[i].x, level[i].y, level[i].radius);
        } else {
            // Invisible fill: keeps command.radius (used for hit-detection)
            // while the actual look comes from the lensing bitmap below.
            circle.graphics.beginFill("rgba(0,0,0,0)").drawCircle(0, 0, level[i].radius);
            blackHoleVisuals = createBlackHoleVisuals(level[i].x, level[i].y, level[i].radius);
        }
        circle.x = level[i].x;
        circle.y = level[i].y;
        circle.setBounds(250, 250, 10, 10);
        world.addChild(circle);
        if (earthVisuals) {
            world.addChild(earthVisuals.earth);
            world.addChild(earthVisuals.glow);
        }
        if (blackHoleVisuals) {
            world.addChild(blackHoleVisuals.lens);
            world.addChild(blackHoleVisuals.ring);
        }

       objects.push({
            object: circle,
            mass: level[i].mass,
            earth: earthVisuals ? earthVisuals.earth : null,
            glow: earthVisuals ? earthVisuals.glow : null,
            lens: blackHoleVisuals ? blackHoleVisuals.lens : null,
            ring: blackHoleVisuals ? blackHoleVisuals.ring : null
       });
    }

    is_game_ready = true;
    // the player
    player = objects[0];
    // the arrival
    arrival = objects[1].object;

    original_player_x = player.object.x
    original_player_y = player.object.y

    start_game();
    resetGame();
}

// Scales the canvas's CSS display size to fit the current viewport while
// keeping its 900x640 internal resolution untouched — every level
// coordinate and physics constant stays valid. EaselJS's Stage maps
// pointer positions through the ratio between the canvas's CSS size and
// its width/height attributes, so touch/mouse/hit-testing keep working
// unchanged at any scale.
function fit_canvas_to_viewport() {
    var canvasEl = document.getElementById("myCanvas");
    var scale = Math.min(window.innerWidth / world_width, window.innerHeight / world_height);
    canvasEl.style.width = (world_width * scale) + "px";
    canvasEl.style.height = (world_height * scale) + "px";
}

function init() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(function() {});
    }

    // Init engine
    world = new createjs.Stage("myCanvas");
    var container = new createjs.Container();

    fit_canvas_to_viewport();
    window.addEventListener("resize", fit_canvas_to_viewport);
    window.addEventListener("orientationchange", fit_canvas_to_viewport);

    starfield_shape = createStarfield(world_width, world_height);
    world.addChild(starfield_shape);
    world.addChild(container);

    createjs.Touch.enable(world);
    create_ui();

    if (level_design_mod) {
        prepare_game = game_preparation();
    } else {
        load_level(current_level);
    }
    update_hud();

    // Update world will render next frame
    world_ticker.framerate = 30;
    world_ticker.addEventListener("tick", handleTick);
}

init();
