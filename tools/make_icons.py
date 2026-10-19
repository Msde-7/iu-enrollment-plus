"""Render the extension icon at every size the browsers and stores use."""

from pathlib import Path

from PIL import Image, ImageDraw

CRIMSON = (153, 0, 0, 255)
WHITE = (255, 255, 255, 255)
SIZES = (16, 32, 48, 128)
CANVAS = 1024
HEIGHTS = (0.58, 0.92, 0.42)
OUT = Path(__file__).resolve().parent.parent / "extension" / "icons"


def bars(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: tuple[int, ...], grow: int = 0) -> None:
    left, top, right, bottom = box
    gap = (right - left) // 14
    width = (right - left - gap * (len(HEIGHTS) - 1)) // len(HEIGHTS)
    for i, share in enumerate(HEIGHTS):
        x = left + i * (width + gap)
        y = bottom - round((bottom - top) * share)
        outline = (x - grow, y - grow, x + width + grow, bottom + grow)
        draw.rounded_rectangle(outline, radius=width // 4 + grow, fill=fill)


def render_mark() -> Image.Image:
    """Crimson grade-distribution bars on a transparent background, outlined in white for dark toolbars."""
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    box = (50, 44, CANVAS - 50, CANVAS - 44)
    bars(draw, box, WHITE, grow=40)
    bars(draw, box, CRIMSON)
    return image


def render(tile: tuple[int, ...] = CRIMSON, fill: tuple[int, ...] = WHITE) -> Image.Image:
    """The mark on a rounded tile, used for the store promo graphic."""
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, CANVAS - 1, CANVAS - 1), radius=CANVAS // 5, fill=tile)
    bars(draw, (230, 220, CANVAS - 230, CANVAS - 220), fill)
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    mark = render_mark()
    for size in SIZES:
        mark.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)
    print(f"Wrote {len(SIZES)} icons to {OUT}")


if __name__ == "__main__":
    main()
