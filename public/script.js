var _URL = window.URL || window.webkitURL;
var editor;
$(document).ready(function () {
    //Set up placeholder text to include new lines
    var newPlaceholder = $('#code').attr('placeholder').replace(/\\n/gi, '\n');
    $('#code').attr('placeholder', newPlaceholder);
    
    editor = CodeMirror.fromTextArea(document.getElementById('code'), {mode: 'xml', autoCloseTags:true, lineNumbers: true});

    //Log the image size when an image is uploaded so the user knows the dimensions
    $("#img").change(changeImage);

    //On upload
    $('#upload').on('click', uploadImage);

    //Add label to file selector
    $(".custom-file-input").on("change", function () {
        var fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
    });

    $('#fileclear').on('click', function () {
        document.getElementById('img').value = "";
        document.getElementById('imglabel').innerHTML = "Select an image";
        $('#log').html('Uploaded file cleared');
    });

    initializeCopyButtons();
});

var changeImage = function (e) {
    var file, img;
    if ((file = this.files[0])) {
        img = new Image();
        img.onload = function () {
            $('#log').html(`Log: Uploaded file has dimensions ${this.width}px x ${this.height}px`);
        };
        img.onerror = function () {
            $('#log').html(`Log: ${file.type} is not a valid image`);
        };
        img.src = _URL.createObjectURL(file);
    }
}

var uploadImage = function (e) {
    this.blur(); // Blur the button so its neater

    //Reset buttons and display log
    $('#log').html('Log: Processing');
    $('#out').attr('src', '');
    $('#outdownloadjpg').attr('href', '');
    $('#outdownloadpng').attr('href', '');
    $('#out').prop('hidden', true);
    $('#outdownloadjpgbtn').prop('hidden', true);
    $('#outdownloadpngbtn').prop('hidden', true);
    $('#outdownloadjpgbtn').prop('disabled', false);
    $('#outdownloadpngbtn').prop('disabled', false);

    //Get the form data
    var postdata = new FormData();
    postdata.append('img', $('#img')[0].files[0]);
    postdata.append('code', editor.getValue());
    console.log(editor.getValue())

    //Send request
    $.ajax({
        type: 'post',
        url: '/process',
        data: postdata,
        processData: false,
        contentType: false,
        success: function (response) {
            $('#log').html('Log: Successful');
            //Load image
            $('#out').attr('src', response.data);
            $('#outdownloadjpg').attr('href', response.data);
            $('#outdownloadpng').attr('href', response.data);
            //Make image downloadable
            $('#out').prop('hidden', false);
            $('#outdownloadjpgbtn').prop('disabled', false);
            $('#outdownloadpngbtn').prop('disabled', false);
            $('#outdownloadjpgbtn').prop('hidden', false);
            $('#outdownloadpngbtn').prop('hidden', false);
        },
        error: function (error) {
            //Display error
            $('#log').html("Log: " + error.responseJSON.err);

            //Reset buttons
            $('#out').attr('src', '');
            $('#outdownloadjpg').attr('href', '');
            $('#outdownloadpng').attr('href', '');
            $('#out').prop('hidden', true);
            $('#outdownloadjpgbtn').prop('disabled', true);
            $('#outdownloadpngbtn').prop('disabled', true);
            $('#outdownloadjpgbtn').prop('hidden', true);
            $('#outdownloadpngbtn').prop('hidden', true);
        }
    });
}

initializeCopyButtons = function () {
    //Add the button that will copy text
    function addCopyButtons(clipboard) {
        document.querySelectorAll('pre > code').forEach(function (codeBlock) {
            var button = document.createElement('button');
            button.className = 'copy-code-button';
            button.type = 'button';
            button.innerText = 'Copy';

            button.addEventListener('click', function () {
                clipboard.writeText(codeBlock.innerText).then(function () {
                    /* Chrome doesn't seem to blur automatically,
                       leaving the button in a focused state. */
                    button.blur();

                    button.innerText = 'Copied!';

                    setTimeout(function () {
                        button.innerText = 'Copy';
                    }, 2000);
                }, function (error) {
                    button.innerText = 'Error';
                });
            });

            var pre = codeBlock.parentNode;
            if (pre.parentNode.classList.contains('highlight')) {
                var highlight = pre.parentNode;
                highlight.parentNode.insertBefore(button, highlight);
            } else {
                pre.parentNode.insertBefore(button, pre);
            }
        });
    }
    //Initialize clipboards
    if (navigator && navigator.clipboard) {
        addCopyButtons(navigator.clipboard);
    } else {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/clipboard-polyfill/2.7.0/clipboard-polyfill.promise.js';
        script.integrity = 'sha256-waClS2re9NUbXRsryKoof+F9qc1gjjIhc2eT7ZbIv94=';
        script.crossOrigin = 'anonymous';
        script.onload = function () {
            addCopyButtons(clipboard);
        };

        document.body.appendChild(script);
    }
}