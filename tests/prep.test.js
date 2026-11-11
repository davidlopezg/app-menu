// Test del plan de preparación (jsdom)
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
const dom = new JSDOM('<!DOCTYPE html><body></body>', { pretendToBeVisual: true });
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
  const src = fs.readFileSync(`${ROOT}/${file}`, 'utf8').replace(`const ${varName} =`, `global.${varName} =`);
  eval(src);
};
load('js/translations.js', 'T');
load('js/store.js', 'Store');
load('js/recipes.js', 'Recipes');
load('js/menu.js', 'Menu');
load('js/prep.js', 'Prep');

const results = [];
const check = (name, cond, extra = '') => {
  results.push(cond);
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

// --- recetas de prueba ---
Recipes._recipes = [
  { id: 'r1', nombre: 'Merluza al horno con patatas', tipoComida: 'cena', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Merluza en rodajas', cantidad: '4', unidad: 'unidad' },
      { nombre: 'Patatas', cantidad: '500', unidad: 'g' },
    ], pasos: ['Precalentar', 'Hornear'] },
  { id: 'r2', nombre: 'Ensalada de tomate y atún', tipoComida: 'cena', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Tomates', cantidad: '3', unidad: 'ud' },
      { nombre: 'Atún en lata', cantidad: '2', unidad: 'latas' },
    ], pasos: ['Cortar'] },
  { id: 'r3', nombre: 'Pollo al horno con patatas', tipoComida: 'almuerzo', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Pollo', cantidad: '1', unidad: 'kg' },
      { nombre: 'Patatas', cantidad: '500', unidad: 'g' },
    ], pasos: ['Marinar', 'Hornear'] },
  { id: 'r4', nombre: 'Arroz con pollo', tipoComida: 'almuerzo', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Arroz blanco', cantidad: '300', unidad: 'g' },
      { nombre: 'Pollo', cantidad: '500', unidad: 'g' },
    ], pasos: ['Sofreír', 'Cocinar'] },
  { id: 'r5', nombre: 'Guiso de lentejas', tipoComida: 'almuerzo', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Lentejas', cantidad: '300', unidad: 'g' },
      { nombre: 'Zanahoria', cantidad: '2', unidad: 'ud' },
    ], pasos: ['Cocer'] },
  { id: 'r6', nombre: 'Tortilla de patatas', tipoComida: 'cena', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Patatas', cantidad: '300', unidad: 'g' },
      { nombre: 'Huevos', cantidad: '4', unidad: 'ud' },
    ], pasos: ['Freír', 'Mezclar'] },
];

Menu.init();
Menu._menu[Menu.getWeekKey()] = {
  monday:    { lunch: 'r3', dinner: null },   // Pollo al horno
  tuesday:   { lunch: null,   dinner: null },
  wednesday: { lunch: 'r4', dinner: null },   // Arroz con pollo
  thursday:  { lunch: 'r5', dinner: null },   // Guiso de lentejas
  friday:    { lunch: null,   dinner: 'r2' }, // Ensalada
  saturday:  { lunch: null,   dinner: 'r1' }, // Merluza
  sunday:    { lunch: null,   dinner: null },
};

Prep.init();

console.log('=== CONSERVA ===');
check('pescado → 0 días (se hace el día que se come)', Prep.conservaDias(Recipes._recipes[0]).dias === 0,
  String(Prep.conservaDias(Recipes._recipes[0]).dias));
check('ensalada → 0 días', Prep.conservaDias(Recipes._recipes[1]).dias === 0);
check('pollo → 2 días', Prep.conservaDias(Recipes._recipes[2]).dias === 2);
check('arroz con pollo → 3 días (manda el arroz)', Prep.conservaDias(Recipes._recipes[3]).dias === 3);
check('guiso de lentejas → 4 días (legumbre)', Prep.conservaDias(Recipes._recipes[4]).dias === 4);
check('tortilla → 2 días', Prep.conservaDias(Recipes._recipes[5]).dias === 2);

console.log('\n=== PLAN ===');
const plan = Prep.buildPlan();
const sesionDe = (nombre) => plan.sesiones.find(s => s.platos.some(p => p.nombre === nombre));

check('la merluza se prepara el sábado (el día que se come)',
  sesionDe('Merluza al horno con patatas')?.dia === 5,
  String(sesionDe('Merluza al horno con patatas')?.dia));
check('la ensalada se prepara el viernes (el día que se come)',
  sesionDe('Ensalada de tomate y atún')?.dia === 4,
  String(sesionDe('Ensalada de tomate y atún')?.dia));
check('el pollo y el arroz con pollo van a la MISMA sesión (batch)',
  sesionDe('Pollo al horno con patatas') === sesionDe('Arroz con pollo'),
  JSON.stringify(plan.sesiones.map(s => `${s.dia}:${s.platos.map(p => p.nombre).join('+')}`)));
check('el batch se hace el lunes (el día del primer consumo)',
  sesionDe('Pollo al horno con patatas')?.dia === 0,
  String(sesionDe('Pollo al horno con patatas')?.dia));
check('el motivo del arroz con pollo explica que se calienta',
  sesionDe('Arroz con pollo')?.platos.find(p => p.nombre === 'Arroz con pollo')?.motivo.includes('se calienta'),
  sesionDe('Arroz con pollo')?.platos.find(p => p.nombre === 'Arroz con pollo')?.motivo);
check('la sesión con dos platos avisa del trabajo compartido',
  sesionDe('Pollo al horno con patatas')?.compartidas.includes('pollo'),
  JSON.stringify(sesionDe('Pollo al horno con patatas')?.compartidas));

console.log('\n=== DÍAS LIBRES ===');
check('marques y domingo quedan sin cocina', plan.diasLibres.includes(1) && plan.diasLibres.includes(6),
  JSON.stringify(plan.diasLibres));
check('el plan cuenta 5 platos y 4 sesiones', plan.nPlatos === 5 && plan.sesiones.length === 4,
  `platos=${plan.nPlatos} sesiones=${plan.sesiones.length}`);
check('el día de compra es el domingo anterior a la primera sesión',
  plan.diaCompra === -1, String(plan.diaCompra));

console.log('\n=== MISMA RECETA DOS VECES ===');
Menu._menu[Menu.getWeekKey()].monday.dinner = 'r6';   // tortilla el lunes
Menu._menu[Menu.getWeekKey()].friday.lunch = 'r6';    // ... y el viernes
const plan2 = Prep.buildPlan();
const tortilla = plan2.platos.find(p => p.nombre === 'Tortilla de patatas');
check('la receta repetida avisa que hay que hacerla de nuevo',
  tortilla.ultimoDia - tortilla.primerDia > tortilla.conserva,
  `primer=${tortilla.primerDia} ultimo=${tortilla.ultimoDia} conserva=${tortilla.conserva}`);
check('los platos del lunes quedan en una sola sesión',
  plan2.sesiones.filter(s => s.dia === 0).length === 1 && plan2.sesiones[0].platos.length >= 2,
  JSON.stringify(plan2.sesiones.map(s => `${s.dia}:${s.platos.map(p => p.nombre).join('+')}`)));

console.log('\n=== CHECKLIST ===');
check('nada hecho al empezar', Prep.hechos().length === 0);
Prep.toggleHecho('r3');
check('marcar una elaboración queda guardado', Prep.estaHecho('r3') && Prep.hechos().length === 1);
check('las otras siguen sin marcar', !Prep.estaHecho('r4'));
Prep.toggleHecho('r3');
check('desmarcar lo saca', !Prep.estaHecho('r3') && Prep.hechos().length === 0);

console.log('\n=== TEXTO PARA COPIAR ===');
const texto = Prep.textoPlan(plan);
check('el texto tiene el día de cada sesión', texto.includes('Lunes') && texto.includes('Sábado'));
check('el texto incluye el batch', texto.includes('pollo en los 2 platos'), texto.split('\n').find(l => l.includes('pollo')));

console.log('\n=== COCINAR POR ADELANTADO ===');
// Semana nueva: un plato que aguanta (carne, 2 días) el martes + otro el miércoles
Recipes._recipes.push({
  id: 'r7', nombre: 'Lomo con pimientos', tipoComida: 'almuerzo', tags: [], nutricion: {},
  ingredientes: [
    { nombre: 'Lomo de cerdo', cantidad: '600', unidad: 'g' },
    { nombre: 'Pimientos', cantidad: '2', unidad: 'ud' },
  ], pasos: ['Saltear', 'Cocer'],
});
Menu._menu[Menu.getWeekKey()] = {
  monday:    { lunch: null,   dinner: null },
  tuesday:   { lunch: 'r7',   dinner: null },   // Lomo (aguanta 2 días)
  wednesday: { lunch: 'r5',   dinner: null },   // Guiso de lentejas (aguanta 4)
  thursday:  { lunch: null,   dinner: null },
  friday:    { lunch: null,   dinner: null },
  saturday:  { lunch: null,   dinner: null },
  sunday:    { lunch: null,   dinner: null },
};
const plan3 = Prep.buildPlan();
const sesionLomo = plan3.sesiones.find(s => s.platos.some(p => p.nombre === 'Lomo con pimientos'));
check('lomo (mar) y guiso (mié) van a una sola sesión',
  plan3.sesiones.length === 1 && sesionLomo?.dia === 1,
  JSON.stringify(plan3.sesiones.map(s => `${s.dia}:${s.platos.map(p => p.nombre).join('+')}`)));
check('el guiso se calienta al día siguiente',
  sesionLomo?.platos.find(p => p.nombre === 'Guiso de lentejas')?.motivo.includes('se calienta'),
  sesionLomo?.platos.find(p => p.nombre === 'Guiso de lentejas')?.motivo);
check('la ventana nunca hace cocinar un plato después de comerlo',
  plan3.sesiones.every(s => s.platos.every(p => s.dia <= p.primerDia)),
  JSON.stringify(plan3.sesiones.map(s => `${s.dia}:${s.platos.map(p => `${p.nombre}(${p.primerDia})`).join('+')}`)));
check('nunca se cocina antes de que se pudra',
  plan3.sesiones.every(s => s.platos.every(p => s.dia >= p.primerDia - Math.min(p.conserva, Prep.MAX_DIAS_ADELANTO))),
  JSON.stringify(plan3.sesiones.map(s => `${s.dia}:${s.platos.map(p => `${p.nombre}(${p.primerDia},${p.conserva})`).join('+')}`)));

console.log('\n=== RENDER (smoke) ===');
// DOM mínimo + stubs para renderizar la vista de verdad
// (volvemos a la semana completa para ver varias sesiones)
Menu._menu[Menu.getWeekKey()] = {
  monday:    { lunch: 'r3', dinner: null },
  tuesday:   { lunch: null,   dinner: null },
  wednesday: { lunch: 'r4', dinner: null },
  thursday:  { lunch: 'r5', dinner: null },
  friday:    { lunch: null,   dinner: 'r2' },
  saturday:  { lunch: null,   dinner: 'r1' },
  sunday:    { lunch: null,   dinner: null },
};
document.body.innerHTML = `
  <header><button id="btn-back"></button><h1 id="header-title"></h1><button id="btn-menu"></button></header>
  <main id="main-content"></main>
  <nav id="nav-tabs"><button class="nav-tab" data-view="menu"></button></nav>`;
global.Components = {
  escapeHtml: s => String(s ?? ''),
  mealCell: () => '<div class="meal-cell"></div>',
  toast: { show: () => {} },
  modal: { open() {}, close() {} },
};
global.DB = { isAuth: () => false };
global.Shopping = { buildList: () => [] };
global.Templates = { hasAny: () => false };
global.AI = { hasKey: () => false };
global.NutritionPanel = { render: () => '' };

const appSrc = fs.readFileSync(`${ROOT}/js/app.js`, 'utf8').replace(/^const App =/m, 'global.App =');
eval(appSrc.replace(/document.addEventListener\('DOMContentLoaded', \(\) => App\.init\(\)\);/, ''));

App.renderPrepView();
const html = document.getElementById('main-content').innerHTML;
check('la vista de preparación se renderiza', html.includes('prep-summary') && html.includes('prep-day'));
check('la vista lista las sesiones con su día', html.includes('Lunes') && html.includes('platos'));
check('la vista avisa del trabajo compartido', html.includes('pollo en los 2 platos'), html.match(/prep-batch[^<]*/)?.[0]);
check('el check está en cada elaboración, no en el día',
  html.includes('App.togglePrepPlato') && !html.includes('App.togglePrepDay'),
  `${html.includes('App.togglePrepPlato')} / ${html.includes('App.togglePrepDay')}`);
check('el día usa el mismo formato que las categorías de la lista',
  html.includes('prep-day__head') && html.includes('prep-day__count') && !html.includes('prep-day__progress'));

App.renderMenuView();
const menuHtml = document.getElementById('main-content').innerHTML;
check('el menú tiene el botón de la lista de la compra', menuHtml.includes('Ver lista de la compra'));
check('el menú tiene el botón de preparación debajo',
  menuHtml.indexOf('Ver lista de la compra') < menuHtml.indexOf('Plan de preparación'),
  `${menuHtml.indexOf('Ver lista de la compra')} < ${menuHtml.indexOf('Plan de preparación')}`);

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} tests OK`);
process.exit(failed ? 1 : 0);
