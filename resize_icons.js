const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, 'assets/images/logo.png');
const iconsDir = path.join(__dirname, 'web/icons');

const sizes = [192, 512];

(async () => {
  for (const size of sizes) {
    // Regular icon (any)
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(path.join(iconsDir, `Icon-${size}.png`));

    // Maskable icon (safe zone: logo centered at 80% of canvas)
    const logoSize = Math.round(size * 0.8);
    await sharp(src)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.round((size - logoSize) / 2),
        bottom: Math.round((size - logoSize) / 2),
        left: Math.round((size - logoSize) / 2),
        right: Math.round((size - logoSize) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      })
      .png()
      .toFile(path.join(iconsDir, `Icon-maskable-${size}.png`));

    console.log(`✓ Generated ${size}px icons`);
  }

  // Also update favicon.png
  await sharp(src)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, 'web/favicon.png'));
  console.log('✓ Generated favicon.png');

  // Delete this script
  fs.unlinkSync(__filename);
  console.log('✓ Script deleted');
})();
