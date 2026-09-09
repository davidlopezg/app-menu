#!/usr/bin/env python3
"""Aplica el menu semanal sugerido a Supabase."""
import json, urllib.request, urllib.error
from datetime import date

SUPABASE_URL = 'https://flpxuyrtdmkqzzdcjqbr.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHh1eXJ0ZG1rcXp6ZGNqcWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzE1MDcsImV4cCI6MjEwNDU0NzUwN30.dA9CmjXMkduZjDPUZw29IDPG3lPiSn-BrH3neGEzDxw'

# Menu propuesto por el asistente
MENU = {
    'monday':    {'lunch': 'Garbanzos al horno',          'dinner': 'Ensalada de rúcula con cherrys'},
    'tuesday':   {'lunch': 'Pasta con salsa de tomate (Cherry’s)', 'dinner': 'Tortilla de verduras'},
    'wednesday': {'lunch': 'Butifarra al horno',          'dinner': 'Merluza a la donostiarra'},
    'thursday':  {'lunch': 'Pollo al horno al curri',     'dinner': 'Revuelto de setas'},
    'friday':    {'lunch': 'Fideua',                      'dinner': 'Ensalada de tomate, burrata, pesto y piñones'},
    'saturday':  {'lunch': 'FABADA ASTURIANA (RECETA HISTÓRICA) - YouTube - hispacocina',
                  'dinner': 'Lenguado (o pelalla) a la plancha'},
    'sunday':    {'lunch': 'Hamburguesa',                 'dinner': 'Sopa miso + huevo duro'},
}

# Week key ISO (YYYY-WXX) usando el lunes de esta semana
def week_key():
    today = date.today()
    # lunes de esta semana
    monday = today.fromordinal(today.toordinal() - today.weekday())
    iso = monday.isocalendar()
    return f'{iso[0]}-W{iso[1]:02d}'

def supa_get(path):
    req = urllib.request.Request(
        f'{SUPABASE_URL}{path}',
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def supa_post(path, data):
    req = urllib.request.Request(
        f'{SUPABASE_URL}{path}',
        method='POST',
        data=json.dumps(data).encode(),
        headers={
            'apikey': KEY, 'Authorization': f'Bearer {KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
        })
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status

# 1. Traer todas las recetas con su id
print('Cargando recetas...')
recipes = supa_get('/rest/v1/recipes?select=id,nombre')
print(f'  {len(recipes)} recetas en la BD')

# 2. Mapear nombre -> id (lowercase para matching robusto)
by_name = {r['nombre'].lower().strip(): r['id'] for r in recipes}

# 3. Construir el menu_data en el formato que la app espera
menu_data = {}
no_encontradas = []
for day, meals in MENU.items():
    menu_data[day] = {}
    for meal_type, recipe_name in meals.items():
        key = recipe_name.lower().strip()
        if key in by_name:
            menu_data[day][meal_type] = by_name[key]
        else:
            no_encontradas.append((day, meal_type, recipe_name))
            menu_data[day][meal_type] = None

# 4. Week key
wk = week_key()
print(f'Semana: {wk}')

# 5. Mostrar resumen
print('\n=== Menu a guardar ===')
days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
for d, lbl in zip(days, labels):
    meals = menu_data.get(d, {})
    lunch_id = meals.get('lunch')
    dinner_id = meals.get('dinner')
    lunch_name = next((r['nombre'] for r in recipes if r['id'] == lunch_id), '?') if lunch_id else '?'
    dinner_name = next((r['nombre'] for r in recipes if r['id'] == dinner_id), '?') if dinner_id else '?'
    print(f'  {lbl}: {lunch_name[:35]:35} | {dinner_name}')

if no_encontradas:
    print('\nNo encontradas:')
    for d, m, n in no_encontradas:
        print(f'  {d} {m}: {n}')

# 6. Upsert a menu_weeks
print('\nGuardando en Supabase...')
status = supa_post('/rest/v1/menu_weeks', [{
    'week_key': wk,
    'data': menu_data,
    'updated_at': '2025-09-09T00:00:00Z',
}])
print(f'  status: {status}')
print(f'\nListo! Semana {wk} guardada.')
print('Abrí la app → Menú Semanal → vas a ver el menu.')
