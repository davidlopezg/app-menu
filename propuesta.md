# Propuesta: App Menú Semanal — David & María

## Contexto

David y María necesitan una herramienta compartida para planificar el menú semanal de casa. Requisitos explícitos:

1. **App web responsive** optimizada para móvil
2. **Desplegada en GitHub Pages** (gratis, simple)
3. **Gestión de menú semanal** (asignar recetas a días/comidas)
4. **Catálogo de recetas** con ingredientes y pasos
5. **Conexión a API nutricional** para cada receta:
   - Calorías
   - Carbohidratos
   - Proteínas
   - Grasas
   - Otros micronutrientes relevantes

**Usuarios:** David y María (2 personas, uso personal)

---

## Módulos afectados

```
app-menu-semanal/
├── index.html          # SPA principal
├── css/
│   └── styles.css      # Estilos responsive
├── js/
│   ├── app.js          # Lógica principal
│   ├── recipes.js      # Gestión de recetas
│   ├── menu.js         # Gestión del menú semanal
│   └── nutrition.js   # Integración API nutricional
├── data/
│   └── recipes.json    # Recetas locales (fallback)
├── api/
│   └── nutrition.js    # Servicio API nutricional
└── README.md
```

---

## Plan de rollback

| Fase | Riesgo | Estrategia |
|:-----|:-------|:----------|
| Frontend | Bajo | HTML/CSS/JS vanilla — sin dependencias complejas |
| API nutricional | Medio | Fallback a datos locales si API falla |
| Datos recetas | Bajo | Formato JSON editable manualmente |
| Despliegue | Bajo | GitHub Pages — reversible eliminando branch |

---

## Dependencias

| Dependencia | Tipo | Alternativa |
|:------------|:-----|:------------|
| API nutricional | Externo | USDA FoodData Central (gratis, sin key) |
| Hosting | GitHub Pages | Netlify/Vercel (backup) |
| Base de datos | LocalStorage | IndexedDB si crece |

---

## Estimación de riesgo

🟡 **MEDIO**

**Factores de riesgo:**
- API nutricional externa puede cambiar endpoints o rate limits
- Sin sistema de autenticación (datos compartidos via localStorage + sync manual)

**Mitigaciones:**
- Cachear respuestas de API
- Permitir edición manual de datos nutricionales
- Diseño minimalista — sin sobreingeniería

---

## API Nutricional seleccionada

**USDA FoodData Central** (https://fdc.nal.usda.gov/api-guide.html)

- ✅ API gratuita
- ✅ No requiere API key para uso básico
- ✅ Datos científicos confiables
- ✅ Endpoint: `https://api.nal.usda.gov/fdc/v1/foods/search`

**Alternativa:** Edamam Food Database (más friendly pero requiere registro)

---

## Scope inicial (MVP)

### Incluido ✅
- Vista semanal (L-D)
- Catálogo de recetas
- Asignar receta → día + comida (desayuno/almuerzo/cena)
- Info nutricional por receta (calorías, HC, proteínas, grasas)
- Responsive mobile-first
- Desplegado en GitHub Pages

### Excluido ❌
- Autenticación multiusuario (uso doméstico, localStorage compartido)
- Compra de ingredientes automatizada
- Planificación a largo plazo (>1 semana)
- App nativa (iOS/Android)
- Offline PWA completo

---

## Siguiente paso

¿Aprobás esta propuesta? Si confirmás, avanzo a **Fase 2: Especificaciones** (requisitos formales Given/When/Then).
