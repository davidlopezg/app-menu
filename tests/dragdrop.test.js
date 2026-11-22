// Test del drag & drop con jsdom
const fs = require('node:fs');
function loadJsdom() {
  for (const p of ['jsdom', '/data/data/com.termux/files/home/.pi/scratch/node_modules/jsdom']) {
    try { return require(p); } catch (e) { /* siguiente */ }
  }
  console.error('Falta jsdom. Instalalo con:  npm i jsdom');
  process.exit(1);
}

const { JSDOM } = loadJsdom();

const dom = new JSDOM(`<!DOCTYPE html><body><div id="main-content"></div></body>`, { pretendToBeVisual: true });
const { window } = dom;
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;

// --- grid de prueba: lunes (lunch=receta, dinner=receta) ... domingo ---
const MAIN = window.document.getElementById('main-content');
MAIN.innerHTML = `
  <div class="menu-grid">
    <div class="menu-day"><div class="menu-day__header">Lun</div><div class="menu-day__meals">
      <div class="meal-cell" data-meal="lunch" data-day="monday" data-recipe-id="r1"><div class="meal-cell__name">Arroz a la cubana</div></div>
      <div class="meal-cell" data-meal="dinner" data-day="monday" data-recipe-id="r2"><div class="meal-cell__name">Ensalada de pollo</div></div>
    </div></div>
    <div class="menu-day"><div class="menu-day__header">Mar</div><div class="menu-day__meals">
      <div class="meal-cell meal-cell--vacant" data-meal="lunch" data-day="tuesday"></div>
      <div class="meal-cell" data-meal="dinner" data-day="tuesday" data-recipe-id="r3"><div class="meal-cell__name">Merluza</div></div>
    </div></div>
  </div>`;

// cargar el módulo real
const src = fs.readFileSync('/data/data/com.termux/files/home/repos/app-menu/js/dragdrop.js', 'utf8')
  .replace(/^const DragDrop =/m, 'global.DragDrop =');
eval(src);

// stub de elementFromPoint (jsdom no lo implementa)
const cells = [...document.querySelectorAll('.meal-cell')];
let forcedTarget = null;
document.elementFromPoint = () => forcedTarget;

// helper de eventos pointer
function pev(type, x, y, opts = {}) {
  const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: opts.button ?? 0 });
  Object.defineProperty(ev, 'pointerId', { value: opts.pointerId ?? 1 });
  Object.defineProperty(ev, 'pointerType', { value: opts.pointerType ?? 'mouse' });
  return ev;
}

const drops = [];
DragDrop.attach(MAIN, { onDrop: d => drops.push(d) });

const cell = (day, meal) => document.querySelector(`.meal-cell[data-day="${day}"][data-meal="${meal}"]`);
const results = [];
const check = (name, cond, extra = '') => {
  results.push([name, cond, extra]);
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

// --- 1) drag con mouse: lunes lunch -> martes lunch (vacía) ---
{
  drops.length = 0;
  const src = cell('monday', 'lunch');
  const dst = cell('tuesday', 'lunch');
  forcedTarget = dst;
  src.dispatchEvent(pev('pointerdown', 10, 10));
  document.dispatchEvent(pev('pointermove', 40, 40));
  document.dispatchEvent(pev('pointerup', 40, 40));
  check('mouse: soltar en celda vacía → mueve', drops.length === 1 &&
    drops[0].from.day === 'monday' && drops[0].from.meal === 'lunch' &&
    drops[0].to.day === 'tuesday' && drops[0].to.meal === 'lunch' &&
    drops[0].recipeId === 'r1', JSON.stringify(drops[0]));
  check('mouse: el click posterior se ignora', DragDrop.shouldIgnoreClick());
  check('mouse: no quedó fantasma en el DOM', document.querySelectorAll('.meal-cell--ghost').length === 0);
}

// --- 2) drag con mouse: lunes dinner -> martes dinner (ocupada) → swap ---
{
  drops.length = 0;
  const src = cell('monday', 'dinner');
  const dst = cell('tuesday', 'dinner');
  forcedTarget = dst;
  src.dispatchEvent(pev('pointerdown', 10, 10));
  document.dispatchEvent(pev('pointermove', 40, 40));
  document.dispatchEvent(pev('pointerup', 40, 40));
  check('mouse: soltar en celda ocupada → intercambia (from≠to)', drops.length === 1 &&
    drops[0].from.day === 'monday' && drops[0].to.day === 'tuesday' && drops[0].recipeId === 'r2');
}

// --- 3) toque simple (sin long press) → NO drag, el click sigue ---
{
  drops.length = 0;
  forcedTarget = cell('tuesday', 'lunch');
  const src = cell('monday', 'lunch');
  src.dispatchEvent(pev('pointerdown', 10, 10, { pointerType: 'touch', pointerId: 7 }));
  document.dispatchEvent(pev('pointerup', 10, 10, { pointerType: 'touch', pointerId: 7 }));
  check('toque corto: no dispara drag (el click normal funciona)', drops.length === 0);
}

// --- 4) long press + arrastre con dedo → sí drag ---
{
  drops.length = 0;
  const src = cell('monday', 'lunch');
  const dst = cell('tuesday', 'dinner');
  forcedTarget = dst;
  src.dispatchEvent(pev('pointerdown', 10, 10, { pointerType: 'touch', pointerId: 8 }));
  setTimeout(() => {
    document.dispatchEvent(pev('pointermove', 60, 60, { pointerType: 'touch', pointerId: 8 }));
    document.dispatchEvent(pev('pointerup', 60, 60, { pointerType: 'touch', pointerId: 8 }));
    check('toque: long press + arrastre → mueve', drops.length === 1 &&
      drops[0].from.day === 'monday' && drops[0].to.day === 'tuesday' && drops[0].to.meal === 'dinner');

    // --- 5) el dedo se mueve antes del long press → es scroll, no drag ---
    drops.length = 0;
    const s2 = cell('monday', 'dinner');
    forcedTarget = cell('tuesday', 'lunch');
    s2.dispatchEvent(pev('pointerdown', 10, 10, { pointerType: 'touch', pointerId: 9 }));
    document.dispatchEvent(pev('pointermove', 30, 90, { pointerType: 'touch', pointerId: 9 }));  // > 12px
    setTimeout(() => {
      document.dispatchEvent(pev('pointerup', 30, 90, { pointerType: 'touch', pointerId: 9 }));
      check('toque: mover el dedo antes del long press → NO drag (scroll)', drops.length === 0);

      const failed = results.filter(r => !r[1]);
      console.log(`\n${results.length - failed.length}/${results.length} tests OK`);
      process.exit(failed.length ? 1 : 0);
    }, 350);
  }, 320);
}
