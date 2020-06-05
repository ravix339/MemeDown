exports.methods = {
    drawCanvas: drawCanvas,
    loadFonts: loadFonts,
    validateAndSeparate: validateAndSeparate,
};

var fs = require('fs');
var canvasText = require('./multiline-text.js');
var Canvas = require('canvas');
var fontTypes = {}
function loadFonts(verbose = true) {
    var count = 0;
    if (verbose) {
        console.log("Starting font load");
    }
    var path = './fonts'
    var start = Date.now();
    for (var folder of fs.readdirSync(path)) {
        var fontfamily = folder;
        fontTypes[fontfamily] = [];
        for (var file of fs.readdirSync(path + '/' + folder)) {
            var filePath = path + '/' + folder + '/' + file;
            if (/\.ttf$/.test(file)) {
                if (/\-Regular.ttf/.test(file)) { Canvas.registerFont(filePath, { family: fontfamily }); fontTypes[fontfamily].push(''); }
                else if (/\-Italic.ttf/.test(file)) { Canvas.registerFont(filePath, { family: fontfamily, style: 'italic' }); fontTypes[fontfamily].push('italic') }
                else if (/\-Bold.ttf/.test(file)) { Canvas.registerFont(filePath, { family: fontfamily, weight: 'bold' }); fontTypes[fontfamily].push('bold') }
                else if (/\-BoldItalic.ttf/.test(file)) { Canvas.registerFont(filePath, { family: fontfamily, weight: 'bold', style: 'italic' }); fontTypes[fontfamily].push('bold italic') }
                else continue;
                count++;
            }
        }
    }
    if (verbose) {
        console.log(`Finished loading ${count} fonts in ${(Date.now() - start) / 1000} seconds.`);
    }
}

function validateAndSeparate(raw, requireImTag) {
    var keys = Object.keys(raw);
    if (keys.length != 1 || keys[0] != 'meme') {
        return { err: "There can only be one main tag which must be named \'meme\'" }
    }
    var errors = "";
    ret = { text: [] }
    if (typeof raw.meme == 'string') {
        return { err: "", data: ret };
    }
    for (var key of Object.keys(raw.meme)) {
        if (key != 'text' && key != 'image') {
            errors += (errors.length == 0 ? "" : "\n");
            errors += `The only acceptable sub-tags are \'text\' and \'image\' not ${key}.`;
        }
        if (key == 'image') {
            if (!requireImTag) {
                errors += (errors.length == 0 ? "" : "\n");
                errors += "Image already attached, so \'image\' tag is unnecessary.";
                continue;
            }
            if (raw.meme.image.length > 1) {
                errors += (errors.length == 0 ? "" : "\n");
                errors += "There can only be one \'image\' tag.";
                continue;
            }
            if (raw.meme.image[0]['$'] != undefined) {
                errors += (errors.length == 0 ? "" : "\n");
                errors += "No parameters allowed in \'image\' tag.";
                continue;
            }
            if (!(/(https:)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/.test(raw.meme.image))) {
                errors += (errors.length == 0 ? "" : "\n");
                errors += "Invalid image url (only HTTPS supported).";
                continue;
            }
            ret.image = raw.meme.image[0];
        }
        if (key == 'text') {
            for (var i = 0; i < raw.meme.text.length; i++) {
                textObj = validateText(raw.meme.text[i])
                if (textObj.err != "") {
                    errors += (errors.length == 0 ? "" : "\n");
                    errors += "Parse of the " + (i + 1).toString() + (i == 0 ? "st" : "th") + " text tag failed. ";
                    errors += textObj.err;
                }
                ret.text.push(textObj.data);
            }
        }
    }
    if (ret.image == undefined && requireImTag) {
        errors += (errors.length == 0 ? "" : "\n");
        errors += "No image attached so \'image\' tag is required and a valid image url is not provided.";
    }
    if (errors.length != 0) {
        return { err: errors };
    }
    return { err: "", data: ret };
}


function drawCanvas(textData, imageData, width, height) {
    var canvas = Canvas.createCanvas(width, height);
    var ctx = canvas.getContext('2d');
    var img = new Canvas.Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.onerror = err => { throw err; }
    img.src = imageData;
    for (var i = 0; i < textData.text.length; i++) {
        info = textData.text[i];
        generateLine(ctx, info);
    }
    return canvas;

}

function generateLine(ctx, lineInfo) {

    var positions = lineInfo.position[0];
    if (lineInfo.position[1][0]) {
        positions[0][0] = Math.round(ctx.canvas.width * positions[0][0] / 100);
        positions[1][0] = Math.round(ctx.canvas.width * positions[1][0] / 100);
        positions[0][1] = Math.round(ctx.canvas.height * positions[0][1] / 100);
        positions[1][1] = Math.round(ctx.canvas.height * positions[1][1] / 100);
    }
    console.log(positions);

    var boundingBox = {
        x0: positions[0][0],
        y0: positions[0][1],
        width: positions[1][0] - positions[0][0],
        height: positions[1][1] - positions[0][1]
    }

    console.log(lineInfo);
    console.log(boundingBox);

    ctx.fillStyle = '#ffffff';
    ctx.fillStyle = lineInfo.color;
    var options = {
        rect: boundingBox,
        verbose: true,
        fontFamily: lineInfo.font,
        minFontSize: 10,
        maxFontSize: lineInfo.size
    }

    if (lineInfo.basic) {
        canvasText.singlestyleText(ctx, lineInfo.quote, options);
    }
    else {
        var parsedLines = parseLineByStyle(lineInfo.quote, ['*', '_']);
        var mappedLines = mapLineStyles(parsedLines);
        console.log(mappedLines);
        canvasText.multistyleText(ctx, mappedLines, options);
    }
}

function validateText(textData) {
    var error = "";
    var obj = {};
    obj.quote = escape_text(textData['_']);
    if (obj.quote == undefined || obj.quote == null) {
        return { err: "Text tag not properly formatted. Use proper formatting \'&lt;text&gt;&lt;/text&gt;\'" };
    }
    for (var key of Object.keys(textData['$'])) {
        var val = textData['$'][key];
        var paramTypeWithArgs = getParam(key);
        if (paramTypeWithArgs == null) {
            error += (error.length == 0 ? "" : '\n');
            error += `Exception trying to process the parameter ${key}. Please check the manual to see valid parameters.`;
            continue;
        }
        var paramType = getParamType(paramTypeWithArgs);
        if (obj[paramType] != undefined) {
            error += (error.length == 0 ? "" : '\n');
            error += `Repeated parameter ${key}.`;
            continue;
        }
        obj[paramType] = null;
        response = parseParam(paramTypeWithArgs, val);
        if (response.err != "") {
            error += (error.length == 0 ? "" : '\n');
            error += `Value error in parameter ${key}: ${response.err}`;
            continue;
        }
        obj[paramType] = response.val;
    }
    if (obj.font == undefined) {
        obj.font = "oswald";
    }
    if (obj.position == undefined) {
        error += (error.length == 0 ? "" : "\n");
        error += "No valid position parameter provided.";
    }
    if (obj.size == undefined) {
        obj.size = 500;
    }
    if (obj.basic == undefined) {
        obj.basic = true;
    }

    if (error.length != 0) {
        return { err: error }
    }

    if (!obj.basic) {
        obj.quote = escape_text(obj.quote)
    }

    return { err: error, data: obj };
}
/*
 *   ########     ###    ########     ###    ##     ##    ########     ###    ########   ######  #### ##    ##  ######   
 *   ##     ##   ## ##   ##     ##   ## ##   ###   ###    ##     ##   ## ##   ##     ## ##    ##  ##  ###   ## ##    ##  
 *   ##     ##  ##   ##  ##     ##  ##   ##  #### ####    ##     ##  ##   ##  ##     ## ##        ##  ####  ## ##        
 *   ########  ##     ## ########  ##     ## ## ### ##    ########  ##     ## ########   ######   ##  ## ## ## ##   #### 
 *   ##        ######### ##   ##   ######### ##     ##    ##        ######### ##   ##         ##  ##  ##  #### ##    ##  
 *   ##        ##     ## ##    ##  ##     ## ##     ##    ##        ##     ## ##    ##  ##    ##  ##  ##   ### ##    ##  
 *   ##        ##     ## ##     ## ##     ## ##     ##    ##        ##     ## ##     ##  ######  #### ##    ##  ###### 
 */

function getParam(key) {
    var key_lower = key.toLowerCase();
    if (['s', 'size'].includes(key_lower)) {
        return ['size'];
    }
    if (['f', 'font'].includes(key_lower)) {
        return ['font'];
    }
    if (['l', 'loc', 'location', 'p', 'pos', 'position'].includes(key_lower)) {
        return ['position', true];
    }
    if (['abs_l', 'abs_loc', 'abs_location', 'abs_p', 'abs_pos', 'abs_position'].includes(key_lower)) {
        return ['position', false];
    }
    if (['c', 'color', 'colour', 'rgb'].includes(key_lower)) {
        return ['color'];
    }
    if (['basic', 'raw', 'b'].includes(key_lower)) {
        return ['basic'];
    }
    return null;
}

function getParamType(paramTypeWithArgs) {
    return paramTypeWithArgs[0];
}

function getParamArgs(paramTypeWithArgs) {
    return paramTypeWithArgs.splice(1);
}

function parseParam(typeWithArgs, param) {
    var type = getParamType(typeWithArgs);
    var args = getParamArgs(typeWithArgs);
    if (type == 'size') {
        return parseSize(param, args);
    }
    else if (type == 'font') {
        return parseFont(param, args);
    }
    else if (type == 'position') {
        return parsePos(param, args);
    }
    else if (type == 'color') {
        return parseColor(param, args);
    }
    else if (type == 'basic') {
        return parseBasic(param, args);
    }
    else {
        return { err: "Undefined parameter" };
    }
}

function parseSize(param, args) {
    var num = parseInt(param);
    if (isNaN(num)) {
        return { err: "Text size is not an integer value." };
    }
    if (num < 10 || num > 500) {
        return { err: "Text size not between 1 and 500." }
    }
    return { err: "", val: num };
}

function parseFont(param, args) {
    var adjusted = param.toLowerCase()
    var path = './fonts/' + adjusted;
    var ret = {};
    if (fs.existsSync(path)) {
        return { err: "", val: adjusted };
    }
    return { err: "Font not in accepted list." };
}

function parsePos(param, args) {
    var twoCoords = param.split('|');
    var parseFunc = (args[0] ? parseInt : parseFloat);
    if (twoCoords.length != 2) {
        return { err: "Position parameter is not properly formatted." }
    }
    errors = "";
    data = [[0, 0], [0, 0]];
    var left = twoCoords[0].split(',');
    if (left.length != 2) {
        errors += (errors.length == 0 ? "" : "\n");
        errors = "First positional argument is not properly formatted.";
    }
    else {
        var x0 = parseFunc(left[0]);
        if (isNaN(x0)) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "First x positional argument is not an integer";
        }
        else if (x0 < 0) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "First x positional argument must be non-negative";
        }
        else {
            data[0][0] = x0;
        }
        var y0 = parseFunc(left[1]);
        if (isNaN(y0)) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "First y positional argument is not an integer";
        }
        else if (y0 < 0) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "First y positional argument must be non-negative";
        }
        else {
            data[0][1] = y0;
        }
    }

    var right = twoCoords[1].split(',');
    if (right.length != 2) {
        errors += (errors.length == 0 ? "" : "\n");
        errors = "Second positional argument is not properly formatted.";
    }
    else {
        var x1 = parseFunc(right[0]);
        if (isNaN(x1)) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "Second x positional argument is not an integer";
        }
        else if (x1 < 0) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "Second x positional argument must be non-negative";
        }
        else {
            data[1][0] = x1;
        }
        var y1 = parseFunc(right[1]);
        if (isNaN(y1)) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "Second y positional argument is not an integer";
        }
        else if (y1 < 0) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "Second y positional argument must be non-negative";
        }
        else {
            data[1][1] = y1;
        }
    }
    if (args[0]) { //args[0] is if the position is proportional or absolute
        if (data[0][0] < 0 || data[0][0] > 100) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "First x positional argument must be between 0 and 100 since it is not an absolute (pixel) coordinate";
        }
        if (data[0][1] < 0 || data[0][1] > 100) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "First y positional argument must be between 0 and 100 since it is not an absolute (pixel) coordinate";
        }
        if (data[1][0] < 0 || data[1][0] > 100) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "Second x positional argument must be between 0 and 100 since it is not an absolute (pixel) coordinate";
        }
        if (data[1][1] < 0 || data[1][1] > 100) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "Second y positional argument must be between 0 and 100 since it is not an absolute (pixel) coordinate";
        }
    }
    if (errors.length == 0) {
        if (data[1][0] >= data[0][0] && data[1][1] >= data[0][1]) {
            return { err: "", val: [data, args] };
        }
        errors = "First positional argument should occur above and to the left of the second argument";
    }
    return { err: errors };
}

function parseColor(param, args) {
    return { err: "", val: param };
}

function parseBasic(param, args) {
    if (/true/i.test(param)) {
        return { err: "", val: true };
    }
    else if (/false/i.test(param)) {
        return { err: "", val: false };
    }
    return { err: "Basic parameter is not \"true\" or \"false\""};
}
/*
 *  ######                          ###                              
 *  #     #  ####  #      #####      #  #####   ##   #      #  ####  
 *  #     # #    # #      #    #     #    #    #  #  #      # #    # 
 *  ######  #    # #      #    #     #    #   #    # #      # #      
 *  #     # #    # #      #    #     #    #   ###### #      # #      
 *  #     # #    # #      #    #     #    #   #    # #      # #    # 
 *  ######   ####  ###### #####     ###   #   #    # ###### #  #### 
 */

function escape_text(str) {
    var special_characters = ['*', '_'];
    var special_characters_map = { '*': 'bold', '_': 'italic' };
    var ret = '';
    var special_stack = [];
    var spc = '';
    var escaped = false;
    for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if (c == '\\') {
            escaped = true;
        }
        else if (special_characters.includes(c) && !escaped) {
            if (special_stack.length == 0) // Regular -> Bold or Regular -> Italics
            {
                var search_c = str.indexOf(c, i + 1); // find next index of special character
                while (search_c < str.length && search_c != -1 && str[search_c - 1] == '\\') { //Get next unescaped version of character
                    search_c = str.indexOf(c, search_c + 1);
                }
                if (search_c != -1) { //If we found one (we have a bold/italic sequence)
                    special_stack.push(c);
                }
                else {
                    ret += '\\'; //Escape the character if you didn't find it.
                }
            }

            else if (special_stack[special_stack.length - 1] == c) { //We're closing the most recent sequence
                special_stack.pop();
            }

            else { //New sequence
                search_c = str.indexOf(c, i + 1); // find next index of special character
                while (search_c < str.length && search_c != -1 && str[search_c - 1] == '\\') { //Get next unescaped version of character
                    search_c = str.indexOf(c, search_c + 1);
                }
                var search_spc = str.indexOf(special_stack[special_stack.length - 1], i);
                if (search_c == -1 || search_c > search_spc) {
                    ret += '\\';
                }
                else {
                    special_stack.push(c);
                }
            }
        }
        else if (escaped) {
            escaped = false;
        }
        ret += c;
    }
    return ret;
}

//This splits lines into what style they would have (regular, bold, italics, bolditalics)
function parseLineByStyle(quote, spcs_left) {
    var special_characters_map = { '*': 'bold', '_': 'italic' }
    if (spcs_left.length == 0) {
        return [['', quote]];
    }
    var ret = []
    var in_spc = false;
    var last_end = 0;
    var index = 0;
    while (index < quote.length) {
        var c = quote[index];
        if (spcs_left.includes(c)) {
            if (index == 0 || (index > 0 && quote[index - 1] != '\\')) {
                if (last_end != index) {
                    ret.push(['', quote.substring(last_end, index)]);
                }
                var end = quote.indexOf(c, index + 1);
                while (quote[end - 1] == '\\') {
                    end = quote.indexOf(c, end + 1);
                }
                var otherSpc = []
                spcs_left.forEach(v => {
                    if (v != c) {
                        otherSpc.push(v);
                    }
                });
                result = parseLineByStyle(quote.substring(index + 1, end), otherSpc);
                result.forEach(pair => {
                    if (pair[0].length != 0) {
                        ret.push([special_characters_map[c] + '-' + pair[0], pair[1]]);
                    }
                    else {
                        ret.push([special_characters_map[c] + pair[0], pair[1]])
                    }
                });
                last_end = end + 1;
                index = end;
            }
        }
        index += 1;
    }

    if (last_end != quote.length) {
        ret.push(['', quote.substring(last_end)]);
    }
    for(var i = 0; i < ret.length; i++) {
        var unescaped = ret[i][1];
        for (var special_chr of Object.keys(special_characters_map)) {
            unescaped = unescaped.replace('\\'+ special_chr, special_chr);
        }
        ret[i] = [ret[i][0], unescaped];
    }
    return ret;
}

//Map font styles - used to account for if a font style doesn't exist but unecessary since NodeCanvas is nice :)
function mapLineStyles(lineStyles) {
    var tmp = [];
    var font_map = { '': '', 'bold-italic': 'bold italic', 'italic-bold': 'bold italic', 'bold': 'bold', 'italic': 'italic' };
    for (var i = 0; i < lineStyles.length; i++) {
        var pair = lineStyles[i];
        var style = font_map[pair[0]];
        tmp.push([style, pair[1]]);
    }
    return tmp;
}