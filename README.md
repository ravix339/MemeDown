# MemeDown
A Markup Language for Memes

## Setup
This project relies on the [Google Fonts Github Repository](https://github.com/google/fonts) for the fonts. The `script.sh` file contains a (badly written) program that when executed when the working directory is the cloned repo, it will format the repo to match the specification required for the interpreter.

## Running the Server
```node server.js``` will start the server on port 8080. You can configure this in `server.js`. 

## API Call
POST Request to /process with an optional image  the following body:
```json
{
    "img":"OPTIONAL FILE UPLOAD",
    "code":"<meme>...</meme>"
}
````

### Responses
- HTTP 200
```json
{
    "data":"b64 encoded image string"
}
```
- HTTP 400
```json
{
    "err":"Error message"
}
```
- HTTP 500
```json
{
    "err":"Error message"
}
```

## Language Specifications
The first thing you'll need an image (JPG or PNG) that will be attached alongside the request or as a url in the MemeDown code.

The MemeDown interpreter is very strict in the range of values for its inputs. Any invalid inputs will result in a parse error, unless otherwise noted.

Each MemeDown document begins with a <code>&lt;meme&gt;</code> tag that signifies the beginning of the document. As with other XML-like languages, this signifies the opening of a section of the code. To signify the end, you must add the appropriate closing tag <code>&lt;/meme&gt;</code>. This style follows for the other tags (<code>&lt;text&gt;</code> and <code>&lt;image&gt;</code>).

<h4>Image Tag <code>&lt;image&gt;</code></h4>
The image tag is an alternative to uploading an image directly through the web interface or through a POST request to the server. This tag is very simple and takes no parameters. The data between the the open and closing tags simply comprises of a url to an image (direct link to image - url ends with &apos;.jpg&apos; or &apos;.png&apos;). As it stands only HTTPS urls are supported.

<h4>Text Tag <code>&lt;text&gt;</code></h4>
The text tag is the main tag that allows for the customization of the memes. There are parameters
that each text tag can contain: position, font, size, color.

<h4>position parameter</h4>
The position parameter is a <b>mandatory</b> parameter that defines the bounding box that the text will
occupy. If the text is long, the bounding box limits the fontsize of the text so that in an attempt to keep
the text within the box. This is not always possible if the bounding box is too small or the text is too long.

The position parameter can appear in the tag as <code>l</code>, <code>loc</code>, <code>location</code>,
<code>p</code>, <code>pos</code>, or <code>position</code>.

The position parameter can handle all non-negative integers. If the user passes in a floating point number,
the interpreter truncates decimal.

The format for the parameter is <code>position=&quot;x0,y0|x1,y1&quot;</code> where (x0,y0) is the upper
left corner of the bounding box and (x1,y1) is the bottom right corner.


<h4>font parameter</h4>
The font parameter is a <b>optional</b> parameter that defines the font that the text will be displayed
with. This font can be different between each text tag and there is no storage of what the font is between
each tag (therefore you must specify each time which font to use if you want to choose a different font than
the default).
The fonts that are available to be used is listed at at <a href="https://fonts.google.com/">Google&apos;s font
repository</a>. This interpreter
accepts the font name as a string that is the name of the font&apos;s folder listed in
<a href="https://github.com/google/fonts/"> Google&apos;s font GitHub</a>

The font parameter can appear in the tag as <code>f</code> or <code>font</code>.

The format for the font is <code>font=&quot;font_base_name_all_lowercase&quot;</code> where font_base_name_all_lowercase is folder name for the font in the mentioned GitHub repository.

As it stands, the interpreter cannot handle italics or bold fonts so do not try to pass in a bold font (ex:<code>font=&quot;RobotoMono-Italic&quot;</code>). The default font is set to "Oswald".


<h4>size parameter</h4>
The size parameter is a <b>optional</b> parameter that defines the <b>max size</b> font that the text will
be displayed with. As mentioned in the position parameter, if the bounding box is too small for the font, the font-size will decrease in order to fit into the box.

The size parameter can appear in the tag as <code>s</code> or <code>size</code>.

The format for the size is <code>size=&quot;fontSize&quot;</code> where fontSize is the max size of the font that you want. The acceptable range of values for fontSize is [10,500]. The default is to create the largest text size that fills the bounding box defined by the position parameter.


<h4>color parameter</h4>
The color parameter is an <b>optional</b> parameter that defines the color of the text specified in that
text tag.

The color parameter can appear in the tag as <code>c</code>, <code>color</code>, <code>colour</code>,
<code>rgb</code>.

The format for the color is <code>color=&quot;myColor&quot;</code> where myColor is any accepted CSS color value (hex code and color names are accepted). If this parameter is left blank or the value of the parameter is not accepted, the text specified in the tag will be displayed in white (#ffffff).
