# streaming-svg-parser

Very fast parser of SVG (and likely XML) files, that doesn't need the entire file to start
parsing it.

## install

You can get this package via npm:

``` sh
npm install streaming-svg-parser
```

Or via CDN:

```
  <script src="https://unpkg.com/streaming-svg-parser@1.1.0/dist/streaming-svg-parser.min.js"></script>
```

## usage

You can find example of this parser in https://anvaka.github.io/map-of-reddit/ and 
more specifically - [here](https://github.com/anvaka/map-of-reddit/blob/756ece61fdf246be10076994f7f5876a7af002e8/src/lib/createSVGLoader.js#L10).
I need to document this better, but here is a quick demo of how the parser could
work to print indented elements along with their attributes:

``` js
// If you are using node.js, you can use require() to load the parser.
// 
// Otherwise, if you used CDN with <script src='...'></script> tag,
// `streamingSVGParser` will be available as global variable:
const streamingSVGParser = require('streaming-svg-parser');

let indent = '';
let parseText = streamingSVGParser.createStreamingSVGParser(
  openElement => {
    // attributes are in a map, let's print it:
    let attributes = Array.from(openElement.attributes)
      .map(pair => pair.join('='))
      .join(' ');

    console.log(indent + 'Open ' + openElement.tagName + ' ' + attributes);
    indent += '  ';
  },
  closeElement => {
    indent = indent.substring(2);
    console.log(indent + 'Close ' + closeElement.tagName);
  }
);
parseText('<?xml version="1.0" encoding="UTF-8"?>');
parseText('<svg clip-rule="evenodd" viewBox="0 0 42 42">')
parseText('<g id="my-id"><');
parseText('/g></svg>');
```

This will print:

```
Open svg clip-rule=evenodd viewBox=0 0 42 42
  Open g id=my-id
  Close g
Close svg
```

[Open on jsbin](https://jsbin.com/pikilibadu/1/edit?html,js,output)

Note that `parseText()` was fed incomplete chunks of svg, which makes this parser
ideal when you load large SVG files over the network but want to process them without
waiting for the entire file to be loaded.

## XML Support

While originally this library is written for SVG, it should work for simple XML files 
as well. Please let me know if you find anything missing.

## License

MIT