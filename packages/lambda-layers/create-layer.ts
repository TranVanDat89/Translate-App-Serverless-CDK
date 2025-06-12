import * as fs from 'fs';
import * as path from 'path';

function copyRecursive(src: string, dest: string): void {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      copyRecursive(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function createLayerStructure(): void {
  console.log('Creating Lambda Layer structure...');

  const layerDir = path.join(__dirname, 'nodejs', 'node_modules', '@ohana', 'lambda-layers');
  const distDir = path.join(__dirname, 'dist');
  const packageJsonPath = path.join(__dirname, 'package.json');

  try {
    console.log('Creating directories...');
    fs.mkdirSync(layerDir, { recursive: true });

    if (!fs.existsSync(distDir)) {
      console.error('Error: dist directory not found. Please run "npm run build" first.');
      process.exit(1);
    }

    console.log('Copying built files...');
    copyRecursive(distDir, layerDir);

    console.log('Copying package.json...');
    fs.copyFileSync(packageJsonPath, path.join(layerDir, 'package.json'));

    console.log('✅ Lambda Layer structure created successfully!');
    console.log(`📁 Layer path: ${layerDir}`);

    const files = fs.readdirSync(layerDir);
    console.log('📋 Files in layer:');
    for (const file of files) {
      console.log(`   - ${file}`);
    }

  } catch (error: any) {
    console.error('❌ Error creating layer structure:', error.message);
    process.exit(1);
  }
}

createLayerStructure();
