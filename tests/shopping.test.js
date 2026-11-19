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
load('js/translations.js', 'T');
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

console.log('\n=== PRODUCTOS A MANO ===');
const papel = Shopping.addManual({ nombre: 'Papel de cocina', cantidad: '2 ud', categoria: 'otros' });
const items3 = Shopping.buildList();
const item3 = nombre => items3.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());
check('el producto a mano aparece en la lista', !!item3('Papel de cocina'));
check('con su cantidad', item3('Papel de cocina')?.cantidad === '2 ud', item3('Papel de cocina')?.cantidad);
check('en la categoría elegida', item3('Papel de cocina')?.categoria === 'otros', item3('Papel de cocina')?.categoria);
check('sin origen (no sale de ninguna receta)', Shopping._de(item3('Papel de cocina')) === '');

Shopping.addManual({ nombre: 'Pollo', cantidad: '1 ud' });
const items4 = Shopping.buildList();
const pollo4 = items4.find(i => i.nombre.toLowerCase() === 'pollo');
check('no se duplica: el pollo sigue siendo una sola fila', items4.filter(i => i.nombre.toLowerCase() === 'pollo').length === 1);
check('la cantidad a mano se suma a la de la receta', pollo4?.cantidad === '1 kg + 1 ud', pollo4?.cantidad);
check('el precio del libro sigue valiendo', pollo4?.precio === 7.5, String(pollo4?.precio));

const mercadona2 = Shopping.getTiendas().find(t => t.nombre === 'Mercadona');
Shopping.addManual({ nombre: 'Cerveza', cantidad: '6 ud', precio: 4.5, tiendaId: mercadona2.id });
const items5 = Shopping.buildList();
const cerveza5 = items5.find(i => i.nombre.toLowerCase() === 'cerveza');
check('el producto a mano con precio muestra precio y tienda', cerveza5?.precio === 4.5 && cerveza5?.tienda?.nombre === 'Mercadona',
  `${cerveza5?.precio} ${cerveza5?.tienda?.nombre}`);
check('el total estimado lo incluye', Shopping.totalEstimado(items5) === 13.29, String(Shopping.totalEstimado(items5)));
check('el reparto por tienda lo incluye', Shopping.porTienda(items5).some(g => g.items.some(i => i.nombre === 'Cerveza')));

Shopping.removeManual(papel.id);
const items6 = Shopping.buildList();
check('al borrar desaparece de la lista', !items6.some(i => i.nombre === 'Papel de cocina'));

console.log('\n=== SYNC DE PRODUCTOS A MANO ===');
const fila = Shopping.toRow();
check('la fila de la nube lleva los productos a mano', !!(fila.data.extras && fila.data.extras[Menu.getWeekKey()]));
Shopping.mergeRemoto({ extras: { [Menu.getWeekKey()]: { items: [{ id: 'x-1', nombre: 'Detergente', cantidad: '1 ud', categoria: 'otros' }] } } });
const items7 = Shopping.buildList();
check('trae el producto a mano remoto', items7.some(i => i.nombre === 'Detergente'));
check('no duplica al fusionar dos veces', Shopping.buildList().filter(i => i.nombre === 'Detergente').length === 1);
Shopping.mergeRemoto({ extras: { [Menu.getWeekKey()]: { items: [{ id: 'x-1', nombre: 'Detergente', cantidad: '1 ud', categoria: 'otros' }] } } });
check('la fusión repetida no duplica', Shopping.buildList().filter(i => i.nombre === 'Detergente').length === 1);

console.log('\n=== RENDER (smoke) ===');
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
global.Templates = { hasAny: () => false };
global.AI = { hasKey: () => false };
global.NutritionPanel = { render: () => '' };

const appSrc = fs.readFileSync(`${ROOT}/js/app.js`, 'utf8').replace(/^const App =/m, 'global.App =');
eval(appSrc.replace(/document.addEventListener\('DOMContentLoaded', \(\) => App\.init\(\)\);/, ''));

App.renderShoppingView();
const html = document.getElementById('main-content').innerHTML;
check('la vista de la lista se renderiza', html.includes('shop-cat') && html.includes('shop-item'));
check('hay un botón para añadir productos a mano', html.includes('App.openAddProductModal'));
check('el producto a mano sale con su botón de borrar', html.includes('App.removeShoppingItem'));
check('el producto a mano dice que lo agregaste a mano', html.includes('añadido a mano'));

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} tests OK`);
process.exit(failed ? 1 : 0);
