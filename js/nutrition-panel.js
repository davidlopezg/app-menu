// ============================================
// Nutrition Panel — Análisis local de la semana
// ============================================
// Cuenta automáticamente cuántas comidas de cada categoría tiene la
// semana y compara contra las metas. Sin API, instantáneo, siempre
// actualizado. La IA sigue siendo necesaria para análisis cualitativo
// (sustituciones concretas, evaluación de cocciones, etc.).

const NutritionPanel = {
  // ============================================
  // Reglas de clasificación
  // ============================================
  // Cada categoría matchea si el NOMBRE de la receta contiene alguno de
  // los patterns, o si tiene el tag correspondiente (case-insensitive).
  CATEGORIES: [
    {
      key: 'pescado_azul',
      label: 'Pescado azul',
      icon: '🐟',
      metaMin: 2, metaMax: 3,
      namePatterns: [
        /salm[oó]n/i, /sardina/i, /caballa/i, /at[uú]n/i, /anchoa/i,
        /chicharro/i, /melva/i, /boquer[oó]n/i, /arenque/i, /jurel/i,
      ],
      tagKey: 'pescado_azul',
    },
    {
      key: 'legumbres',
      label: 'Legumbres',
      icon: '🫘',
      metaMin: 2, metaMax: 3,
      namePatterns: [
        /lentejas?/i, /garbanzos?/i, /jud[ií]as?/i, /habichuelas?/i,
        /soja/i, /edamame/i, /frijoles?/i, /porotos?/i, /alubias?/i,
      ],
      tagKey: 'legumbres',
    },
    {
      key: 'pollo_pavo',
      label: 'Pollo o pavo',
      icon: '🍗',
      metaMin: 2, metaMax: 3,
      namePatterns: [/pollo/i, /pavo/i],
      tagKey: 'pollo',
    },
    {
      key: 'carne_roja',
      label: 'Carne roja',
      icon: '🥩',
      metaMin: 0, metaMax: 1,
      namePatterns: [
        /ternera/i, /cordero/i, /cerdo/i, /vacuno/i, /\bres\b/i,
        /buey/i, /chulet[oó]n/i, /solomillo/i, /\blomo\b/i, /entrecot/i,
      ],
      tagKey: 'carne_roja',
    },
    {
      key: 'huevos',
      label: 'Huevos',
      icon: '🥚',
      metaMin: 2, metaMax: 3,
      namePatterns: [/\bhuevo/i, /tortilla/i, /revuelto/i, /frittata/i, /huev[oó]s?/i],
      tagKey: 'huevos',
    },
  ],

  VERDURA: {
    namePatterns: [
      /ensalada/i, /verdura/i, /br[oó]coli/i, /espinaca/i, /acelga/i,
      /calabac[ií]n/i, /zanahoria/i, /\btomate\b/i, /pimiento/i, /cebolla/i,
      /\bajo\b/i, /lechuga/i, /r[uú]cula/i, /can[oó]nig[ge]a/i,
      /\bcol\b/i, /coliflor/i, /apio/i, /puerro/i, /remolacha/i,
      /berenjena/i, /calabaza/i, /alcachofa/i, /esparr[áa]g[oa]s?/i,
    ],
    tagKey: 'verdura',
  },

  FRITURAS: {
    namePatterns: [
      /\bfrit[oa]\b/i, /empanizad[oa]/i, /rebozad[oa]/i, /croqueta/i,
      /tempura/i, /rebozado/i, /fritura/i,
    ],
    tagKey: 'fritura',
  },

  // ============================================
  // Helpers de matching
  // ============================================
  _matchesPattern(recipe, patterns) {
    if (!recipe) return false;
    return patterns.some(p => p.test(recipe.nombre || ''));
  },

  _hasTag(recipe, tagKey) {
    if (!recipe || !tagKey) return false;
    const tags = (recipe.tags || []).map(t => String(t).toLowerCase());
    return tags.includes(tagKey.toLowerCase());
  },

  _matchesCategory(recipe, cat) {
    return this._matchesPattern(recipe, cat.namePatterns) || this._hasTag(recipe, cat.tagKey);
  },

  _matchesVerdura(recipe) {
    return this._matchesPattern(recipe, this.VERDURA.namePatterns) || this._hasTag(recipe, this.VERDURA.tagKey);
  },

  _matchesFritura(recipe) {
    return this._matchesPattern(recipe, this.FRITURAS.namePatterns) || this._hasTag(recipe, this.FRITURAS.tagKey);
  },

  // ============================================
  // Análisis
  // ============================================
  _flattenWeek(weekData, recipes) {
    const out = [];
    Store.getDaysOrder().forEach(day => {
      Store.getMealTypes().forEach(meal => {
        const id = weekData?.[day]?.[meal];
        const recipe = id ? recipes.find(r => r.id === id) : null;
        out.push({ day, meal, recipe });
      });
    });
    return out;
  },

  analyze(weekData, recipes) {
    const items = this._flattenWeek(weekData, recipes);
    const dayNames = {
      monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles',
      thursday: 'jueves', friday: 'viernes', saturday: 'sábado', sunday: 'domingo',
    };

    // Conteos por categoría (sobre las 14 comidas)
    const catCounts = {};
    for (const cat of this.CATEGORIES) {
      catCounts[cat.key] = items.filter(i => this._matchesCategory(i.recipe, cat)).length;
    }

    // Frituras y cenas con carbos
    const friturasCount = items.filter(i => this._matchesFritura(i.recipe)).length;
    const cenasConCarbos = items
      .filter(i => i.meal === 'dinner')
      .filter(i => (i.recipe?.nutricion?.hc ?? 0) > 20).length;

    // Verdura por día (comida Y cena)
    const verduraPorDia = {};
    Store.getDaysOrder().forEach(day => {
      const lunch = items.find(i => i.day === day && i.meal === 'lunch');
      const dinner = items.find(i => i.day === day && i.meal === 'dinner');
      verduraPorDia[day] = {
        dayLabel: dayNames[day],
        comidaOk: this._matchesVerdura(lunch?.recipe),
        cenaOk: this._matchesVerdura(dinner?.recipe),
      };
    });
    const diasVerduraCompleta = Object.values(verduraPorDia)
      .filter(d => d.comidaOk && d.cenaOk).length;
    const diasSinVerdura = Object.values(verduraPorDia)
      .filter(d => !d.comidaOk || !d.cenaOk)
      .map(d => d.dayLabel);

    // Calorías
    const totalCal = items.reduce((s, i) => s + (i.recipe?.nutricion?.cal ?? 0), 0);
    const calPorDia = {};
    Store.getDaysOrder().forEach(day => {
      calPorDia[day] = items.filter(i => i.day === day)
        .reduce((s, i) => s + (i.recipe?.nutricion?.cal ?? 0), 0);
    });
    const avgCal = totalCal / 7;

    // Celdas vacías
    const vacias = items.filter(i => !i.recipe).length;
    const totalComidas = items.length;

    return {
      catCounts, friturasCount, cenasConCarbos,
      verduraPorDia, diasVerduraCompleta, diasSinVerdura,
      totalCal, calPorDia, avgCal, vacias, totalComidas,
    };
  },

  // ============================================
  // Render del panel (HTML)
  // ============================================
  render(weekData, recipes) {
    const a = this.analyze(weekData, recipes);

    const row = (icon, label, countText, status) => `
      <div class="nutri-row nutri-row--${status}">
        <span class="nutri-row__icon">${icon}</span>
        <span class="nutri-row__label">${label}</span>
        <span class="nutri-row__count">${countText}</span>
        <span class="nutri-row__status">${
          status === 'ok' ? '✅' : status === 'low' ? '⚠️' : '🚨'
        }</span>
      </div>
    `;

    const catRows = this.CATEGORIES.map(cat => {
      const count = a.catCounts[cat.key] || 0;
      let status;
      if (count < cat.metaMin) status = 'low';
      else if (count > cat.metaMax) status = 'high';
      else status = 'ok';
      return row(cat.icon, cat.label, `${count} / ${cat.metaMin}–${cat.metaMax}`, status);
    }).join('');

    // Verdura diaria
    const verdStatus = a.diasVerduraCompleta === 7 ? 'ok'
      : a.diasVerduraCompleta >= 5 ? 'low' : 'high';
    const verduraDiasTxt = a.diasSinVerdura.length
      ? `${a.diasVerduraCompleta}/7 (faltan: ${a.diasSinVerdura.join(', ')})`
      : `${a.diasVerduraCompleta} / 7 días`;

    // Frituras
    const fritStatus = a.friturasCount === 0 ? 'ok' : a.friturasCount <= 2 ? 'low' : 'high';
    const fritTxt = a.friturasCount === 0 ? '0 ✓' : String(a.friturasCount);

    // Cenas con carbos
    const carbStatus = a.cenasConCarbos <= 1 ? 'ok'
      : a.cenasConCarbos <= 3 ? 'low' : 'high';

    // Calorías
    const cal = Math.round(a.avgCal);
    let calStatus = 'ok', calTxt = `${cal} kcal`;
    if (cal < 1500) { calStatus = 'high'; calTxt = `${cal} kcal (muy bajo)`; }
    else if (cal > 2500) { calStatus = 'high'; calTxt = `${cal} kcal (muy alto)`; }
    else if (cal < 1800 || cal > 2200) { calStatus = 'low'; calTxt = `${cal} kcal`; }

    // Tip automático: lo más urgente
    const tips = [];
    for (const cat of this.CATEGORIES) {
      const count = a.catCounts[cat.key] || 0;
      if (count < cat.metaMin && cat.metaMin > 0) {
        tips.push(`Sumá ${cat.metaMin - count} ${cat.label.toLowerCase()} esta semana.`);
      }
    }
    if (a.friturasCount > 0) tips.push('Evitá frituras (cocciones suaves mejor).');
    if (a.cenasConCarbos > 2) tips.push('Bajá carbos en las cenas (verdura + proteína ideal).');
    if (a.vacias > 0) tips.push(`Hay ${a.vacias} comidas sin asignar.`);

    return `
      <div class="nutrition-panel">
        <div class="nutrition-panel__title">
          <span>📊</span>
          <span>Resumen nutricional</span>
        </div>

        ${catRows}

        ${row('🥬', 'Verdura diaria', verduraDiasTxt, verdStatus)}
        ${row('🔥', 'Frituras', fritTxt, fritStatus)}
        ${row('🌙', 'Cenas con carbos', `${a.cenasConCarbos} / 7`, carbStatus)}
        ${row('⚡', 'Calorías/día (prom.)', calTxt, calStatus)}

        ${a.vacias > 0 ? row('⚪', 'Celdas vacías', `${a.vacias} de ${a.totalComidas}`, 'low') : ''}

        ${tips.length ? `
          <div class="nutrition-panel__tips">
            <strong>💡</strong>
            <ul>${tips.slice(0, 3).map(t => `<li>${t}</li>`).join('')}</ul>
          </div>
        ` : `
          <div class="nutrition-panel__tips nutrition-panel__tips--ok">
            ✅ Todo en rango, ¡buen menú!
          </div>
        `}

        <div class="nutrition-panel__cta">
          <button class="btn btn--primary btn--full" onclick="App.analyzeCurrentWeek()">
            🤖 Análisis IA completo
          </button>
        </div>
      </div>
    `;
  },
};
