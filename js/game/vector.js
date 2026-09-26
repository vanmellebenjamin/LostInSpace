function vector_shape (vector) {

	var rgbToHex = function (rgb) { 
		var hex = Number(rgb).toString(16);
		if (hex.length < 2) {
			hex = "0" + hex;
		}
		return hex;
	};

	var fullColorHex = function(r, g, b) {   
		var red = rgbToHex(r);
		var green = rgbToHex(g);
		var blue = rgbToHex(b);
		return red+green+blue;
	};

	return function(targetX, targetY) {
		var w = targetX - vector.x;
		var h = targetY - vector.y;
		var lineLength = Math.sqrt(w*w+h*h);
		vectorHeadSize = Math.min(Math.max(lineLength / 25, 4), 8)

		vector.component_x = w;
		vector.component_y = h;

		color = createjs.Graphics.getRGB(Math.min(lineLength, 266), 266 - Math.max(lineLength - 266, 0), 20);
		
		// Draw the vector.
	    // Math.sqrt on the amplitude and frequency make it scale as it gets larger
	    vector.graphics.clear().setStrokeStyle(vectorHeadSize, "round", "round").beginStroke(color).moveTo(0,0);
		// Logic to draw to the end. This is just a straight line
		vector.graphics.lineTo(lineLength-vectorHeadSize, 0);

		vector.graphics.beginFill(color);
		vector.graphics.drawPolyStar(lineLength, 0, vectorHeadSize, 3);

		// Rotate
		vector.rotation = Math.atan2(h, w) * 180 / Math.PI;
		vector.shadow = new createjs.Shadow(color, 0, 0, 10);
	    
	    world.update();
	}

}