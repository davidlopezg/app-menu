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

    # === Ingredientes ===
    # Formato A: inline "Ingredientes: Name1 (url1), Name2 (url2), ..."
    # Formato B: lista vertical después de "Ingredientes:" hasta línea vacía/header
    meta['ingredientes'] = []

    # Primero intentar formato A
    m = re.search(r'^Ingredientes:\s*(.+?)(?=\n\n|\n#|\nSaludable:|\Z)', text, re.MULTILINE | re.DOTALL)
    if m:
        raw = m.group(1).strip()
        # Si la primera linea tiene (url), es formato A
        if '(http' in raw.split('\n')[0]:
            # Split por ", " pero respetando paréntesis
            items = split_inline_ingredients(raw.split('\n')[0])
            meta['ingredientes'] = items
        else:
            # Formato B: cada línea es un ingrediente (hasta línea vacía)
            for line in raw.split('\n'):
                line = line.strip()
                if not line or line.startswith('#'):
                    break
                # Limpiar numeración tipo "1.", "2)" al inicio
                line = re.sub(r'^\d+[\.\)]\s*', '', line)
                # Quitar punto final
                line = line.rstrip('.').strip()
                if line and not line.startswith('['):
                    meta['ingredientes'].append(line)

    # Formato C: sección "# Ingredientes" con checklist "- [ ] item"
    if not meta['ingredientes']:
        section = re.search(
            r'^#\s*Ingredientes\s*\n((?:- \[[ x]\] .+(?:\n|$))+)',
            text, re.MULTILINE)
        if section:
            for line in section.group(1).split('\n'):
                m = re.match(r'^- \[[ x]\]\s*(.+)$', line)
                if m and m.group(1).strip():
                    meta['ingredientes'].append(m.group(1).strip())

    # === Pasos (Elaboración / Preparación / Pasos) ===
    meta['pasos'] = []
    for section_name in ['Elaboración', 'Elaboracion', 'Preparación', 'Preparacion', 'Pasos', 'Instrucciones']:
        # Lista numerada: "1. paso", "2. paso"
        section = re.search(
            rf'^#\s*{section_name}\s*\n((?:\d+\..+(?:\n|$))+)',
            text, re.MULTILINE)
        if section:
            for line in section.group(1).split('\n'):
                m = re.match(r'^\d+\.\s*(.+)$', line)
                if m and m.group(1).strip():
                    meta['pasos'].append(m.group(1).strip())
            break  # usar la primera sección que encontremos
        # Lista con guion: "- paso"
        section = re.search(
            rf'^#\s*{section_name}\s*\n((?:- .+(?:\n|$))+)',
            text, re.MULTILINE)
        if section:
            for line in section.group(1).split('\n'):
                m = re.match(r'^- (?!\[)\s*(.+)$', line)
                if m and m.group(1).strip():
                    meta['pasos'].append(m.group(1).strip())
            break

    # Imagen externa (markdown ![]())
    m = re.search(r'!\[[^\]]*\]\(([^)]+)\)', text)
    if m:
        url = m.group(1).strip()
        if url.startswith('http'):
            meta['imagen_url'] = url

    # Link plano (no markdown) en líneas siguientes
    if not meta.get('link'):
        m = re.search(r'^\[?(https?://[^\s\]]+)\]?\(?https?://[^\s\)]+\)?', text, re.MULTILINE)
        if m:
            meta['link'] = m.group(1)

    # Saludable (no se usa por ahora)
    m = re.search(r'^Saludable:\s*(.+)$', text, re.MULTILINE)
    if m:
        meta['saludable'] = m.group(1).strip().lower() in ('si', 'sí', 'yes', 'true')

    return meta


def split_inline_ingredients(line: str):
    """Parte 'Name1 (url1), Name2 (url2), Name3 (opcional) (url3)' en nombres limpios."""
    items = []
    # Encontrar cada patron: nombre opcionalmente seguido de (url)
    # El problema es cuando el nombre tiene sus propios parentesis como "Nueces (o frutos)"
    # Estrategia: split por ', ' pero solo cuando NO estamos dentro de paréntesis
    depth = 0
    current = ''
    for ch in line:
        if ch == '(':
            depth += 1
            current += ch
        elif ch == ')':
            depth -= 1
            current += ch
            # Si depth llega a 0, terminamos un item (la URL cierra)
            if depth == 0:
                items.append(current.strip())
                current = ''
        elif ch == ',' and depth == 0:
            if current.strip():
                items.append(current.strip())
            current = ''
        else:
            current += ch
    if current.strip():
        items.append(current.strip())

    # Limpiar cada item: sacar la URL y dejar solo el nombre
    cleaned = []
    for item in items:
        # Quitar la URL entre parentesis al final
        # Patron: "Nombre (opcional) (url)" o "Nombre (url)" o "Nombre"
        m = re.match(r'^(.+?)\s*\(https?://[^\)]+\)\s*$', item)
        if m:
            cleaned.append(m.group(1).strip())
        elif item.startswith('(') and ')' in item:
            # Es solo una URL entre parentesis, descartar
            continue
        else:
            cleaned.append(item.strip())
    return cleaned


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
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--clean', action='store_true',
                        help='Borrar todas las recetas existentes antes de importar')
    args = parser.parse_args()

    recipes_dir = NOTION_DIR / 'Recipes'
    csv_path = NOTION_DIR / 'Recipes fc4a509a71fe4d7faf63a04d45fa2a23.csv'

    if not recipes_dir.exists():
        print(f'! No existe {recipes_dir}')
        sys.exit(1)
    if not csv_path.exists():
        print(f'! No existe {csv_path}')
        sys.exit(1)

    if args.clean:
        print('-- Limpiando tabla recipes...')
        # Primero obtener todos los IDs, luego borrar uno por uno (o batch)
        req = urllib.request.Request(
            f'{SUPABASE_URL}/rest/v1/recipes?select=id',
            headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                existing = json.loads(r.read())
        except urllib.error.HTTPError as e:
            print(f'  FAIL listando: {e.code} {e.read().decode()[:200]}')
            sys.exit(1)
        print(f'  Hay {len(existing)} recetas existentes')
        if existing:
            ids = ','.join(f'"{r["id"]}"' for r in existing)
            req = urllib.request.Request(
                f'{SUPABASE_URL}/rest/v1/recipes?id=in.({ids})',
                method='DELETE',
                headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    print(f'  Borradas ({r.status})')
            except urllib.error.HTTPError as e:
                print(f'  FAIL borrando: {e.code} {e.read().decode()[:200]}')
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
            'pasos': meta.get('pasos', []),
            'nutricion': {'cal': 0, 'hc': 0, 'proteinas': 0, 'grasas': 0, 'fibra': 0, 'azucares': 0},
            'tipo_comida': map_tipo_comida(tags),
            'imagen': img_url,
            'tags': tags,
            'link': meta.get('link', ''),
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
