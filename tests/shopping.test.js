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

const ROOT = require('node:path').join(__dirname, '..');
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

console.log('\n=== BUGS DE LA LISTA (v48) ===');
// Recetas que disparan los bugs que se cazaron contra el catálogo real
Recipes._recipes.push(
  { id: 'v1', nombre: 'Con aceite', tipoComida: 'cena', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cucharas' },
      { nombre: 'Vinagre', cantidad: '1', unidad: 'cuchara' },
      { nombre: 'Ajo rallado', cantidad: '1', unidad: 'diente' },
      { nombre: 'Filetes de salmón', cantidad: '4', unidad: 'unidad' },
      { nombre: 'Salsa de tomate', cantidad: '400', unidad: 'g' },
    ], pasos: [] },
  { id: 'v2', nombre: 'Con sal', tipoComida: 'cena', tags: [], nutricion: {},
    ingredientes: [
      { nombre: 'Aceite de oliva', cantidad: 'al gusto', unidad: 'none' },
      { nombre: 'Vinagre', cantidad: 'al gusto', unidad: 'none' },
      { nombre: 'Ajo', cantidad: '2', unidad: 'dientes' },
      { nombre: 'Cebolla morada', cantidad: '1/2', unidad: 'unidad' },
      { nombre: 'Agua', cantidad: '600', unidad: 'ml' },
      { nombre: 'Perejil', cantidad: 'un puñado', unidad: 'none' },
      { nombre: 'Cerveza', cantidad: '2', unidad: 'unidad' },
    ], pasos: [] },
);
Menu._menu[Menu.getWeekKey()] = {
  monday:    { lunch: 'v1', dinner: 'v2' },
  tuesday:   { lunch: null, dinner: null },
  wednesday: { lunch: null, dinner: null },
  thursday:  { lunch: null, dinner: null },
  friday:    { lunch: null, dinner: null },
  saturday:  { lunch: null, dinner: null },
  sunday:    { lunch: null, dinner: null },
};
const itemsV = Shopping.buildList();
const itemV = nombre => itemsV.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());

check('el aceite NO desaparece por aparecer "al gusto" en otra receta',
  !!itemV('Aceite de oliva'), itemsV.map(i => i.nombre).join(', '));
check('el aceite conserva su cantidad real', itemV('Aceite de oliva')?.cantidad === '3 cda', itemV('Aceite de oliva')?.cantidad);
check('el vinagre tampoco desaparece', itemV('Vinagre')?.cantidad === '1 cda', itemV('Vinagre')?.cantidad);
check('"Ajo rallado" y "Ajo" son la misma fila', itemsV.filter(i => i.nombre.toLowerCase() === 'ajo').length === 1,
  itemsV.filter(i => i.nombre.toLowerCase().includes('ajo')).map(i => i.nombre).join(' | '));
check('las unidades "diente" y "ud" se suman', itemV('Ajo')?.cantidad === '3 dientes', itemV('Ajo')?.cantidad);
check('las fracciones se calculan (1/2 → 0,5)', itemV('Cebolla morada')?.cantidad === '0,5 ud', itemV('Cebolla morada')?.cantidad);
check('el agua no se compra', !itemV('Agua'));
check('"un puñado" no es una cantidad que se compre', !itemV('Perejil'));
check('el salmón es pescado, no despensa', itemV('Salmón')?.categoria === 'pescado', itemV('Salmón')?.categoria);
check('la salsa de tomate es despensa', itemV('Salsa de tomate')?.categoria === 'despensa', itemV('Salsa de tomate')?.categoria);
check('la cerveza es bebida', itemV('Cerveza')?.categoria === 'bebidas', itemV('Cerveza')?.categoria);

console.log('\n=== SYNC DE PRODUCTOS A MANO ===');
const fila = Shopping.toRow();
check('la fila de la nube lleva los productos a mano', !!(fila.data.extras && fila.data.extras[Menu.getWeekKey()]));
Shopping.mergeRemoto({ extras: { [Menu.getWeekKey()]: { items: [{ id: 'x-1', nombre: 'Detergente', cantidad: '1 ud', categoria: 'otros' }] } } });
const items7 = Shopping.buildList();
check('trae el producto a mano remoto', items7.some(i => i.nombre === 'Detergente'));
check('no duplica al fusionar dos veces', Shopping.buildList().filter(i => i.nombre === 'Detergente').length === 1);
Shopping.mergeRemoto({ extras: { [Menu.getWeekKey()]: { items: [{ id: 'x-1', nombre: 'Detergente', cantidad: '1 ud', categoria: 'otros' }] } } });
check('la fusión repetida no duplica', Shopping.buildList().filter(i => i.nombre === 'Detergente').length === 1);

console.log('\n=== TICKETS (registros de compra) ===');
const mercadona3 = Shopping.getTiendas().find(t => t.nombre === 'Mercadona');
const lidl3 = Shopping.getTiendas().find(t => t.nombre === 'Lidl');

// ticket con 2 líneas: una con producto del libro y otra nueva
const ticket = Shopping.addTicket({
  fecha: '2026-11-19',
  tiendaId: mercadona3.id,
  tiendaNombre: 'Mercadona',
  lineas: [
    { descripcion: 'POLLO ENTERO 1KG', cantidad: '1', precioTotal: '6,99', ingrediente: 'Pollo', precioGuardado: true },
    { descripcion: 'PATATAS 1KG', cantidad: '2', precioTotal: '2,58', ingrediente: 'Patatas', precioGuardado: true },
  ],
  total: '9,57',
  marcarComprado: true,
});

check('el ticket se guarda', !!Shopping.getTicket(ticket.id));
check('con sus 2 líneas', ticket.lineas.length === 2);
check('el total es el del ticket', Shopping.ticketTotal(ticket) === 9.57, String(Shopping.ticketTotal(ticket)));
check('la fecha se guarda', ticket.fecha === '2026-11-19');
check('la tienda se guarda', ticket.tiendaNombre === 'Mercadona');
check('el precio con coma se entiende (6,99 → 6.99)', ticket.lineas[0].precioTotal === 6.99, String(ticket.lineas[0].precioTotal));

// el precio del ticket va al libro de precios
const precioPollo = Shopping.getPreciosDe(ticket.lineas[0].productoId).find(p => p.tiendaId === mercadona3.id);
check('el precio del ticket se guarda en el libro (Mercadona 6,99)', precioPollo?.precio === 6.99, String(precioPollo?.precio));
const precioPatatas = Shopping.getPreciosDe(ticket.lineas[1].productoId).find(p => p.tiendaId === mercadona3.id);
check('y el de las patatas también (2,58)', precioPatatas?.precio === 2.58, String(precioPatatas?.precio));
check('el producto se crea con el nombre del ticket', Shopping.getProductosDe('Patatas').some(p => p.nombre === 'Patatas 1kg'),
  Shopping.getProductosDe('Patatas').map(p => p.nombre).join(' | '));
check('el precio más barato sigue siendo el de Dia (1,29)', Shopping.mejorPrecio('Patatas')?.precio === 1.29,
  String(Shopping.mejorPrecio('Patatas')?.precio));

// marcar como comprado
check('marca como comprado lo que coincide con la lista', Shopping.isComprado(Shopping._norm('pollo')),
  Shopping.buildList().filter(i => i.comprado).map(i => i.nombre).join(', '));

// gasto del mes
check('el gasto del mes suma el ticket', Shopping.gastoDelMes('2026-11') === 9.57, String(Shopping.gastoDelMes('2026-11')));
check('otro mes no suma', Shopping.gastoDelMes('2026-10') === 0);

// sync
const filaT = Shopping.toRow();
check('la fila de la nube lleva los tickets', (filaT.data.tickets || []).length === 1);
Shopping.mergeRemoto({ tickets: [{ id: 'tk-remoto', fecha: '2026-11-18', tiendaNombre: 'Lidl', lineas: [], total: 12 }] });
check('trae el ticket remoto', Shopping.getTickets().length === 2);
Shopping.mergeRemoto({ tickets: [{ id: 'tk-remoto', fecha: '2026-11-18', tiendaNombre: 'Lidl', lineas: [], total: 12 }] });
check('la fusión repetida no duplica tickets', Shopping.getTickets().length === 2, String(Shopping.getTickets().length));

Shopping.removeTicket(ticket.id);
check('al borrar el ticket desaparece', Shopping.getTickets().length === 1);

console.log('\n=== OFERTAS POR TIENDA (issue #2) ===');
// El mismo ingrediente se llama distinto en cada tienda:
// "Plátano de Canarias extra" en Mercadona, "Plátano canario ECO" en Carrefour.
const carrefour = Shopping.getTiendas().find(t => t.nombre === 'Carrefour');
Shopping.addManual({ nombre: 'Plátano', cantidad: '1 kg' });
Shopping.setPrecioEnTienda('Plátano', mercadona3.id, 'Plátano de Canarias extra', 1.99);
Shopping.setPrecioEnTienda('Plátano', carrefour.id, 'Plátano canario ECO', 1.79);

const ofertas = Shopping.getOfertas('Plátano');
check('hay una oferta por tienda', ofertas.length === 2,
  ofertas.map(o => `${o.tienda.nombre}: ${o.nombreProducto} ${o.precio}`).join(' | '));
check('cada oferta lleva el nombre que tiene el producto ahí',
  ofertas.some(o => o.tienda.nombre === 'Mercadona' && o.nombreProducto === 'Plátano de Canarias extra' && o.precio === 1.99) &&
  ofertas.some(o => o.tienda.nombre === 'Carrefour' && o.nombreProducto === 'Plátano canario ECO' && o.precio === 1.79),
  ofertas.map(o => `${o.tienda.nombre}=${o.nombreProducto}`).join(' | '));
check('el precio de la fila es el más barato (Carrefour 1,79)', Shopping.mejorPrecio('Plátano')?.precio === 1.79,
  String(Shopping.mejorPrecio('Plátano')?.precio));
check('el nombre que se usa en cada tienda se recuerda',
  Shopping.nombresPorTienda('Plátano')[mercadona3.id] === 'Plátano de Canarias extra' &&
  Shopping.nombresPorTienda('Plátano')[carrefour.id] === 'Plátano canario ECO');

const itemsO = Shopping.buildList();
const platanoItem = itemsO.find(i => i.nombre === 'Plátano');
check('la fila del plátano trae las ofertas de cada tienda', platanoItem?.ofertas?.length === 2,
  JSON.stringify(platanoItem?.ofertas?.map(o => o.tienda.nombre)));
check('la fila usa el precio más barato', platanoItem?.precio === 1.79 && platanoItem?.tienda?.nombre === 'Carrefour',
  `${platanoItem?.precio} ${platanoItem?.tienda?.nombre}`);
check('la fila guarda el nombre del producto en la tienda',
  platanoItem?.nombreProducto === 'Plátano canario ECO', platanoItem?.nombreProducto);

// un ticket de Mercadona NO tiene que pisar el precio del plátano de Carrefour
const ticket2 = Shopping.addTicket({
  fecha: '2026-11-25',
  tiendaId: mercadona3.id,
  tiendaNombre: 'Mercadona',
  lineas: [{ descripcion: 'PLATANO CANARIO 1KG', cantidad: '1', precioTotal: '1,85', ingrediente: 'Plátano', precioGuardado: true }],
  total: '1,85',
  marcarComprado: false,
});
const ofMercadona = Shopping.getOfertas('Plátano').find(o => o.tienda.nombre === 'Mercadona');
const ofCarrefour = Shopping.getOfertas('Plátano').find(o => o.tienda.nombre === 'Carrefour');
check('el ticket actualiza el precio de SU tienda', ofMercadona?.precio === 1.85, String(ofMercadona?.precio));
check('y no toca el de la otra tienda', ofCarrefour?.precio === 1.79, String(ofCarrefour?.precio));
check('el ticket de la lista sigue guardado', Shopping.getTicket(ticket2.id) !== null);

// un producto que solo existe en Mercadona: el ticket de Lidl crea su entrada
Shopping.setPrecioEnTienda('Leche', mercadona3.id, 'Leche entera 1L', 1.15);
Shopping.addTicket({
  fecha: '2026-11-25',
  tiendaId: lidl3.id,
  tiendaNombre: 'Lidl',
  lineas: [{ descripcion: 'LECHE DESNATADA 1L', cantidad: '1', precioTotal: '0,95', ingrediente: 'Leche', precioGuardado: true }],
  total: '0,95',
  marcarComprado: false,
});
const lecheLidl = Shopping.getOfertas('Leche').find(o => o.tienda.nombre === 'Lidl');
check('la tienda que no lo tenía recibe su propia entrada con el nombre del ticket',
  lecheLidl?.nombreProducto === 'Leche Desnatada 1l' && lecheLidl?.precio === 0.95,
  `${lecheLidl?.nombreProducto} ${lecheLidl?.precio}`);

// un producto a mano con el nombre que tiene en esa tienda
Shopping.addManual({ nombre: 'Yogur', cantidad: '4 ud', precio: '1,20', tiendaId: carrefour.id, nombreTienda: 'Yogur natural Pack 4' });
const yogurt = Shopping.getOfertas('Yogur').find(o => o.tienda.nombre === 'Carrefour');
check('el producto a mano guarda el nombre de la tienda',
  yogurt?.nombreProducto === 'Yogur natural Pack 4' && yogurt?.precio === 1.2,
  `${yogurt?.nombreProducto} ${yogurt?.precio}`);

// en el ticket, si el usuario escribe el NOMBRE del súper como producto,
// el ingrediente se resuelve al del catálogo (el precio llega a la fila)
const ticket3 = Shopping.addTicket({
  fecha: '2026-11-25',
  tiendaId: mercadona3.id,
  tiendaNombre: 'Mercadona',
  lineas: [{ descripcion: 'YOGUR NATURAL PACK 4', cantidad: '1', precioTotal: '1,15', ingrediente: 'Yogur natural Pack 4', precioGuardado: true }],
  total: '1,15',
  marcarComprado: false,
});
check('el nombre del súper se resuelve a su ingrediente',
  ticket3.lineas[0].ingrediente === 'yogur', ticket3.lineas[0].ingrediente);
const yogurtMerc = Shopping.getOfertas('Yogur').find(o => o.tienda.nombre === 'Mercadona');
check('y el precio va a la fila del ingrediente, en su tienda',
  yogurtMerc?.precio === 1.15 && yogurtMerc?.nombreProducto === 'Yogur natural Pack 4',
  `${yogurtMerc?.nombreProducto} ${yogurtMerc?.precio}`);

console.log('\n=== PRECIOS POR KILO Y POR UNIDAD (issue #7) ===');
// El pimiento: Mercadona lo vende POR KILO (4,50 €/kg) y Carrefour en bolsa
// de 500 g (1,79 €). La lista pide 300 g → hay que comparar con la misma base.
Shopping.addManual({ nombre: 'Pimiento verde', cantidad: '300 g' });
Shopping.setPrecioEnTienda('Pimiento verde', mercadona3.id, 'Pimiento verde', 4.50, { unidad: 'kg' });
Shopping.setPrecioEnTienda('Pimiento verde', carrefour.id, 'Pimiento verde bolsa 500 g', 1.79, { unidad: 'ud', formato: '500 g' });

const pedido = { cantidades: { g: 300 } };
const ofPim = Shopping.getOfertas('Pimiento verde', pedido);
const ofPimMerc = ofPim.find(o => o.tienda.nombre === 'Mercadona');
const ofPimCar = ofPim.find(o => o.tienda.nombre === 'Carrefour');
check('la oferta por kilo se prorratea a los 300 g (4,50 → 1,35 €)', ofPimMerc?.coste === 1.35, String(ofPimMerc?.coste));
check('la bolsa de 500 g también se prorratea (1,79 → 1,07 €)', ofPimCar?.coste === 1.07, String(ofPimCar?.coste));
check('la bolsa se pasa a €/kg para comparar (1,79 / 500 g → 3,58 €/kg)', ofPimCar?.porKilo === 3.58, String(ofPimCar?.porKilo));
check('el precio por kilo se queda en €/kg (4,50)', ofPimMerc?.porKilo === 4.50, String(ofPimMerc?.porKilo));
check('la más barata por kilo es la bolsa de Carrefour (3,58 < 4,50)',
  Shopping.mejorPorKilo('Pimiento verde', pedido)?.tienda.nombre === 'Carrefour',
  String(Shopping.mejorPorKilo('Pimiento verde', pedido)?.precio));

const itemsP = Shopping.buildList();
const pimiento = itemsP.find(i => i.nombre === 'Pimiento verde');
check('la fila usa lo que se paga de verdad (1,07 €)', pimiento?.precio === 1.07, String(pimiento?.precio));
check('la fila marca la más barata por kilo',
  pimiento?.ofertas?.find(o => o.tienda.nombre === 'Carrefour')?.mejorKilo === true);
check('el total estimado suma el importe prorateado',
  Shopping.totalEstimado(itemsP.filter(i => i.nombre === 'Pimiento verde')) === 1.07,
  String(Shopping.totalEstimado(itemsP.filter(i => i.nombre === 'Pimiento verde'))));
check('el texto copiado lleva la base comparable',
  Shopping.textoLista(itemsP.filter(i => i.nombre === 'Pimiento verde')).includes('€/kg'),
  Shopping.textoLista(itemsP.filter(i => i.nombre === 'Pimiento verde')));

// lo que ya estaba guardado (sin unidad) sigue igual: sin base comparable
check('los productos sin unidad no se comparan por kilo',
  Shopping.mejorPorKilo('Pollo', { cantidades: { kg: 1 } }) === null);

console.log('\n=== DEL TICKET AL LIBRO: EL PRECIO DE UNA UNIDAD ===');
// una línea con 2 bolsas (1,79 € cada una) y otra de 1,45 kg (2,10 €)
Shopping.addTicket({
  fecha: '2026-11-25',
  tiendaId: mercadona3.id,
  tiendaNombre: 'Mercadona',
  lineas: [
    { descripcion: 'PIMIENTO VERDE BOLSA 500 G', cantidad: '2', precioUnit: '1,79', precioTotal: '3,58', ingrediente: 'Pimiento verde', precioGuardado: true },
    { descripcion: 'PIMIENTO VERDE A KG', cantidad: '1,45', precioTotal: '2,10', ingrediente: 'Pimiento verde', precioGuardado: true },
  ],
  total: '5,68',
  marcarComprado: false,
});
const precioBolsa = Shopping.getOfertas('Pimiento verde')
  .find(o => o.tienda.nombre === 'Mercadona' && o.nombreProducto === 'Pimiento verde bolsa 500 g');
const precioKg = Shopping.getOfertas('Pimiento verde')
  .find(o => o.tienda.nombre === 'Mercadona' && o.nombreProducto === 'Pimiento verde');
check('va el precio de UNA bolsa (1,79, no 3,58 del total)', precioBolsa?.precio === 1.79, String(precioBolsa?.precio));
check('si lo venden por kilo, va el €/kg (2,10 / 1,45 kg → 1,45)', precioKg?.precio === 1.45, String(precioKg?.precio));

console.log('\n=== RENDER (smoke) ===');
document.body.innerHTML = `
  <header><button id="btn-back"></button><h1 id="header-title"></h1><button id="btn-menu"></button></header>
  <main id="main-content"></main>
  <nav id="nav-tabs"><button class="nav-tab" data-view="menu"></button></nav>`;
global.Components = {
  escapeHtml: s => String(s ?? ''),
  mealCell: () => '<div class="meal-cell"></div>',
  toast: { show: () => {} },
  modal: { open(t, c) { global.__modal = c; }, close() {} },
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

App.renderTicketsView();
const tHtml = document.getElementById('main-content').innerHTML;
check('la vista de tickets se renderiza', tHtml.includes('🧾'), tHtml.slice(0, 80));
check('tiene el botón de escanear ticket', tHtml.includes('App.openScanTicketModal'));
check('lista los tickets guardados', tHtml.includes('Lidl'), tHtml.replace(/<[^>]+>/g, ' ').slice(0, 120));
check('muestra el gasto del mes', tHtml.includes('este mes'));

console.log('\n=== RENDER DE LAS OFERTAS ===');
App.renderShoppingView();
const htmlO = document.getElementById('main-content').innerHTML;
check('la fila muestra el precio de cada tienda', htmlO.includes('shop-oferta'), '');
check('con el nombre del producto en cada tienda',
  htmlO.includes('Plátano de Canarias extra') && htmlO.includes('Plátano canario ECO'), '');
check('marca el más barato', htmlO.includes('shop-oferta--best'));

App.openPriceModal(Shopping._norm('Plátano'));
const modalHtml = global.__modal || '';
check('el modal de precios lista las ofertas con su nombre',
  modalHtml.includes('Plátano de Canarias extra') && modalHtml.includes('Plátano canario ECO'), modalHtml.slice(0, 120));
check('el modal deja escribir el nombre en esa tienda',
  modalHtml.includes('sp-producto') && modalHtml.includes('Nombre en esa tienda'), '');

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} tests OK`);
process.exit(failed ? 1 : 0);
