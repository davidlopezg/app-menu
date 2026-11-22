// Test del cliente de IA para la lectura de tickets (no llama a la API:
// intercepta fetch y mira lo que se manda).
const fs = require('node:fs');

const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
};

const src = fs.readFileSync('/data/data/com.termux/files/home/repos/app-menu/js/ai.js', 'utf8')
  .replace('const AI =', 'global.AI =')
  .replace(/document\.addEventListener\([^;]*;/g, '');

const results = [];
const check = (name, cond, extra = '') => {
  results.push(cond);
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

let ultimaPeticion = null;
global.fetch = async (url, opts) => {
  ultimaPeticion = { url, body: JSON.parse(opts.body) };
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{
        message: {
          content: '```json\n{"tienda":"MERCADONA","fecha":"2026-11-19","total":9.57,"lineas":[{"descripcion":"PATATAS 1KG","cantidad":1,"precio_unit":1.29,"precio_total":1.29,"ingrediente":"Patatas"}]}\n```',
        },
      }],
    }),
  };
};

eval(src);

AI.setKey('key-de-prueba');
AI.setConfig('openai', 'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini');

(async () => {
  console.log('=== CONTRATO CON LA API ===');
  const ticket = await AI.readTicket(
    ['data:image/jpeg;base64,AAAA', 'data:image/jpeg;base64,BBBB'],
    {
      tiendas: ['Mercadona'],
      ingredientes: ['Patatas', 'Pollo'],
      productos: ['Patatas 1kg [Patatas]'],
    }
  );

  check('devuelve el ticket parseado', ticket && ticket.tienda === 'MERCADONA', JSON.stringify(ticket).slice(0, 80));
  check('con sus líneas', Array.isArray(ticket.lineas) && ticket.lineas.length === 1);
  check('el total se lee', ticket.total === 9.57, String(ticket.total));

  const body = ultimaPeticion.body;
  check('la petición va al endpoint configurado', ultimaPeticion.url === 'https://api.openai.com/v1/chat/completions');
  check('usa el modelo configurado', body.model === 'gpt-4o-mini');
  check('lleva el prompt del lector de tickets',
    String(body.messages[0].content).includes('lector de tickets de compra'),
    String(body.messages[0].content).slice(0, 40));

  const content = body.messages[1].content;
  check('el mensaje del usuario es multimodal (array)', Array.isArray(content));
  check('manda las 2 fotos como image_url',
    Array.isArray(content) && content.filter(c => c.type === 'image_url').length === 2);
  check('las fotos van como data URL',
    content.filter(c => c.type === 'image_url').every(c => c.image_url.url.startsWith('data:image/jpeg;base64,')));
  check('el texto pide el JSON y manda el catálogo',
    content[0].type === 'text' && content[0].text.includes('Patatas') && content[0].text.includes('Mercadona'));

  console.log('\n=== ERRORES ===');
  let err = null;
  try {
    await AI.readTicket([], {});
  } catch (e) { err = e; }
  check('sin fotos da error claro', !!err && /fotos/i.test(err.message), err?.message);

  const failed = results.filter(r => !r).length;
  console.log(`\n${results.length - failed}/${results.length} tests OK`);
  process.exit(failed ? 1 : 0);
})();
