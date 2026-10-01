const sharp = require('sharp');
const fs = require('fs');

const inputPath = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\5110469c-d977-47ea-8aa6-4c907c5ba403\\.user_uploaded\\media_1790851749929.png';

async function processImages() {
  // Generate 192x192
  await sharp(inputPath).resize(192, 192).toFile('public/android-chrome-192x192.png');
  // Generate 512x512
  await sharp(inputPath).resize(512, 512).toFile('public/android-chrome-512x512.png');
  
  // Generate SVG with base64 embedded
  const buffer = fs.readFileSync(inputPath);
  const base64 = buffer.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image href="data:image/png;base64,${base64}" width="512" height="512" /></svg>`;
  fs.writeFileSync('public/icon.svg', svg);
  
  // Write manifest.json
  const manifest = {
    "name": "SwiftParcel Courier Hub",
    "short_name": "SwiftParcel",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0f172a",
    "theme_color": "#3b82f6",
    "icons": [
      {
        "src": "/android-chrome-192x192.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/android-chrome-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ]
  };
  fs.writeFileSync('public/manifest.json', JSON.stringify(manifest, null, 2));
}

processImages().catch(console.error);
