const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'src/images/favicon-source.svg');
const logoPath = path.join(rootDir, 'src/images/logo.png');
const faviconsDir = path.join(rootDir, 'src/images/favicons');
const favicon32Path = path.join(faviconsDir, 'favicon-32x32.png');
const faviconIcoPath = path.join(faviconsDir, 'favicon.ico');

const pngTargets = [
  { path: logoPath, size: 512 },
  { path: path.join(faviconsDir, 'favicon-16x16.png'), size: 16 },
  { path: favicon32Path, size: 32 },
  { path: path.join(faviconsDir, 'favicon-96x96.png'), size: 96 },
  { path: path.join(faviconsDir, 'android-icon-36x36.png'), size: 36 },
  { path: path.join(faviconsDir, 'android-icon-48x48.png'), size: 48 },
  { path: path.join(faviconsDir, 'android-icon-72x72.png'), size: 72 },
  { path: path.join(faviconsDir, 'android-icon-96x96.png'), size: 96 },
  { path: path.join(faviconsDir, 'android-icon-144x144.png'), size: 144 },
  { path: path.join(faviconsDir, 'android-icon-192x192.png'), size: 192 },
  { path: path.join(faviconsDir, 'apple-icon-57x57.png'), size: 57 },
  { path: path.join(faviconsDir, 'apple-icon-60x60.png'), size: 60 },
  { path: path.join(faviconsDir, 'apple-icon-72x72.png'), size: 72 },
  { path: path.join(faviconsDir, 'apple-icon-76x76.png'), size: 76 },
  { path: path.join(faviconsDir, 'apple-icon-114x114.png'), size: 114 },
  { path: path.join(faviconsDir, 'apple-icon-120x120.png'), size: 120 },
  { path: path.join(faviconsDir, 'apple-icon-144x144.png'), size: 144 },
  { path: path.join(faviconsDir, 'apple-icon-152x152.png'), size: 152 },
  { path: path.join(faviconsDir, 'apple-icon-180x180.png'), size: 180 },
  { path: path.join(faviconsDir, 'apple-icon.png'), size: 180 },
  { path: path.join(faviconsDir, 'apple-icon-precomposed.png'), size: 180 },
  { path: path.join(faviconsDir, 'ms-icon-70x70.png'), size: 70 },
  { path: path.join(faviconsDir, 'ms-icon-144x144.png'), size: 144 },
  { path: path.join(faviconsDir, 'ms-icon-150x150.png'), size: 150 },
  { path: path.join(faviconsDir, 'ms-icon-310x310.png'), size: 310 },
];

async function generatePng(svgBuffer, targetPath, size) {
  await sharp(svgBuffer, { density: 512 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(targetPath);
}

async function main() {
  const svgBuffer = fs.readFileSync(svgPath);

  fs.mkdirSync(faviconsDir, { recursive: true });

  await Promise.all(
    pngTargets.map(target => generatePng(svgBuffer, target.path, target.size)),
  );

  execFileSync('sips', ['-s', 'format', 'ico', favicon32Path, '--out', faviconIcoPath], {
    stdio: 'ignore',
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
