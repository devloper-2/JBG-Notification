const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, 'assets/images/logo.png');
const outDir = path.join(__dirname, 'web/icons');
const faviconOut = path.join(__dirname, 'web/favicon.png');

async function makeIcon(size, outPath, padding = 0) {
  const padded = Math.round(size * padding);
  const inner = size - padded * 2;
  await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: padded, bottom: padded, left: padded, right: padded, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

(async () => {
  await makeIcon(192, `${outDir}/Icon-192.png`);
  await makeIcon(512, `${outDir}/Icon-512.png`);
  // maskable: 20% safe zone padding on each side
  await makeIcon(192, `${outDir}/Icon-maskable-192.png`, 0.2);
  await makeIcon(512, `${outDir}/Icon-maskable-512.png`, 0.2);
  await makeIcon(32, faviconOut);
  console.log('All icons generated.');
})();
