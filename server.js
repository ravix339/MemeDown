var express = require('express');
var app = express();
var gm = require('gm').subClass({ imageMagick: true }); //Try to remove if possible
var multer = require('multer');
var fs = require('fs');
var parseString = require('xml2js').parseString;
var memedown = require('./memedown.js').methods;

var storage = multer.memoryStorage()
var upload = multer({ storage: storage })

app.use(express.static('public'));

memedown.loadFonts();

app.post('/process', upload.any(), async function (req, res) {
    var code = req.body.code;
    if (req.files.length == 0) {
        res.status(400).send({err: "No valid image attached."});
        return;
    }
    var imdata = req.files[0].buffer;
    gm(imdata).size(function (err, size) {
        if (!err) {
            parseString(code, function (err, result) {
                if (err) {
                    res.status(400).send({err: "Malformed memedown code."});
                }
                else{
                    var textData = memedown.validateAndSeparate(result, false);
                    if (textData.err) {
                        console.log(textData.err);
                        res.status(400).send({err: textData.err});
                    }
                    else {
                        var result = memedown.drawCanvas(textData.data, imdata, size.width, size.height);
                        res.status(200).send({ data: result.toDataURL() });
                    }
                }
            });
        }
        else {
            res.status(400).send({err: "No valid image attached."});
        }
    });
});

app.get('/', function (req, res) {
    res.send("hello");
});

app.listen(8080, function () { });