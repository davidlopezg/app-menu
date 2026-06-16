// ============================================
// Nutrition — USDA API + Cache
// ============================================

const Nutrition = {
  API_URL: 'https://api.nal.usda.gov/fdc/v1/foods/search',
  API_KEY: 'DEMO_KEY', // Free tier, 1000 req/day
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_KEY: 'menuapp_nutrition_cache',

  // Nutrient IDs from USDA
  NUTRIENTS_IDS: {
    208: 'cal',      // Energy (kcal)
    205: 'hc',       // Carbohydrates
    203: 'proteinas', // Protein
    204: 'grasas',   // Total lipid (fat)
    291: 'fibra',    // Fiber
    269: 'azucares'  // Sugars
  },

  // Search food in USDA database
  async searchFood(query) {
    if (!query || query.length < 2) return [];

    try {
      const url = new URL(this.API_URL);
      url.searchParams.set('api_key', this.API_KEY);
      url.searchParams.set('query', query);
      url.searchParams.set('pageSize', '5');
      url.searchParams.set('dataType', 'Foundation,SR Legacy');

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      return this._parseFoods(data.foods || []);
    } catch (error) {
      console.error('Nutrition.searchFood error:', error);
      return [];
    }
  },

  // Parse USDA response to our format
  _parseFoods(foods) {
    return foods.map(food => {
      const nutrients = {};
      
      // Extract nutrients by ID
      (food.foodNutrients || []).forEach(n => {
        if (this.NUTRIENTS_IDS[n.nutrientId]) {
          const key = this.NUTRIENTS_IDS[n.nutrientId];
          nutrients[key] = Math.round(n.value || 0);
        }
      });

      return {
        id: food.fdcId,
        nombre: food.description,
        nutrientes: nutrients
      };
    });
  },

  // Get cached nutrition for ingredient
  getCached(ingredientName) {
    const cache = Store.get(this.CACHE_KEY) || {};
    const key = ingredientName.toLowerCase().trim();
    
    if (cache[key]) {
      const cached = cache[key];
      const age = Date.now() - cached.timestamp;
      
      if (age < this.CACHE_TTL) {
        return cached.data;
      }
    }
    return null;
  },

  // Cache nutrition data
  setCache(ingredientName, data) {
    const cache = Store.get(this.CACHE_KEY) || {};
    const key = ingredientName.toLowerCase().trim();
    
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    
    Store.set(this.CACHE_KEY, cache);
  },

  // Search with cache
  async searchWithCache(query) {
    // Check cache first
    const cached = this.getCached(query);
    if (cached) {
      return { data: cached, fromCache: true };
    }

    // Search API
    const results = await this.searchFood(query);
    
    if (results.length > 0) {
      // Cache the first result
      this.setCache(query, results[0]);
      return { data: results[0], fromCache: false };
    }

    return { data: null, fromCache: false };
  },

  // Calculate total nutrition from ingredients
  async calculateFromIngredients(ingredients) {
    const totals = {
      cal: 0,
      hc: 0,
      proteinas: 0,
      grasas: 0,
      fibra: 0,
      azucares: 0
    };

    const errors = [];

    for (const ing of ingredients) {
      const searchName = `${ing.nombre} ${ing.cantidad}${ing.unidad}`;
      const result = await this.searchWithCache(searchName);
      
      if (result.data) {
        const n = result.data.nutrientes;
        totals.cal += n.cal || 0;
        totals.hc += n.hc || 0;
        totals.proteinas += n.proteinas || 0;
        totals.grasas += n.grasas || 0;
        totals.fibra += n.fibra || 0;
        totals.azucares += n.azucares || 0;
      } else {
        errors.push(ing.nombre);
      }
    }

    // Round totals
    Object.keys(totals).forEach(key => {
      totals[key] = Math.round(totals[key]);
    });

    return { totals, errors };
  },

  // Clear cache
  clearCache() {
    Store.remove(this.CACHE_KEY);
  },

  // Get nutrition info for display
  formatNutrition(nutrition) {
    if (!nutrition) return '';
    return `${nutrition.cal || 0} kcal | ${nutrition.proteinas || 0}P | ${nutrition.hc || 0}HC | ${nutrition.grasas || 0}G`;
  }
};
