var streamingSVGParser = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // lib/createStreamingSVGParser.js
  var require_createStreamingSVGParser = __commonJS({
    "lib/createStreamingSVGParser.js"(exports, module) {
      var WAIT_TAG_OPEN = 1;
      var READ_TAG_OR_COMMENT = 2;
      var READ_TAG = 3;
      var READ_TAG_CLOSE = 4;
      var READ_COMMENT = 5;
      var WAIT_TAG_CLOSE = 6;
      var WAIT_ATTRIBUTE_OR_CLOSE_TAG = 7;
      var READ_ATTRIBUTE_NAME = 8;
      var READ_ATTRIBUTE_VALUE = 9;
      var WAIT_ATTRIBUTE_VALUE = 10;
      var WAIT_ATTRIBUTE_ASSIGNMENT_OR_NEXT_ATTRIBUTE = 11;
      var A = "A".charCodeAt(0);
      var Z = "z".charCodeAt(0);
      var whitespace = /\s/;
      module.exports = function createStreamingSVGParser(notifyTagOpen, notifyTagClose, generateAsync) {
        let currentState = WAIT_TAG_OPEN;
        let closeAttributeSymbol;
        let currentTagName;
        let currentAttributeName;
        let lastElement;
        let buffer;
        let innerText;
        if (notifyTagClose === void 0) {
          notifyTagClose = Function.prototype;
        }
        return generateAsync ? processChunkAsync : processChunkSync;
        function processChunkAsync(chunk) {
          return new Promise((resolve) => iterateSymbolsAsync(chunk, 0, resolve));
        }
        function iterateSymbolsAsync(chunk, idx, resolve) {
          let start = performance.now();
          let processed = 0;
          while (idx < chunk.length) {
            processSymbol(chunk[idx]);
            idx += 1;
            processed += 1;
            if (processed > 3e4) {
              let elapsed = performance.now() - start;
              if (elapsed > 32) {
                setTimeout(() => iterateSymbolsAsync(chunk, idx, resolve), 0);
                return;
              }
            }
          }
          resolve();
        }
        function processChunkSync(chunk) {
          return iterateSymbols(chunk, 0);
        }
        function iterateSymbols(chunk, idx) {
          let processed = 0;
          while (idx < chunk.length) {
            processSymbol(chunk[idx]);
            idx += 1;
          }
        }
        function processSymbol(ch) {
          switch (currentState) {
            case WAIT_TAG_OPEN:
              if (ch === "<")
                currentState = READ_TAG_OR_COMMENT;
              else if (innerText) {
                innerText.push(ch);
              }
              break;
            case WAIT_TAG_CLOSE:
              if (ch === ">")
                currentState = WAIT_TAG_OPEN;
              break;
            case READ_TAG_OR_COMMENT:
              if (ch === "!" || ch === "?") {
                buffer = [ch];
                currentState = READ_COMMENT;
              } else if (ch === "/") {
                if (innerText) {
                  lastElement.innerText = innerText.join("");
                  innerText = null;
                }
                notifyTagClose(lastElement);
                if (lastElement)
                  lastElement = lastElement.parent;
                currentState = WAIT_TAG_CLOSE;
                innerText = null;
              } else {
                currentState = READ_TAG;
                buffer = [ch];
              }
              break;
            case READ_COMMENT: {
              buffer.push(ch);
              let l = buffer.length;
              if (buffer.length > 3 && buffer[l - 1] === ">" && buffer[l - 2] === "-" && buffer[l - 3] === "-") {
                currentState = WAIT_TAG_OPEN;
                innerText = null;
              } else if (buffer[0] === "!" && (buffer.length > 1 && buffer[1] !== "-") || buffer[0] === "?")
                currentState = WAIT_TAG_CLOSE;
              break;
            }
            case READ_TAG: {
              if (isTagNameCharacter(ch)) {
                buffer.push(ch);
              } else if (ch === "/") {
              } else {
                currentTagName = buffer.join("");
                currentState = WAIT_ATTRIBUTE_OR_CLOSE_TAG;
                let parent = lastElement;
                lastElement = {
                  tagName: currentTagName,
                  attributes: /* @__PURE__ */ new Map(),
                  parent,
                  children: []
                };
                if (parent)
                  parent.children.push(lastElement);
                if (ch === ">")
                  finishTag();
              }
              break;
            }
            case READ_TAG_CLOSE: {
              if (isTagNameCharacter(ch)) {
                buffer.push(ch);
              } else if (ch === ">") {
                let closedTag = buffer.join("");
                if (closedTag !== currentTagName) {
                  throw new Error("Expected " + currentTagName + " to be closed, but got " + closedTag);
                }
              }
              break;
            }
            case WAIT_ATTRIBUTE_OR_CLOSE_TAG: {
              if (ch === ">") {
                finishTag();
              } else if (isTagNameCharacter(ch)) {
                buffer = [ch];
                currentState = READ_ATTRIBUTE_NAME;
              } else {
                buffer.push(ch);
              }
              break;
            }
            case READ_ATTRIBUTE_NAME: {
              if (!isTagNameCharacter(ch)) {
                currentAttributeName = buffer.join("");
                if (ch === "=")
                  currentState = WAIT_ATTRIBUTE_VALUE;
                else if (ch === ">") {
                  lastElement.attributes.set(currentAttributeName, true);
                  finishTag();
                } else
                  currentState = WAIT_ATTRIBUTE_ASSIGNMENT_OR_NEXT_ATTRIBUTE;
              } else {
                buffer.push(ch);
              }
              break;
            }
            case WAIT_ATTRIBUTE_ASSIGNMENT_OR_NEXT_ATTRIBUTE: {
              if (ch === "=") {
                currentState = WAIT_ATTRIBUTE_VALUE;
              } else if (isTagNameCharacter(ch)) {
                currentState = READ_ATTRIBUTE_NAME;
                lastElement.attributes.set(buffer.join(""), true);
                buffer = [ch];
              } else if (ch === ">") {
                lastElement.attributes.set(buffer.join(""), true);
                finishTag();
              }
              break;
            }
            case WAIT_ATTRIBUTE_VALUE: {
              if (ch === '"' || ch === "'" || !isWhiteSpace(ch)) {
                buffer = [];
                currentState = READ_ATTRIBUTE_VALUE;
                closeAttributeSymbol = ch;
              }
              break;
            }
            case READ_ATTRIBUTE_VALUE: {
              if (ch === closeAttributeSymbol) {
                currentState = WAIT_ATTRIBUTE_OR_CLOSE_TAG;
                lastElement.attributes.set(currentAttributeName, buffer.join(""));
                currentAttributeName = null;
                buffer = [];
              } else {
                buffer.push(ch);
              }
              break;
            }
          }
        }
        function finishTag() {
          let l = buffer.length;
          notifyTagOpen(lastElement);
          if (l > 0 && buffer[l - 1] === "/") {
            notifyTagClose(lastElement);
            if (lastElement)
              lastElement = lastElement.parent;
          }
          currentState = WAIT_TAG_OPEN;
          innerText = [];
          currentAttributeName = null;
        }
      };
      function isTagNameCharacter(ch) {
        let code = ch.charCodeAt(0);
        return A <= code && code <= Z || ch === "_" || ch === "-" || ch === ":";
      }
      function isWhiteSpace(ch) {
        return whitespace.test(ch);
      }
    }
  });

  // lib/NumberParser.js
  var require_NumberParser = __commonJS({
    "lib/NumberParser.js"(exports, module) {
      var CharacterLookup = {
        "0": 0,
        "1": 1,
        "2": 2,
        "3": 3,
        "4": 4,
        "5": 5,
        "6": 6,
        "7": 7,
        "8": 8,
        "9": 9
      };
      var NumberParser = class {
        constructor() {
          this.value = 0;
          this.fractionValue = 0;
          this.divider = 1;
          this.exponent = 0;
          this.isNegative = false;
          this.hasValue = false;
          this.hasFraction = false;
          this.hasExponent = false;
        }
        getValue() {
          let value = this.value;
          if (this.hasFraction) {
            value += this.fractionValue / this.divider;
          }
          if (this.hasExponent) {
            value *= Math.pow(10, this.exponent);
          }
          if (this.isNegative) {
            return -value;
          }
          return value;
        }
        reset() {
          this.value = 0;
          this.fractionValue = 0;
          this.divider = 1;
          this.exponent = 0;
          this.isNegative = false;
          this.hasValue = false;
          this.hasFraction = false;
          this.hasExponent = false;
        }
        addCharacter(ch) {
          this.hasValue = true;
          if (ch === "-") {
            this.isNegative = true;
            return;
          }
          if (ch === ".") {
            if (this.hasFraction)
              throw new Error("Already has fractional part!");
            this.hasFraction = true;
            return;
          }
          if (ch === "e") {
            if (this.hasExponent)
              throw new Error("Already has exponent");
            this.hasExponent = true;
            this.exponent = 0;
            return;
          }
          let numValue = CharacterLookup[ch];
          if (numValue === void 0)
            throw new Error("Not a digit: " + ch);
          if (this.hasExponent) {
            this.exponent = this.exponent * 10 + numValue;
          } else if (this.hasFraction) {
            this.fractionValue = this.fractionValue * 10 + numValue;
            this.divider *= 10;
          } else {
            this.value = this.value * 10 + numValue;
          }
        }
      };
      module.exports = NumberParser;
    }
  });

  // lib/getPointsFromPathData.js
  var require_getPointsFromPathData = __commonJS({
    "lib/getPointsFromPathData.js"(exports, module) {
      var NumberParser = require_NumberParser();
      var processCommand = {
        M(points, lastNumbers) {
          if (lastNumbers.length % 2 !== 0) {
            throw new Error("Expected an even number of numbers for M command");
          }
          if (points.length === 0) {
            for (let i = 0; i < lastNumbers.length; i += 2) {
              points.push([lastNumbers[i], lastNumbers[i + 1]]);
            }
          } else {
            throw new Error('Only one "Move" command per path is expected');
          }
        },
        m(points, lastNumbers) {
          let lx = 0, ly = 0;
          if (points.length > 0 && lastNumbers.length > 1) {
            let last = points[points.length - 1];
            lx = last[0] + lastNumbers[0];
            ly = last[1] + lastNumbers[1];
            ;
          }
          for (let i = 2; i < lastNumbers.length; i += 2) {
            let x = lx + lastNumbers[i];
            let y = ly + lastNumbers[i + 1];
            points.push([x, y]);
            lx = x;
            ly = y;
          }
        },
        L(points, lastNumbers) {
          for (let i = 0; i < lastNumbers.length; i += 2) {
            points.push([lastNumbers[i], lastNumbers[i + 1]]);
          }
        },
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
            lx = x;
            ly = y;
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
      };
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
              lastNumbers.push(numParser.getValue());
            }
            numParser.reset();
            if (lastNumbers) {
              lastCommand(points, lastNumbers);
            }
            lastCommand = processCommand[ch];
            lastNumbers = [];
          } else if (ch === " " || ch === ",") {
            if (numParser.hasValue) {
              lastNumbers.push(numParser.getValue());
              numParser.reset();
            }
          } else if (ch === "Z" || ch === "z") {
          } else if (numParser.hasValue && ch === "-") {
            lastNumbers.push(numParser.getValue());
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
    }
  });

  // lib/getElementFillColor.js
  var require_getElementFillColor = __commonJS({
    "lib/getElementFillColor.js"(exports, module) {
      module.exports = function getElementFillColor(el) {
        return getColor(el.attributes.get("fill") || el.attributes.get("style"));
      };
      function getColor(styleValue) {
        if (styleValue[0] === "#") {
          if (styleValue.length === 1 + 6) {
            let r = Number.parseInt(styleValue.substr(1, 2), 16);
            let g = Number.parseInt(styleValue.substr(3, 2), 16);
            let b = Number.parseInt(styleValue.substr(5, 2), 16);
            return hexColor([r, g, b]);
          }
          if (styleValue.length === 1 + 3 || styleValue.length === 1 + 4) {
            let rs = styleValue.substr(1, 1);
            let gs = styleValue.substr(2, 1);
            let bs = styleValue.substr(3, 1);
            let r = Number.parseInt(rs + rs, 16);
            let g = Number.parseInt(gs + gs, 16);
            let b = Number.parseInt(bs + bs, 16);
            return hexColor([r, g, b]);
          }
          throw new Error("Cannot parse this color yet " + styleValue);
        } else if (styleValue.startsWith("rgba")) {
          let colors = styleValue.substr(5).split(/,/).map((x) => Number.parseFloat(x));
          colors[3] = Math.round(colors[3] * 255);
          return alphaHexColor(colors);
        }
        let rgb = styleValue.match(/fill:rgb\((.+?)\)/);
        let rgbArray;
        if (rgb) {
          rgbArray = rgb[1].split(",").map((x) => Number.parseInt(x, 10)).filter(finiteNumber);
        }
        if (!rgbArray) {
          rgb = styleValue.match(/fill:#([0-9a-fA-F]{6})/);
          if (rgb) {
            rgbArray = [
              Number.parseInt(rgb[1].substr(0, 2), 16),
              Number.parseInt(rgb[1].substr(2, 2), 16),
              Number.parseInt(rgb[1].substr(4, 2), 16)
            ];
          }
        }
        if (!rgbArray) {
          rgb = styleValue.match(/fill:#([0-9a-fA-F]{3})/);
          if (rgb) {
            let rs = rgb[1].substr(0, 1);
            let gs = rgb[1].substr(1, 1);
            let bs = rgb[1].substr(2, 1);
            rgbArray = [
              Number.parseInt(rs + rs, 16),
              Number.parseInt(gs + gs, 16),
              Number.parseInt(bs + bs, 16)
            ];
          }
        }
        if (rgbArray) {
          if (rgbArray.length !== 3) {
            throw new Error("Cannot parse this color yet " + styleValue);
          }
          return hexColor(rgbArray);
        }
        console.error("Cannot parse this color yet " + styleValue);
        throw new Error("Cannot parse this color yet " + styleValue);
      }
      function hexColor(arr) {
        return arr;
      }
      function alphaHexColor(arr) {
        return arr;
      }
      function finiteNumber(x) {
        return Number.isFinite(x);
      }
    }
  });

  // index.js
  var require_streaming_svg_parser = __commonJS({
    "index.js"(exports, module) {
      var createStreamingSVGParser = require_createStreamingSVGParser();
      var getPointsFromPathData = require_getPointsFromPathData();
      var NumberParser = require_NumberParser();
      var getElementFillColor = require_getElementFillColor();
      module.exports = {
        createStreamingSVGParser,
        getPointsFromPathData,
        NumberParser,
        getElementFillColor
      };
    }
  });
  return require_streaming_svg_parser();
})();
//# sourceMappingURL=streaming-svg-parser.js.map
