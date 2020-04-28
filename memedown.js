exports.methods = {
    drawCanvas: drawCanvas,
    loadFonts: loadFonts,
    validateAndSeparate: validateAndSeparate,
};

var fs = require('fs');
//var canvasText = require('canvas-multiline-text');
var canvasText = require('./multiline-text.js');
var Canvas = require('canvas');

function loadFonts(verbose = true) {
    var count = 0;
    if (verbose) {
        console.log("Starting font load");
    }
    var path = './fonts'
    var start = Date.now();
    for (var folder of fs.readdirSync(path)) {
        var fontfamily = folder;
        for (var file of fs.readdirSync(path + '/' + folder)) {
            if (/\.ttf$/.test(file)) {
                Canvas.registerFont(path + '/' + folder + '/' + file, { family: fontfamily });
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
            errors += (errors.length == 0 ? "" : "\n");
            errors += "\'image\' tags are not supported.";
            continue;
            // if (raw.meme.image.length > 1) {
            //     errors += (errors.length == 0 ? "" : "\n");
            //     errors += "There can only be one \'image\' tag.";
            //     continue;
            // }
            // if (!requireImTag) {
            //     errors += (errors.length == 0 ? "" : "\n");
            //     errors += "Image already attached so unnecessary \'image\' tag.";
            //     continue;
            // }
            // if (raw.meme.image[0]['$'] != undefined) {
            //     errors += (errors.length == 0 ? "" : "\n");
            //     errors += "No parameters allowed in \'image\' tag.";
            //     continue;
            // }
            // ret.image = raw.meme.image[0];
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
        errors += "No image attached so \'image\' tag is required and not provided.";
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

    var boundingBox = {
        x: lineInfo.position[0][0],
        y: lineInfo.position[0][1],
        width: lineInfo.position[1][0] - lineInfo.position[0][0],
        height: lineInfo.position[1][1] - lineInfo.position[0][1]
    }

    console.log(boundingBox);

    ctx.fillStyle = '#ffffff';
    ctx.fillStyle = lineInfo.color;
    console.log(lineInfo);
    canvasText(ctx, lineInfo.quote, {
        rect: boundingBox,
        verbose: true,
        font: lineInfo.font,
        minFontSize: 10,
        maxFontSize: lineInfo.size

    });

    // Single line canvas text
    // console.log(boundingBox);
    // canvasText.default(ctx, lineInfo.quote, fonts['Regular.ttf'], boundingBox, {
    //     minSize: 10,
    //     maxSize: lineInfo.size,
    //     textFillStyle: '#00ffff',
    //     hAlign: 'center',
    //     vAlign: 'center'
    // });

    // formattedLines = formatLineStyles(parseLineByStyle(lineInfo.quote, ['*', '_']), Object.keys(fonts));
    // for (var i = 0; i < formattedLines.length; i++) {
    //     var line = formattedLines[i];
    //     formattedLines[i] = [line[0], line[1].replace('\\\"', '\"').replace('\\\'', '\'').replace('\\_', '_').replace('\\*', '*').replace('\\\\','\\')];
    // }
    // for (var i = 0; i < formattedLines.length; i++) {
    //     //Draw formattedLines[i]
    // }
}

function validateText(textData) {
    var error = "";
    var obj = {};
    obj.quote = textData['_']; // escape_text(textData['_']); //Removed escaping since bolds and italics are a pain.
    if (obj.quote == undefined || obj.quote == null) {
        return { err: "Text tag not properly formatted. Use proper formatting \'&lt;text&gt;&lt;/text&gt;\'" };
    }
    for (var key of Object.keys(textData['$'])) {
        var val = textData['$'][key];
        var paramType = getParamType(key);
        var flag = false;
        if (paramType == null) {
            error += (error.length == 0 ? "" : '\n');
            error += `Exception trying to process the parameter ${key}. Please check the manual to see valid parameters.`;
            flag = true;
        }
        if (obj[paramType] != undefined) {
            error += (error.length == 0 ? "" : '\n');
            error += `Repeated parameter ${key}.`;
            flag = true;
        }
        if (flag) {
            continue;
        }
        obj[paramType] = null;
        response = parseParam(paramType, val);
        if (response.err != "") {
            error += (error.length == 0 ? "" : '\n');
            error += `Value error in parameter ${key}: ${response.err}`;
            continue;
        }
        obj[paramType] = response.val;
    }
    if (obj.font == undefined) {
        error += (error.length == 0 ? "" : "\n");
        error += "No valid font parameter provided.";
    }
    if (obj.position == undefined) {
        error += (error.length == 0 ? "" : "\n");
        error += "No valid position parameter provided.";
    }
    if (obj.size == undefined) {
        error += (error.length == 0 ? "" : "\n");
        error += "No valid size parameter provided.";
    }
    if (error.length != 0) {
        return { err: error }
    }
    return { err: error, data: obj };
}

function getParamType(key) {
    var key_lower = key.toLowerCase();
    if (['s', 'size'].includes(key_lower)) {
        return 'size';
    }
    if (['f', 'font'].includes(key_lower)) {
        return 'font';
    }
    if (['l', 'loc', 'location', 'p', 'pos', 'position'].includes(key_lower)) {
        return 'position';
    }
    if (['c', 'color', 'colour', 'rgb'].includes(key_lower)) {
        return 'color';
    }
    return null;
}

function parseParam(type, param) {
    if (type == 'size') {
        return parseSize(param);
    }
    else if (type == 'font') {
        return parseFont(param);
    }
    else if (type == 'position') {
        return parsePos(param);
    }
    else if (type == 'color') {
        return parseColor(param);
    }
    else {
        return { err: "Undefined parameter" };
    }
}

function parseSize(param) {
    var num = parseInt(param);
    if (isNaN(num)) {
        return { err: "Text size is not an integer value." };
    }
    if (num < 10 || num > 100) {
        return { err: "Text size not between 1 and 100." }
    }
    return { err: "", val: num };
}

function parseFont(param) {
    var adjusted = param.toLowerCase()
    var path = './fonts/' + adjusted;
    var ret = {};
    if (fs.existsSync(path)) {
        return { err: "", val: adjusted };
    }
    return { err: "Font not in accepted list." };
}

function parsePos(param) {
    var twoCoords = param.split('|');
    if (twoCoords.length != 2) {
        return { err: "Position parameter is not properly formatted." }
    }
    errors = "";
    data = [[0, 0], [0, 0]];
    var left = twoCoords[0].split(',');
    if (left.length != 2) {
        errors = "First positional argument is not properly formatted.";
    }
    else {
        var x0 = parseInt(left[0]);
        if (isNaN(x0)) {
            errors += "First x positional argument is not an integer";
        }
        else if (x0 < 0) {
            errors += "First x positional argument must be non-negative";
        }
        else {
            data[0][0] = x0;
        }
        var y0 = parseInt(left[1]);
        if (isNaN(y0)) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "First y positional argument is not an integer";
        }
        else if (y0 < 0) {
            errors += "First y positional argument must be non-negative";
        }
        else {
            data[0][1] = y0;
        }
    }

    var right = twoCoords[1].split(',');
    if (right.length != 2) {
        errors = "Second positional argument is not properly formatted.";
    }
    else {
        var x1 = parseInt(right[0]);
        if (isNaN(x1)) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "Second x positional argument is not an integer";
        }
        else if (x1 < 0) {
            errors += "Second x positional argument must be non-negative";
        }
        else {
            data[1][0] = x1;
        }
        var y1 = parseInt(right[1]);
        if (isNaN(y1)) {
            errors += (errors.length == 0 ? "" : "\n");
            errors += "Second y positional argument is not an integer";
        }
        else if (y1 < 0) {
            errors += "Second y positional argument must be non-negative";
        }
        else {
            data[1][1] = y1;
        }
    }
    if (errors.length == 0) {
        if (data[1][0] >= data[0][0] && data[1][1] >= data[0][1]) {
            return { err: "", val: data };
        }
        errors = "First positional argument should occur above and to the left of the second argument";
    }
    return { err: errors };
}

function parseColor(param) {
    return { err: "", val: param };
}


/*
 *
 * #                                          #####
 * #       ######  ####    ##    ####  #   # #     #  ####  #####  ###### 
 * #       #      #    #  #  #  #    #  # #  #       #    # #    # #      
 * #       #####  #      #    # #        #   #       #    # #    # #####  
 * #       #      #  ### ###### #        #   #       #    # #    # #      
 * #       #      #    # #    # #    #   #   #     # #    # #    # #      
 * ####### ######  ####  #    #  ####    #    #####   ####  #####  ###### 
 *
 *  (not currently used)
 */

// Not used since italics and bolds aren't implemented.
function escape_text(str) {
    var special_characters = ['*', '_'];
    var special_characters_map = { '*': 'bold', '_': 'italic' };
    var ret = '';
    var spc = '';
    var escaped = false;
    for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if (c == '\\') {
            escaped = true;
        }
        else if (special_characters.includes(c) && !escaped) {
            if (spc == '') {
                var search_c = str.indexOf(c, i + 1);
                while (search_c < str.length && search_c != -1 && str[search_c - 1] == '\\')
                    search_c = str.indexOf(c, search_c + 1);
                if (search_c != -1) {
                    spc = c;
                }
                else {
                    ret += '\\';
                }
            }
            else if (c == spc[spc.length - 1]) {
                spc = spc.substring(0, spc.length - 1)
            }
            else {
                search_c = str.indexOf(c, i + 1);
                while (search_c < str.length && search_c != -1 && str[search_c - 1] == '\\') {
                    search_c = str.indexOf(c, search_c + 1);
                }
                var search_spc = str.indexOf(spc, i);
                if (search_c == -1 || search_c > search_spc) {
                    ret += '\\';
                }
                else {
                    spc += c;
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
    return ret;
}

//Assigns a font file to the text (accounting for if the font file doesn't exist)
function formatLineStyles(lineStyles, fontTypes) {
    var tmp = [];
    var font_map = { '': 'Regular.ttf', 'bold-italic': 'BoldItalic.ttf', 'italic-bold': 'BoldItalic.ttf', 'bold': 'Bold.ttf', 'italic': 'Italic.ttf' };
    console.log(lineStyles)
    for (var i = 0; i < lineStyles.length; i++) {
        var pair = lineStyles[i];
        var style = font_map[pair[0]];
        if (fontTypes.includes(style)) {
            tmp.push([style, pair[1]])
            continue;
        }
        else if (style == 'BoldItalic.ttf') {
            var split = pair[0].split('-')
            var primary = font_map[split[0]];
            var secondary = font_map[split[1]];
            if (fontTypes.includes(primary)) {
                tmp.push([primary, pair[1]]);
                continue;
            }
            else if (fontTypes.includes(secondary)) {
                tmp.push([secondary, pair[1]]);
                continue;
            }
        }
        tmp.push(['Regular.ttf', pair[1]]);
    }

    var currFont = tmp[0][0];
    var currQuote = tmp[0][1];
    ret = []
    for (var i = 1; i < tmp.length; i++) {
        var pair = tmp[i];
        if (pair[0] == currFont) {
            currQuote += pair[1];
        }
        else {
            ret.push([currFont, currQuote]);
            currFont = pair[0];
            currQuote = pair[1];
        }
    }
    ret.push([currFont, currQuote]);
    return ret;
}