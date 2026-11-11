// Test de la lógica de mover/intercambiar recetas (App._moveMealInWeek / _moveMealInTemplate)
const fs = require('node:fs');
function loadJsdom() {
  for (const p of ['jsdom', '/data/data/com.termux/files/home/.pi/scratch/node_modules/jsdom']) {
    try { return require(p); } catch (e) { /* siguiente */ }
  }
  console.error('Falta jsdom. Instalalo con:  npm i jsdom');
  process.exit(1);
}

const { JSDOM } = loadJsdom();

const ROOT = '/data/data/com.termux/files/home/repos/app-menu';
const dom = new JSDOM('<!DOCTYPE html><body><div id="main-content"></div></body>', { pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
};

const load = (file, varName) => {
  const src = fs.readFileSync(`${ROOT}/${file}`, 'utf8').replace(new RegExp(`^const ${varName} =`, 'm'), `global.${varName} =`);
  eval(src);
};
load('js/store.js', 'Store');
load('js/recipes.js', 'Recipes');
load('js/menu.js', 'Menu');
load('js/templates.js', 'Templates');

global.Components = { toast: { show: m => console.log('   [toast]', m) }, modal: { close() {} } };
global.T = { meals: { lunch: 'Almuerzo', dinner: 'Cena' } };

// app.js real (sin ejecutar el bootstrap del DOMContentLoaded)
const appSrc = fs.readFileSync(`${ROOT}/js/app.js`, 'utf8').replace(/^const App =/m, 'global.App =');
eval(appSrc.replace(/document.addEventListener('DOMContentLoaded', () => App.init());/, ''));

// stubs
Recipes._recipes = [
  { id: 'r1', nombre: 'Arroz a la cubana', tipoComida: 'almuerzo', ingredientes: [], pasos: [], nutricion: {} },
  { id: 'r2', nombre: 'Ensalada de pollo', tipoComida: 'cena', ingredientes: [], pasos: [], nutricion: {} },
  { id: 'r3', nombre: 'Merluza', tipoComida: 'cena', ingredientes: [], pasos: [], nutricion: {} },
];
Menu.init();
Menu._menu[Menu.getWeekKey()] = {
  monday: { lunch: 'r1', dinner: 'r2' },
  tuesday: { lunch: null, dinner: 'r3' },
  wednesday: { lunch: null, dinner: null },
  thursday: { lunch: null, dinner: null },
  friday: { lunch: null, dinner: null },
  saturday: { lunch: null, dinner: null },
  sunday: { lunch: null, dinner: null },
};
App.renderMenuView = () => {};   // no re-renderizar en el test

const results = [];
const check = (name, cond, extra = '') => {
  results.push(cond);
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};
const wk = () => Menu.getCurrentWeek();

console.log('=== MENÚ SEMANAL ===');
// 1) mover a celda vacía
App._moveMealInWeek({ from: { day: 'monday', meal: 'lunch' }, to: { day: 'tuesday', meal: 'lunch' } });
check('mover a celda vacía: origen queda vacío', wk().monday.lunch === null);
check('mover a celda vacía: destino recibe la receta', wk().tuesday.lunch === 'r1');

// 2) intercambiar con celda ocupada
App._moveMealInWeek({ from: { day: 'tuesday', meal: 'lunch' }, to: { day: 'tuesday', meal: 'dinner' } });
check('intercambiar: origen toma la receta del destino', wk().tuesday.lunch === 'r3');
check('intercambiar: destino toma la receta del origen', wk().tuesday.dinner === 'r1');

// 3) mover a la misma celda → no hace nada
const before = JSON.stringify(wk());
App._moveMealInWeek({ from: { day: 'monday', meal: 'dinner' }, to: { day: 'monday', meal: 'dinner' } });
check('mover a la misma celda → no cambia nada', JSON.stringify(wk()) === before);

// 4) se persistió en localStorage
const saved = JSON.parse(mem['menuapp_menu'] || '{}');
check('se guardó en localStorage', saved[Menu.getWeekKey()]?.tuesday?.lunch === 'r3');

console.log('\n=== PLANTILLA ===');
Templates.init();
Templates._list = [{
  id: 'tpl1', nombre: 'Semana tipo', descripcion: '',
  dias: {
    monday: { lunch: 'r1', dinner: 'r2' },
    tuesday: { lunch: null, dinner: 'r3' },
    wednesday: { lunch: null, dinner: null },
    thursday: { lunch: null, dinner: null },
    friday: { lunch: null, dinner: null },
    saturday: { lunch: null, dinner: null },
    sunday: { lunch: null, dinner: null },
  },
  updatedAt: new Date().toISOString(),
}];
Templates._currentId = 'tpl1';
App.renderTemplateView = () => {};

App._moveMealInTemplate({ from: { day: 'monday', meal: 'lunch' }, to: { day: 'wednesday', meal: 'lunch' } });
check('plantilla: mover a celda vacía', Templates.getCurrent().dias.wednesday.lunch === 'r1' && Templates.getCurrent().dias.monday.lunch === null);

App._moveMealInTemplate({ from: { day: 'tuesday', meal: 'dinner' }, to: { day: 'wednesday', meal: 'lunch' } });
check('plantilla: intercambiar', Templates.getCurrent().dias.wednesday.lunch === 'r3' && Templates.getCurrent().dias.tuesday.dinner === 'r1');

check('plantilla: se guardó en localStorage', JSON.parse(mem['menuapp_templates'] || '[]')[0]?.dias?.wednesday?.lunch === 'r3');

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} tests OK`);
process.exit(failed ? 1 : 0);
