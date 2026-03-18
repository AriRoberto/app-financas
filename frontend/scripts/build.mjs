import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(path.join(dist, 'src'), { recursive: true });

const indexHtml = fs
  .readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('/src/main.jsx', './src/main.jsx');

fs.writeFileSync(path.join(dist, 'index.html'), indexHtml, 'utf8');
fs.copyFileSync(path.join(root, 'src', 'main.jsx'), path.join(dist, 'src', 'main.jsx'));
fs.copyFileSync(path.join(root, 'src', 'App.jsx'), path.join(dist, 'src', 'App.jsx'));
fs.copyFileSync(path.join(root, 'src', 'styles.css'), path.join(dist, 'src', 'styles.css'));

console.log('frontend build completed: dist/ gerado com os assets locais do app.');
