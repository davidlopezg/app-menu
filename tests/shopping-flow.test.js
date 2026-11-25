// Test del FLUJO COMPLETO de la lista de la compra con el libro de precios
// (issue #2): se abre el modal de precios, se carga un producto con el
// nombre de cada tienda y se comprueba que la lista lo muestra.
//
// Carga el jsdom con el index.html REAL (mismos ids que la app) y el código
// real de la app → atrapa bugs de UI que los tests de datos no ven.
const fs = require('node:fs');
const path = require('node:path');

function loadJsdom() {
  for (const p of ['jsdom', '/data/data/com.termux/files/home/.pi/scratch/node_modules/jsdom']) {
    try { return require(p); } catch (e) { /* siguiente */ }
  }
  console.error('Falta jsdom. Instalalo con:  npm i jsdom');
  process.exit(1);
}
const { JSDOM } = loadJsdom();

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(`${ROOT}/index.html`, 'utf8')
  .replace(/<script src="[^"]*"><\/script>/g, '');   // los scripts se cargan aparte
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.Image = dom.window.Image;
global.HTMLElement = dom.window.HTMLElement;

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
load('js/shopping.js', 'Shopping');
load('js/components.js', 'Components');

// stubs de lo que necesita la app pero no entra en este flujo
global.DB = { isAuth: () => false, onAuthChange: () => {} };
global.AI = { hasKey: () => false };
global.NutritionPanel = { render: () => '' };
global.Templates = { hasAny: () => false };

const results = [];
const check = (name, cond, extra = '') => {
  results.push(cond);
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

// --- recetas de prueba (con plátano) ---
Recipes._recipes = [
  { id: 'r1', nombre: 'Plátanos con leche', tipoComida: 'desayuno', tags: [], nutricion: {},
    ingredientes: [{ nombre: 'Plátano', cantidad: '2', unidad: 'unidad' }], pasos: [] },
];
Menu.init();
Menu._menu[Menu.getWeekKey()] = {
  monday: { lunch: 'r1', dinner: null }, tuesday: { lunch: null, dinner: null },
  wednesday: { lunch: null, dinner: null }, thursday: { lunch: null, dinner: null },
  friday: { lunch: null, dinner: null }, saturday: { lunch: null, dinner: null },
  sunday: { lunch: null, dinner: null },
};
Shopping.init();

const appSrc = fs.readFileSync(`${ROOT}/js/app.js`, 'utf8')
  .replace(/^const App =/m, 'global.App =')
  .replace(/document\.addEventListener\('DOMContentLoaded', \(\) => App\.init\(\)\);/, '');
eval(appSrc);

const main = document.getElementById('main-content');
const modalContent = document.getElementById('modal-content');
const mercadona = Shopping.getTiendas().find(t => t.nombre === 'Mercadona');
const carrefour = Shopping.getTiendas().find(t => t.nombre === 'Carrefour');

// ------------------------------------------------------------
// 1) El modal de precios: cargar el plátano en cada tienda con
//    SU nombre (el de cada supermercado)
// ------------------------------------------------------------
console.log('=== MODAL DE PRECIOS ===');
App.renderShoppingView();
const keyPlatano = Shopping._norm('Plátano');
check('la lista tiene el plátano', main.innerHTML.includes('Plátano'), '');

App.openPriceModal(keyPlatano);
check('el modal se abre con el nombre del producto',
  document.getElementById('modal-title').textContent.includes('Plátano'),
  document.getElementById('modal-title').textContent);
check('el modal pide el nombre en esa tienda', modalContent.innerHTML.includes('Nombre en esa tienda'), '');
check('el modal tiene el selector de tienda', !!document.getElementById('sp-tienda'), '');

// Mercadona: "Plátano de Canarias extra"
document.getElementById('sp-tienda').value = mercadona.id;
document.getElementById('sp-producto').value = 'Plátano de Canarias extra';
document.getElementById('sp-precio').value = '1,99';
App.savePrice(keyPlatano);

// Carrefour: "Plátano canario ECO"
App.openPriceModal(keyPlatano);
document.getElementById('sp-tienda').value = carrefour.id;
document.getElementById('sp-producto').value = 'Plátano canario ECO';
document.getElementById('sp-precio').value = '1.79';
App.savePrice(keyPlatano);

const ofertas = Shopping.getOfertas('Plátano');
check('las dos tiendas tienen su precio', ofertas.length === 2,
  ofertas.map(o => `${o.tienda.nombre}=${o.nombreProducto} ${o.precio}`).join(' | '));
check('el precio con COMA se guarda bien (1,99 → 1.99)', ofertas.find(o => o.tienda.nombre === 'Mercadona')?.precio === 1.99,
  String(ofertas.find(o => o.tienda.nombre === 'Mercadona')?.precio));
check('el precio con PUNTO también (1.79)', ofertas.find(o => o.tienda.nombre === 'Carrefour')?.precio === 1.79,
  String(ofertas.find(o => o.tienda.nombre === 'Carrefour')?.precio));
check('cada una con el nombre de su tienda',
  ofertas.some(o => o.tienda.nombre === 'Mercadona' && o.nombreProducto === 'Plátano de Canarias extra' && o.precio === 1.99) &&
  ofertas.some(o => o.tienda.nombre === 'Carrefour' && o.nombreProducto === 'Plátano canario ECO' && o.precio === 1.79),
  ofertas.map(o => `${o.tienda.nombre}:${o.nombreProducto}`).join(' | '));

// ------------------------------------------------------------
// 2) La lista muestra las dos ofertas con su nombre
// ------------------------------------------------------------
console.log('\n=== LA LISTA ===');
App.renderShoppingView();
const htmlLista = main.innerHTML;
check('la fila muestra el precio de cada tienda', (htmlLista.match(/shop-oferta/g) || []).length >= 2, '');
check('con el nombre de Mercadona', htmlLista.includes('Plátano de Canarias extra'), '');
check('con el nombre de Carrefour', htmlLista.includes('Plátano canario ECO'), '');
check('marca el más barato (Carrefour 1,79)', htmlLista.includes('💰 mejor'), '');
check('el precio de la fila es el más barato', htmlLista.includes('1,79 €'), '');

// ------------------------------------------------------------
// 3) Al cambiar de tienda, el nombre se autofill con el de esa tienda
// ------------------------------------------------------------
console.log('\n=== AUTOFILL POR TIENDA ===');
App.openPriceModal(keyPlatano);
document.getElementById('sp-tienda').value = mercadona.id;
App.onPriceStoreChange(keyPlatano);
check('el nombre se pone el de Mercadona', document.getElementById('sp-producto').value === 'Plátano de Canarias extra',
  document.getElementById('sp-producto').value);
document.getElementById('sp-tienda').value = carrefour.id;
App.onPriceStoreChange(keyPlatano);
check('y al cambiar a Carrefour, el de Carrefour', document.getElementById('sp-producto').value === 'Plátano canario ECO',
  document.getElementById('sp-producto').value);

// ------------------------------------------------------------
// 4) Dónde comprar y el texto copiado llevan el nombre del producto
// ------------------------------------------------------------
console.log('\n=== DÓNDE COMPRAR / COPIAR ===');
App.showStoresByShop();
const htmlMapa = modalContent.innerHTML;
check('el reparto por tienda lleva el nombre del producto',
  htmlMapa.includes('Plátano de Canarias extra') || htmlMapa.includes('Plátano canario ECO'), '');
Components.modal.close();

const texto = Shopping.textoLista(Shopping.buildList());
check('el texto copiado lleva el nombre del producto', texto.includes('Plátano canario ECO'), texto);
check('y la tienda', texto.includes('Carrefour'), '');

// ------------------------------------------------------------
// 5) El ticket no pisa el precio de otra tienda
// ------------------------------------------------------------
console.log('\n=== TICKET ===');
Shopping.addTicket({
  fecha: '2026-11-25',
  tiendaId: mercadona.id,
  tiendaNombre: 'Mercadona',
  lineas: [{ descripcion: 'PLATANO CANARIO 1KG', cantidad: '1', precioTotal: '1,85', ingrediente: 'Plátano', precioGuardado: true }],
  total: '1,85',
  marcarComprado: false,
});
const trasTicket = Shopping.getOfertas('Plátano');
check('el ticket actualiza el precio de su tienda',
  trasTicket.find(o => o.tienda.nombre === 'Mercadona')?.precio === 1.85, '');
check('y no toca el de la otra tienda',
  trasTicket.find(o => o.tienda.nombre === 'Carrefour')?.precio === 1.79, '');

// ------------------------------------------------------------
// 6) Producto a mano con el nombre que tiene en esa tienda
// ------------------------------------------------------------
console.log('\n=== PRODUCTO A MANO ===');
App.openAddProductModal();
check('el modal pide el nombre en esa tienda', modalContent.innerHTML.includes('Nombre en esa tienda'), '');
document.getElementById('ap-nombre').value = 'Yogur';
document.getElementById('ap-cantidad').value = '4 ud';
document.getElementById('ap-precio').value = '1,20';
document.getElementById('ap-tienda').value = mercadona.id;
document.getElementById('ap-nombre-tienda').value = 'Yogur natural Pack 4';
App.saveShoppingProduct();
const yogur = Shopping.getOfertas('Yogur').find(o => o.tienda.nombre === 'Mercadona');
check('el producto a mano guarda su nombre de tienda y el precio',
  yogur?.nombreProducto === 'Yogur natural Pack 4' && yogur?.precio === 1.2,
  `${yogur?.nombreProducto} ${yogur?.precio}`);

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} tests OK`);
process.exit(failed ? 1 : 0);
