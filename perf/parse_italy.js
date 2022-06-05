const fs = require('fs');
const path = require('path');
const lib = require('../index');
const inputFile = process.argv[2] || path.join(__dirname, 'data', 'italy.svg');

if(!fs.existsSync(inputFile)) {
  console.error(`File ${inputFile} not found. Try downloading file first using ./download.sh script`);
  process.exit(1);
}

let tagCount = 0;
let totalLength = 0;
const parseChunk = lib.createStreamingSVGParser(el => {
  tagCount += 1;
});

let readStream = fs.createReadStream(inputFile, 'utf8');
let start = performance.now();
readStream.on('data', chunk => {
  totalLength += chunk.length;
  parseChunk(chunk);
});
readStream.on('end', () => {
  let elapsed = performance.now() - start;
  console.log('File length is ' + prettyNumber(totalLength) + ' symbols');
  console.log('Processed ' + tagCount + ' tags in ' + elapsed + 'ms');
});

function prettyNumber(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}