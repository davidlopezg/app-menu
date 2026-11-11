// ============================================
// Shopping — Lista de la compra con libro de precios manual
// ============================================
// Tres cosas:
//   1. La lista de la compra de la semana (agrega ingredientes, normaliza
//      unidades y los agrupa por categoría).
//   2. El "libro de precios": qué producto se compra en qué tienda y a qué
//      precio. Todo manual: cuando comprás, anotá el precio y la app lo
//      recuerda para decirte dónde sale más barato.
//   3. El reparto por tienda: qué hay que comprar en cada sitio y cuánto
//      cuesta en total.
//
// El libro entero (tiendas + productos + precios) se guarda en UNA fila de
// `menu_weeks` con la clave `shopping:data` → así sincroniza con el resto
// de la app sin necesidad de crear tablas nuevas en Supabase.

const Shopping = {
  _data: null,      // { tiendas: [], productos: [], precios: [] }
  _comprados: null, // { "2026-W41": ["aceite de oliva", ...] } (por semana)

  // Tiendas por defecto (ids fijos → se sincronizan sin duplicar)
  DEFAULT_TIENDAS: [
    { id: '51111111-0000-4000-8000-000000000001', nombre: 'Mercadona', tipo: 'supermercado', direccion: '' },
    { id: '51111111-0000-4000-8000-000000000002', nombre: 'Carrefour', tipo: 'supermercado', direccion: '' },
    { id: '51111111-0000-4000-8000-000000000003', nombre: 'Lidl',      tipo: 'supermercado', direccion: '' },
    { id: '51111111-0000-4000-8000-000000000004', nombre: 'Día',       tipo: 'supermercado', direccion: '' },
    { id: '51111111-0000-4000-8000-000000000005', nombre: 'Ahorro',    tipo: 'supermercado', direccion: '' },
    { id: '51111111-0000-4000-8000-000000000006', nombre: 'Frutería',  tipo: 'fruteria', direccion: '' },
    { id: '51111111-0000-4000-8000-000000000007', nombre: 'Mercado',   tipo: 'mercado', direccion: '' },
  ],

  // Categorías (por palabra clave en el nombre del ingrediente)
  CATEGORIAS: [
    { key: 'verduras', label: 'Verduras y frutas', icon: '🥬', words: ['tomate','tomates','cebolla','pimiento','pimientos','patata','patatas','zanahoria','lechuga','calabacin','berenjena','pepino','espinaca','apio','albahaca','perejil','cilantro','eneldo','oregano','romero','tomillo','rucula','endibia','esparragos','champinon','setas','seta','puerro','ajo','manzana','naranja','platano','pera','uva','fresa','limon','mandarina','kiwi','melon','aguacate','banana','ciruela','pera'] },
    { key: 'carniceria', label: 'Carnicería', icon: '🥩', words: ['pollo','ternera','cerdo','lomo','codillo','hamburguesa','chorizo','tocino','bacon','jamon','salchicha','butifarra','costillar','filete','filetes','pechuga','muslo','muslos','chuleton','entrecot','solomillo','milanesa','carne','pavo','pato','bistec'] },
    { key: 'pescado', label: 'Pescado', icon: '🐟', words: ['merluza','salmon','atun','bacalao','lubina','dorada','calamar','sepia','pulpo','gamba','almeja','mejillon','sardina','boqueron','anchoa','trucha','rape','lenguado','pez','anchoas'] },
    { key: 'lacteos', label: 'Lácteos y huevos', icon: '🥛', words: ['leche','queso','yogur','nata','crema','mantequilla','huevo','huevos','caciotta','ricotta'] },
    { key: 'despensa', label: 'Despensa', icon: '🥫', words: ['pasta','arroz','harina','azucar','aceite','sal','lenteja','garbanzo','alubia','haba','habas','fabes','judia','tomate triturado','caldo','pan','fideos','espaguetis','macarrones','couscous','quinoa','avena','miel','mostaza','ketchup','mayonesa','salsa','vinagre','comino','pimenton','curri','azafran','laurel'] },
    { key: 'congelados', label: 'Congelados', icon: '🧊', words: ['congelado','congelados','helado','hielo'] },
    { key: 'panaderia', label: 'Panadería', icon: '🥖', words: ['tostada','baguette','barra','magdalena','galleta','croissant','muffin','pan integral','pan rallado','pan de','pan de molde'] },
  ],

  // ------------------------------------------------------------
  // Init / persistencia
  // ------------------------------------------------------------
  init() {
    this._data = Store.get(Store.KEYS.SHOPPING) || null;
    if (!this._data || typeof this._data !== 'object') {
      this._data = { tiendas: [], productos: [], precios: [] };
    }
    this._data.tiendas = this._data.tiendas || [];
    this._data.productos = this._data.productos || [];
    this._data.precios = this._data.precios || [];

    // Tiendas por defecto solo si no hay ninguna
    if (this._data.tiendas.length === 0) {
      this._data.tiendas = this.DEFAULT_TIENDAS.map(t => ({ ...t }));
      this._save();
    }

    this._comprados = Store.get(Store.KEYS.SHOPPING_DONE) || {};
  },

  _save() {
    Store.set(Store.KEYS.SHOPPING, this._data);
  },

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  _norm(s) {
    return (s || '')
      .toLowerCase()
      .replace(/ñ/g, 'n')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  _unidad(u) {
    return ({
      'g': 'g', 'ml': 'ml', 'kg': 'kg', 'l': 'l',
      'unidad': 'ud', 'diente': 'dientes', 'dientes': 'dientes',
      'cuchara': 'cda', 'cucharas': 'cda', 'cucharita': 'cdta', 'cucharitas': 'cdta',
      'cucharadita': 'cdta',
      'lata': 'latas', 'latas': 'latas', 'ramo': 'ramo', 'ramas': 'ramo',
      'puñado': 'puñado', 'puñados': 'puñado', 'sobre': 'sobre', 'sobres': 'sobre',
      'none': '',
    })[this._norm(u)] || (u || '');
  },

  _num(cantidad) {
    const n = parseFloat(String(cantidad ?? '').replace(',', '.'));
    return isNaN(n) ? null : n;
  },

  _fmt(n, dec = 2) {
    return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  },

  _precio(n) {
    return `${this._fmt(n)} €`;
  },

  _categoria(nombre, producto) {
    if (producto && producto.categoria && producto.categoria !== 'otros') return producto.categoria;
    const n = this._norm(nombre);
    for (const c of this.CATEGORIAS) {
      if (c.words.some(w => n.includes(w))) return c.key;
    }
    return 'otros';
  },

  // ------------------------------------------------------------
  // Tiendas
  // ------------------------------------------------------------
  getTiendas() {
    return this._data.tiendas.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  getTienda(id) {
    return this._data.tiendas.find(t => t.id === id) || null;
  },

  addTienda({ nombre, tipo = 'supermercado', direccion = '' }) {
    const tienda = {
      id: Store.uuid(),
      nombre: nombre.trim(),
      tipo,
      direccion: direccion.trim(),
    };
    this._data.tiendas.push(tienda);
    this._save();
    return tienda;
  },

  removeTienda(id) {
    this._data.tiendas = this._data.tiendas.filter(t => t.id !== id);
    this._data.precios = this._data.precios.filter(p => p.tiendaId !== id);
    this._save();
  },

  // ------------------------------------------------------------
  // Productos (un producto = lo que comprás: "Carbonell 1L")
  // ------------------------------------------------------------
  getProductos() {
    return this._data.productos;
  },

  findProducto(ingrediente, nombreProducto) {
    const ing = this._norm(ingrediente);
    const nom = this._norm(nombreProducto);
    return this._data.productos.find(p =>
      this._norm(p.ingrediente) === ing && this._norm(p.nombre) === nom
    ) || null;
  },

  getProductosDe(ingrediente) {
    const ing = this._norm(ingrediente);
    return this._data.productos.filter(p => this._norm(p.ingrediente) === ing);
  },

  ensureProducto({ ingrediente, nombre, marca = '', tamano = '' }) {
    let p = this.findProducto(ingrediente, nombre);
    if (!p) {
      p = {
        id: Store.uuid(),
        ingrediente: ingrediente.trim(),
        nombre: nombre.trim(),
        marca: marca.trim(),
        tamano: tamano.trim(),
        categoria: this._categoria(ingrediente, null),
      };
      this._data.productos.push(p);
    } else {
      if (marca) p.marca = marca.trim();
      if (tamano) p.tamano = tamano.trim();
    }
    this._save();
    return p;
  },

  removeProducto(id) {
    this._data.productos = this._data.productos.filter(p => p.id !== id);
    this._data.precios = this._data.precios.filter(p => p.productoId !== id);
    this._save();
  },

  // ------------------------------------------------------------
  // Precios
  // ------------------------------------------------------------
  setPrecio(productoId, tiendaId, precio) {
    const valor = Math.round(parseFloat(precio) * 100) / 100;
    if (!productoId || !tiendaId || isNaN(valor)) return null;
    let p = this._data.precios.find(x => x.productoId === productoId && x.tiendaId === tiendaId);
    if (!p) {
      p = { id: Store.uuid(), productoId, tiendaId, precio: valor, actualizado_at: new Date().toISOString() };
      this._data.precios.push(p);
    } else {
      p.precio = valor;
      p.actualizado_at = new Date().toISOString();
    }
    this._save();
    return p;
  },

  removePrecio(productoId, tiendaId) {
    this._data.precios = this._data.precios.filter(p => !(p.productoId === productoId && p.tiendaId === tiendaId));
    this._save();
  },

  getPreciosDe(productoId) {
    return this._data.precios
      .filter(p => p.productoId === productoId)
      .map(p => ({ ...p, tienda: this.getTienda(p.tiendaId) }))
      .filter(p => p.tienda)
      .sort((a, b) => a.precio - b.precio);
  },

  // El precio más barato entre los productos del ingrediente
  mejorPrecio(ingrediente) {
    let mejor = null;
    for (const prod of this.getProductosDe(ingrediente)) {
      for (const p of this.getPreciosDe(prod.id)) {
        if (!mejor || p.precio < mejor.precio) {
          mejor = { ...p, producto: prod };
        }
      }
    }
    return mejor;
  },

  // ------------------------------------------------------------
  // Lista de la compra
  // ------------------------------------------------------------
  buildList(weekKey = Menu.getWeekKey()) {
    const week = Menu._menu[weekKey] || Menu.getCurrentWeek();
    const acc = new Map();

    Store.getDaysOrder().forEach(day => {
      Store.getMealTypes().forEach(meal => {
        const receta = Recipes.getById(week[day]?.[meal]);
        if (!receta) return;
        (receta.ingredientes || []).forEach(ing => {
          const key = this._norm(ing.nombre);
          if (!key) return;
          if (!acc.has(key)) {
            acc.set(key, {
              key,
              nombre: ing.nombre,
              cantidades: {},   // { unidad: cantidad }
              texto: [],        // cantidades no numéricas ("al gusto")
              condimento: false,
            });
          }
          const item = acc.get(key);
          const unidad = this._unidad(ing.unidad);
          const n = this._num(ing.cantidad);

          if (n === null) {
            // "al gusto" = condimento (no se compra). "un puñado" = cantidad real.
            if (/al\s+gusto/i.test(String(ing.cantidad))) {
              item.condimento = true;
            } else if (!item.texto.includes(String(ing.cantidad))) {
              item.texto.push(String(ing.cantidad));
            }
          } else if (unidad) {
            item.cantidades[unidad] = (item.cantidades[unidad] || 0) + n;
          } else {
            item.condimento = true;
          }
        });
      });
    });

    const items = [...acc.values()].map(item => {
      const partes = Object.entries(item.cantidades)
        .map(([u, c]) => `${this._fmt(c, c % 1 === 0 ? 0 : 1)} ${u}`);
      if (item.texto.length) partes.push(item.texto.join(', '));
      const producto = this.getProductosDe(item.nombre)[0] || null;
      const precio = this.mejorPrecio(item.nombre);
      return {
        ...item,
        cantidad: partes.join(' + ') || 'al gusto',
        categoria: this._categoria(item.nombre, producto),
        producto,
        precio: precio ? precio.precio : null,
        tienda: precio ? precio.tienda : null,
        alternativas: producto ? this.getPreciosDe(producto.id) : [],
        comprado: this.isComprado(item.key),
      };
    });

    // ordena por categoría y luego por nombre
    const ordenCat = ['verduras', 'carniceria', 'pescado', 'lacteos', 'despensa', 'panaderia', 'congelados', 'otros'];
    items.sort((a, b) => {
      const ca = ordenCat.indexOf(a.categoria), cb = ordenCat.indexOf(b.categoria);
      if (ca !== cb) return ca - cb;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
    // los condimentos ("al gusto") no van a la lista de la compra
    return items.filter(i => !i.condimento);
  },

  // ------------------------------------------------------------
  // "Ya lo tengo" (por semana)
  // ------------------------------------------------------------
  _semanaActual() {
    return Menu.getWeekKey();
  },

  isComprado(key, weekKey = this._semanaActual()) {
    return (this._comprados[weekKey] || []).includes(key);
  },

  toggleComprado(key) {
    const wk = this._semanaActual();
    const lista = this._comprados[wk] || [];
    const i = lista.indexOf(key);
    if (i >= 0) lista.splice(i, 1);
    else lista.push(key);
    this._comprados[wk] = lista;
    Store.set(Store.KEYS.SHOPPING_DONE, this._comprados);
  },

  // ------------------------------------------------------------
  // Resumen y reparto por tienda
  // ------------------------------------------------------------
  totalEstimado(items) {
    return items.reduce((acc, it) => acc + (it.precio || 0), 0);
  },

  sinPrecio(items) {
    return items.filter(it => it.precio === null && !it.condimento);
  },

  // Reparte los productos por la tienda más barata de cada uno
  porTienda(items) {
    const grupos = new Map();
    for (const it of items) {
      if (it.condimento) continue;
      const tid = it.tienda ? it.tienda.id : null;
      if (!grupos.has(tid)) {
        grupos.set(tid, { tienda: it.tienda, items: [], total: 0, sinPrecio: 0 });
      }
      const g = grupos.get(tid);
      g.items.push(it);
      if (it.precio !== null) g.total += it.precio;
      else g.sinPrecio++;
    }
    return [...grupos.values()].sort((a, b) => {
      if (!a.tienda) return 1;
      if (!b.tienda) return -1;
      return a.tienda.nombre.localeCompare(b.tienda.nombre, 'es');
    });
  },

  // Texto plano para copiar (con precios y tienda)
  textoLista(items) {
    const lineas = items.map(it => {
      const parts = [`- ${it.nombre}: ${it.cantidad}`];
      if (it.precio !== null) parts.push(`(${Shopping._precio(it.precio)}${it.tienda ? ' en ' + it.tienda.nombre : ''})`);
      return parts.join(' ');
    });
    const reparto = this.porTienda(items).filter(g => g.tienda);
    if (reparto.length) {
      lineas.push('');
      lineas.push('Dónde comprar:');
      reparto.forEach(g => lineas.push(`  ${g.tienda.nombre}: ${g.items.length} productos · ${Shopping._precio(g.total)}`));
    }
    return lineas.join('\n');
  },

  // Sincronización con la nube: el libro entero va en una fila de menu_weeks
  KEY_ROW: 'shopping:data',

  toRow() {
    return {
      week_key: this.KEY_ROW,
      data: {
        tiendas: this._data.tiendas,
        productos: this._data.productos,
        precios: this._data.precios,
      },
      updated_at: new Date().toISOString(),
    };
  },

  // Merge: lo local gana en conflicto, pero no se pierde lo remoto
  mergeRemoto(remoto) {
    if (!remoto) return;
    const r = remoto.tiendas ? remoto : { tiendas: [], productos: [], precios: [] };

    const tiendas = new Map(this._data.tiendas.map(t => [t.id, t]));
    (r.tiendas || []).forEach(t => { if (!tiendas.has(t.id)) tiendas.set(t.id, t); });

    const productos = new Map(this._data.productos.map(p => [p.id, p]));
    (r.productos || []).forEach(p => { if (!productos.has(p.id)) productos.set(p.id, p); });

    const clave = p => `${p.productoId}|${p.tiendaId}`;
    const precios = new Map(this._data.precios.map(p => [clave(p), p]));
    (r.precios || []).forEach(p => {
      if (!precios.has(clave(p))) precios.set(clave(p), p);
    });

    this._data.tiendas = [...tiendas.values()];
    this._data.productos = [...productos.values()];
    this._data.precios = [...precios.values()];
    this._save();
  },
};
