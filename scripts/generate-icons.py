#!/usr/bin/env python3
"""
Genera los PNG del icono PWA a partir de un diseño limpio.
Diseño: plato con cubierto a la izquierda (no dos), enfoque minimal
para que se lea bien a 48px en el escritorio Android.

Corre siempre que cambies el diseño.
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), 'assets')

# Paleta
BG = (45, 106, 79)         # #2D6A4F  (verde app)
PLATE = (255, 255, 255)
PLATE_INNER = (248, 249, 250)
PLATE_RIM = (225, 232, 226)
ACCENT = (149, 213, 178)   # verde claro
ACCENT_2 = (64, 145, 108)


def draw(draw_obj, cx, cy, plate_r, accent_top, accent_bottom):
    """Dibuja comida colorida dentro del plato."""
    # Proteína (curvada, abajo-izquierda)
    draw_obj.ellipse(
        [cx - plate_r * 0.55, cy + plate_r * 0.05,
         cx - plate_r * 0.05, cy + plate_r * 0.55],
        fill=accent_top
    )
    # Vegetal (círculo verde claro arriba)
    draw_obj.ellipse(
        [cx + plate_r * 0.05, cy - plate_r * 0.45,
         cx + plate_r * 0.55, cy - plate_r * 0.05],
        fill=ACCENT
    )
    # Punto amarillo (grano / cereal)
    draw_obj.ellipse(
        [cx - plate_r * 0.15, cy - plate_r * 0.05,
         cx + plate_r * 0.20, cy + plate_r * 0.30],
        fill=accent_bottom
    )


def render(size, maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # Adaptive icon: ocupa toda la imagen, contenido en círculo central
        d.rectangle([0, 0, size, size], fill=BG)
        radius = int(size * 0.20)
        plate_r = int(size * 0.30)
    else:
        # Icono normal con esquinas redondeadas
        radius = int(size * 0.20)
        plate_r = int(size * 0.30)
        d.rounded_rectangle([0, 0, size, size], radius=radius, fill=BG)

    cx, cy = size // 2, size // 2

    # Plato (aro exterior + interior)
    d.ellipse([cx - plate_r, cy - plate_r, cx + plate_r, cy + plate_r], fill=PLATE)
    rim = int(plate_r * 0.92)
    d.ellipse([cx - rim, cy - rim, cx + rim, cy + rim], fill=PLATE_RIM)
    inner = int(plate_r * 0.78)
    d.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill=PLATE_INNER)

    # Sombra suave del plato (debajo, fina)
    shadow_y = cy + plate_r + int(plate_r * 0.04)
    shadow_h = int(plate_r * 0.12)
    d.ellipse(
        [cx - plate_r * 0.85, shadow_y - shadow_h,
         cx + plate_r * 0.85, shadow_y + shadow_h],
        fill=(0, 0, 0, 45)
    )

    # Comida
    # Colores cálidos para proteínas / carbos / verdes
    draw(d, cx, cy, inner,
         accent_top=(220, 120, 80),     # naranja-marrón (pollo/carne)
         accent_bottom=(240, 195, 110)) # amarillo (arroz/granos)

    return img


def main():
    targets = {
        'icon-192.png': (192, False),
        'icon-512.png': (512, False),
        'icon-maskable-512.png': (512, True),
        'apple-touch-icon.png': (180, False),
    }

    for name, (size, mask) in targets.items():
        img = render(size, maskable=mask)
        img.save(os.path.join(ASSETS, name), 'PNG', optimize=True)
        print(f'  ✓ {name}  ({size}×{size}{" maskable" if mask else ""})')

    # Favicons chicos
    for size in (32, 16):
        img = render(size, False)
        img.save(os.path.join(ASSETS, f'favicon-{size}.png'), 'PNG', optimize=True)
    print('  ✓ favicon-16.png / favicon-32.png')

    print('\nIconos regenerados en', ASSETS)


if __name__ == '__main__':
    main()
