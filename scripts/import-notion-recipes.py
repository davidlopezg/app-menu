#!/usr/bin/env python3
"""
Importa las recetas de Notion (export a .md + CSV) a Supabase.

Uso:
  python3 scripts/import-notion-recipes.py

Lee:
  /storage/emulated/0/Download/ExportBlock-06989495-f04c-4dba-aacb-004bf54b14a2/
    Recipes/                                # subcarpetas con .md y opcionalmente .png
    Recipes fc4a509a71fe4d7faf63a04d45fa2a23.csv

Sube a:
  Supabase Storage bucket "recipe-images"  (las imagenes locales)
  Supabase table     "recipes"             (los datos)
"""
import csv
import json
import re
import sys
import urllib.request
import urllib.error
import urllib.parse
import uuid
import mimetypes
import os
from pathlib import Path

# === Config ===
SUPABASE_URL = 'https://flpxuyrtdmkqzzdcjqbr.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHh1eXJ0ZG1rcXp6ZGNqcWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzE1MDcsImV4cCI6MjEwNDU0NzUwN30.dA9CmjXMkduZjDPUZw29IDPG3lPiSn-BrH3neGEzDxw'
STORAGE_BUCKET = 'recipe-images'
NOTION_DIR = Path('/storage/emulated/0/Download/ExportBlock-06989495-f04c-4dba-aacb-004bf54b14a2')

# === Helpers HTTP ===
def supa(method, path, data=None, content_type='application/json'):
    url = f'{SUPABASE_URL}{path}'
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, method=method, data=body, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': content_type,
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def storage_upload(local_path: Path, remote_name: str):
    """Sube un archivo a Storage y devuelve la URL publica."""
    mime, _ = mimetypes.guess_type(str(local_path))
    if not mime:
        mime = 'application/octet-stream'
    with open(local_path, 'rb') as f:
        data = f.read()
    url = f'{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{urllib.parse.quote(remote_name)}'
    req = urllib.request.Request(url, method='POST', data=data, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': mime,
        'x-upsert': 'true',
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            if r.status in (200, 201):
                public_url = f'{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{urllib.parse.quote(remote_name)}'
                return public_url
            return None
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return 'BUCKET_MISSING'
        print(f'  ! upload error {e.code} for {local_path.name}: {e.read().decode()[:200]}')
        return None


# === Parsers ===
def parse_csv(path: Path):
    """Lee el CSV y devuelve dict: nombre_lower -> nombre_original."""
    out = {}
    with open(path, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get('Name') or '').strip()
            if not name:
                continue
            out[name.lower()] = name
    return out


def normalize_for_match(text: str) -> str:
    """Quita acentos, caracteres raros y normaliza para matching."""
    import unicodedata
    # Quitar acentos
    nfkd = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in nfkd if not unicodedata.combining(c))
    # Lowercase + quitar todo lo que no sea alfanumerico o espacio
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def find_md_for_name(recipes_dir: Path, clean_name: str):
    """Encuentra el .md cuyo stem (sin hash) matchea clean_name.

    Notion a veces trunca el nombre del file vs el Name del CSV.
    Usamos matching por prefijo despues de normalizar (sin acentos ni simbolos).
    """
    norm_target = normalize_for_match(clean_name)
    target_words = norm_target.split()[:4]  # primeras 4 palabras

    best_match = None
    best_score = 0

    for md in recipes_dir.glob('*.md'):
        stem = md.stem
        # Quitar el hash (32 chars hex al final) si existe
        m = re.match(r'^(.+?)\s+([0-9a-f]{32})$', stem)
        stem_clean = (m.group(1) if m else stem).strip()

        norm_stem = normalize_for_match(stem_clean)

        # Match exacto
        if norm_stem == norm_target:
            return md

        # Match por prefijo: uno es prefijo del otro (min 8 chars)
        shorter, longer = sorted([norm_stem, norm_target], key=len)
        if len(shorter) >= 8 and longer.startswith(shorter):
            return md

        # Match por primeras N palabras
        stem_words = norm_stem.split()[:4]
        common = sum(1 for a, b in zip(target_words, stem_words) if a == b)
        if common >= 3 and common > best_score:
            best_score = common
            best_match = md

    return best_match


def parse_md(md_path: Path):
    """Extrae metadata del .md: categoria, link, ingredientes, imagen externa."""
    if not md_path:
        return {}
    text = md_path.read_text(encoding='utf-8', errors='replace')
    meta = {}

    # Categoria
    m = re.search(r'^Categor[íi]a:\s*(.+)$', text, re.MULTILINE)
    if m:
        meta['categoria'] = [t.strip().lower() for t in m.group(1).split(',') if t.strip()]

    # Link
    m = re.search(r'^Link:\s*(.+)$', text, re.MULTILINE)
    if m:
        meta['link'] = m.group(1).strip()

    # Ingredientes: lista de "Nombre (url), Nombre (url), ..."
    m = re.search(r'^Ingredientes:\s*(.+)$', text, re.MULTILINE)
    if m:
        raw = m.group(1)
        # Patrón: capturar "nombre (url)" - los nombres no tienen parentesis
        parts = re.findall(r'([^,(]+?)\s*(?:\([^)]*\))?(?:,|$)', raw)
        meta['ingredientes'] = [p.strip() for p in parts if p.strip()]
    else:
        meta['ingredientes'] = []

    # Imagen externa (markdown ![]())
    m = re.search(r'!\[[^\]]*\]\(([^)]+)\)', text)
    if m:
        url = m.group(1).strip()
        if url.startswith('http'):
            meta['imagen_url'] = url

    # Saludable (no se usa por ahora)
    m = re.search(r'^Saludable:\s*(.+)$', text, re.MULTILINE)
    if m:
        meta['saludable'] = m.group(1).strip().lower() in ('si', 'sí', 'yes', 'true')

    return meta


def map_tipo_comida(tags):
    """Heuristica: detecta si es almuerzo, cena o ambos."""
    tags_lower = [t.lower() for t in tags]
    is_lunch = any(t in ('lunch', 'almuerzo') for t in tags_lower)
    is_dinner = any(t in ('dinner', 'cena') for t in tags_lower)
    if is_lunch and is_dinner:
        return 'ambos'
    if is_dinner:
        return 'cena'
    if is_lunch:
        return 'almuerzo'
    return 'ambos'


# === Main ===
def main():
    recipes_dir = NOTION_DIR / 'Recipes'
    csv_path = NOTION_DIR / 'Recipes fc4a509a71fe4d7faf63a04d45fa2a23.csv'

    if not recipes_dir.exists():
        print(f'! No existe {recipes_dir}')
        sys.exit(1)
    if not csv_path.exists():
        print(f'! No existe {csv_path}')
        sys.exit(1)

    clean_names = parse_csv(csv_path)
    print(f'CSV: {len(clean_names)} recetas listadas\n')

    rows = []
    stats = {'uploaded': 0, 'bucket_missing': 0, 'no_png': 0, 'errors': 0}

    for idx, (key, clean_name) in enumerate(clean_names.items(), 1):
        md_path = find_md_for_name(recipes_dir, clean_name)
        meta = parse_md(md_path)

        # Imagen local? Buscar PNG en subcarpeta con el mismo nombre
        img_url = meta.get('imagen_url', '')
        png_dir = recipes_dir / clean_name
        if png_dir.exists() and png_dir.is_dir():
            pngs = sorted(png_dir.glob('*.png'))
            if pngs:
                # Tomar la primera imagen
                first_png = pngs[0]
                # Nombre remoto limpio: recetas/<uuid>.png
                remote_name = f'recetas/{uuid.uuid4()}.png'
                result = storage_upload(first_png, remote_name)
                if result == 'BUCKET_MISSING':
                    stats['bucket_missing'] += 1
                    print(f'  ! bucket "{STORAGE_BUCKET}" no existe. Crealo en Storage y re-ejecuta.')
                elif result:
                    img_url = result
                    stats['uploaded'] += 1
                    print(f'  [{idx:2}] {clean_name:50}  ↑ imagen subida')
                else:
                    stats['errors'] += 1
                    print(f'  [{idx:2}] {clean_name:50}  ! error subiendo imagen')
            else:
                stats['no_png'] += 1
        else:
            stats['no_png'] += 1

        # Construir row para Supabase
        ingredientes = [
            {'nombre': ing, 'cantidad': '', 'unidad': 'none'}
            for ing in meta.get('ingredientes', [])
        ]
        tags = meta.get('categoria', [])
        row = {
            'id': str(uuid.uuid4()),
            'nombre': clean_name,
            'ingredientes': ingredientes,
            'pasos': [],                       # vacio: no hay elaboracion en los .md
            'nutricion': {'cal': 0, 'hc': 0, 'proteinas': 0, 'grasas': 0, 'fibra': 0, 'azucares': 0},
            'tipo_comida': map_tipo_comida(tags),
            'imagen': img_url,
            'tags': tags,
            'fecha_creacion': '2025-09-09T00:00:00Z',
        }
        rows.append(row)

    if not rows:
        print('Nada que importar')
        return

    # Subir todo a Supabase en un solo batch
    print(f'\nSubiendo {len(rows)} recetas a Supabase...')
    status, body = supa('POST', '/rest/v1/recipes', data=rows)
    if status in (200, 201):
        print(f'  ✓ {len(rows)} recetas importadas')
    else:
        print(f'  ✗ Error {status}: {body.decode()[:500]}')
        sys.exit(1)

    print('\n--- Resumen ---')
    print(f'  Total procesadas: {len(rows)}')
    print(f'  Imagenes subidas: {stats["uploaded"]}')
    print(f'  Sin imagen:        {stats["no_png"]}')
    print(f'  Bucket faltante:   {stats["bucket_missing"]}')
    print(f'  Errores:           {stats["errors"]}')


if __name__ == '__main__':
    main()
