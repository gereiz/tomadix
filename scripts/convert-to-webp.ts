import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function convertImage(filePath: string) {
  const ext = path.extname(filePath);
  const webpPath = filePath.slice(0, -ext.length) + '.webp';
  
  const originalSize = fs.statSync(filePath).size;
  
  await sharp(filePath)
    .webp({ quality: 85, effort: 6 })
    .toFile(webpPath);
    
  const newSize = fs.statSync(webpPath).size;
  const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
  
  console.log(`Converted: ${path.relative(process.cwd(), filePath)} (${(originalSize / 1024).toFixed(1)} KB) -> ${path.relative(process.cwd(), webpPath)} (${(newSize / 1024).toFixed(1)} KB) [-${reduction}%]`);
  return { originalSize, newSize };
}

async function run() {
  const targets = [
    path.join(process.cwd(), 'public', 'sample-cinematic.png'),
    path.join(process.cwd(), 'public', 'studio-references', 'black-white-grain.jpg'),
    path.join(process.cwd(), 'public', 'studio-references', 'chiaroscuro.jpg'),
    path.join(process.cwd(), 'public', 'studio-references', 'golden-hour.jpg'),
    path.join(process.cwd(), 'public', 'studio-references', 'motion-blur.jpg'),
    path.join(process.cwd(), 'public', 'studio-references', 'neon-noir.jpg'),
    path.join(process.cwd(), 'public', 'studio-references', 'soft-window-light.jpg'),
  ];

  // Also find generated images
  const genDir = path.join(process.cwd(), 'public', 'generated-images');
  if (fs.existsSync(genDir)) {
    const findJpgs = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          findJpgs(full);
        } else if (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')) {
          targets.push(full);
        }
      }
    };
    findJpgs(genDir);
  }

  let totalOriginal = 0;
  let totalNew = 0;

  for (const t of targets) {
    if (fs.existsSync(t)) {
      const { originalSize, newSize } = await convertImage(t);
      totalOriginal += originalSize;
      totalNew += newSize;
    }
  }

  console.log('----------------------------------------------------');
  console.log(`TOTAL BEFORE: ${(totalOriginal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`TOTAL AFTER:  ${(totalNew / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`SAVED:        ${((1 - totalNew / totalOriginal) * 100).toFixed(1)}% payload reduction!`);
}

run().catch(console.error);

