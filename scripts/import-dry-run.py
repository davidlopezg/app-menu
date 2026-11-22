#!/usr/bin/env python3
"""Dry-run: parsea sin subir nada. Solo muestra que se importaria."""
import sys, importlib.util
from pathlib import Path

# Cargar el modulo de import de forma dinamica (los filenames tienen guion)
spec = importlib.util.spec_from_file_location('imp', 'scripts/import-notion-recipes.py')
imp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imp)
parse_csv, parse_md, find_md_for_name, map_tipo_comida, NOTION_DIR = (
    imp.parse_csv, imp.parse_md, imp.find_md_for_name, imp.map_tipo_comida, imp.NOTION_DIR
)

recipes_dir = NOTION_DIR / 'Recipes'
csv_path = NOTION_DIR / 'Recipes fc4a509a71fe4d7faf63a04d45fa2a23.csv'

clean_names = parse_csv(csv_path)
print(f'CSV tiene {len(clean_names)} recetas\n')

print(f'{"#":>3}  {"NOMBRE":50} {"TIPO":10} {"ING":4} {"IMG":10} {"MD?":4}')
print('-' * 90)

for i, (key, name) in enumerate(clean_names.items(), 1):
    md = find_md_for_name(recipes_dir, name)
    meta = parse_md(md)
    png_dir = recipes_dir / name
    has_local_png = png_dir.is_dir() and any(png_dir.glob('*.png'))
    img_src = 'local' if has_local_png else ('url' if meta.get('imagen_url') else '-')

    tipo = map_tipo_comida(meta.get('categoria', []))
    n_ing = len(meta.get('ingredientes', []))

    print(f'{i:3}. {name[:48]:50} {tipo:10} {n_ing:<4} {img_src:10} {"si" if md else "no":4}')
