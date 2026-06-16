// ============================================
// Translations — App Menú Semanal
// ============================================

const T = {
  // Days
  days: {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  },
  daysShort: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],

  // Meals
  meals: {
    lunch: 'Comida',
    dinner: 'Cena'
  },

  // Navigation
  nav: {
    menu: 'Menú',
    recipes: 'Recetas'
  },

  // Actions
  actions: {
    add: 'Añadir',
    edit: 'Editar',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    search: 'Buscar...',
    back: 'Volver',
    assign: 'Asignar al menú',
    viewRecipe: 'Ver receta'
  },

  // Recipe
  recipe: {
    newRecipe: 'Nueva Receta',
    editRecipe: 'Editar Receta',
    recipeName: 'Nombre de la receta',
    ingredients: 'Ingredientes',
    steps: 'Pasos',
    nutrition: 'Información Nutricional',
    addIngredient: '+ Añadir ingrediente',
    addStep: '+ Añadir paso',
    namePlaceholder: 'Nombre del ingrediente',
    quantityPlaceholder: 'Cantidad',
    stepPlaceholder: 'Describe el paso...',
    buscarNutrientes: 'Buscar nutrientes',
    ingrediente: 'Ingrediente',
    cantidad: 'Cantidad',
    unidad: 'Unidad',
    porcion: 'Porción (g/ml)',
    sinRecetas: 'No hay recetas todavía',
    sinRecetasHint: 'Pulsa el botón + para crear tu primera receta'
  },

  // Nutrition
  nutrition: {
    calories: 'Calorías',
    carbs: 'Carbohidratos',
    protein: 'Proteínas',
    fat: 'Grasas',
    fiber: 'Fibra',
    sugar: 'Azúcares',
    kcal: 'kcal',
    searching: 'Buscando...',
    notFound: 'No encontrado',
    manualEntry: 'Introducir manualmente',
    searchFood: 'Buscar alimento',
    porRacion: 'Por ración'
  },

  // Menu
  menu: {
    title: 'Menú Semanal',
    today: 'Hoy',
    thisWeek: 'Esta semana',
    selectRecipe: 'Seleccionar receta',
    removeMeal: 'Eliminar',
    replaceMeal: 'Cambiar',
    weekOf: 'Semana del',
    shoppingList: 'Lista de la compra',
    viewShoppingList: 'Ver lista de la compra',
    shoppingListTitle: 'Lista de la Compra',
    shoppingListEmpty: 'No hay recetas asignadas esta semana',
    copyList: 'Copiar lista',
    listCopied: '¡Lista copiada!'
  },

  // Validation
  validation: {
    nameRequired: 'El nombre es obligatorio',
    ingredientsRequired: 'Añade al menos un ingrediente',
    stepsRequired: 'Añade al menos un paso'
  },

  // Toast messages
  toast: {
    recipeSaved: 'Receta guardada',
    recipeDeleted: 'Receta eliminada',
    mealAssigned: 'Comida asignada',
    mealRemoved: 'Asignación eliminada',
    error: 'Ha ocurrido un error'
  },

  // Units
  units: {
    g: 'g',
    ml: 'ml',
    cup: 'taza',
    tbsp: 'cda',
    tsp: 'cdita',
    piece: 'ud',
    slice: 'rebanada',
    none: 'sin unidad'
  },

  // Meal type badges
  mealType: {
    almuerzo: 'Almuerzo',
    cena: 'Cena',
    ambos: 'Almuerzo y Cena'
  },

  // Filter tabs
  filter: {
    all: 'Todas',
    almuerzo: 'Almuerzo',
    cena: 'Cena'
  },

  // Validation warnings
  validation: {
    nameRequired: 'El nombre es obligatorio',
    ingredientsRequired: 'Añade al menos un ingrediente',
    stepsRequired: 'Añade al menos un paso',
    cenaHighCarbs: '⚠️ Esta cena tiene carbohidratos/azúcares. ¿Continuar de todos modos?'
  },

  // Tags
  tags: {
    breakfast: 'desayuno',
    lunch: 'almuerzo',
    dinner: 'cena',
    snack: 'tentempié',
    quick: 'rápida',
    vegetarian: 'vegetariana',
    vegan: 'vegana',
    glutenFree: 'sin gluten',
    lowCarb: 'baja en carbs'
  }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = T;
}
