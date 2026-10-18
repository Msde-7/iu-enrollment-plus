"""Compose the Chrome Web Store and Edge Add-ons screenshots and promo tile from the README images."""

from pathlib import Path

from make_icons import render
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "docs" / "images"
OUT = ROOT / "store"
BACKGROUND = (246, 247, 249)
CRIMSON = (153, 0, 0)
INK = (31, 35, 40)
MUTED = (101, 109, 118)
WHITE = (255, 255, 255)


def font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype("segoeuib.ttf" if bold else "segoeui.ttf", size)


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = min(width / image.width, height / image.height)
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)


def framed(image: Image.Image) -> Image.Image:
    frame = Image.new("RGB", (image.width + 2, image.height + 2), (225, 228, 232))
    frame.paste(image, (1, 1))
    return frame


def screenshot(source: str, title: str, subtitle: str, out: str) -> None:
    canvas = Image.new("RGB", (1280, 800), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text((72, 56), title, font=font(44, bold=True), fill=INK)
    draw.text((72, 118), subtitle, font=font(24), fill=MUTED)
    shot = framed(fit(Image.open(IMAGES / source).convert("RGB"), 1136, 560))
    canvas.paste(shot, ((1280 - shot.width) // 2, 190))
    canvas.save(OUT / out, optimize=True)


def card_screenshot(out: str) -> None:
    canvas = Image.new("RGB", (1280, 800), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    shot = framed(fit(Image.open(IMAGES / "grade-card.png").convert("RGB"), 560, 700))
    canvas.paste(shot, (640, (800 - shot.height) // 2))
    draw.text((72, 200), "Hover for the", font=font(48, bold=True), fill=INK)
    draw.text((72, 262), "full picture", font=font(48, bold=True), fill=CRIMSON)
    points = ("Grade histogram from A+ to F", "Compared with its department", "Every instructor and their rating")
    for i, point in enumerate(points):
        draw.text((72, 360 + i * 52), f"•  {point}", font=font(26), fill=MUTED)
    canvas.save(OUT / out, optimize=True)


def promo_tile(out: str) -> None:
    canvas = Image.new("RGB", (440, 280), CRIMSON)
    draw = ImageDraw.Draw(canvas)
    icon = render(tile=(*WHITE, 255), bars=(*CRIMSON, 255)).resize((88, 88), Image.Resampling.LANCZOS)
    canvas.paste(icon, (40, 56), icon)
    draw.text((40, 168), "IU Stellic Plus", font=font(36, bold=True), fill=WHITE)
    draw.text((40, 216), "Grades and ratings in Stellic", font=font(20), fill=(255, 220, 220))
    canvas.save(OUT / out, optimize=True)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    screenshot(
        "course-search.png",
        "A GPA badge beside every course",
        "Green grades high, red grades low, and the arrow compares it to its department",
        "screenshot-1.png",
    )
    card_screenshot("screenshot-2.png")
    promo_tile("promo-small.png")
    print(f"Wrote store assets to {OUT}")


if __name__ == "__main__":
    main()
