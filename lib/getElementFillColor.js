module.exports = function getElementFillColor(el) {
  return getColor(el.attributes.get('fill') || el.attributes.get('style'));
}

function getColor(styleValue) {
  // TODO: could probably be done faster.
  if (styleValue[0] === '#') {
    if (styleValue.length === 1 + 6) {
      // #rrggbb
      let r = Number.parseInt(styleValue.substr(1, 2), 16);
      let g = Number.parseInt(styleValue.substr(3, 2), 16);
      let b = Number.parseInt(styleValue.substr(5, 2), 16);
      return hexColor([r, g, b]);
    }
    if (styleValue.length === 1 + 3 || styleValue.length === 1 + 4) {
      // #rgba
      let rs = styleValue.substr(1, 1);
      let gs = styleValue.substr(2, 1);
      let bs = styleValue.substr(3, 1);
      let r = Number.parseInt(rs + rs, 16);
      let g = Number.parseInt(gs + gs, 16);
      let b = Number.parseInt(bs + bs, 16);
      return hexColor([r, g, b]);
    }
    throw new Error('Cannot parse this color yet ' + styleValue);
  } else if (styleValue.startsWith('rgba')) {
    // rgba(rr,gg,bb,a)
    let colors = styleValue.substr(5).split(/,/).map(x => Number.parseFloat(x))
    colors[3] = Math.round(colors[3] * 255);
    return alphaHexColor(colors);
  }
  let rgb = styleValue.match(/fill:rgb\((.+?)\)/);
  let rgbArray;
  if (rgb) {
    rgbArray = rgb[1]
      .split(',')
      .map((x) => Number.parseInt(x, 10))
      .filter(finiteNumber);
  }
  if (!rgbArray) {
    rgb = styleValue.match(/fill:#([0-9a-fA-F]{6})/)
    if (rgb) {
      rgbArray = [
          Number.parseInt(rgb[1].substr(0, 2), 16),
          Number.parseInt(rgb[1].substr(2, 2), 16),
          Number.parseInt(rgb[1].substr(4, 2), 16)
        ]
    }
  }
  if (!rgbArray) {
    rgb = styleValue.match(/fill:#([0-9a-fA-F]{3})/)
    if (rgb) {
      let rs = rgb[1].substr(0, 1);
      let gs = rgb[1].substr(1, 1);
      let bs = rgb[1].substr(2, 1);
      rgbArray = [
        Number.parseInt(rs + rs, 16),
        Number.parseInt(gs + gs, 16),
        Number.parseInt(bs + bs, 16)
      ]
    }

  }
  if (rgbArray) {
    if (rgbArray.length !== 3){
      throw new Error('Cannot parse this color yet ' + styleValue);
    }
    return hexColor(rgbArray);
  }
  console.error('Cannot parse this color yet ' + styleValue)
  throw new Error('Cannot parse this color yet ' + styleValue);
}

function hexColor(arr) {
  return arr;
}
function alphaHexColor(arr) {
  return arr;
}