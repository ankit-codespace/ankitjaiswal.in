const fs = require('fs');
const path = require('path');

function getJpegSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  let i = 2; // skip SOI marker
  while (i < buffer.length) {
    const marker = buffer.readUInt16BE(i);
    i += 2;
    if (marker === 0xFFC0 || marker === 0xFFC2) { // SOF0 or SOF2
      i += 3; // skip length & precision
      const height = buffer.readUInt16BE(i);
      i += 2;
      const width = buffer.readUInt16BE(i);
      return { width, height };
    }
    const length = buffer.readUInt16BE(i);
    i += length;
  }
  return null;
}

const file = path.resolve(__dirname, '..', 'artifacts', 'website', 'public', 'opengraph.jpg');
console.log(getJpegSize(file));
