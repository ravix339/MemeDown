// My own adaptation of https://gitlab.com/davideblasutto/canvas-multiline-text
// since the code base was buggy + didn't allow for usage of multiple styles.
module.exports = {
	multistyleText : multistyleText,
	singlestyleText : singlestyleText
}

function multistyleText(ctx, textBlocks, opts) {
	if (!opts)
		opts = {}
	if (!opts.fontFamily)
		opts.fontFamily = 'sans-serif'
	if (typeof opts.stroke == 'undefined')
		opts.stroke = false
	if (typeof opts.verbose == 'undefined')
		opts.verbose = false
	if (!opts.rect)
		opts.rect = {
			x0: 0,
			y0: 0,
			width: ctx.canvas.width,
			height: ctx.canvas.height
		}
	if (!opts.lineHeight)
		opts.lineHeight = 1.1
	if (!opts.minFontSize)
		opts.minFontSize = 30
	if (!opts.maxFontSize)
		opts.maxFontSize = 100
	// Default log function is console.log - Note: if verbose is false, nothing will be logged anyway
	if (!opts.logFunction)
		opts.logFunction = function (message) { console.log(message) }
	
	var fontLines = generateTextPositions(ctx, textBlocks, opts);
	drawLines(ctx, fontLines, opts);
}

function generateTextPositions(ctx, textBlocks, opts) {

	var fontSize;
	var lines = [];
	for (fontSize = opts.minFontSize; fontSize <= opts.maxFontSize; fontSize++) {
		var lineheight = 1.1 * fontSize;
		var baseFont = " " + fontSize + "px " + opts.fontFamily
		var basex = opts.rect.x0;
		var x = basex;
		var y = opts.rect.y0 + fontSize;

		lines = [];
		var lineLength = 0;

		for (var group of textBlocks) { //For each block
			var linePlus = ""; //Current Line + Current word
			var line = ""; //Current Line
			ctx.font = group[0] + baseFont;
			var words = group[1].split(/\s/); // split by whitespace (multiple white space is represented)

			for (var i = 0; i < words.length; i++) {
				var newAdd = words[i]; //String to add
				if (i > 0) { //Not first word so we need a space to separate
					linePlus = line + " ";
					newAdd = " " + newAdd;
				}
				linePlus = linePlus + words[i];
				var linePlusLen = lineLength + ctx.measureText(newAdd).width;
				if (linePlusLen > opts.rect.width) { //Addition of new word is too long
					lines.push({ style: group[0], text: line, x: x, y: y });
					x = basex;
					y += lineheight;
					//Assign the current line to the word that didn't fit
					line = newAdd;
					lineLength = ctx.measureText(newAdd).width;
				}
				else { //Word isn't too long
					line = linePlus;
					lineLength = linePlusLen;
				}
			}
			//End of a block so push style info to the return
            lines.push({style: group[0], text: line, x : x, y : y });
            x = basex + lineLength; //shift for next block
            if (lineLength >= opts.rect.width) { //Check if overflow and reset values
                x = basex;
                y += lineheight; 
                lineLength = 0; 
            }
		}
		if (y >= opts.rect.y0 + opts.rect.height) break; //We overshot the font size
	}
	if (opts.verbose) opts.logFunction(`Font used: ${fontSize}`);
	if (opts.verbose) opts.logFunction(`Split text into ${lines.length} sections`);
	return { fontSize: fontSize, lines: lines }
};

var drawLines = function(ctx, lineInfo, opts) {
	var baseFont = " " + lineInfo.fontSize + "px " + opts.fontFamily
	for (var line of lineInfo.lines) {
		ctx.font = line.style + baseFont;
		if (opts.stroke)
			ctx.strokeText(line.text.trim(), line.x, line.y)
		else
			ctx.fillText(line.text.trim(), line.x, line.y)
	}
}

//Direct from Github URL with bug fixes
function singlestyleText(ctx, text, opts) {
	// Default options
	if (!opts)
		opts = {}
	if (!opts.fontFamily)
		opts.fontFamily = 'sans-serif'
	if (typeof opts.stroke == 'undefined')
		opts.stroke = false
	if (typeof opts.verbose == 'undefined')
		opts.verbose = false
	if (!opts.rect)
		opts.rect = {
			x0: 0,
			y0: 0,
			width: ctx.canvas.width,
			height: ctx.canvas.height
		}
	if (!opts.lineHeight)
		opts.lineHeight = 1.1
	if (!opts.minFontSize)
		opts.minFontSize = 30
	if (!opts.maxFontSize)
		opts.maxFontSize = 100
	// Default log function is console.log - Note: if verbose is false, nothing will be logged anyway
	if (!opts.logFunction)
		opts.logFunction = function (message) { console.log(message) }


	const words = require('words-array')(text)
	if (opts.verbose) opts.logFunction('Text contains ' + words.length + ' words')
	var lines = []
	// Finds max font size  which can be used to print whole text in opts.rec
	for (var fontSize = opts.minFontSize; fontSize <= opts.maxFontSize; fontSize++) {

		// Line height
		var lineHeight = fontSize * opts.lineHeight

		// Set font for testing with measureText()
		ctx.font = " " + fontSize + "px " + opts.fontFamily

		// Start
		var x = opts.rect.x0
		var y = opts.rect.y0 + fontSize // It's the bottom line of the letters
		lines = []
		var line = ""
		// Cycles on words
		for (var word of words) {
			// Add next word to line
			var linePlus = line + word + " "
			// If added word exceeds rect width...
			if (ctx.measureText(linePlus).width > (opts.rect.width)) {
				if (line.trim() != "") {
					// ..."prints" (save) the line without last word
					lines.push({ text: line, x: x, y: y })
					y += lineHeight
				}
				// New line with ctx last word
				line = word + " "
			} else {
				// ...continues appending words
				line = linePlus
			}
		}

		// "Print" (save) last line
		lines.push({ text: line, x: x, y: y })
		// If bottom of rect is reached then breaks "fontSize" cycle
		if (y > opts.rect.y0 + opts.rect.height)
			break

	}

	if (opts.verbose) opts.logFunction("Font used: " + ctx.font)

	// Print lines
	for (var line of lines)
		// Fill or stroke
		if (opts.stroke)
			ctx.strokeText(line.text.trim(), line.x, line.y)
		else
			ctx.fillText(line.text.trim(), line.x, line.y)

	// Returns font size
	return fontSize
}
