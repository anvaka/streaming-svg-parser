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