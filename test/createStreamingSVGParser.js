const test = require('tap').test;
const {createStreamingSVGParser, getPointsFromPathData} = require('../index');
const getElementFillColor = require('../lib/getElementFillColor');

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
  let buffer = [];
  let parseText = createStreamingSVGParser(
    openElement => {
      // attributes is a map, let's print it
      let attributes = Array.from(openElement.attributes)
        .map(pair => pair.join('='))
        .join(' ');

      buffer.push(indent + '<' + openElement.tagName + ' ' + attributes + '>')
      indent += '  ';
    },
    closeElement => {
      indent = indent.substring(2);
      buffer.push(indent + '</' + closeElement.tagName + '>');
    }
  );
  parseText('<?xml version="1.0" encoding="UTF-8"?>');
  parseText('<svg clip-rule="evenodd" viewBox="0 0 42 42">')
  parseText('<g id="my-id"><');
  parseText('/g></svg>');

  // we got indents now:
  t.equal(buffer.join('\n'), 
`<svg clip-rule=evenodd viewBox=0 0 42 42>
  <g id=my-id>
  </g>
</svg>`)
  t.end();
})

test('it can parse comments', t => {
  let passed = true;
  let totalTags = 0;
  let parseText = createStreamingSVGParser(
    Function.prototype,
    el => {
      if (el.tagName === 'text') {
        passed = false;
      }
      totalTags += 1;
    }
  );
  parseText('<?xml version="1.0" encoding="UTF-8"?>');
  parseText('<svg clip-rule="evenodd" viewBox="0 0 42 42">')
  parseText(`<!-- text x="70" y = "80" style="font-family:'Arial'">Hello world</text-->`);
  parseText('</svg>');
  t.equal(passed, true);
  t.equal(totalTags, 1, 'One tag found')
  t.end()
});

test('it parses tags on new lines', t=> {
  let passed = false;
  let parseText = createStreamingSVGParser(
    el => {
      if (el.tagName === 'g') {
        passed = true;
      }
    },
    Function.prototype
  );
  parseText('<g>')
  parseText('</g>');
  t.equal(passed, true);
  t.end()
});

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
  const pathData ='M10 10 L200 -10 l-10 -10 H100 h10V10 v10-10 1e1 0.5 m0 0 10 10';
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
          [110, 10],  // -10
          [110, 20],  // 1e1
          [110, 20.5],  // 0.5
          [120, 30.5],  // m0 0 10 10
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
});

test('it can read single boolean attribute', t => {
  let passed = false;
  let parseText = createStreamingSVGParser(
    el => {
      t.ok(el.attributes.has('enabled'), 'enabled is present');
      passed = true;
    }, Function.prototype);
  parseText('<path enabled></path>')
  t.ok(passed);
  t.end();
});

test('it ignores whitespace after single attribute', t => {
  let passed = false;
  let parseText = createStreamingSVGParser(
    el => {
      t.ok(el.attributes.has('enabled'), 'enabled is present');
      passed = true;
    }, Function.prototype);

  parseText('<path enabled /></path>')
  t.ok(passed);
  t.end();
});

test('it can read single boolean attribute followed by another attribute', t => {
  let passed = false;
  let parseText = createStreamingSVGParser(
    el => {
      t.ok(el.attributes.has('enabled'), 'enabled is present');
      t.equal(el.attributes.get('d'), 'M0,0 1,1', 'data is correct');
      passed = true;
    }, Function.prototype);
  parseText('<path enabled d="M0,0 1,1"></path>')
  t.ok(passed);
  t.end();
});

test('it can read tag without attributes', t => {
  let passed = false;
  let parseText = createStreamingSVGParser(
    el => {
      t.equal(el.tagName, 'g', 'g is read');
      passed = true;
    }, Function.prototype);
  parseText('<g />')
  parseText('<g/>')
  t.ok(passed);
  t.end();
});


test('it can get element fill color', t => {
  let testCases = [
    {fill: '#ff0000', parsed: [255, 0, 0]},
    {fill: '#f00', parsed: [255, 0, 0]},
    {style: "fill:#f01", parsed: [255, 0, 17]},
    {style: "fill:rgb(255, 40, 0)", parsed: [255, 40, 0]},
    {fill: "rgba(255, 127, 0, 1)", parsed: [255, 127, 0, 255]},
  ];
  let processedCount = 0;
  let idToTestCase = new Map();
  testCases.forEach((testCase, idx) => {
    testCase.id = idx;
    idToTestCase.set('' + idx, testCase);
  });

  let parseText = createStreamingSVGParser(
    Function.prototype,
    el => {
      if (el.tagName !== 'circle') return;
      let id = el.attributes.get('id');
      let testCase = idToTestCase.get(id);
      if (!testCase) {
        throw new Error('Unknown test case id: ' + id);
      }
      let parsedColor = getElementFillColor(el);
      t.same(parsedColor, testCase.parsed);
      processedCount += 1;
    }
  );
  parseText('<?xml version="1.0" encoding="UTF-8"?>');
  parseText('<svg clip-rule="evenodd" viewBox="0 0 42 42">')
  parseText(testCases.map(testCase => {
    if (testCase.fill) {
      return `<circle id="${testCase.id}" cx="10" cy="10" r="10" fill="${testCase.fill}"/>`;
    }
    return `<circle id="${testCase.id}" cx="10" cy="10" r="10" style="${testCase.style}"/>`;
  }).join('\n'));
  parseText('</svg>');
  t.equal(processedCount, testCases.length);
  t.end();
});

test('it can process async', t => {
  let openCount = 0, closeCount = 0;
  let parseTextAsync = createStreamingSVGParser(
    open => { openCount += 1; },
    close => {closeCount += 1; },
    true
  );
  return parseTextAsync([
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg clip-rule="evenodd" viewBox="0 0 5.1e5 762000">',
    '<g id="borders"></g>',
    '</svg>'].join('\n')).then(() => {
      t.equal(openCount, 2);
      t.equal(closeCount, 2);
      t.end();
    });
})

test('it throws when two M commands are in a row', t => {
  let passed = false;
  const pathData ='M10 10 M0 0';
  let parseText = createStreamingSVGParser(
    Function.prototype,
    el => {
      if (el.tagName === 'path') {
        t.throws(() => {
          getPointsFromPathData(el.attributes.get('d'));
        });
        passed = true;
      }
    }
  );
  parseText(`<path d="${pathData}"/>`);
  t.equal(passed, true);
  t.end()
});

test('NumberParser throws on second exponent', t => {
  t.throws(
    () => getPointsFromPathData('M1e1e1 10'), /Already has exponent/
  );
  t.end();
});

test('NumberParser throws on second fractional part', t => {
  t.throws(
    () => getPointsFromPathData('M1.1.1 10'), /fractional part/
  );
  t.end();
});

test('NumberParser throws on not a digit', t => {
  t.throws(
    () => getPointsFromPathData('M1p 10'), /Not a digit/
  );
  t.end();
})

test('it throws when two M commands has non even points', t => {
  let passed = false;
  const pathData ='M10 L0';
  let parseText = createStreamingSVGParser(
    Function.prototype,
    el => {
      if (el.tagName === 'path') {
        t.throws(() => {
          getPointsFromPathData(el.attributes.get('d'));
        });
        passed = true;
      }
    }
  );
  parseText(`<path d="${pathData}"/>`);
  t.equal(passed, true);
  t.end()
});