# streaming-svg-parser

Very fast parser of SVG files, that doesn't need the entire file to start
parsing it.

## usage

TODO: document it!

``` js
let parseText = createStreamingSVGParser(
  open => {
    lastOpenElement = open;
  },
  close => {
    lastCloseElement = close;
  }
);
parseText('<?xml version="1.0" encoding="UTF-8"?>');
parseText('<svg clip-rule="evenodd" viewBox="0 0 42 42">')
parseText('<g id="my-id">');
parseText('</g></svg>');
```