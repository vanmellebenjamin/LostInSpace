function game_preparation() {
	var current_object;
	var click_defined = false;

	return function() {
		onClickDuringPreparation = function(event) {
			if (is_game_ready) {
				return;
			}
            if (typeof current_object === 'undefined' || current_object === null) {
        		current_object = new createjs.Shape();
			    var creatingArrival = (objects.length == 1);

			    if (objects.length == 0) {
			    	// the player
			    	drawShipShape(current_object.graphics, 8);
			    	current_object.shadow = new createjs.Shadow("rgba(120,190,255,0.7)", 0, 0, 10);
			    } else if (objects.length == 1) {
			    	// the arrival — invisible fill: keeps command.radius (used
			    	// for hit-detection) while the look comes from the earth
			    	// bitmap below.
			    	current_object.graphics.beginFill("rgba(0,0,0,0)").drawCircle(0, 0, 20);
			    } else {
			    	// black hole
			    	drawGradientOrb(current_object.graphics, 20, "#3a1a5c", "rgba(10,5,20,0)");
			    }

			    current_object.x =  world.mouseX;
			    current_object.y = world.mouseY;

			    current_object.setBounds(500, 250, 10, 10);

			    world.addChild(current_object);

				objects.push({object: current_object});

				if (creatingArrival) {
					var earthVisuals = createEarthVisuals(current_object.x, current_object.y, 20);
					world.addChild(earthVisuals.earth);
					world.addChild(earthVisuals.glow);
					objects[objects.length - 1].earth = earthVisuals.earth;
					objects[objects.length - 1].glow = earthVisuals.glow;
				}

				if (objects.length == 1) {
					objects[0].mass = 50000000000000000 / 4
			    	current_object = null;
			    } else if (objects.length == 2) {
			    	objects[1].mass = 50000000000000000 / 4
			    	current_object = null;
			    }
            } else {
            	var finalRadius = current_object.graphics.command.radius;
        		objects[objects.length - 1].mass = finalRadius * 1000000000000000;

        		// Invisible fill: keeps command.radius (used for hit-detection)
        		// while the actual look comes from the lensing bitmap below.
        		current_object.graphics.clear().beginFill("rgba(0,0,0,0)").drawCircle(0, 0, finalRadius);

        		var blackHoleVisuals = createBlackHoleVisuals(current_object.x, current_object.y, finalRadius);
        		world.addChild(blackHoleVisuals.lens);
        		world.addChild(blackHoleVisuals.ring);
        		objects[objects.length - 1].lens = blackHoleVisuals.lens;
        		objects[objects.length - 1].ring = blackHoleVisuals.ring;

            	current_object = null;

            	if (objects.length == 2 + level_design_mod_black_holes) {
            		is_game_ready = true;
            		// the player
		            player = objects[0];
		            // the arrival
		            arrival = objects[1].object;

		            original_player_x = player.object.x
		            original_player_y = player.object.y

		            start_game();
		            resetGame();

		            level_array = [];
		            for (i = 0; i < objects.length; i++) {
		            	var level_element = {};
		            	level_element.mass = objects[i].mass;
		            	level_element.x = objects[i].object.x;
		            	level_element.y = objects[i].object.y;
		            	level_element.radius = objects[i].object.graphics.command.radius;
		            	level_array.push(level_element);
		            }
            	}
            }
        }

        // click event to start the game
        if (!click_defined) {
        	world.addEventListener("stagemousedown", onClickDuringPreparation);
        	click_defined = true;
    	} 

    	if (typeof current_object !== 'undefined' && current_object !== null) {
    		var w = world.mouseX - current_object.x;
			var h = world.mouseY - current_object.y;
			var lineLength = Math.sqrt(w*w+h*h);
			lineLength = Math.max(lineLength, 20);
			// lineLength = Math.min(lineLength, 60);
			current_object.graphics.clear();
			drawGradientOrb(current_object.graphics, lineLength, "#3a1a5c", "rgba(10,5,20,0)");
    	}

	} 
}