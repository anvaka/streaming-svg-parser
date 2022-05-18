const test = require('tap').test;
const {createStreamingSVGParser, getPointsFromPathData} = require('../index');

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
  t.equal(lastOpenElement.tagName, 'svg');
  t.equal(lastOpenElement.attributes.get('viewBox'), '0 0 5.1e5 762000');
  parseText('<g id="borders"'); 
  parseText('>')
  t.equal(lastOpenElement.attributes.get('id'), 'borders');
  parseText('</g></svg>')
  t.equal(lastCloseElement, svg);
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
        t.equal(el.innerText, 'Hello world')
        t.equal(el.attributes.get('style'), "font-family:'Arial'");
        passed = true;
      }
    }
  );
  parseText('<?xml version="1.0" encoding="UTF-8"?>');
  parseText('<svg clip-rule="evenodd" viewBox="0 0 42 42">')
  parseText(`<text x="70" y = "80" style="font-family:'Arial'">Hello world</text>`);
  parseText('</svg>');
  t.equal(passed, true);
  t.end()
});

test('it can parse path data', t => {
  let passed = false;
  const pathData ='M10 10 L200 -10 l-10 -10 H100 h10V10 v10';
  let parseText = createStreamingSVGParser(
    Function.prototype,
    el => {
      if (el.tagName === 'path') {
        let points = getPointsFromPathData(el.attributes.get('d'));
        t.same(points, [
          [10, 10],   // M 10 10
          [200, -10], // L 200 -10
          [190, -20], // l -10 -10
          [100, -20], // H 100
          [110, -20], // h 10
          [110, 10],  // V 10
          [110, 20],  // v 10
        ]);
        passed = true;
      }
    }
  );
  parseText('<?xml version="1.0" encoding="UTF-8"?>');
  parseText('<svg clip-rule="evenodd" viewBox="0 0 42 42">')
  parseText(`<path d="${pathData}"/>`);
  parseText('</svg>');
  t.equal(passed, true);
  t.end()
})