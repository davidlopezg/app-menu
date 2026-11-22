// ============================================
// Prep — Plan de preparación de la semana
// ============================================
// Responde "¿qué hago y cuándo?" a partir del menú de la semana:
//
//   1. Cada receta tiene una "conserva" estimada (días que aguanta en la
//      nevera), deducida del nombre, los tags y los ingredientes.
//   2. Cada receta se puede preparar en una ventana: desde
//      (día que se come - conserva) hasta (día que se come).
//   3. Para ser productivo, las elaboraciones que comparten un ingrediente
//      base (pollo, arroz, legumbre...) se cocinan JUNTAS en una misma
//      sesión, siempre que la ventana de ambas lo permita.
//   4. Cada día de la semana queda con una sesión de cocina… o con descanso.
//
// Todo es heurística: no hay tiempo de cocción en las recetas, así que la
// conserva y los minutos son estimaciones.
// ponytail: si algún día se agregan `conservaDias` y `prepMin` a la receta,
// estas heurísticas pasan a ser solo el fallback para las recetas viejas.

const Prep = {
  // Días (índice 0 = lunes)
  DIAS: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'],
  DIAS_LARGO: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],

  // Máximo de platos por sesión (más de esto es un maratón de cocina)
  MAX_PLATOS_POR_SESION: 3,

  // Adelanto máximo: no cocinamos más de N días antes de comer el plato,
  // aunque la conserva dé más. Frescura > organización.
  MAX_DIAS_ADELANTO: 2,

  // Reglas de conserva, en orden: gana la primera que matchea.
  // dias = días que aguanta en la nevera · tipo = cómo se cocina
  REGLAS_CONSERVA: [
    { dias: 0, tipo: 'ensalada',  words: ['ensalada','ensaladas','crudita','crudas','carpaccio','tartar','sushi','ceviche'] },
    { dias: 4, tipo: 'legumbre',  words: ['garbanzo','garbanzos','lenteja','lentejas','alubia','alubias','fabe','fabes','haba','habas','judia','judias','pocha','pochas'] },
    { dias: 3, tipo: 'guiso',     words: ['guiso','guisos','estofado','caldo','potaje','cocido','ragú','ragu'] },
    { dias: 0, tipo: 'pescado',   words: ['merluza','salmon','atun','bacalao','lubina','dorada','calamar','sepia','pulpo','gamba','gambas','mejillon','mejillones','almeja','almejas','sardina','sardinas','trucha','rape','lenguado','pescado','boqueron','anchoa'] },
    { dias: 2, tipo: 'tortilla', words: ['tortilla'] },
    { dias: 3, tipo: 'pasta',     words: ['pasta','espagueti','espaguetis','macarron','macarrones','fideo','fideos','lasaña','canelones'] },
    { dias: 3, tipo: 'arroz',     words: ['arroz','risotto','paella'] },
    { dias: 2, tipo: 'carne',     words: ['pollo','pechuga','ternera','cerdo','lomo','costillar','chuletón','chuleton','entrecot','solomillo','bistec','hamburguesa','chorizo','tocino','bacon','butifarra','salchicha','pavo','jamón','jamon'] },
    { dias: 2, tipo: 'verdura',   words: ['patata','patatas','tomate','tomates','calabacin','berenjena','pimiento','cebolla','zanahoria','calabaza'] },
  ],

  // "Claves" = ingrediente base que se puede cocinar una sola vez para
  // varios platos. Dos platos que comparten clave se hacen en la misma
  // sesión (batch) → menos fuegos, menos limpias, más productividad.
  CLAVES: [
    { key: 'pollo',    label: 'pollo',    words: ['pollo','pechuga'] },
    { key: 'carne',    label: 'carne',    words: ['ternera','bistec','chuleton','entrecot','solomillo','filete','hamburguesa','carne'] },
    { key: 'cerdo',    label: 'cerdo',    words: ['cerdo','lomo','costillar','chorizo','tocino','bacon','butifarra','salchicha'] },
    { key: 'pescado',  label: 'pescado',  words: ['merluza','salmon','atun','bacalao','lubina','dorada','calamar','gamba','mejillon','almeja','sardina','trucha','rape','lenguado'] },
    { key: 'legumbre', label: 'legumbre', words: ['garbanzo','lenteja','alubia','fabe','haba','judia','pocha'] },
    { key: 'arroz',    label: 'arroz',    words: ['arroz'] },
    { key: 'pasta',    label: 'pasta',    words: ['pasta','espagueti','macarron','fideo'] },
  ],

  // ------------------------------------------------------------
  // Init / persistencia (qué elaboraciones ya se hicieron, por semana)
  // ------------------------------------------------------------
  _hechos: null,

  init() {
    this._hechos = Store.get(Store.KEYS.PREP_DONE) || {};
  },

  _save() {
    Store.set(Store.KEYS.PREP_DONE, this._hechos);
  },

  hechos(weekKey = Menu.getWeekKey()) {
    return (this._hechos && this._hechos[weekKey]) || [];
  },

  estaHecho(id, weekKey = Menu.getWeekKey()) {
    return this.hechos(weekKey).includes(id);
  },

  toggleHecho(id, weekKey = Menu.getWeekKey()) {
    const lista = (this._hechos && this._hechos[weekKey]) || [];
    const i = lista.indexOf(id);
    if (i >= 0) lista.splice(i, 1);
    else lista.push(id);
    this._hechos[weekKey] = lista;
    this._save();
  },

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  _norm(s) {
    return (s || '')
      .toLowerCase()
      .replace(/ñ/g, 'n')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  _texto(receta) {
    return this._norm([
      receta.nombre,
      (receta.tags || []).join(' '),
      (receta.ingredientes || []).map(i => i.nombre).join(' '),
    ].join(' '));
  },

  // Regla de conserva que matchea (o la por defecto)
  conservaDias(receta) {
    const t = this._texto(receta);
    for (const r of this.REGLAS_CONSERVA) {
      if (r.words.some(w => t.includes(this._norm(w)))) {
        return { dias: r.dias, tipo: r.tipo };
      }
    }
    return { dias: 2, tipo: 'plato' };
  },

  clavesDe(receta) {
    const t = this._texto(receta);
    return this.CLAVES.filter(c => c.words.some(w => t.includes(this._norm(w)))).map(c => c.key);
  },

  labelClave(key) {
    return (this.CLAVES.find(c => c.key === key) || {}).label || key;
  },

  // Esfuerzo estimado: los pasos de la receta como proxy.
  minutosDe(receta) {
    const pasos = (receta.pasos || []).length;
    return Math.min(75, 10 + 7 * (pasos || 4));
  },

  _fecha(weekKey, indice) {
    const base = Menu._getWeekDate(weekKey);
    const d = new Date(base);
    d.setDate(base.getDate() + indice);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  },

  _nombreDia(indice) {
    // -1 = domingo de la semana anterior
    if (indice < 0) return 'domingo';
    return this.DIAS[indice] || '';
  },

  _consumoTexto(p) {
    return p.consumo
      .map(c => `${this.DIAS[c.indice]} ${c.meal === 'lunch' ? 'almuerzo' : 'cena'}`)
      .join(' · ');
  },

  // Por qué ese día (explicación corta para la UI)
  _motivo(p, dia) {
    if (dia === p.primerDia) {
      return p.conserva === 0
        ? 'Se hace el mismo día (no aguanta de un día para otro)'
        : 'Se hace el mismo día que lo comés';
    }
    return `Se hace el ${this._nombreDia(dia)} y se calienta el ${this._nombreDia(p.primerDia)} (aguanta ${p.conserva} días)`;
  },

  // ------------------------------------------------------------
  // Plan
  // ------------------------------------------------------------
  buildPlan(weekKey = Menu.getWeekKey()) {
    const week = (Menu._menu && Menu._menu[weekKey]) || Menu.getCurrentWeek();
    const dias = Store.getDaysOrder();

    // 1) Platos de la semana (una entrada por receta + sus días de consumo)
    const porReceta = new Map();
    dias.forEach((day, i) => {
      Store.getMealTypes().forEach(meal => {
        const rid = week[day]?.[meal];
        const receta = rid ? Recipes.getById(rid) : null;
        if (!receta) return;
        if (!porReceta.has(rid)) {
          const cons = this.conservaDias(receta);
          porReceta.set(rid, {
            id: rid,
            nombre: receta.nombre,
            receta,
            conserva: cons.dias,
            tipo: cons.tipo,
            claves: this.clavesDe(receta),
            minutos: this.minutosDe(receta),
            consumo: [],
          });
        }
        porReceta.get(rid).consumo.push({ dia: day, indice: i, meal });
      });
    });

    const platos = [...porReceta.values()];
    platos.forEach(p => {
      p.primerDia = Math.min(...p.consumo.map(c => c.indice));
      p.ultimoDia = Math.max(...p.consumo.map(c => c.indice));
      // Ventana de preparación: ni antes de que se pudra ni después de comerlo
      p.ventana = [
        Math.max(0, p.primerDia - Math.min(p.conserva, this.MAX_DIAS_ADELANTO)),
        p.primerDia,
      ];
    });

    // 2) Sesiones de cocina. Las elaboraciones que aguanta se cocinan por
    //    adelantado y se agrupan; las frescas mandan el día que se comen.
    //    Primero las más cerradas (las frescas fijan el día) y después las
    //    flexibles, que se cuelgan en la sesión que les queda más a mano.
    const sesiones = [];
    const orden = platos.slice().sort((a, b) => {
      const fa = a.ventana[1] - a.ventana[0], fb = b.ventana[1] - b.ventana[0];
      return fa - fb || a.primerDia - b.primerDia || a.nombre.localeCompare(b.nombre, 'es');
    });

    for (const p of orden) {
      // Sesiones candidatas: dentro de la ventana y con lugar
      const candidatas = sesiones.filter(s =>
        s.dia >= p.ventana[0] && s.dia <= p.ventana[1] &&
        s.platos.length < this.MAX_PLATOS_POR_SESION);

      // 1º si comparte trabajo con otra de esa sesión → batch de verdad
      const conClave = candidatas.filter(s =>
        s.platos.some(x => x.claves.some(k => p.claves.includes(k))));
      // 2º si no, la más tardía (lo más fresco posible)
      const destino = (conClave.length ? conClave : candidatas)
        .sort((a, b) => b.dia - a.dia)[0];

      if (destino) destino.platos.push(p);
      else sesiones.push({ dia: p.primerDia, platos: [p] });
    }

    // 3) Una sesión por día (varios platos del mismo día = una sola sesión)
    const porDia = new Map();
    for (const s of sesiones) {
      if (!porDia.has(s.dia)) porDia.set(s.dia, { dia: s.dia, platos: [] });
      porDia.get(s.dia).platos.push(...s.platos);
    }
    const sesionesPorDia = [...porDia.values()].sort((a, b) => a.dia - b.dia);

    // 4) Datos finales de cada sesión
    for (const s of sesionesPorDia) {
      s.platos.sort((a, b) => a.primerDia - b.primerDia || a.nombre.localeCompare(b.nombre, 'es'));
      s.minutos = s.platos.reduce((acc, p) => acc + p.minutos, 0);
      const conteo = {};
      s.platos.forEach(p => p.claves.forEach(k => { conteo[k] = (conteo[k] || 0) + 1; }));
      s.compartidas = Object.keys(conteo).filter(k => conteo[k] > 1);
      s.platos.forEach(p => { p.motivo = this._motivo(p, s.dia); });
      s.diaLabel = this._nombreDia(s.dia);
      s.fecha = this._fecha(weekKey, s.dia);
    }

    const minutosTotal = sesionesPorDia.reduce((acc, s) => acc + s.minutos, 0);
    const Cocina = this.DIAS.map((_, i) => i).filter(i => sesionesPorDia.some(s => s.dia === i));

    // Día de compra: el día antes de la primera sesión
    let diaCompra = Cocina.length ? Cocina[0] - 1 : null;
    if (diaCompra === -1) diaCompra = -1; // domingo de la semana anterior

    return {
      semana: weekKey,
      platos,
      sesiones: sesionesPorDia,
      minutosTotal,
      Cocina,
      diasLibres: this.DIAS.map((_, i) => i).filter(i => !Cocina.includes(i)),
      diaCompra,
      nPlatos: platos.length,
    };
  },

  // ------------------------------------------------------------
  // Texto para copiar
  // ------------------------------------------------------------
  textoPlan(plan) {
    const lineas = [`🍳 Plan de preparación — ${Menu.getWeekLabel()}`, ''];
    for (const s of plan.sesiones) {
      lineas.push(`${this.DIAS_LARGO[s.dia]} ${s.fecha} · ${s.platos.length} ${s.platos.length === 1 ? 'plato' : 'platos'} · ~${s.minutos} min`);
      for (const p of s.platos) {
        lineas.push(`  • ${p.nombre} → ${this._consumoTexto(p)}`);
        lineas.push(`    ${p.motivo}`);
      }
      if (s.compartidas.length) {
        lineas.push(`  🔁 ${s.compartidas.map(k => this.labelClave(k)).join(' / ')} en los ${s.platos.length} platos: una sola compra y lo aprovechás`);
      }
      lineas.push('');
    }
    if (plan.diasLibres.length) {
      lineas.push(`😌 Días sin cocina: ${plan.diasLibres.map(d => this.DIAS[d]).join(', ')}`);
    }
    return lineas.join('\n');
  },
};
