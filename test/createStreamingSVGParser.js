const test = require('tap').test;
const {createStreamingSVGParser} = require('../index');

test('it can parse', (t) => {
  let lastOpenElement, lastCloseElement;
  let parseText = createStreamingSVGParser(
    open => {
      lastOpenElement = open;
    },
    close => {
      lastCloseElement = close;
    }
  );
  parseText('<?xml version="1.0" encoding="UTF-8"?>');
  parseText('<svg clip-rule="evenodd" viewBox="0 0 5.1e5 762000">')
  let svg = lastOpenElement;
  t.equals(lastOpenElement.tagName, 'svg');
  t.equals(lastOpenElement.attributes.get('viewBox'), '0 0 5.1e5 762000');
  parseText('<g id="borders"'); 
  parseText('>')
  t.equals(lastOpenElement.attributes.get('id'), 'borders');
  parseText('</g></svg>')
  t.equals(lastCloseElement, svg);
  t.end();
});

test('it can print', t => {
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
  t.end()
})