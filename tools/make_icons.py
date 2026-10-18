"""Render the extension icon at every size the browsers and stores use."""

from pathlib import Path

from PIL import Image, ImageDraw

CRIMSON = (153, 0, 0, 255)
WHITE = (255, 255, 255, 255)
SIZES = (16, 32, 48, 128)
CANVAS = 1024
OUT = Path(__file__).resolve().parent.parent / "extension" / "icons"


def render(tile: tuple[int, ...] = CRIMSON, bars: tuple[int, ...] = WHITE) -> Image.Image:
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, CANVAS - 1, CANVAS - 1), radius=CANVAS // 5, fill=tile)
    bar_width, gap, floor = 180, 70, 800
    heights = (380, 600, 260)
    left = (CANVAS - (len(heights) * bar_width + (len(heights) - 1) * gap)) // 2
    for i, height in enumerate(heights):
        x = left + i * (bar_width + gap)
        draw.rounded_rectangle((x, floor - height, x + bar_width, floor), radius=40, fill=bars)
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    master = render()
    for size in SIZES:
        master.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)
    print(f"Wrote {len(SIZES)} icons to {OUT}")


if __name__ == "__main__":
    main()
