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

test('it can parse text', t => {
  let passed = false;
  let parseText = createStreamingSVGParser(
    Function.prototype,
    el => {
      if (el.tagName === 'text') {
        t.equals(el.innerText, 'Hello world')
        t.equals(el.attributes.get('style'), "font-family:'Arial'");
        passed = true;
      }
    }
  );
  parseText('<?xml version="1.0" encoding="UTF-8"?>');
  parseText('<svg clip-rule="evenodd" viewBox="0 0 42 42">')
  parseText(`<text x="70" y = "80" style="font-family:'Arial'">Hello world</text>`);
  parseText('</svg>');
  t.equals(passed, true);
  t.end()
})