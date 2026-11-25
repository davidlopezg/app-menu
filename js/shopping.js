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

  // Categorías (por palabra clave en el nombre del ingrediente).
  // El match es por palabra completa (no por trozo): así "salmón" NO cae en
  // "sal" (despensa) ni "panceta" en "pan" (panadería).
  CATEGORIAS: [
    { key: 'verduras', label: 'Verduras y frutas', icon: '🥬', words: ['tomate','cebolla','pimiento','patata','zanahoria','lechuga','calabacin','berenjena','pepino','espinaca','apio','albahaca','perejil','cilantro','eneldo','oregano','romero','tomillo','rucula','endibia','esparragos','champinon','seta','puerro','ajo','manzana','naranja','platano','pera','uva','fresa','limon','mandarina','kiwi','melon','aguacate','banana','ciruela','guisante','judia verde','judias verdes','haba verde','habas verdes','jengibre','piña','mango','alcachofa','calabaza','maiz dulce','fruta'] },
    { key: 'carniceria', label: 'Carnicería', icon: '🥩', words: ['pollo','ternera','cerdo','lomo','codillo','chorizo','tocino','bacon','jamon','salchicha','butifarra','costillar','pechuga','muslo','chuleton','entrecot','solomillo','milanesa','carne','pavo','pato','bistec','panceta','guanciale','morcilla','cordero','carrillera','gulas'] },
    { key: 'pescado', label: 'Pescado', icon: '🐟', words: ['merluza','salmon','atun','bacalao','lubina','dorada','calamar','sepia','pulpo','gamba','almeja','mejillon','sardina','boqueron','anchoa','trucha','rape','lenguado','pez','vieira','cigala'] },
    { key: 'lacteos', label: 'Lácteos y huevos', icon: '🥛', words: ['leche','queso','yogur','nata','crema','mantequilla','huevo','caciotta','ricotta','burrata','mozzarella','mascarpone','kefir'] },
    { key: 'despensa', label: 'Despensa', icon: '🥫', words: ['pasta','arroz','harina','azucar','aceite','sal','lenteja','garbanzo','alubia','haba','fabe','judia','tomate triturado','caldo','fideos','espagueti','macarron','couscous','quinoa','avena','miel','mostaza','ketchup','mayonesa','salsa','vinagre','comino','pimenton','curri','azafran','laurel','guindilla','pimienta','nuez moscada','canela','clavo','cacao','cafe','chocolate','frutos seco','nuez','nueces','almendra','pinon','piones','castaña','cacahuete','aceituna','agua','levadura','maicena','miso','alga','wakame','tofu','pesto','sesamo','lupulo','masala'] },
    { key: 'panaderia', label: 'Panadería', icon: '🥖', words: ['pan','tostada','baguette','barra','magdalena','galleta','croissant','muffin','picatostes','frankfurt','pan rallado','pan de molde','tortita','donut','ensaimada'] },
    { key: 'congelados', label: 'Congelados', icon: '🧊', words: ['congelado','helado','hielo'] },
    { key: 'bebidas', label: 'Bebidas', icon: '🍷', words: ['vino','cerveza','mirin','sake','refresco','zumo','soda','cava','espumoso','ron','whisky','ginebra','vodka','agua mineral'] },
  ],

  // Cosas que no se compran: ya las tenés en casa.
  NO_COMPRAR: ['agua'],

  // "Salsa de tomate" es despensa (no es un tomate) y "Caldo de pollo"
  // también (no es pollo).
  PREFIJOS: { 'salsa': 'despensa', 'caldo': 'despensa' },

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
    this._data.extras = this._data.extras || {};   // productos a mano, por semana
    this._data.tickets = this._data.tickets || []; // registros de compra
    this._aliasMap = null;

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

  // Ingredientes que son lo mismo pero con nombres distintos en las recetas.
  // Se unifican para que la lista no los repetition y el precio serve para
  // todos (ej: "Ajo" y "Dientes de ajo" → un solo "Ajo").
  ALIAS_ING: {
    'dientes de ajo': 'ajo',
    'aceite de oliva virgen extra': 'aceite de oliva',
    'pimientos rojos': 'pimiento rojo',
    'pimientos verdes': 'pimiento verde',
    'tomates maduros': 'tomate maduro',
    'tomates maduros variados': 'tomate maduro',
    'perejil fresco': 'perejil',
    'perejil picado': 'perejil',
    'setas variadas (champinones, shiitake)': 'setas',
    'setas variadas (champinones)': 'setas',
    'arroz bomba o calasparra': 'arroz blanco',
    'arroz basmati': 'arroz blanco',
    'arroz jazmin o de grano corto': 'arroz blanco',
    'filetes de salmon': 'salmon',
    'lomo de cerdo en filetes': 'lomo de cerdo',
    'merluza en rodajas': 'merluza',
    'filetes de lenguado': 'lenguado',
    'gambas peladas': 'gambas',
    'mejillones frescos': 'mejillones',
    'almejas': 'almejas',
    'queso parmesano rallado': 'queso parmesano',
    'queso parmesano en lascas': 'queso parmesano',
    'atun en lata escurrido': 'atun en lata',
    'atun en lata al natural': 'atun en lata',
    'pollo (muslos o entero en piezas)': 'pollo',
    'pechuga de pollo en cubos': 'pechuga de pollo',
    'pollo a la plancha (pechuga)': 'pechuga de pollo',
    'yogur natural': 'yogur',
    'huevo': 'huevos',
    'pasta (espaguetis o la que prefieras)': 'pasta',
    'espaguetis': 'pasta',
    'tomate cherry': 'tomate cherry',
    'tomates cherry': 'tomate cherry',
    'vinagre de modena o de jerez': 'vinagre de jerez',
    'lomo con pimientos': 'lomo con pimientos',
    'alubias cocidas': 'alubias',
    'alubias blancas cocidas': 'alubias',
    'setas variadas': 'setas',
    'butifarra de perol o negra': 'butifarra',
    'butifarra negra': 'butifarra',
    'guisantes (frescos o congelados)': 'guisantes',
    'guisantes frescos': 'guisantes',
    'huevo': 'huevos',
    // --- v48: unificaciones que faltaban (mismo producto, 2 filas) ---
    'ajo rallado': 'ajo',
    'nueces peladas': 'nueces',
    'lechuga romana o iceberg': 'lechuga',
    'manzana verde': 'manzana',
    'pimenton o perejil': 'pimentón',
    'romero y tomillo': 'romero',
    'tomillo y laurel': 'tomillo',
    'miel o sirope de agave': 'miel',
    'mantequilla o aceite': 'mantequilla',
    'pasta rellena (ravioles, cappelletti, tortelloni)': 'pasta',
    'caldo de pollo o verduras': 'caldo de pollo',
    'agua o caldo': 'agua',
    'agua fria': 'agua',
    'aguacate': 'aguacate',
    'diente de ajo': 'ajo',
    'calamares limpios': 'calamar limpio',
    'butifarras': 'butifarra',
    'pulpo y/o calamar': 'pulpo',
  },

  // Cómo se muestra cada canónico (con tildes y mayúscula)
  CANON_LABEL: {
    'ajo': 'Ajo',
    'aceite de oliva': 'Aceite de oliva',
    'pimiento rojo': 'Pimiento rojo',
    'pimiento verde': 'Pimiento verde',
    'tomate maduro': 'Tomate maduro',
    'perejil': 'Perejil',
    'setas': 'Setas',
    'arroz blanco': 'Arroz blanco',
    'salmon': 'Salmón',
    'lomo de cerdo': 'Lomo de cerdo',
    'merluza': 'Merluza',
    'lenguado': 'Lenguado',
    'gambas': 'Gambas',
    'mejillones': 'Mejillones',
    'queso parmesano': 'Queso parmesano',
    'atun en lata': 'Atún en lata',
    'pollo': 'Pollo',
    'pechuga de pollo': 'Pechuga de pollo',
    'yogur': 'Yogur',
    'huevos': 'Huevos',
    'pasta': 'Pasta',
    'tomate cherry': 'Tomate cherry',
    'vinagre de jerez': 'Vinagre de Jerez',
    'lomo con pimientos': 'Lomo con pimientos',
    'alubias': 'Alubias',
    'setas': 'Setas',
    'butifarra': 'Butifarra',
  },

  // Nombre canónico de un ingrediente (para agrupar y para los precios)
  // Los alias se normalizan igual que los ingredientes: así los que tienen
  // paréntesis ("pollo (muslos o entero en piezas)") también funcionan.
  _alias() {
    if (!this._aliasMap) {
      this._aliasMap = {};
      for (const [k, v] of Object.entries(this.ALIAS_ING)) this._aliasMap[this._norm(k)] = v;
    }
    return this._aliasMap;
  },

  _canon(nombre) {
    const n = this._norm(nombre);
    return this._alias()[n] || n;
  },

  // Nombre que se muestra en la lista: el del alias si unifica
  // ("Ajo rallado" → "Ajo") y sin los paréntesis ("Sake (opcional)" → "Sake").
  _labelDe(nombreOriginal) {
    const crudo = String(nombreOriginal || '').replace(/\s*\([^)]*\)/g, '').trim() || String(nombreOriginal || '');
    const alias = this._alias()[this._norm(nombreOriginal)];
    if (alias) {
      const key = this._norm(alias);
      if (this.CANON_LABEL[key]) return this.CANON_LABEL[key];
      if (this._norm(crudo).includes(key)) return this._titulo(alias);
    }
    return crudo;
  },

  _titulo(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  },

  // Unidad canónica (singular). El plural se pone al mostrar ("2 dientes").
  // Unidades "contables" (piezas): si el mismo producto sale con "ud" en una
  // receta y con "dientes" en otra, se suman en la misma (no "2 ud + 1 diente").
  UNIDADES_PIEZA: ['ud', 'diente', 'lata', 'hoja', 'loncha', 'rebanada', 'rodaja', 'ramo'],

  _unidad(u) {
    return ({
      'g': 'g', 'ml': 'ml', 'kg': 'kg', 'l': 'l',
      'unidad': 'ud', 'ud': 'ud',
      'diente': 'diente', 'dientes': 'diente',
      'cuchara': 'cda', 'cucharas': 'cda', 'cucharita': 'cdta', 'cucharitas': 'cdta',
      'cucharadita': 'cdta',
      'lata': 'lata', 'latas': 'lata',
      'ramo': 'ramo', 'ramas': 'ramo',
      'hoja': 'hoja', 'hojas': 'hoja',
      'loncha': 'loncha', 'lonchas': 'loncha',
      'rebanada': 'rebanada', 'rebanadas': 'rebanada',
      'rodaja': 'rodaja', 'rodajas': 'rodaja',
      'puñado': 'puñado', 'puñados': 'puñado', 'sobre': 'sobre', 'sobres': 'sobre',
      'none': '',
    })[this._norm(u)] || (u || '');
  },

  // Plural de la unidad cuando la cantidad es > 1 ("2 dientes", "1 diente")
  _uLabel(u, n) {
    const plural = {
      diente: 'dientes', lata: 'latas', ramo: 'ramos', hoja: 'hojas',
      loncha: 'lonchas', rebanada: 'rebanadas', rodaja: 'rodajas',
    };
    return (n > 1 && plural[u]) ? plural[u] : u;
  },

  // Número con fracciones: "1/2" → 0.5 · "1 1/2" → 1.5 · "0,5" → 0.5
  _num(cantidad) {
    const s = String(cantidad ?? '').trim().replace(',', '.');
    if (!s) return null;
    const mixto = s.match(/^(\d+(?:\.\d+)?)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixto) {
      const den = parseFloat(mixto[3]);
      return den ? parseFloat(mixto[1]) + parseFloat(mixto[2]) / den : null;
    }
    if (s.includes('/')) {
      const [a, b] = s.split('/').map(x => parseFloat(x));
      return (!isNaN(a) && !isNaN(b) && b !== 0) ? a / b : null;
    }
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  },

  _fmt(n, dec = 2) {
    return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  },

  _precio(n) {
    return `${this._fmt(n)} €`;
  },

  // "de Tortilla de verduras" / "de 2 platos"
  _de(item) {
    const nombres = (item.origen || []).map(o => o.receta);
    if (nombres.length === 0) return '';
    if (nombres.length === 1) return `de ${nombres[0]}`;
    return `de ${nombres.length} platos`;
  },

  // "mié · Tortilla de verduras"
  _donde(item) {
    const dias = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    const o = (item.origen || [])[0];
    if (!o) return '';
    const d = dias[Store.getDaysOrder().indexOf(o.dia)];
    const c = o.meal === 'lunch' ? 'almuerzo' : 'cena';
    return `${d} ${c}`;
  },

  // Categoría de un ingrediente: match por palabra completa (con plural),
  // no por trozos → "salmón" NO es despensa ("sal") ni "panceta" panadería ("pan").
  _categoria(nombre, producto) {
    if (producto && producto.categoria && producto.categoria !== 'otros') return producto.categoria;
    const n = this._norm(nombre);
    for (const [p, cat] of Object.entries(this.PREFIJOS)) {
      if (n.startsWith(p + ' ')) return cat;
    }
    for (const c of this.CATEGORIAS) {
      if (c.words.some(w => this._matchPalabra(n, w))) return c.key;
    }
    return 'otros';
  },

  // "sal" NO matchea "salmón" ni "panceta"; "pimiento" sí matchea "pimientos"
  _matchPalabra(n, palabra) {
    const w = this._norm(palabra);
    if (w.includes(' ')) return n.includes(w);
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${esc}(s|es)?\\b`).test(n);
  },

  // ------------------------------------------------------------
  // Tickets (registros de compra)
  // ------------------------------------------------------------
  // Lo que se compró, en qué tienda y a qué precio. El ticket es la fuente
  // de verdad del libro de precios: cada línea puede guardar su precio en
  // la tienda del ticket.
  getTickets() {
    return (this._data.tickets || []).slice()
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  },

  getTicket(id) {
    return (this._data.tickets || []).find(t => t.id === id) || null;
  },

  ticketTotal(ticket) {
    if (!ticket) return 0;
    if (ticket.total !== null && ticket.total !== undefined) return parseFloat(ticket.total) || 0;
    return (ticket.lineas || []).reduce((a, l) => a + (parseFloat(l.precioTotal) || 0), 0);
  },

  // Gasto del mes (YYYY-MM)
  gastoDelMes(mes) {
    const m = mes || new Date().toISOString().slice(0, 7);
    return this.getTickets()
      .filter(t => String(t.fecha || '').startsWith(m))
      .reduce((a, t) => a + this.ticketTotal(t), 0);
  },

  // Guarda un ticket: registra la compra, actualiza el libro de precios y
  // (opcionalmente) marca como comprado lo de la lista de esta semana.
  addTicket({ fecha, tiendaId, tiendaNombre, lineas, total, marcarComprado = true }) {
    const lineasLimpias = (lineas || [])
      .map(l => ({
        descripcion: String(l.descripcion || '').trim(),
        cantidad: l.cantidad === '' || l.cantidad === null || l.cantidad === undefined ? null : l.cantidad,
        precioUnit: this._num(l.precioUnit),
        precioTotal: this._num(l.precioTotal),
        ingrediente: l.ingrediente || null,
        productoId: l.productoId || null,
        precioGuardado: !!l.precioGuardado,
      }))
      .filter(l => l.descripcion);

    const ticket = {
      id: Store.uuid(),
      fecha: fecha || new Date().toISOString().slice(0, 10),
      tiendaId: tiendaId || null,
      tiendaNombre: tiendaNombre || '',
      lineas: lineasLimpias,
      total: this._num(total) ?? lineasLimpias.reduce((a, l) => a + (l.precioTotal || 0), 0),
      creado: new Date().toISOString(),
    };

    // 1) el precio del ticket va al libro de precios (producto + tienda)
    for (const l of ticket.lineas) {
      if (!l.precioGuardado || !l.ingrediente || !ticket.tiendaId || l.precioTotal === null) continue;
      // si escribió el nombre del producto del súper ("Plátano canario"),
      // el ingrediente real es el del catálogo ("Plátano")
      l.ingrediente = this._ingredienteDe(l.ingrediente);
      if (!l.productoId) {
        // el producto del libro: el que se llama como dice el ticket, o el
        // que ya tiene precio en esa tienda, o uno nuevo con el nombre del
        // ticket (cada tienda llama distinto a las cosas)
        l.productoId = this._productoDelTicket(l.ingrediente, l.descripcion, ticket.tiendaId).id;
      }
      const producto = this._data.productos.find(p => p.id === l.productoId);
      this.setPrecio(l.productoId, ticket.tiendaId, this._precioLibro(l, producto));
    }

    // 2) marcar como comprado lo que coincide con la lista de esta semana
    if (marcarComprado) {
      const items = this.buildList();
      for (const l of ticket.lineas) {
        if (!l.ingrediente) continue;
        const key = this._norm(this._canon(l.ingrediente));
        const item = items.find(i => i.key === key);
        if (item && !item.comprado) this.toggleComprado(key);
      }
    }

    this._data.tickets = this._data.tickets || [];
    this._data.tickets.push(ticket);
    this._save();
    return ticket;
  },

  removeTicket(id) {
    this._data.tickets = (this._data.tickets || []).filter(t => t.id !== id);
    this._save();
  },

  // "PATATAS 1KG" → "Patatas 1kg" (nombre del producto en el libro)
  _tituloNombre(desc) {
    return String(desc || '')
      .toLowerCase()
      .replace(/\b[a-záéíóúñ]/g, c => c.toUpperCase())
      .replace(/\b(de|del|la|el|los|las|y|con)\b/g, m => m.toLowerCase());
  },

  // Qué precio se guarda en el libro para una línea del ticket. En el libro
  // va el precio de UNA unidad (o el €/kg si el súper lo vende por kilo), no
  // el total de la línea: "2 x 1,79" son 1,79 por unidad, y "1,45 kg 2,10 €"
  // son 1,45 €/kg.
  _precioLibro(linea, producto) {
    const total = linea.precioTotal;
    const n = this._num(linea.cantidad);
    const unidad = this._unidadVenta(producto && producto.unidad);
    if (unidad === 'kg' && n && n > 0) return Math.round((total / n) * 100) / 100;
    if (linea.precioUnit !== null && linea.precioUnit !== undefined) return linea.precioUnit;
    return total;
  },

  // Si lo que escribió el usuario es el NOMBRE de un producto del libro
  // ("Plátano canario"), el ingrediente real es el de ese producto
  // ("plátano") → así el precio le llega a la fila de la lista de la compra.
  _ingredienteDe(nombre) {
    const n = this._norm(nombre);
    if (!n) return nombre;
    const prods = this._data.productos;
    let prod = prods.find(p => this._norm(p.nombre) === n);
    if (!prod) {
      prod = prods.find(p => {
        const pn = this._norm(p.nombre);
        return pn && (n.includes(pn) || pn.includes(n));
      });
    }
    return prod ? this._canon(prod.ingrediente) : nombre;
  },

  // Qué producto del libro es el de esta línea del ticket:
  //   1) el que se llama como dice el ticket ("PLATANO CANARIO 1KG" →
  //      "Plátano canario"), el más específico si hay varios;
  //   2) el que ya tiene precio en esa tienda;
  //   3) uno nuevo con el nombre del ticket (esa tienda lo llama así).
  _productoDelTicket(ingrediente, descripcion, tiendaId) {
    const productos = this.getProductosDe(ingrediente);
    if (!productos.length) {
      return this.ensureProducto({ ingrediente, nombre: this._tituloNombre(descripcion) });
    }
    const d = this._norm(descripcion);
    if (d) {
      const cands = productos.filter(p => {
        const n = this._norm(p.nombre);
        if (!n) return false;
        if (d.includes(n)) return true;
        return d.length >= 3 && n.includes(d);
      });
      // el nombre más largo es el más específico ("Plátano de Canarias" > "Plátano")
      cands.sort((a, b) => this._norm(b.nombre).length - this._norm(a.nombre).length);
      if (cands[0]) return cands[0];
    }
    const enTienda = productos.find(p =>
      this._data.precios.some(x => x.productoId === p.id && x.tiendaId === tiendaId));
    if (enTienda) return enTienda;
    return this.ensureProducto({ ingrediente, nombre: this._tituloNombre(descripcion) });
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
    const ing = this._norm(this._canon(ingrediente));
    const nom = this._norm(nombreProducto);
    return this._data.productos.find(p =>
      this._norm(p.ingrediente) === ing && this._norm(p.nombre) === nom
    ) || null;
  },

  getProductosDe(ingrediente) {
    const ing = this._norm(this._canon(ingrediente));
    return this._data.productos.filter(p => this._norm(p.ingrediente) === ing);
  },

  ensureProducto({ ingrediente, nombre, marca = '', tamano = '', unidad = null, formato = null }) {
    let p = this.findProducto(ingrediente, nombre);
    if (!p) {
      p = {
        id: Store.uuid(),
        ingrediente: this._canon(ingrediente),
        nombre: nombre.trim(),
        marca: marca.trim(),
        tamano: tamano.trim(),
        categoria: this._categoria(ingrediente, null),
        unidad: this._unidadVenta(unidad),
        formato: this._formato(formato),
      };
      this._data.productos.push(p);
    } else {
      if (marca) p.marca = marca.trim();
      if (tamano) p.tamano = tamano.trim();
      // cómo lo vende el súper (€/kg o €/unidad) y cuánto pesa el formato
      if (unidad) p.unidad = this._unidadVenta(unidad);
      if (formato !== null && formato !== undefined && formato !== '') p.formato = this._formato(formato);
    }
    this._save();
    return p;
  },

  // Cómo lo vende un súper: por kilo (el precio es por kg/l) o por unidad
  // (el precio es por pieza o por formato: una bolsa, una bandeja).
  UNIDADES_VENTA: ['kg', 'ud', 'l'],

  _unidadVenta(u) {
    const n = this._norm(u);
    if (n === 'kg' || n === 'kilo' || n === 'kilos' || n === 'kgs' || n === 'kg.') return 'kg';
    if (n === 'l' || n === 'litro' || n === 'litros') return 'l';
    return 'ud';
  },

  // Peso de una unidad en gramos ("500 g" → 500). null si no se sabe.
  _formato(f) {
    if (f === null || f === undefined || f === '') return null;
    if (typeof f === 'number') return f > 0 ? Math.round(f) : null;
    const n = this._num(String(f).replace(/\s*(g|gr|gramos?)\s*/gi, ''));
    return n !== null && n > 0 ? Math.round(n) : null;
  },

  removeProducto(id) {
    this._data.productos = this._data.productos.filter(p => p.id !== id);
    this._data.precios = this._data.precios.filter(p => p.productoId !== id);
    this._save();
  },

  // ------------------------------------------------------------
  // Productos a mano (los que NO salen de ninguna receta)
  // ------------------------------------------------------------
  // "Papel de cocina", "cerveza", "limpieza"... cosas que también hay que
  // comprar pero no están en el menú. Viven en el libro (que sí sincroniza)
  // → se ven en los dos móviles.
  _extras(weekKey = Menu.getWeekKey()) {
    if (!this._data.extras[weekKey]) this._data.extras[weekKey] = { items: [] };
    if (!this._data.extras[weekKey].items) this._data.extras[weekKey].items = [];
    return this._data.extras[weekKey];
  },

  addManual({ nombre, cantidad = '', categoria = '', precio = null, tiendaId = null, nombreTienda = '', unidad = null, formato = null }) {
    const n = (nombre || '').trim();
    if (!n) return null;
    const item = {
      id: Store.uuid(),
      nombre: n,
      cantidad: String(cantidad || '').trim(),
      categoria: categoria || this._categoria(n, null),
    };
    this._extras().items.push(item);
    // si viene con precio, se guarda en el libro → total y reparto funcionan
    if (tiendaId && this._num(precio) !== null) {
      // el nombre en esa tienda (si no, el mismo nombre del producto)
      const nombreProd = String(nombreTienda || '').trim() || n;
      const producto = this.ensureProducto({ ingrediente: n, nombre: nombreProd, unidad, formato });
      this.setPrecio(producto.id, tiendaId, precio);
    }
    this._save();
    return item;
  },

  removeManual(id) {
    for (const wk of Object.keys(this._data.extras)) {
      const s = this._data.extras[wk] || {};
      s.items = (s.items || []).filter(i => i.id !== id);
    }
    this._save();
  },

  // "2", "2 ud", "1 kg" → lo suma a las cantidades si la unidad ya existe
  _sumarCantidad(item, texto) {
    const t = String(texto || '').trim();
    if (!t) return;
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ%]*)$/);
    if (m) {
      const n = this._num(m[1]);
      if (n !== null) {
        const u = this._unidad(m[2]) || 'ud';
        item.cantidades[u] = (item.cantidades[u] || 0) + n;
        return;
      }
    }
    if (!item.texto.includes(t)) item.texto.push(t);
  },

  // ------------------------------------------------------------
  // Precios
  // ------------------------------------------------------------
  setPrecio(productoId, tiendaId, precio) {
    // acepta "1,99" (coma) y "1.99" (punto)
    const n = this._num(precio);
    if (!productoId || !tiendaId || n === null) return null;
    const valor = Math.round(n * 100) / 100;
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

  // ------------------------------------------------------------
  // Ofertas por tienda (issue #2)
  // ------------------------------------------------------------
  // El mismo ingrediente se llama distinto en cada supermercado:
  // "Plátano de Canarias" en Mercadona, "Plátano canario" en Carrefour.
  // Cada entrada del libro (un producto) tiene SU nombre y SUS precios
  // por tienda → una oferta es "este ingrediente, en esta tienda, con este
  // nombre y este precio".
  //
  // Y además cada súper lo vende distinto: uno lo vende POR KILO (4,50 €/kg)
  // y otro POR UNIDAD o por formato (bolsa de 500 g, 1,79 €). Para poder
  // compararlos hace falta la misma base:
  //   coste   → lo que se paga por la cantidad que pide la lista
  //   porKilo → el precio por kilo (la base comparable entre tiendas)
  getOfertas(ingrediente, item = null) {
    const ofertas = [];
    for (const prod of this.getProductosDe(ingrediente)) {
      const unidad = this._unidadVenta(prod.unidad);
      const formato = prod.formato || null;
      for (const p of this.getPreciosDe(prod.id)) {
        const gramos = this._gramos(item, formato);
        let coste = p.precio;
        if (unidad === 'kg' || unidad === 'l') {
          // el precio es por kilo: se proratea a lo que pide la lista
          coste = gramos ? (p.precio * gramos) / 1000 : p.precio;
        } else if (formato && gramos) {
          // el precio es por formato (bolsa de 500 g): se proratea también
          coste = (p.precio * gramos) / formato;
        }
        const porKilo = (unidad === 'kg' || unidad === 'l')
          ? p.precio
          : (formato ? (p.precio * 1000) / formato : null);
        ofertas.push({
          tienda: p.tienda,
          tiendaId: p.tiendaId,
          producto: prod,
          productoId: prod.id,
          nombreProducto: prod.nombre,
          precio: p.precio,
          unidad,
          formato,
          gramos,
          coste: Math.round(coste * 100) / 100,
          porKilo: porKilo !== null ? Math.round(porKilo * 100) / 100 : null,
        });
      }
    }
    // por tienda y, dentro de la tienda, el más barato primero
    return ofertas.sort((a, b) =>
      a.tienda.nombre.localeCompare(b.tienda.nombre, 'es') || a.coste - b.coste);
  },

  // Cuántos gramos pide la lista para este producto (si lo sabemos).
  _gramos(item, formato = null) {
    const c = (item && item.cantidades) || {};
    let g = 0;
    if (c.g) g += c.g;
    if (c.kg) g += c.kg * 1000;
    if (c.l) g += c.l * 1000;
    // "2 pimientos" de 150 g cada uno → 300 g (si se conoce el formato)
    if (c.ud && formato) g += c.ud * formato;
    return g > 0 ? g : null;
  },

  // El precio de un ingrediente en una tienda concreta, con el nombre que
  // tiene el producto ahí. null si esa tienda no lo tiene.
  getOferta(ingrediente, tiendaId) {
    return this.getOfertas(ingrediente).find(o => o.tiendaId === tiendaId) || null;
  },

  // Lo que ya se sabe de un ingrediente en cada tienda: nombre, unidad y
  // peso del formato.
  datosPorTienda(ingrediente) {
    const out = {};
    for (const o of this.getOfertas(ingrediente)) {
      if (!out[o.tiendaId]) {
        out[o.tiendaId] = { nombre: o.nombreProducto, unidad: o.unidad, formato: o.formato };
      }
    }
    return out;
  },

  // El nombre que ya se usa para un ingrediente en cada tienda
  // { [tiendaId]: "Plátano canario" }
  nombresPorTienda(ingrediente) {
    const out = {};
    for (const o of this.getOfertas(ingrediente)) {
      if (!out[o.tiendaId]) out[o.tiendaId] = o.nombreProducto;
    }
    return out;
  },

  // Poner el precio de un ingrediente en una tienda con el nombre que tiene
  // el producto ahí ("Plátano canario" en Carrefour) y cómo lo venden (por
  // kilo o por unidad). Si ese nombre no está en el libro, se crea el
  // producto con él.
  setPrecioEnTienda(ingrediente, tiendaId, nombreProducto, precio, { unidad = null, formato = null } = {}) {
    const nombre = String(nombreProducto || '').trim();
    if (!nombre) return null;
    const producto = this.ensureProducto({ ingrediente, nombre, unidad, formato });
    return this.setPrecio(producto.id, tiendaId, precio);
  },

  // El precio más barato entre los productos del ingrediente (por lo que se
  // paga de verdad por la cantidad de la lista).
  mejorPrecio(ingrediente, item = null) {
    const ofertas = this.getOfertas(ingrediente, item);
    if (!ofertas.length) return null;
    let mejor = ofertas[0];
    for (const o of ofertas) {
      if (o.coste < mejor.coste) mejor = o;
    }
    return { ...mejor, producto: mejor.producto, nombreProducto: mejor.nombreProducto };
  },

  // El más barato con la MISMA base (€/kg): es el que sirve para comparar
  // entre supermercados. null si las tiendas no lo venden igual.
  mejorPorKilo(ingrediente, item = null) {
    const conBase = this.getOfertas(ingrediente, item).filter(o => o.porKilo !== null);
    if (!conBase.length) return null;
    return conBase.reduce((a, b) => (b.porKilo < a.porKilo ? b : a));
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
          const canon = this._canon(ing.nombre);
          const key = this._norm(canon);
          if (!key) return;
          if (!acc.has(key)) {
            acc.set(key, {
              key,
              nombre: this.CANON_LABEL[key] || this._labelDe(ing.nombre),
              cantidades: {},   // { unidad: cantidad }
              texto: [],        // cantidades escritas a mano ("un paquete")
              origen: [],       // de qué platos sale este ingrediente
            });
          }
          const item = acc.get(key);
          let unidad = this._unidad(ing.unidad);
          const n = this._num(ing.cantidad);

          // de qué plato viene (para que la lista no parezca arbitraria)
          if (!item.origen.some(o => o.receta === receta.nombre)) {
            item.origen.push({ receta: receta.nombre, dia: day, meal });
          }

          if (n === null) {
            // "al gusto", "un puñado", "unas hojas", "suficiente"... no es una
            // cantidad que se pueda comprar → no cuenta para la lista.
            // (si el mismo producto aparece con cantidad real en otra receta,
            //  el producto SÍ sale: solo se ignora esta mención)
          } else if (unidad) {
            // "2 ud" + "1 diente" del mismo producto → una sola cantidad
            if (item.cantidades[unidad] === undefined) {
              const misma = Object.keys(item.cantidades)
                .find(u => this.UNIDADES_PIEZA.includes(u) && this.UNIDADES_PIEZA.includes(unidad));
              if (misma) unidad = misma;
            }
            item.cantidades[unidad] = (item.cantidades[unidad] || 0) + n;
          } else {
            // número sin unidad → unidades
            item.cantidades.ud = (item.cantidades.ud || 0) + n;
          }
        });
      });
    });

    // Productos añadidos a mano: si ya hay una fila con ese producto
    // (de una receta) se SUMA a la misma fila → la lista no se repite.
    for (const manual of (this._extras(weekKey).items || [])) {
      const key = this._norm(this._canon(manual.nombre));
      if (!key) continue;
      if (acc.has(key)) {
        const item = acc.get(key);
        item.manual = true;
        item.manualId = manual.id;
        this._sumarCantidad(item, manual.cantidad);
        continue;
      }
      const item = {
        key,
        nombre: this.CANON_LABEL[key] || this._labelDe(manual.nombre),
        cantidades: {},
        texto: [],
        origen: [],
        manual: true,
        manualId: manual.id,
        manualCategoria: manual.categoria,
      };
      this._sumarCantidad(item, manual.cantidad);
      acc.set(key, item);
    }

    const items = [...acc.values()].map(item => {
      const partes = Object.entries(item.cantidades)
        .map(([u, c]) => `${this._fmt(c, c % 1 === 0 ? 0 : 1)} ${this._uLabel(u, c)}`);
      if (item.texto.length) partes.push(item.texto.join(', '));
      const producto = this.getProductosDe(item.nombre)[0] || null;
      const ofertas = this.getOfertas(item.nombre, item);
      const precio = this.mejorPrecio(item.nombre, item);
      const mejorKilo = this.mejorPorKilo(item.nombre, item);
      ofertas.forEach(o => {
        o.mejorKilo = !!(mejorKilo && o.productoId === mejorKilo.productoId && o.tiendaId === mejorKilo.tiendaId);
      });
      return {
        ...item,
        cantidad: partes.join(' + '),
        categoria: item.manualCategoria || this._categoria(item.nombre, producto),
        producto,
        // lo que se paga por la cantidad que pide la lista (prorrateado si
        // el súper lo vende por kilo)
        precio: precio ? precio.coste : null,
        tienda: precio ? precio.tienda : null,
        unidad: precio ? precio.unidad : null,
        porKilo: precio ? precio.porKilo : null,
        // el precio y el nombre que tiene en cada tienda (issue #2)
        ofertas,
        nombreProducto: precio ? precio.nombreProducto : null,
        alternativas: producto ? this.getPreciosDe(producto.id) : [],
        comprado: this.isComprado(item.key),
      };
    });

    // ordena por categoría y luego por nombre
    const ordenCat = ['verduras', 'carniceria', 'pescado', 'lacteos', 'despensa', 'panaderia', 'congelados', 'bebidas', 'otros'];
    items.sort((a, b) => {
      const ca = ordenCat.indexOf(a.categoria), cb = ordenCat.indexOf(b.categoria);
      if (ca !== cb) return ca - cb;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
    // Solo lo que se compra de verdad: cantidad numérica (o lo que escribió
    // el usuario a mano) y no cosas que ya tenés en casa (el agua).
    return items.filter(i => i.cantidad && !this.NO_COMPRAR.includes(i.key));
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
    return items.filter(it => it.precio === null);
  },

  // Reparte los productos por la tienda más barata de cada uno
  porTienda(items) {
    const grupos = new Map();
    for (const it of items) {
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

  // Texto plano para copiar (con precios, tienda, nombre del producto y la
  // base con la que se comparan: por kilo o por unidad)
  textoLista(items) {
    const lineas = items.map(it => {
      const parts = [`- ${it.nombre}: ${it.cantidad}`];
      if (it.precio !== null) {
        const oferta = it.tienda
          ? (it.ofertas || []).find(o => o.coste === it.precio && o.tienda.id === it.tienda.id)
          : null;
        const base = (oferta && oferta.unidad !== 'kg' && oferta.porKilo)
          ? ` · ${Shopping._fmt(oferta.porKilo)} €/kg` : '';
        parts.push(`(${Shopping._precio(it.precio)}${it.tienda ? ' en ' + it.tienda.nombre : ''}` +
          `${oferta && oferta.nombreProducto ? ' — ' + oferta.nombreProducto : ''}${base})`);
      }
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
        extras: this._data.extras,
        tickets: this._data.tickets,
      },
      updated_at: new Date().toISOString(),
    };
  },

  // Merge: lo local gana en conflicto, pero no se pierde lo remoto
  mergeRemoto(remoto) {
    if (!remoto) return;
    const r = remoto;

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

    // productos a mano: unión por id (si está en los dos, gana el local)
    const extras = { ...(this._data.extras || {}) };
    for (const wk of Object.keys(r.extras || {})) {
      const local = extras[wk] || { items: [] };
      const items = new Map((local.items || []).map(i => [i.id, i]));
      ((r.extras[wk] && r.extras[wk].items) || []).forEach(i => {
        if (!items.has(i.id)) items.set(i.id, i);
      });
      extras[wk] = { ...(r.extras[wk] || {}), items: [...items.values()] };
    }
    this._data.extras = extras;

    // tickets: unión por id (si está en los dos, gana el local)
    const tickets = new Map((this._data.tickets || []).map(t => [t.id, t]));
    (r.tickets || []).forEach(t => { if (!tickets.has(t.id)) tickets.set(t.id, t); });
    this._data.tickets = [...tickets.values()];

    this._save();
  },
};
