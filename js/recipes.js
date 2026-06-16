// ============================================
// Recipes — CRUD + Seed Data
// ============================================

const Recipes = {
  // Storage
  _recipes: null,

  // Initialize
  init() {
    this._recipes = Store.get(Store.KEYS.RECIPES);
    if (!this._recipes) {
      this._recipes = this._getSeedData();
      this._save();
    }
  },

  // Save to localStorage
  _save() {
    Store.set(Store.KEYS.RECIPES, this._recipes);
  },

  // Get all recipes
  getAll() {
    return [...this._recipes].sort((a, b) => 
      new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
    );
  },

  // Get recipe by ID
  getById(id) {
    return this._recipes.find(r => r.id === id) || null;
  },

  // Search recipes
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    
    return this._recipes.filter(r => 
      r.nombre.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q))
    );
  },

  // Get recipes by meal type (almuerzo, cena, ambos)
  getByTipoComida(tipo) {
    if (!tipo || tipo === 'all') return this.getAll();
    return this._recipes.filter(r => {
      const tipoComida = r.tipoComida || 'ambos'; // Backward compatibility
      return tipoComida === tipo || tipoComida === 'ambos';
    });
  },

  // Check if recipe is low carb (no carbs, no sugar)
  isLowCarb(recipe) {
    if (!recipe || !recipe.nutricion) return false;
    return (recipe.nutricion.hc || 0) === 0 && (recipe.nutricion.azucares || 0) === 0;
  },

  // Save new recipe
  create(recipe) {
    const newRecipe = {
      id: Store.uuid(),
      nombre: recipe.nombre.trim(),
      ingredientes: recipe.ingredientes || [],
      pasos: recipe.pasos || [],
      nutricion: recipe.nutricion || { cal: 0, hc: 0, proteinas: 0, grasas: 0, fibra: 0, azucares: 0 },
      tipoComida: recipe.tipoComida || 'ambos',
      imagen: recipe.imagen || '',
      tags: recipe.tags || [],
      fechaCreacion: new Date().toISOString()
    };
    this._recipes.push(newRecipe);
    this._save();
    return newRecipe;
  },

  // Update recipe
  update(id, updates) {
    const index = this._recipes.findIndex(r => r.id === id);
    if (index === -1) return null;

    this._recipes[index] = {
      ...this._recipes[index],
      ...updates,
      id // Prevent ID change
    };
    this._save();
    return this._recipes[index];
  },

  // Delete recipe
  delete(id) {
    const index = this._recipes.findIndex(r => r.id === id);
    if (index === -1) return false;

    this._recipes.splice(index, 1);
    this._save();
    return true;
  },

  // Get by tag
  getByTag(tag) {
    return this._recipes.filter(r => r.tags.includes(tag));
  },

  // Seed data
  _getSeedData() {
    return [
      {
        id: Store.uuid(),
        nombre: 'Tortilla de patatas',
        ingredientes: [
          { nombre: 'Patatas', cantidad: '300', unidad: 'g' },
          { nombre: 'Huevos', cantidad: '4', unidad: 'ud' },
          { nombre: 'Cebolla', cantidad: '100', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Pela y corta las patatas en rodajas finas.',
          'Corta la cebolla en aros.',
          'Sofríe las patatas y la cebolla en aceite hasta que estén hechas.',
          'Bate los huevos con sal.',
          'Añade las patatas y cebolla al huevo.',
          'Cocina en sartén con aceite.',
          'Dale la vuelta con un plato y cocina el otro lado.'
        ],
        nutricion: { cal: 380, hc: 28, proteinas: 18, grasas: 24, fibra: 2, azucares: 4 },
        tipoComida: 'cena',
        tags: ['cena', 'española', 'clásica', 'huevos'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Revoltijo de espárragos, ajos tiernos y champiñones',
        ingredientes: [
          { nombre: 'Espárragos verdes', cantidad: '200', unidad: 'g' },
          { nombre: 'Ajos tiernos', cantidad: '100', unidad: 'g' },
          { nombre: 'Champiñones', cantidad: '150', unidad: 'g' },
          { nombre: 'Huevos', cantidad: '3', unidad: 'ud' },
          { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Lava y corta los espárragos en trozos.',
          'Limpia y corta los champiñones.',
          'Corta los ajos tiernos en rodajas.',
          'Sofríe las verduras en aceite 5 min.',
          'Bate los huevos y añádelos.',
          'Remueve hasta que cuajen.',
          'Salpimienta.'
        ],
        nutricion: { cal: 320, hc: 12, proteinas: 20, grasas: 22, fibra: 5, azucares: 4 },
        tipoComida: 'cena',
        tags: ['cena', 'verduras', 'huevos', 'rápido'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Guisantes con butifarra negra y huevo pochado',
        ingredientes: [
          { nombre: 'Guisantes', cantidad: '300', unidad: 'g' },
          { nombre: 'Butifarra negra', cantidad: '150', unidad: 'g' },
          { nombre: 'Huevos', cantidad: '2', unidad: 'ud' },
          { nombre: 'Cebolla', cantidad: '50', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Cuece los guisantes en agua con sal 10 min.',
          'Corta la butifarra en rodajas.',
          'Sofríe la cebolla en aceite.',
          'Añade la butifarra y dórala.',
          'Incorpora los guisantes.',
          'Prepara los huevos pochados: Hierve agua con vinagre, crea remolino y vierte el huevo.',
          'Sirve los guisantes con el huevo encima.'
        ],
        nutricion: { cal: 420, hc: 18, proteinas: 28, grasas: 26, fibra: 8, azucares: 6 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'legumbres', 'catalán'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Verdura (patata y alubias verde)',
        ingredientes: [
          { nombre: 'Patatas', cantidad: '200', unidad: 'g' },
          { nombre: 'Alubias verdes', cantidad: '200', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '80', unidad: 'g' },
          { nombre: 'Zanahoria', cantidad: '100', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Pela y corta las patatas y zanahorias en trozos.',
          'Cuece las alubias verdes 15 min.',
          'Sofríe la cebolla.',
          'Añade las patatas y zanahorias con agua.',
          'Cuece 20 min.',
          'Añade las alubias verdes y cocina 5 min más.',
          'Aliña con aceite y sal.'
        ],
        nutricion: { cal: 280, hc: 38, proteinas: 8, grasas: 10, fibra: 9, azucares: 6 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'verduras', 'tradicional'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Pasta pesto',
        ingredientes: [
          { nombre: 'Espaguetis', cantidad: '100', unidad: 'g' },
          { nombre: 'Albahaca fresca', cantidad: '50', unidad: 'g' },
          { nombre: 'Piñones', cantidad: '30', unidad: 'g' },
          { nombre: 'Ajo', cantidad: '1', unidad: 'diente' },
          { nombre: 'Parmesano', cantidad: '40', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '4', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Cuece la pasta según el paquete.',
          'Para el pesto: tritura albahaca, piñones, ajo y parmesano con aceite.',
          'Mezcla la pasta con el pesto.',
          'Sirve con más parmesano.'
        ],
        nutricion: { cal: 520, hc: 58, proteinas: 18, grasas: 26, fibra: 3, azucares: 2 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'pasta', 'italiano'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Pasta carbonara',
        ingredientes: [
          { nombre: 'Espaguetis', cantidad: '100', unidad: 'g' },
          { nombre: 'Bacon', cantidad: '80', unidad: 'g' },
          { nombre: 'Huevos', cantidad: '2', unidad: 'ud' },
          { nombre: 'Parmesano', cantidad: '40', unidad: 'g' },
          { nombre: 'Pimienta negra', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Cuece la pasta.',
          'Fríe el bacon hasta crujiente.',
          'Bate huevos con parmesano y pimienta.',
          'Escurre la pasta y mézclala con el bacon (fuera del fuego).',
          'Añade la mezcla de huevos y remueve rápido.',
          'Añade agua de cocción si queda seco.'
        ],
        nutricion: { cal: 550, hc: 52, proteinas: 24, grasas: 28, fibra: 2, azucares: 2 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'pasta', 'clásico'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Pasta tomate y atún',
        ingredientes: [
          { nombre: 'Espaguetis', cantidad: '100', unidad: 'g' },
          { nombre: 'Tomate triturado', cantidad: '200', unidad: 'g' },
          { nombre: 'Atún en lata', cantidad: '120', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '50', unidad: 'g' },
          { nombre: 'Ajo', cantidad: '1', unidad: 'diente' },
          { nombre: 'Aceite de oliva', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Azúcar', cantidad: '1', unidad: 'cda' },
          { nombre: 'Hierbas provenzales', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Cuece la pasta.',
          'Sofríe cebolla y ajo.',
          'Añade el tomate, sal, azúcar y hierbas.',
          'Cocina 10 min.',
          'Añade el atún escurrido.',
          'Mezcla con la pasta.'
        ],
        nutricion: { cal: 480, hc: 56, proteinas: 26, grasas: 16, fibra: 4, azucares: 8 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'pasta', 'atún'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Arroz de verduras',
        ingredientes: [
          { nombre: 'Arroz', cantidad: '100', unidad: 'g' },
          { nombre: 'Calabacín', cantidad: '100', unidad: 'g' },
          { nombre: 'Pimiento rojo', cantidad: '80', unidad: 'g' },
          { nombre: 'Pimiento verde', cantidad: '80', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '50', unidad: 'g' },
          { nombre: 'Guisantes', cantidad: '50', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '2', unidad: 'cda' },
          { nombre: 'Caldo de verduras', cantidad: '250', unidad: 'ml' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Pica todas las verduras en dados pequeños.',
          'Sofríe la cebolla y pimientos.',
          'Añade el calabacín y guisantes.',
          'Incorpora el arroz y remueve 2 min.',
          'Añade el caldo caliente.',
          'Cocina a fuego medio 15 min.',
          'Deja reposar 5 min.'
        ],
        nutricion: { cal: 380, hc: 65, proteinas: 10, grasas: 10, fibra: 4, azucares: 6 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'arroz', 'verduras'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Arroz de pollo',
        ingredientes: [
          { nombre: 'Arroz', cantidad: '100', unidad: 'g' },
          { nombre: 'Pechuga de pollo', cantidad: '150', unidad: 'g' },
          { nombre: 'Caldo de pollo', cantidad: '300', unidad: 'ml' },
          { nombre: 'Cebolla', cantidad: '50', unidad: 'g' },
          { nombre: 'Ajo', cantidad: '1', unidad: 'diente' },
          { nombre: 'Pimiento verde', cantidad: '50', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Colorante alimentario', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Corta el pollo en dados.',
          'Sofríe el pollo hasta dorar.',
          'Reserva.',
          'Sofríe cebolla, ajo y pimiento.',
          'Añade el arroz y remueve.',
          'Vierte el caldo y el pollo.',
          'Cocina 15 min.',
          'Deja reposar 5 min.'
        ],
        nutricion: { cal: 450, hc: 55, proteinas: 32, grasas: 12, fibra: 2, azucares: 2 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'arroz', 'pollo'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Arroz a la cubana',
        ingredientes: [
          { nombre: 'Arroz', cantidad: '100', unidad: 'g' },
          { nombre: 'Huevo', cantidad: '1', unidad: 'ud' },
          { nombre: 'Plátano', cantidad: '1', unidad: 'ud' },
          { nombre: 'Salsa de tomate', cantidad: '100', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Cuece el arroz.',
          'Fríe el huevo.',
          'Corta el plátano en rodajas y fríe.',
          'Calienta la salsa de tomate.',
          'Sirve el arroz con el huevo frito encima, plátano frito y salsa de tomate.'
        ],
        nutricion: { cal: 520, hc: 72, proteinas: 14, grasas: 20, fibra: 3, azucares: 14 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'arroz', 'cubano'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Ensalada de cabra',
        ingredientes: [
          { nombre: 'Lechuga variada', cantidad: '150', unidad: 'g' },
          { nombre: 'Queso de cabra', cantidad: '80', unidad: 'g' },
          { nombre: 'Nueces', cantidad: '30', unidad: 'g' },
          { nombre: 'Manzana verde', cantidad: '1/2', unidad: 'ud' },
          { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cda' },
          { nombre: 'Vinagre', cantidad: '1', unidad: 'cda' },
          { nombre: 'Miel', cantidad: '1', unidad: 'cda' },
          { nombre: 'Mostaza', cantidad: '1', unidad: 'cdita' }
        ],
        pasos: [
          'Lava y corta la lechuga.',
          'Corta el queso de cabra en rodajas.',
          'Corta la manzana en daditos.',
          'Tuesta las nueces.',
          'Prepara la vinagreta batiendo todos los ingredientes.',
          'Mezcla la ensalada y sirve con la vinagreta.'
        ],
        nutricion: { cal: 420, hc: 12, proteinas: 16, grasas: 34, fibra: 4, azucares: 10 },
        tipoComida: 'cena',
        tags: ['cena', 'ensalada', 'queso'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Ensalada de pera y gorgonzola',
        ingredientes: [
          { nombre: 'Rúcula', cantidad: '100', unidad: 'g' },
          { nombre: 'Pera', cantidad: '1', unidad: 'ud' },
          { nombre: 'Gorgonzola', cantidad: '80', unidad: 'g' },
          { nombre: 'Nueces', cantidad: '30', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cda' },
          { nombre: 'Vinagre de Módena', cantidad: '1', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Lava la rúcula.',
          'Corta la pera en rodajas.',
          'Desmenuza el gorgonzola.',
          'Tuesta las nueces.',
          'Prepara la vinagreta.',
          'Mezcla todos los ingredientes y aliña.'
        ],
        nutricion: { cal: 450, hc: 14, proteinas: 18, grasas: 36, fibra: 5, azucares: 12 },
        tipoComida: 'cena',
        tags: ['cena', 'ensalada', 'queso'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Patatas aliñadas Andalucía',
        ingredientes: [
          { nombre: 'Patatas', cantidad: '400', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '100', unidad: 'g' },
          { nombre: 'Perejil fresco', cantidad: '10', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '4', unidad: 'cda' },
          { nombre: 'Vinagre', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Huevo duro', cantidad: '2', unidad: 'ud' }
        ],
        pasos: [
          'Cuece las patatas con piel hasta que estén tiernas.',
          'Déjalas enfriar y córtalas en rodajas.',
          'Corta la cebolla en aros finos.',
          'Pica el perejil.',
          'Prepara el aliño con aceite, vinagre, sal y pimienta.',
          'Mezcla patatas, cebolla y aliño.',
          'Decora con huevo duro cortado y perejil.'
        ],
        nutricion: { cal: 340, hc: 42, proteinas: 10, grasas: 16, fibra: 4, azucares: 4 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'patatas', 'andaluucía'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Patatas fritas con carne rebozada o huevo frito',
        ingredientes: [
          { nombre: 'Patatas', cantidad: '400', unidad: 'g' },
          { nombre: 'Carne de ternera', cantidad: '150', unidad: 'g' },
          { nombre: 'Huevo para rebozar', cantidad: '1', unidad: 'ud' },
          { nombre: 'Pan rallado', cantidad: '50', unidad: 'g' },
          { nombre: 'Aceite para freír', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Pela y corta las patatas en palitos.',
          'Fríe las patatas dos veces: primero 5 min a fuego medio, segundo 2 min a fuego alto.',
          'Para la carne: empana con huevo y pan rallado y fríe.',
          'O fríe los huevos.',
          'Sirve juntos.'
        ],
        nutricion: { cal: 580, hc: 48, proteinas: 26, grasas: 32, fibra: 3, azucares: 2 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'patatas', 'carne'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Fideuá',
        ingredientes: [
          { nombre: 'Fideos', cantidad: '100', unidad: 'g' },
          { nombre: 'Gambas', cantidad: '150', unidad: 'g' },
          { nombre: 'Calamares', cantidad: '100', unidad: 'g' },
          { nombre: 'Mejillones', cantidad: '100', unidad: 'g' },
          { nombre: 'Caldo de pescado', cantidad: '300', unidad: 'ml' },
          { nombre: 'Azafrán', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cda' },
          { nombre: 'Ajo', cantidad: '2', unidad: 'dientes' },
          { nombre: 'Cebolla', cantidad: '50', unidad: 'g' },
          { nombre: 'Tomate triturado', cantidad: '100', unidad: 'g' }
        ],
        pasos: [
          'Sofríe el ajo y la cebolla.',
          'Añade los calamares.',
          'Agrega el tomate.',
          'Incorpora los fideos y remueve.',
          'Añade el caldo caliente con azafrán.',
          'Coloca las gambas y mejillones encima.',
          'Cocina a fuego medio 10 min y termina con el grill 2 min.'
        ],
        nutricion: { cal: 480, hc: 52, proteinas: 32, grasas: 14, fibra: 3, azucares: 4 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'fideuá', 'marisco', 'mediterráneo'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Alubias blancas con butifarra',
        ingredientes: [
          { nombre: 'Alubias blancas', cantidad: '300', unidad: 'g' },
          { nombre: 'Butifarra', cantidad: '200', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '100', unidad: 'g' },
          { nombre: 'Laurel', cantidad: '1', unidad: 'hoja' },
          { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Si usas alubias secas, déjalas en remojo la noche anterior y cuécelas 1h con laurel.',
          'Sofríe la cebolla.',
          'Añade la butifarra en rodajas y dórala.',
          'Incorpora las alubias.',
          'Cocina todo junto 15 min.',
          'Aliña con aceite de oliva, sal y pimienta.'
        ],
        nutricion: { cal: 450, hc: 42, proteinas: 28, grasas: 18, fibra: 14, azucares: 4 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'legumbres', 'catalán'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Huevos al plato',
        ingredientes: [
          { nombre: 'Huevos', cantidad: '3', unidad: 'ud' },
          { nombre: 'Jamón serrano', cantidad: '80', unidad: 'g' },
          { nombre: 'Chorizo', cantidad: '50', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '50', unidad: 'g' },
          { nombre: 'Pimiento choricero', cantidad: '30', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Precalienta el horno a 180°C.',
          'Sofríe la cebolla, jamón y chorizo.',
          'Coloca en cazuelas individuales.',
          'Casca los huevos encima.',
          'Hornea 8-10 min hasta que la clara esté cuajada.'
        ],
        nutricion: { cal: 380, hc: 4, proteinas: 24, grasas: 30, fibra: 1, azucares: 2 },
        tipoComida: 'cena',
        tags: ['cena', 'huevos', 'tradicional'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Salmón al vapor',
        ingredientes: [
          { nombre: 'Filete de salmón', cantidad: '180', unidad: 'g' },
          { nombre: 'Limón', cantidad: '1', unidad: 'ud' },
          { nombre: 'Eneldo fresco', cantidad: '10', unidad: 'g' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Coloca el salmón en la vaporera.',
          'Salpimienta.',
          'Coloca rodajas de limón encima.',
          'Vapor 8-10 min.',
          'Sirve con eneldo fresco.'
        ],
        nutricion: { cal: 280, hc: 0, proteinas: 36, grasas: 16, fibra: 0, azucares: 0 },
        tipoComida: 'cena',
        tags: ['cena', 'pescado', 'saludable', 'vapor'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Pescado al horno',
        ingredientes: [
          { nombre: 'Merluza', cantidad: '200', unidad: 'g' },
          { nombre: 'Patatas', cantidad: '200', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '80', unidad: 'g' },
          { nombre: 'Pimiento rojo', cantidad: '50', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cda' },
          { nombre: 'Limón', cantidad: '1/2', unidad: 'ud' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Hierbas provenzales', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Precalienta el horno a 200°C.',
          'Corta las patatas en rodajas finas y pré-cocínalas 5 min.',
          'Coloca en bandeja de horno.',
          'Añade la cebolla y pimiento.',
          'Coloca el pescado encima.',
          'Aliña con aceite, limón, sal y hierbas.',
          'Hornea 20 min.'
        ],
        nutricion: { cal: 320, hc: 22, proteinas: 32, grasas: 14, fibra: 3, azucares: 4 },
        tipoComida: 'cena',
        tags: ['cena', 'pescado', 'horno'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Ensaladilla',
        ingredientes: [
          { nombre: 'Patatas', cantidad: '300', unidad: 'g' },
          { nombre: 'Zanahoria', cantidad: '100', unidad: 'g' },
          { nombre: 'Huevos', cantidad: '2', unidad: 'ud' },
          { nombre: 'Atún', cantidad: '120', unidad: 'g' },
          { nombre: 'Aceitunas', cantidad: '50', unidad: 'g' },
          { nombre: 'Mayonesa', cantidad: '80', unidad: 'g' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Perejil', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Cuece las patatas, zanahorias y huevos.',
          'Déjalos enfriar.',
          'Corta todo en dados pequeños.',
          'Mezcla con el atún escurrido y aceitunas.',
          'Incorpora la mayonesa.',
          'Decora con perejil y aceitunas.'
        ],
        nutricion: { cal: 420, hc: 28, proteinas: 22, grasas: 26, fibra: 4, azucares: 4 },
        tipoComida: 'cena',
        tags: ['cena', 'ensalada', 'atún'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Gazpacho',
        ingredientes: [
          { nombre: 'Tomate maduro', cantidad: '500', unidad: 'g' },
          { nombre: 'Pepino', cantidad: '150', unidad: 'g' },
          { nombre: 'Pimiento verde', cantidad: '100', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '50', unidad: 'g' },
          { nombre: 'Ajo', cantidad: '1', unidad: 'diente' },
          { nombre: 'Pan duro', cantidad: '30', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '4', unidad: 'cda' },
          { nombre: 'Vinagre', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Lava y corta las verduras.',
          'Remoja el pan en agua.',
          'Tritura todo en batidora.',
          'Añade aceite y vinagre.',
          'Bate hasta obtener una crema líquida.',
          'Refrigera 2h.',
          'Sirve frío con picatostes.'
        ],
        nutricion: { cal: 180, hc: 18, proteinas: 4, grasas: 12, fibra: 4, azucares: 12 },
        tipoComida: 'cena',
        tags: ['cena', 'sopa fría', 'andaluucía', 'verano'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Salmorejo',
        ingredientes: [
          { nombre: 'Tomate maduro', cantidad: '600', unidad: 'g' },
          { nombre: 'Pan duro', cantidad: '60', unidad: 'g' },
          { nombre: 'Ajo', cantidad: '1', unidad: 'diente' },
          { nombre: 'Aceite de oliva', cantidad: '6', unidad: 'cda' },
          { nombre: 'Vinagre', cantidad: '1', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Jamón serrano', cantidad: '50', unidad: 'g' },
          { nombre: 'Huevo duro', cantidad: '1', unidad: 'ud' }
        ],
        pasos: [
          'Cuece los tomates y pélalos.',
          'Remoja el pan en agua.',
          'Tritura tomate, pan, ajo, aceite, vinagre y sal.',
          'Bate hasta que quede cremoso.',
          'Decora con jamón y huevo duro picados.'
        ],
        nutricion: { cal: 280, hc: 22, proteinas: 8, grasas: 20, fibra: 3, azucares: 14 },
        tipoComida: 'cena',
        tags: ['cena', 'sopa fría', 'andaluucía'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Frankfurt',
        ingredientes: [
          { nombre: 'Salchicha frankfurt', cantidad: '2', unidad: 'ud' },
          { nombre: 'Pan para hot dog', cantidad: '2', unidad: 'ud' },
          { nombre: 'Mostaza', cantidad: '2', unidad: 'cda' },
          { nombre: 'Ketchup', cantidad: '2', unidad: 'cda' },
          { nombre: 'Cebolla frita', cantidad: '20', unidad: 'g' }
        ],
        pasos: [
          'Calienta las salchichas en agua hirviendo o a la plancha.',
          'Tuesta ligeramente el pan.',
          'Coloca la salchicha en el pan.',
          'Añade mostaza, ketchup y cebolla frita.'
        ],
        nutricion: { cal: 420, hc: 36, proteinas: 18, grasas: 24, fibra: 2, azucares: 6 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'frankfurt', 'rápido'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Bikini',
        ingredientes: [
          { nombre: 'Pan de bikini', cantidad: '2', unidad: 'ud' },
          { nombre: 'Jamón york', cantidad: '60', unidad: 'g' },
          { nombre: 'Queso emmental', cantidad: '60', unidad: 'g' },
          { nombre: 'Mantequilla', cantidad: '20', unidad: 'g' }
        ],
        pasos: [
          'Unta mantequilla en las dos partes del pan.',
          'Coloca jamón y queso.',
          'Tapa.',
          'Gratinado en sandwichera o sartén con presión 3 min por lado hasta que el queso funda y el pan esté dorado.'
        ],
        nutricion: { cal: 480, hc: 38, proteinas: 24, grasas: 26, fibra: 2, azucares: 4 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'sándwich', 'rápido'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Albóndigas salsa española',
        ingredientes: [
          { nombre: 'Carne picada mezcla', cantidad: '300', unidad: 'g' },
          { nombre: 'Pan rallado', cantidad: '30', unidad: 'g' },
          { nombre: 'Huevo', cantidad: '1', unidad: 'ud' },
          { nombre: 'Leche', cantidad: '50', unidad: 'ml' },
          { nombre: 'Ajo', cantidad: '1', unidad: 'diente' },
          { nombre: 'Perejil', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Caldo', cantidad: '200', unidad: 'ml' },
          { nombre: 'Vino blanco', cantidad: '100', unidad: 'ml' },
          { nombre: 'Cebolla', cantidad: '80', unidad: 'g' },
          { nombre: 'Tomate triturado', cantidad: '150', unidad: 'g' },
          { nombre: 'Harina', cantidad: '1', unidad: 'cda' },
          { nombre: 'Aceite de oliva', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Mezcla la carne con pan rallado, huevo, leche, ajo y perejil.',
          'Forma albóndigas y fríe.',
          'Reserva.',
          'Sofríe cebolla, añade harina y remueve.',
          'Añade tomate, vino y caldo.',
          'Cocina 10 min.',
          'Vuelve a añadir las albóndigas y cocina 15 min más.'
        ],
        nutricion: { cal: 520, hc: 18, proteinas: 36, grasas: 34, fibra: 3, azucares: 8 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'carne', 'guiso', 'tradicional'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Lentejas de verduras',
        ingredientes: [
          { nombre: 'Lentejas', cantidad: '300', unidad: 'g' },
          { nombre: 'Zanahoria', cantidad: '100', unidad: 'g' },
          { nombre: 'Patata', cantidad: '150', unidad: 'g' },
          { nombre: 'Cebolla', cantidad: '80', unidad: 'g' },
          { nombre: 'Pimiento verde', cantidad: '50', unidad: 'g' },
          { nombre: 'Ajo', cantidad: '2', unidad: 'dientes' },
          { nombre: 'Tomate triturado', cantidad: '100', unidad: 'g' },
          { nombre: 'Aceite de oliva', cantidad: '3', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Comino', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Laurel', cantidad: '1', unidad: 'hoja' }
        ],
        pasos: [
          'Si usas lentejas secas, límpialas.',
          'Sofríe cebolla, ajo y pimiento.',
          'Añade el tomate y la zanahoria.',
          'Incorpora las lentejas y remueve.',
          'Añade agua (1:3) con laurel y comino.',
          'Cuece 30-40 min hasta que estén tiernas.',
          'Añade la patata troceada los últimos 15 min.'
        ],
        nutricion: { cal: 380, hc: 52, proteinas: 24, grasas: 8, fibra: 18, azucares: 8 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'legumbres', 'guiso'],
        fechaCreacion: new Date().toISOString()
      }
    ];
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Recipes.init());
