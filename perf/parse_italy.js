const fs = require('fs');
const path = require('path');
const { createStreamingSVGParser, getPointsFromPathData } = require('../index');

const inputFile = process.argv[2] || path.join(__dirname, 'data', 'italy.svg');

if (!fs.existsSync(inputFile)) {
  console.error(`File ${inputFile} not found. Try downloading it first using ./downloadFiles.sh`);
  process.exit(1);
}

// Read the whole file into memory once, so the numbers reflect parsing speed
// rather than disk I/O. `bytes` drives MB/s; `chars` drives Mchar/s (they differ
// only if the file has multi-byte characters).
const buffer = fs.readFileSync(inputFile);
const text = buffer.toString('utf8');
const bytes = buffer.length;
const chars = text.length;
const CHUNK_SIZE = 1 << 16; // 64 KB, to emulate a streamed download

(async function main() {
  console.log(`Node ${process.version}`);
  console.log(`File: ${path.basename(inputFile)}`);
  console.log(`Size: ${pretty(bytes)} bytes / ${pretty(chars)} chars\n`);

  // 1. Whole-string sync parse: the raw state-machine throughput.
  const sync = await bench('parse (sync, one chunk)', () => countTags(text));

  // 2. Chunked parse: same work, but fed in 64 KB pieces like a network stream.
  const chunked = await bench('parse (sync, 64KB chunks)', () => countTagsChunked(text));

  // 3. Async parse: yields to the event loop to keep a UI responsive. Wall-clock
  //    here is dominated by the scheduler (setTimeout), not by parsing.
  const async = await bench('parse (async, yields)', () => countTagsAsync(text), { warmup: 1, samples: 3 });

  console.log('=== Tag parsing ===');
  report(sync, bytes, chars);
  report(chunked, bytes, chars);
  report(async, bytes, chars);
  console.log(`Tags found: ${sync.result}\n`);

  // 4. Path-data extraction: collect every <path d="..."> once, then benchmark
  //    turning that data into points. Uses only the d-attribute bytes for MB/s.
  const paths = collectPathData(text);
  const dChars = paths.reduce((sum, d) => sum + d.length, 0);
  const pathBench = await bench('getPointsFromPathData (all paths)', () => parseAllPaths(paths));

  console.log('=== Path data extraction ===');
  report(pathBench, dChars, dChars);
  const { totalPoints, ok, failed } = pathBench.result;
  console.log(`Paths: ${pretty(ok)} parsed, ${failed} threw (multi-"M" subpaths, unsupported)`);
  console.log(`Points: ${pretty(totalPoints)} (${msg(totalPoints / pathBench.min * 1000)} points/sec)`);
})();

// --- workloads ---------------------------------------------------------------

function countTags(input) {
  let tagCount = 0;
  const parse = createStreamingSVGParser(() => { tagCount += 1; });
  parse(input);
  return tagCount;
}

function countTagsChunked(input) {
  let tagCount = 0;
  const parse = createStreamingSVGParser(() => { tagCount += 1; });
  for (let i = 0; i < input.length; i += CHUNK_SIZE) {
    parse(input.slice(i, i + CHUNK_SIZE));
  }
  return tagCount;
}

function countTagsAsync(input) {
  let tagCount = 0;
  const parse = createStreamingSVGParser(() => { tagCount += 1; }, undefined, true);
  return parse(input).then(() => tagCount);
}

function collectPathData(input) {
  const paths = [];
  const parse = createStreamingSVGParser(el => {
    if (el.tagName === 'path') {
      const d = el.attributes.get('d');
      if (d) paths.push(d);
    }
  });
  parse(input);
  return paths;
}

function parseAllPaths(paths) {
  let totalPoints = 0, ok = 0, failed = 0;
  for (const d of paths) {
    try {
      totalPoints += getPointsFromPathData(d).length;
      ok += 1;
    } catch (e) {
      failed += 1;
    }
  }
  return { totalPoints, ok, failed };
}

// --- harness -----------------------------------------------------------------

async function bench(name, fn, { warmup = 2, samples = 5 } = {}) {
  for (let i = 0; i < warmup; i++) await fn();

  const times = [];
  let result;
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    result = await fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    name,
    result,
    min: times[0],
    median: times[Math.floor(times.length / 2)],
  };
}

function report({ name, min, median }, bytes, chars) {
  const mbPerSec = bytes / (1024 * 1024) / (min / 1000);
  const mcharPerSec = chars / 1e6 / (min / 1000);
  console.log(
    `${name.padEnd(34)} ${min.toFixed(1).padStart(7)} ms  (median ${median.toFixed(1)} ms)  ` +
    `${mbPerSec.toFixed(0).padStart(4)} MB/s  ${mcharPerSec.toFixed(1)} Mchar/s`
  );
}

function pretty(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function msg(x) {
  return pretty(Math.round(x));
}
