import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = dirname(__dirname);
const read = (p: string) => readFileSync(join(baseDir, p), 'utf8');

const html = read('index.html');
const css = read('css/styles.css');
const jsFiles = [
  'js/translations.js',
  'js/store.js',
  'js/db.js',
  'js/ai.js',
  'js/recipes.js',
  'js/nutrition.js',
  'js/components.js',
  'js/menu.js',
  'js/templates.js',
  'js/dragdrop.js',
  'js/shopping.js',
  'js/prep.js',
  'js/nutrition-panel.js',
  'js/app.js',
];

let newHtml = html;

// Inline CSS
newHtml = newHtml.replace('<link rel="stylesheet" href="css/styles.css">', `<style>${css}</style>`);

// Inline JS
for (const f of jsFiles) {
  const content = read(f);
  // Los scripts están al final del body con src... los reemplazamos con inline scripts
  const scriptSrcMatch = newHtml.match(/<script src="[^"]*"><\/script>/g) || [];
  // Agregar antes del comentario de SW
  newHtml = newHtml.replace(
    /(\s*)<!-- Service Worker \(PWA \/ Android install\) -->/,
    `$1${jsFiles.map((f) => `<script>${read(f)}</script>`).join('\n')}\n\n$1<!-- Service Worker (PWA / Android install) -->`
  );
}

writeFileSync(
  join(baseDir, 'src/components/legacy-web-html.ts'),
  `export const LEGACY_WEB_HTML = \`${newHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
`
);

console.log('Generated src/components/legacy-web-html.ts');
