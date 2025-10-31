#!/usr/bin/env node
/**
 * Auto-crop logo images to remove white space
 * Requires: sharp npm package
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoLightPath = path.join(__dirname, '../frontend/public/aifinity-logo.png');
const logoDarkPath = path.join(__dirname, '../frontend/public/aifinity-logo-dark.png');

async function cropLogo(inputPath, outputPath) {
  try {
    console.log(`\n🔄 Processing: ${path.basename(inputPath)}`);
    
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`   Original size: ${metadata.width}x${metadata.height}`);
    
    // Auto-crop: trim transparent/white edges
    const image = sharp(inputPath);
    
    // Get the trimmed image
    const trimmed = await image
      .trim({
        threshold: 10, // Threshold for what is considered "background"
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Trim white/transparent
      })
      .toBuffer();
    
    // Get new dimensions
    const trimmedMetadata = await sharp(trimmed).metadata();
    console.log(`   Trimmed size: ${trimmedMetadata.width}x${trimmedMetadata.height}`);
    
    // Add padding (10px on each side)
    const finalImage = await sharp(trimmed)
      .extend({
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent padding
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);
    
    console.log(`   ✅ Saved: ${path.basename(outputPath)}`);
    console.log(`   Final size: ${finalImage.width}x${finalImage.height}`);
    
    // Get file sizes
    const fs = await import('fs');
    const originalSize = fs.statSync(inputPath).size;
    const newSize = fs.statSync(outputPath).size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`   Size: ${(originalSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${savings}% reduction)`);
    
    return finalImage;
  } catch (error) {
    console.error(`   ❌ Error processing ${path.basename(inputPath)}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🎨 Auto-cropping AiFinity logos...\n');
  
  try {
    // Check if sharp is installed
    try {
      await import('sharp');
    } catch (e) {
      console.error('❌ Sharp package not found. Installing...\n');
      const { execSync } = await import('child_process');
      execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    }
    
    // Create backup
    const fs = await import('fs');
    const backupDir = path.join(__dirname, '../frontend/public/logo-backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(logoLightPath, path.join(backupDir, `aifinity-logo-backup-${timestamp}.png`));
    fs.copyFileSync(logoDarkPath, path.join(backupDir, `aifinity-logo-dark-backup-${timestamp}.png`));
    console.log('✅ Backups created\n');
    
    // Crop logos
    await cropLogo(logoLightPath, logoLightPath);
    await cropLogo(logoDarkPath, logoDarkPath);
    
    console.log('\n✅ All logos cropped successfully!');
    console.log('\n💡 Original files backed up in: frontend/public/logo-backup/');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

