"""Zip the extension folder into dist/ for upload to the Chrome Web Store and Edge Add-ons."""

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTENSION = ROOT / "extension"
DIST = ROOT / "dist"


def main() -> None:
    version = json.loads((EXTENSION / "manifest.json").read_text(encoding="utf-8"))["version"]
    DIST.mkdir(exist_ok=True)
    archive = DIST / f"iu-enrollment-plus-{version}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(EXTENSION.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(EXTENSION).as_posix())
    print(f"Wrote {archive.relative_to(ROOT)} ({archive.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
