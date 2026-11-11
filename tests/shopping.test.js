// Test de la lista de la compra y el libro de precios (jsdom)
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
load('js/store.js', 'Store');
load('js/recipes.js', 'Recipes');
load('js/menu.js', 'Menu');
load('js/shopping.js', 'Shopping');

const results = [];
const check = (name, cond, extra = '') => {
  results.push(cond);
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

// --- recetas de prueba ---
Recipes._recipes = [
  { id: 'r1', nombre: 'Arroz con tomate', tipoComida: 'almuerzo', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Arroz blanco', cantidad: '300', unidad: 'g' },
      { nombre: 'Tomate triturado', cantidad: '400', unidad: 'g' },
      { nombre: 'Ajo', cantidad: '2', unidad: 'dientes' },
      { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
    ], pasos: [] },
  { id: 'r2', nombre: 'Pollo al horno', tipoComida: 'cena', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Pollo', cantidad: '1', unidad: 'kg' },
      { nombre: 'Arroz blanco', cantidad: '200', unidad: 'g' },
      { nombre: 'Sal y pimienta', cantidad: 'al gusto', unidad: 'none' },
    ], pasos: [] },
  { id: 'r3', nombre: 'Merluza', tipoComida: 'cena', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Merluza en rodajas', cantidad: '4', unidad: 'unidad' },
      { nombre: 'Patatas', cantidad: '500', unidad: 'g' },
    ], pasos: [] },
];

Menu.init();
Menu._menu[Menu.getWeekKey()] = {
  monday: { lunch: 'r1', dinner: null },
  tuesday: { lunch: null, dinner: 'r2' },
  wednesday: { lunch: null, dinner: 'r3' },
  thursday: { lunch: null, dinner: null },
  friday: { lunch: null, dinner: null },
  saturday: { lunch: null, dinner: null },
  sunday: { lunch: null, dinner: null },
};

Shopping.init();

console.log('=== LISTA ===');
const items = Shopping.buildList();
const item = nombre => items.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());

check('agrega los 3 días con recetas (sin condimentos)', items.length === 6, `items=${items.length}`);
check('suma la misma unidad (arroz 300g + 200g = 500g)', item('Arroz blanco')?.cantidad === '500 g', item('Arroz blanco')?.cantidad);
check('no mezcla unidades (patatas 500 g)', item('Patatas')?.cantidad === '500 g');
check('merluza 4 unidades → 4 ud (unificada con "Merluza en rodajas")', item('Merluza')?.cantidad === '4 ud', item('Merluza')?.cantidad);
check('ajo 2 dientes', item('Ajo')?.cantidad === '2 dientes', item('Ajo')?.cantidad);
check('los condimentos ("al gusto") quedan fuera de la lista', !items.some(i => i.nombre === 'Sal'));

check('los sinónimos se unifican (Dientes de ajo → Ajo)', items.filter(i => i.nombre.toLowerCase().includes('ajo')).length === 1,
  items.filter(i => i.nombre.toLowerCase().includes('ajo')).map(i => i.nombre + ':' + i.cantidad).join(' | '));

console.log('\n=== DE QUÉ PLATO VIENE ===');
check('indica el plato de origen', Shopping._de(item('Patatas')) === 'de Merluza', Shopping._de(item('Patatas')));
check('indica el día y la comida', Shopping._donde(item('Patatas')) === 'mié cena', Shopping._donde(item('Patatas')));
check('indica el origen de un ingrediente repetido', Shopping._de(item('Arroz blanco')) === 'de 2 platos', Shopping._de(item('Arroz blanco')));

console.log('\n=== CATEGORÍAS ===');
check('tomate → verduras', item('Tomate triturado')?.categoria === 'verduras', item('Tomate triturado')?.categoria);
check('pollo → carnicería', item('Pollo')?.categoria === 'carniceria', item('Pollo')?.categoria);
check('merluza → pescado', item('Merluza')?.categoria === 'pescado', item('Merluza')?.categoria);
check('arroz → despensa', item('Arroz blanco')?.categoria === 'despensa', item('Arroz blanco')?.categoria);

console.log('\n=== PRECIOS ===');
const mercadona = Shopping.getTiendas().find(t => t.nombre === 'Mercadona');
const lidl = Shopping.getTiendas().find(t => t.nombre === 'Lidl');

const prodPollo = Shopping.ensureProducto({ ingrediente: 'Pollo', nombre: 'Pollo entero 1kg' });
Shopping.setPrecio(prodPollo.id, mercadona.id, 9.95);
Shopping.setPrecio(prodPollo.id, lidl.id, 7.50);

const items2 = Shopping.buildList();   // snapshot nuevo, ya con precios
const item2 = nombre => items2.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());
const mejor = Shopping.mejorPrecio('Pollo');
check('el más barato se elige (Lidl 7,50)', mejor && mejor.tienda.id === lidl.id && mejor.precio === 7.50,
  mejor ? `${mejor.tienda.nombre} ${mejor.precio}` : 'null');
check('el producto aparece con su precio en la lista', item2('Pollo')?.precio === 7.5 && item2('Pollo')?.tienda?.nombre === 'Lidl',
  `${item2('Pollo')?.precio} ${item2('Pollo')?.tienda?.nombre}`);
check('total estimado suma los precios', Shopping.totalEstimado(items2) === 7.5, String(Shopping.totalEstimado(items2)));
check('los condimentos no cuentan como productos a comprar', Shopping.porTienda(items2).every(g => !g.items.some(i => i.condimento)));

const grupos = Shopping.porTienda(items2);
check('reparto por tienda: solo Lidl (el más barato del pollo)', grupos.filter(g => g.tienda).length === 1 && grupos[0].tienda.nombre === 'Lidl',
  grupos.map(g => `${g.tienda?.nombre}(${g.items.length})`).join(','));

console.log('\n=== SINCRONIZACIÓN (merge) ===');
const remoto = {
  tiendas: [{ id: '99999999-0000-4000-8000-000000000099', nombre: 'Dia', tipo: 'supermercado', direccion: '' }],
  productos: [{ id: '88888888-0000-4000-8000-000000000088', ingrediente: 'Patatas', nombre: 'Patatas 1kg', marca: '', tamano: '1kg', categoria: 'verduras' }],
  precios: [{ id: '77777777-0000-4000-8000-000000000077', productoId: '88888888-0000-4000-8000-000000000088', tiendaId: '99999999-0000-4000-8000-000000000099', precio: 1.29, actualizado_at: new Date().toISOString() }],
};
Shopping.mergeRemoto(remoto);
check('trae la tienda remota', Shopping.getTiendas().some(t => t.nombre === 'Dia'));
check('trae el producto remoto', Shopping.getProductosDe('Patatas').some(p => p.nombre === 'Patatas 1kg'));
check('trae el precio remoto', Shopping.mejorPrecio('Patatas')?.precio === 1.29);
check('no pierde los precios locales', Shopping.getPreciosDe(prodPollo.id).length === 2);

Shopping.mergeRemoto(remoto);
check('merge repetido no duplica', Shopping.getTiendas().length === Shopping.DEFAULT_TIENDAS.length + 1 && Shopping.getPreciosDe(prodPollo.id).length === 2,
  `tiendas=${Shopping.getTiendas().length} preciosPollo=${Shopping.getPreciosDe(prodPollo.id).length}`);

console.log('\n=== TEXTO PARA COPIAR ===');
const texto = Shopping.textoLista(items2);
check('el texto incluye el precio', texto.includes('7,50 €'));
check('el texto incluye dónde comprar', texto.includes('Dónde comprar'));

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} tests OK`);
process.exit(failed ? 1 : 0);
