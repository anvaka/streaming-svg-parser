
/**
 * Extremely fast SVG path data attribute parser. Currently
 * it doesn't support curves or arcs. Only M, L, H, V (and m, l, h, v) are
 * supported
 */
const NumberParser = require('./NumberParser');

const processCommand = {
  M(points, lastNumbers) {
    // TODO: validate lastNumbers.length % 2 === 0
    if (points.length === 0) {
      // consider this to be absolute points
      for (let i = 0; i < lastNumbers.length; i += 2) {
        points.push([lastNumbers[i], lastNumbers[i + 1]]);
      }
    } else {
      // Note: this is not true for generic case, and could/should be extended to start a new path.
      // We are just optimizing for own sake of a single path
      throw new Error('Only one "Move" command per path is expected');
    }
  },
  m(points, lastNumbers) {
    let lx = 0, ly = 0;
    if (points.length > 0) {
      let last = points[points.length - 1];
      lx = last[0];
      ly = last[1];
    }
    for (let i = 0; i < lastNumbers.length; i += 2) {
      let x = lx + lastNumbers[i];
      let y = ly + lastNumbers[i + 1];
      points.push([x, y]);
      lx = x; ly = y;
    }
  },
  // line to:
  L(points, lastNumbers) {
    // TODO: validate lastNumbers.length % 2 === 0
    for (let i = 0; i < lastNumbers.length; i += 2) {
      points.push([lastNumbers[i], lastNumbers[i + 1]]);
    }
  },
  // relative line to:
  l(points, lastNumbers) {
    let lx = 0, ly = 0;
    if (points.length > 0) {
      let last = points[points.length - 1];
      lx = last[0];
      ly = last[1];
    }
    for (let i = 0; i < lastNumbers.length; i += 2) {
      let x = lx + lastNumbers[i];
      let y = ly + lastNumbers[i + 1];
      points.push([x, y]);
      lx = x; ly = y;
    }
  },
  H(points, lastNumbers) {
    let y = 0;
    if (points.length > 0) {
      y = points[points.length - 1][1];
    }
    for (let i = 0; i < lastNumbers.length; i += 1) {
      let x = lastNumbers[i];
      points.push([x, y]);
    }
  },
  h(points, lastNumbers) {
    let y = 0, lx = 0;
    if (points.length > 0) {
      lx = points[points.length - 1][0];
      y = points[points.length - 1][1];
    }
    for (let i = 0; i < lastNumbers.length; i += 1) {
      let x = lx + lastNumbers[i];
      points.push([x, y]);
      lx = x;
    }
  },
  V(points, lastNumbers) {
    let x = 0;
    if (points.length > 0) {
      x = points[points.length - 1][0];
    }
    for (let i = 0; i < lastNumbers.length; i += 1) {
      points.push([x, lastNumbers[i]]);
    }
  },
  v(points, lastNumbers) {
    let ly = 0, x = 0;
    if (points.length > 0) {
      x = points[points.length - 1][0];
      ly = points[points.length - 1][1];
    }
    for (let i = 0; i < lastNumbers.length; i += 1) {
      let y = ly + lastNumbers[i];
      points.push([x, y]);
      ly = y;
    }
  }
}

function getPointsFromPathData(d) {
  let numParser = new NumberParser();
  let idx = 0;
  let l = d.length;
  let ch;
  let lastNumbers, lastCommand;
  let points = [];
  while (idx < l) {
    ch = d[idx];
    if (ch in processCommand) {
      if (numParser.hasValue) {
        lastNumbers.push(numParser.getValue())
      }
      numParser.reset();
      if (lastNumbers) {
        lastCommand(points, lastNumbers);
      }
      lastCommand = processCommand[ch];
      lastNumbers = [];
    } else if (ch === ' ' || ch === ',') {
      if (numParser.hasValue) {
        lastNumbers.push(numParser.getValue())
        numParser.reset();
      }
      // ignore.
    } else if (ch === 'Z' || ch === 'z') {
      // ignore
    } else if (numParser.hasValue && ch === '-') {
      // this considered to be a start of the next number.
      lastNumbers.push(numParser.getValue())
      numParser.reset();
      numParser.addCharacter(ch);
    } else {
      numParser.addCharacter(ch);
    }
    idx += 1;
  }
  if (numParser.hasValue) {
    lastNumbers.push(numParser.getValue());
  }
  if (lastNumbers) {
    lastCommand(points, lastNumbers);
  }
  return points;
}

module.exports = getPointsFromPathData;