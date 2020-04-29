var express = require('express');
var app = express();
var sizeOf = require('image-size');
var https = require('https');
var url = require('url');
var multer = require('multer');
var urlExists = require('url-exists');
var parseString = require('xml2js').parseString;
var memedown = require('./memedown.js').methods;

var storage = multer.memoryStorage()
var upload = multer({ storage: storage })

app.use(express.static('public'));

memedown.loadFonts();

app.post('/process', upload.any(), async function (req, res) {
    var code = req.body.code;
    if (code == null || code == undefined || code == '') {
        res.status(400).send({ err: "No memedown code." });
        return;
    }
    var requireIm = (req.files.length == 0 ? true : false);

    var imdata;
    var dimensions;

    parseString(code, function(err, result) {
        if (err) {
            res.status(400).send({ err: "Malformed memedown code." });
            return;
        }
        var textData = memedown.validateAndSeparate(result, requireIm);
        if (textData.err) {
            console.log(textData.err);
            res.status(400).send({ err: textData.err });
            return;
        }

        if (!requireIm) {
            imdata = req.files[0].buffer;
            dimensions = sizeOf(imdata);
            var result = memedown.drawCanvas(textData.data, imdata, dimensions.width, dimensions.height);
            res.status(200).send({ data: result.toDataURL() });
            return;
        }

        var website = textData.data.image;
        urlExists(website, function(err, exists) {
            if (err) {
                res.status(500).send({err: 'Internal Error when processing website url'});
                return;
            }
            if (!exists) {
                res.status(400).send({err: 'Invalid image url'})
                return;
            }
            var options = url.parse(website);
            options.protocol = 'https:'
            https.get(options, function(response) {
                var chunks = [];
                response.on('data', function(chunk) {
                    chunks.push(chunk);
                }).on('end', function () {
                    imdata = Buffer.concat(chunks);
                    dimensions = sizeOf(imdata);
                    var result = memedown.drawCanvas(textData.data, imdata, dimensions.width, dimensions.height);
                    res.status(200).send({ data: result.toDataURL() });
                    return;
                })
            })
        });
    });
});

app.get('/', function (req, res) {
    res.send("hello");
});

app.listen(8080, function () { });