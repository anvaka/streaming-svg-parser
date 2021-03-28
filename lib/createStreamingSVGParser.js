
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

const latinFrom = 'A'.charCodeAt(0);
const latinTo = 'z'.charCodeAt(0);
const whitespace = /\s/;

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
  let currentTagName;
  let currentAttributeName;
  let lastElement;
  let buffer;

  return generateAsync ? processChunkAsync : processChunkSync;

  function processChunkAsync(chunk) {
    return new Promise(resolve => iterateSymbolsAsync(chunk, 0, resolve));
  }

  function iterateSymbolsAsync(chunk, idx, resolve) {
    let start = window.performance.now(); // TODO: add node support
    let processed = 0;

    while (idx < chunk.length) {
      // Assuming each element is a symbol (i.e. this wouldn't work for unicode well).
      processSymbol(chunk[idx]);

      idx += 1;
      processed += 1;
      if (processed > 30000) {
        let elapsed = window.performance.now() - start;
        if (elapsed > 32) {
          setTimeout(() => iterateSymbols(chunk, idx, resolve), 0);
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
        if (ch === '<') currentState = READ_TAG_OR_COMMENT;
        break;
      case WAIT_TAG_CLOSE: 
        if (ch === '>') currentState = WAIT_TAG_OPEN;
        break;
      case READ_TAG_OR_COMMENT: 
        if (ch === '!' || ch === '?') {
          buffer = [ch];
          currentState = READ_COMMENT;
        } else if (ch === '/') {
          notifyTagClose(lastElement);
          if (lastElement) lastElement = lastElement.parent;
          currentState = WAIT_TAG_CLOSE;
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
          buffer[l - 3] === '-') currentState = WAIT_TAG_OPEN;
        else if (buffer[0] === '!' || // <!DOCTYPE
           buffer[0] === '?') currentState = WAIT_TAG_CLOSE; // <?xml
        break;
      }
      case READ_TAG: {
        if (isTagNameCharacter(ch)) {
          buffer.push(ch);
        } else if (ch === '/') {
          // <g></g> reading last </g> part
          currentState = READ_TAG_CLOSE;
          buffer = [];
        } else {
          currentTagName = buffer.join('');
          currentState = WAIT_ATTRIBUTE_OR_CLOSE_TAG;
          let parent = lastElement;
          lastElement = {
            tagName: currentTagName,
            attributes: new Map(),
            parent,
            children: []
          }
          if (parent) {
            parent.children.push(lastElement);
          }
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
          let l = buffer.length;
          notifyTagOpen(lastElement); // we finished reading the attribute definition

          if (l > 0 && buffer[l - 1] === '/') {
            // a case of quick close <path />
            notifyTagClose(lastElement);
            // since we closed this tag, let's pop it, and wait for the sibling.
            if (lastElement) lastElement = lastElement.parent;
          }
          currentState = WAIT_TAG_OPEN;
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
          if (ch === '=') currentState = WAIT_ATTRIBUTE_VALUE;
          else currentState = WAIT_ATTRIBUTE_ASSIGNMENT_OR_NEXT_ATTRIBUTE;
          currentAttributeName = buffer.join('');
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
          lastElement.attributes.set(buffer.join(''), true)
          buffer = [ch];
        }
        break;
      }
      case WAIT_ATTRIBUTE_VALUE: {
        if (ch === "\"" || ch === "'" || !isWhiteSpace(ch)) {
          buffer = [];
          currentState = READ_ATTRIBUTE_VALUE;
        }
        // TODO: Might want to tighten validation here;
        break;
      }
      case READ_ATTRIBUTE_VALUE: {
        if (ch === "\"" || ch === "'") {
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
}

function isTagNameCharacter(ch) {
  let code = ch.charCodeAt(0);
  return (latinFrom <= code && code <= latinTo) || (ch === '_') || (ch === '-') || (ch === ':');
}

function isWhiteSpace(ch) {
  return whitespace.test(ch);
}
