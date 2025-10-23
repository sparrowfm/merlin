const sharp = require('sharp');
const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
  const pngPath = path.join(__dirname, '..', 'build', 'icon.png');
  const icnsPath = path.join(__dirname, '..', 'build', 'icon.icns');

  console.log('Converting SVG to PNG...');

  // Convert SVG to 1024x1024 PNG
  await sharp(svgPath)
    .resize(1024, 1024)
    .png()
    .toFile(pngPath);

  console.log('PNG created:', pngPath);

  // Convert PNG to ICNS
  console.log('Converting PNG to ICNS...');
  const pngBuffer = fs.readFileSync(pngPath);
  const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0);
  fs.writeFileSync(icnsPath, icnsBuffer);

  console.log('ICNS created:', icnsPath);
  console.log('Icon generation complete!');
}

generateIcon().catch(console.error);
