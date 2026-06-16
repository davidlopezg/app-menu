# Especificaciones: App Menú Semanal — David & María

> Proyecto: `app-menu-semanal/`
> Fase: Especificaciones (v1.0)
> Fecha: 2026-06-17

---

## Requisitos Funcionales

### RF-1: Vista de Menú Semanal

**Given** el usuario abre la aplicación en su móvil  
**When** la aplicación carga  
**Then** muestra una vista con 7 días (Lunes a Domingo) y 3 franjas por día (Desayuno, Almuerzo, Cena)

**Given** el usuario toca una celda vacía del menú  
**When** no hay receta asignada  
**Then** aparece un selector para elegir receta del catálogo

---

### RF-2: Catálogo de Recetas

**Given** el usuario toca el botón "Recetas"  
**When** accede al catálogo  
**Then** muestra lista de recetas con nombre, imagen (opcional) y resumen nutricional

**Given** el usuario toca una receta  
**When** la abre  
**Then** muestra: nombre, ingredientes, pasos, y datos nutricionales completos

---

### RF-3: Integración API Nutricional

**Given** el usuario crea o edita una receta  
**When** introduce los ingredientes  
**Then** la app consulta USDA FoodData Central API para obtener valores nutricionales

**Given** la API responde correctamente  
**When** se procesa la respuesta  
**Then** se muestran: Calorías (kcal), Carbohidratos (g), Proteínas (g), Grasas (g)

**Given** la API falla o no hay conexión  
**When** se intenta obtener datos nutricionales  
**Then** se muestra campo editable manual para introducir valores o se marca "Pendiente"

---

### RF-4: Asignar Receta a Menú

**Given** el usuario está en vista semanal  
**When** toca una celda vacía  
**Then** se abre modal con lista de recetas filtrables

**Given** el usuario selecciona una receta  
**When** confirma la selección  
**Then** la celda muestra nombre de receta + mini info nutricional

---

### RF-5: Eliminar/Editar Asignación

**Given** el usuario toca una celda con receta asignada  
**When** ve el detalle  
**Then** puede: ver receta completa, reemplazar con otra, o eliminar asignación

---

## Requisitos No Funcionales

### RNF-1: Responsive Mobile-First

- **DEBE**: funcionar en pantallas de 320px a 1440px
- **DEBE**: touch targets mínimo 44x44px
- **DEBERÍA**: animaciones suaves CSS para transiciones

### RNF-2: Sin Servidor Backend

- **DEBE**: funcionar 100% en cliente (HTML/CSS/JS vanilla)
- **DEBE**: persistir datos en localStorage
- **PUEDE**: usar Service Worker para cache básico

### RNF-3: GitHub Pages

- **DEBE**: funcionar en `github.io` sin configuración adicional
- **DEBE**: no usar rutas que requieran servidor (SPA hash routing OK)

### RNF-4: Rendimiento

- **DEBE**: cargar en <3s en 3G
- **DEBE**: API calls con cache de 24h mínimo
- **DEBERÍA**: lazy load de imágenes

### RNF-5: Accesibilidad

- **DEBE**: contraste mínimo WCAG AA
- **DEBE**: labels en español
- **DEBERÍA**: navegación por teclado

---

## Criterios de Aceptación

### CA-1: Menú Semanal

- [ ] Se ven 7 días con 3 comidas cada uno
- [ ] Se puede asignar receta a cualquier celda
- [ ] Se puede eliminar asignación
- [ ] Los cambios persisten al recargar

### CA-2: Catálogo

- [ ] Lista de recetas visible
- [ ] Detalle de receta muestra ingredientes + pasos
- [ ] Info nutricional visible
- [ ] Se puede añadir receta nueva

### CA-3: API Nutricional

- [ ] Búsqueda por ingrediente funciona
- [ ] Datos se guardan en receta
- [ ] Fallback manual si API falla

### CA-4: Responsive

- [ ] Testado en iPhone SE (375px)
- [ ] Testado en Android (360-420px)
- [ ] Navegación táctil funcional

### CA-5: Despliegue

- [ ] Repo GitHub con branch `gh-pages`
- [ ] URL accesible: `username.github.io/app-menu-semanal`
- [ ] SSL activo

---

## Estructura de Datos

### Receta

```json
{
  "id": "uuid",
  "nombre": "string",
  "ingredientes": [
    { "nombre": "string", "cantidad": "string", "unidad": "string" }
  ],
  "pasos": ["string"],
  "nutricion": {
    "calorias": 0,
    "carbohidratos": 0,
    "proteinas": 0,
    "grasas": 0,
    "azucares": 0,
    "fibra": 0
  },
  "imagen": "url (opcional)",
  "tags": ["string"],
  "fechaCreacion": "ISO date"
}
```

### Menú Semanal

```json
{
  "semana": "2026-W25",
  "dias": {
    "lunes": { "desayuno": "recipe-id", "almuerzo": "recipe-id", "cena": "recipe-id" },
    "martes": { ... },
    ...
  }
}
```

---

## API Externa

### USDA FoodData Central

```
GET https://api.nal.usda.gov/fdc/v1/foods/search
?api_key=DEMO_KEY
&query=chicken+breast
&pageSize=5
```

- **Gratuito** con `DEMO_KEY`
- Rate limit: 1000 requests/day
- Respuesta: array de `foods` con `foodNutrients`

### Fallback

Si API falla: mostrar inputs manuales para cada valor nutricional.

---

## Vistas

### 1. Vista Principal (Menú)

```
┌─────────────────────────┐
│  🍽️ Menú Semanal   [⚙️]│
├─────────────────────────┤
│  ◀  Junio 2026  ▶       │
├─────────────────────────┤
│ LUN  │Desay│Alm │Cena  │
│ MAR  │Desay│Alm │Cena  │
│ MIE  │Desay│Alm │Cena  │
│ JUE  │Desay│Alm │Cena  │
│ VIE  │Desay│Alm │Cena  │
│ SAB  │Desay│Alm │Cena  │
│ DOM  │Desay│Alm │Cena  │
├─────────────────────────┤
│ [+ Receta] [📋 Recetas] │
└─────────────────────────┘
```

### 2. Catálogo de Recetas

```
┌─────────────────────────┐
│  📚 Recetas    [+ Nuevo]│
├─────────────────────────┤
│  🔍 Buscar...           │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 🥗 Ensalada César    │ │
│ │ 350 kcal | 25P | 15G │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 🍝 Pasta Carbonara   │ │
│ │ 520 kcal | 22P | 28G │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### 3. Detalle Receta

```
┌─────────────────────────┐
│  ← Volver               │
├─────────────────────────┤
│ 🥗 Ensalada César       │
├─────────────────────────┤
│ 📊 Información Nutricional│
│ Calorías: 350 kcal      │
│ Carbohidratos: 15g     │
│ Proteínas: 25g          │
│ Grasas: 18g             │
├─────────────────────────┤
│ 🥬 Ingredientes         │
│ • Lechuga romana (200g) │
│ • Pollo (150g)          │
│ • Parmesano (30g)      │
├─────────────────────────┤
│ 👨‍🍳 Pasos               │
│ 1. Lavar y cortar...    │
│ 2. Cocinar pollo...     │
└─────────────────────────┘
```

---

## Sincronización GitHub (Gist)

### Objetivo
Permitir que David y María vean y editen el mismo menú desde sus móviles.

### Arquitectura
- **Almacenamiento:** GitHub Gist privado
- **Gist ID:** `c297536c9c15f7ad42a37a1feb6afba0`
- **Token:** Cada usuario guarda su token en localStorage (solo acceso a Gist)

### Estructura del JSON (en Gist)
```json
{
  "version": "1.0",
  "updated": "2026-06-17T12:00:00.000Z",
  "menu": { ... },
  "recipes": [ ... ]
}
```

### Flujo de Uso
1. **Primera vez:** El usuario pega su token GitHub en Ajustes
2. **Abrir app:** Se descargan datos del Gist automáticamente
3. **Hacer cambios:** Se guardan en localStorage
4. **Sincronizar:** Subir cambios al Gist desde Ajustes → "Subir al Gist"
5. **Otro dispositivo:** Descargar del Gist desde Ajustes → "Descargar del Gist"

### Seguridad
- Token solo tiene scope `gist` (no acceso a repos)
- Token se guarda en localStorage del navegador (no en servidor)
- Gist es privado (solo quien tiene el link puede verlo)

### Ajustes en la App
El menú de ajustes permite:
- Guardar/actualizar token GitHub
- Subir datos al Gist (⬆️)
- Descargar datos del Gist (⬇️)
- Ver estado de sincronización

---

## Siguiente paso

¿Aprobás estas especificaciones? Si confirmás, avanzo a **Fase 3: Diseño** (arquitectura + diagramas).
