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
        nombre: 'Avena con frutas del bosque',
        ingredientes: [
          { nombre: 'Avena', cantidad: '80', unidad: 'g' },
          { nombre: 'Leche', cantidad: '200', unidad: 'ml' },
          { nombre: 'Arándanos', cantidad: '50', unidad: 'g' },
          { nombre: 'Fresas', cantidad: '50', unidad: 'g' },
          { nombre: 'Miel', cantidad: '1', unidad: 'cda' }
        ],
        pasos: [
          'Hierve la leche en un cazo a fuego medio.',
          'Añade la avena y cocina 5 minutos removiendo.',
          'Retira del fuego y deja reposar 2 minutos.',
          'Sirve en un bol y añade las frutas encima.',
          'Riega con miel al gusto.'
        ],
        nutricion: { cal: 350, hc: 58, proteinas: 12, grasas: 8, fibra: 6, azucares: 18 },
        tipoComida: 'almuerzo',
        tags: ['desayuno', 'vegetariana', 'rápida'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Ensalada César con pollo',
        ingredientes: [
          { nombre: 'Lechuga romana', cantidad: '150', unidad: 'g' },
          { nombre: 'Pechuga de pollo', cantidad: '150', unidad: 'g' },
          { nombre: 'Parmesano', cantidad: '30', unidad: 'g' },
          { nombre: 'Crutones', cantidad: '40', unidad: 'g' },
          { nombre: 'Salsa César', cantidad: '2', unidad: 'cda' }
        ],
        pasos: [
          'Lava y trocea la lechuga romana.',
          'Cocina la pechuga a la plancha con sal y pimienta (5 min por lado).',
          'Corta el pollo en tiras.',
          'Coloca la lechuga en un bol grande.',
          'Añade el pollo, los crutones y el parmesano rayado.',
          'Aliña con la salsa César y mezcla bien.'
        ],
        nutricion: { cal: 420, hc: 22, proteinas: 38, grasas: 22, fibra: 4, azucares: 4 },
        tipoComida: 'ambos',
        tags: ['almuerzo', 'cena', 'baja en carbs'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Pasta a la carbonara',
        ingredientes: [
          { nombre: 'Espaguetis', cantidad: '100', unidad: 'g' },
          { nombre: 'Bacon', cantidad: '80', unidad: 'g' },
          { nombre: 'Huevos', cantidad: '2', unidad: 'ud' },
          { nombre: 'Parmesano', cantidad: '40', unidad: 'g' },
          { nombre: 'Pimienta negra', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Cocina los espaguetis en agua con sal según el paquete.',
          'Mientras, corta el bacon en dados y fríelo hasta que esté crujiente.',
          'Bate los huevos con el parmesano rayado y pimienta.',
          'Escurre la pasta (guarda un poco del agua de cocción).',
          'Mezcla la pasta caliente con el bacon (fuera del fuego).',
          'Añade la mezcla de huevos y remueve rápidamente.',
          'Si queda seco, añade un poco de agua de cocción.'
        ],
        nutricion: { cal: 550, hc: 52, proteinas: 24, grasas: 28, fibra: 2, azucares: 2 },
        tipoComida: 'almuerzo',
        tags: ['almuerzo', 'cena'],
        fechaCreacion: new Date().toISOString()
      },
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
          'Cocina en una sartén con un poco de aceite.',
          'Dale la vuelta con un plato y cocina el otro lado.'
        ],
        nutricion: { cal: 380, hc: 28, proteinas: 18, grasas: 24, fibra: 2, azucares: 4 },
        tipoComida: 'cena',
        tags: ['almuerzo', 'cena'],
        fechaCreacion: new Date().toISOString()
      },
      {
        id: Store.uuid(),
        nombre: 'Salmón al horno con verduras',
        ingredientes: [
          { nombre: 'Filete de salmón', cantidad: '180', unidad: 'g' },
          { nombre: 'Calabacín', cantidad: '150', unidad: 'g' },
          { nombre: 'Pimientos', cantidad: '150', unidad: 'g' },
          { nombre: 'Limón', cantidad: '1', unidad: 'ud' },
          { nombre: 'Aceite de oliva', cantidad: '2', unidad: 'cda' },
          { nombre: 'Sal', cantidad: 'al gusto', unidad: 'none' },
          { nombre: 'Pimienta', cantidad: 'al gusto', unidad: 'none' }
        ],
        pasos: [
          'Precalienta el horno a 200°C.',
          'Corta el calabacín y los pimientos en rodajas.',
          'Coloca las verduras en una bandeja de horno.',
          'Pon el salmón encima y salpimienta.',
          'Riega con aceite de oliva y el jugo de medio limón.',
          'Hornea 20-25 minutos hasta que el salmón esté hecho.',
          'Sirve con el另一半 limón en rodajas.'
        ],
        nutricion: { cal: 400, hc: 12, proteinas: 35, grasas: 26, fibra: 4, azucares: 8 },
        tipoComida: 'ambos',
        tags: ['almuerzo', 'cena', 'gluten free'],
        fechaCreacion: new Date().toISOString()
      }
    ];
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Recipes.init());
