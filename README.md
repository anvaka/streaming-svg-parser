# streaming-svg-parser

Very fast parser of SVG files, that doesn't need the entire file to start
parsing it.

## usage

I need to document this better, but the here is a quick demo of how the parser could
work to print indented elements along with their attributes:

``` js
const createStreamingSVGParser = require('streaming-svg-parser');

let indent = '';
let parseText = createStreamingSVGParser(
  openElement => {
    // attributes is a map, let's print it
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

Note that `parseText()` was fed incomplete chunks of svg, which makes this parser
ideal when you load large SVG files over the network but want to process them without
waiting for the entire file to be loaded.