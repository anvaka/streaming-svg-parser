
// Possible states of SVG parsing
const WAIT_TAG_OPEN = 1;
const READ_TAG_OR_COMMENT = 2;
const READ_TAG = 3;
const READ_TAG_CLOSE = 4;
const READ_COMMENT = 5;
const WAIT_TAG_CLOSE = 6;
const WAIT_ATTRIBUTE_OR_CLOSE_TAG = 7;
const READ_ATTRIBUTE_NAME = 8;
const READ_ATTRIBUTE_VALUE = 9;
const WAIT_ATTRIBUTE_VALUE = 10;
const WAIT_ATTRIBUTE_ASSIGNMENT_OR_NEXT_ATTRIBUTE = 11;

const A = 'A'.charCodeAt(0);
const Z = 'z'.charCodeAt(0);
const whitespace = /\s/;

class XMLNode {
  constructor(name, parent) {
    this.children = [];
    this.attributes = new Map(),
    this.tagName = name;
    this.parent = parent;
  }
}

/**
 * Creates a new instance of the parser. Parser will consume chunk of text and will
 * notify the caller when new tag is opened or closed.
 * 
 * If `generateAsync` is true - the parser will break its own execution,
 * allowing UI thread to catch up. (Only for browser environment now)
 * 
 * @returns Function(chunk: String) - function that processes chunk of text
 * 
 * WARNING: This may not work correctly with multi-byte unicode characters
 */
module.exports = function createStreamingSVGParser(notifyTagOpen, notifyTagClose, generateAsync) {
  let currentState = WAIT_TAG_OPEN;
  let closeAttributeSymbol;
  let currentTagName;
  let currentAttributeName;
  let lastElement;
  let buffer;
  let innerText;
  if (notifyTagClose === undefined) {
    notifyTagClose = Function.prototype; // noop
  }

  return generateAsync ? processChunkAsync : processChunkSync;

  function processChunkAsync(chunk) {
    return new Promise(resolve => iterateSymbolsAsync(chunk, 0, resolve));
  }

  function iterateSymbolsAsync(chunk, idx, resolve) {
    let start = performance.now(); 
    let processed = 0;

    while (idx < chunk.length) {
      // Assuming each element is a symbol (i.e. this wouldn't work for unicode well).
      processSymbol(chunk[idx]);

      idx += 1;
      processed += 1;
      if (processed > 30000) {
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
      // Assuming each element is a symbol (i.e. this wouldn't work for unicode well).
      processSymbol(chunk[idx]);
      idx += 1;
    }
  }

  function processSymbol(ch) {
    switch (currentState) {
      case WAIT_TAG_OPEN: 
        if (ch === '<') {
          if (innerText && lastElement) {
            lastElement.innerText = innerText.join('');
            innerText = null;
          }
          currentState = READ_TAG_OR_COMMENT;
        } else if (innerText) {
          innerText.push(ch);
        }
        break;
      case WAIT_TAG_CLOSE: 
        if (ch === '>') currentState = WAIT_TAG_OPEN;
        break;
      case READ_TAG_OR_COMMENT: 
        if (ch === '!' || ch === '?') {
          buffer = [ch];
          currentState = READ_COMMENT;
        } else if (ch === '/') {
          if (innerText) {
            lastElement.innerText = innerText.join('');
            innerText = null;
          }
          notifyTagClose(lastElement);
          if (lastElement) lastElement = lastElement.parent;
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
        if (buffer.length > 3 && 
          buffer[l - 1] === '>' &&
          buffer[l - 2] === '-' &&
          buffer[l - 3] === '-') {
            currentState = WAIT_TAG_OPEN;
            innerText = null;
        } else if ((buffer[0] === '!' && (buffer.length > 1 && buffer[1] !== '-')) || // <!DOCTYPE
           buffer[0] === '?') currentState = WAIT_TAG_CLOSE; // <?xml
        break;
      }
      case READ_TAG: {
        if (isTagNameCharacter(ch)) {
          buffer.push(ch);
        } else if (ch === '/') {
          // <g/>
          // Skip this one, as next `READ_TAG` will close it.
        } else {
          currentTagName = buffer.join('');
          currentState = WAIT_ATTRIBUTE_OR_CLOSE_TAG;
          let parent = lastElement;
          lastElement = new XMLNode(currentTagName, parent);

          if (parent) parent.children.push(lastElement);
          if (ch === '>') finishTag();
        }
        break;
      }
      case READ_TAG_CLOSE: {
        if (isTagNameCharacter(ch)) {
          buffer.push(ch);
        } else if (ch === '>') {
          let closedTag = buffer.join('')
          if (closedTag !== currentTagName) {
            throw new Error('Expected ' + currentTagName + ' to be closed, but got ' + closedTag)
          }
        }

        break;
      }
      case WAIT_ATTRIBUTE_OR_CLOSE_TAG: {
        if (ch === '>') {
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
          currentAttributeName = buffer.join('');
          if (ch === '=') currentState = WAIT_ATTRIBUTE_VALUE;
          else if (ch === '>') {
            lastElement.attributes.set(currentAttributeName, true);
            finishTag();
          } else currentState = WAIT_ATTRIBUTE_ASSIGNMENT_OR_NEXT_ATTRIBUTE;
        } else {
          buffer.push(ch);
        }
        break;
      }
      case WAIT_ATTRIBUTE_ASSIGNMENT_OR_NEXT_ATTRIBUTE: {
        if (ch === '=') {
          currentState = WAIT_ATTRIBUTE_VALUE;
        } else if (isTagNameCharacter(ch)) {
          currentState = READ_ATTRIBUTE_NAME;
          // Case of a boolean attribute <path enabled d=... />
          lastElement.attributes.set(buffer.join(''), true);
          buffer = [ch];
        } else if (ch === '>') {
          lastElement.attributes.set(buffer.join(''), true);
          finishTag();
        }
        break;
      }
      case WAIT_ATTRIBUTE_VALUE: {
        if (ch === "\"" || ch === "'" || !isWhiteSpace(ch)) {
          buffer = [];
          currentState = READ_ATTRIBUTE_VALUE;
          // not 100% accurate!
          closeAttributeSymbol = ch;
        }
        // TODO: Might want to tighten validation here;
        break;
      }
      case READ_ATTRIBUTE_VALUE: {
        if (ch === closeAttributeSymbol) {
          currentState = WAIT_ATTRIBUTE_OR_CLOSE_TAG;
          lastElement.attributes.set(currentAttributeName, buffer.join(''));
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
    notifyTagOpen(lastElement); // we finished reading the attribute definition

    if (l > 0 && buffer[l - 1] === '/') {
      // a case of quick close <path />
      notifyTagClose(lastElement);
      // since we closed this tag, let's pop it, and wait for the sibling.
      if (lastElement) lastElement = lastElement.parent;
    }
    currentState = WAIT_TAG_OPEN;
    innerText = [];
    currentAttributeName = null;
  }
}

function isTagNameCharacter(ch) {
  let code = ch.charCodeAt(0);
  return (A <= code && code <= Z) || (ch === '_') || (ch === '-') || (ch === ':');
}

function isWhiteSpace(ch) {
  return whitespace.test(ch);
}
