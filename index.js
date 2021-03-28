const createStreamingSVGParser = require('./lib/createStreamingSVGParser');
const getPointsFromPathData = require('./lib/getPointsFromPathData');
const NumberParser = require('./lib/NumberParser');
const getElementFillColor = require('./lib/getElementFillColor');

module.exports = {
  createStreamingSVGParser,
  getPointsFromPathData,
  NumberParser,

  // Somewhat specific methods. Defining it temporarily here. May go away
  getElementFillColor
}