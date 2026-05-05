const fs = require('fs');
const path = require('path');

// args
let [templateArg, dataArg] = process.argv.slice(2);
let outputDir = 'dist';

if (!templateArg || !dataArg ) {
  console.error('Usage: node build.js <template> <data.json|path> ');
  process.exit(1);
}

// resolve template path
const templateFilePath = (templateArg.includes('/') || templateArg.includes('\\'))
  ? templateArg
  : path.join('./templates', templateArg.endsWith('.html') ? templateArg : `${templateArg}.html`);

// resolve data path
const dataPath = path.isAbsolute(dataArg)
  ? dataArg
  : path.join('./data', dataArg);


// validation
if (!fs.existsSync(templateFilePath)) {
  throw new Error(`Template not found: ${templateFilePath}`);
}

if (!fs.existsSync(dataPath)) {
  throw new Error(`Data file not found: ${dataPath}`);
}

const jobDir = path.dirname(dataPath);

// derive image folder
const templateFileName = path.basename(templateFilePath, '.html');
const imageFolderName = templateFileName.replace(/_(Front|Back)$/i, '');

// image paths
const imagesRoot = path.resolve('./images');
const templateImagesDir = path.join(imagesRoot, imageFolderName);
const commonImagesDir = path.join(imagesRoot, 'common');

// output
const outputAssetsDir = path.join(outputDir, 'assets');
fs.mkdirSync(outputAssetsDir, { recursive: true });

// load files
const template = fs.readFileSync(templateFilePath, 'utf-8');
const job = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

if (!job.data) {
  throw new Error('JSON must have a "data" object');
}

let result = template;

// image resolver
function resolveAndCopyImage(fileName) {
  const tryPaths = [
  path.join(jobDir, fileName),              // 1. data folder (highest priority)
  path.join(templateImagesDir, fileName),  // 2. template folder
  path.join(commonImagesDir, fileName)     // 3. common folder
];

  for (const sourcePath of tryPaths) {
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(outputAssetsDir, fileName);
      fs.copyFileSync(sourcePath, destPath);
      return `./assets/${fileName}`;
    }
  }

  throw new Error(`Image not found: ${fileName}`);
}

// replace tokens
for (const [key, value] of Object.entries(job.data)) {
  const token = `{{${key}}}`;

  let replacement = value;

  if (typeof value === 'string' && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(value)) {
    replacement = resolveAndCopyImage(value);
  }

  result = result.replaceAll(token, replacement);
}

// write output
const outputHtmlPath = path.join(outputDir, path.basename(templateFilePath));
fs.writeFileSync(outputHtmlPath, result, 'utf-8');

console.log(`Built: ${outputHtmlPath}`);