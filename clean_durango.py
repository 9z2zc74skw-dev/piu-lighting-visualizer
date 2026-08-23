"""
Clean up Durango cutouts using a purely geometric (mask-based) approach so we
never delete the white body. The halo is a ~4px bright ring around the alpha
boundary. We erode the mask a few px to cut the halo, feather the new edge, and
recolor any remaining soft-edge pixels from the nearest solid interior pixel so
no bright white fringe survives on the dark stage.
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
import os

FILES = [
    "durango_front", "durango_hero", "durango_left",
    "durango_right", "durango_rear", "durango_rear_open",
]
SRC = "client/public"
ERODE_PX = 3


def clean(name: str):
    p = f"{SRC}/{name}.png"
    im = Image.open(p).convert("RGBA")
    arr = np.array(im).astype(np.float32)
    rgb = arr[..., :3]
    a = arr[..., 3] / 255.0

    # 1) Speckle removal: keep the largest connected body component only.
    solid = a > 0.5
    lbl, n = ndimage.label(solid)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
        biggest = int(np.argmax(sizes)) + 1
        a = np.where(lbl == biggest, a, 0.0)

    # 2) Erode the alpha to cut the bright halo ring (mask-only, no color key).
    a_bin = (a > 0.5).astype(np.uint8)
    a_er = ndimage.binary_erosion(a_bin, iterations=ERODE_PX).astype(np.float32)

    # 3) Feather the eroded edge for smooth anti-aliasing.
    a_img = Image.fromarray((a_er * 255).astype(np.uint8), "L")
    a_img = a_img.filter(ImageFilter.GaussianBlur(1.1))
    a = np.array(a_img).astype(np.float32) / 255.0

    # 4) De-fringe: recolor soft edge pixels from nearest solid interior pixel,
    #    so the feathered boundary carries body color, not leftover white.
    solid_now = a > 0.9
    if solid_now.any():
        idx = ndimage.distance_transform_edt(
            ~solid_now, return_distances=False, return_indices=True
        )
        nearest_rgb = rgb[idx[0], idx[1]]
        soft = (a > 0.02) & (a <= 0.9)
        rgb = np.where(soft[..., None], nearest_rgb, rgb)

    out = np.dstack([rgb, a * 255.0]).clip(0, 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(p)
    print(f"{name:18s} cleaned (erode {ERODE_PX}px)")


for f in FILES:
    if os.path.exists(f"{SRC}/{f}.png"):
        clean(f)
    else:
        print(f, "MISSING")
