/**
 * Streaming parser of numbers.
 */
const CharacterLookup = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9
}

/**
 * Naive parser of integer numbers. Optimized for memory consumption and
 * CPU performance. Not very strong on validation side.
 */
class NumberParser {
  constructor() {
    this.value = 0;
    this.fractionValue = 0;
    this.divider = 1;
    this.exponent = 0;
    this.isNegative = false;
    this.hasValue = false;
    this.hasFraction = false;
    this.hasExponent = false
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
    this.hasExponent = false
  }

  addCharacter(ch) {
    this.hasValue = true;
    if (ch === '-') {
      this.isNegative = true;
      return;
    }
    if (ch === '.') {
      if (this.hasFraction) throw new Error('Already has fractional part!');
      this.hasFraction = true;
      return;
    }
    if (ch === 'e') {
      if (this.hasExponent) throw new Error('Already has exponent');
      this.hasExponent = true;
      this.exponent = 0;
      return;
    }

    let numValue = CharacterLookup[ch];
    if (numValue === undefined) throw new Error('Not a digit: ' + ch)

    if (this.hasExponent) {
      this.exponent = this.exponent * 10 + numValue;
    } else if (this.hasFraction) {
      this.fractionValue = this.fractionValue * 10 + numValue;
      this.divider *= 10;
    } else {
      this.value = this.value * 10 + numValue;
    }
  }
}

module.exports = NumberParser;