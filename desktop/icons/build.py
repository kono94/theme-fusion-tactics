#!/usr/bin/env python3
"""Regenerate native icons on macOS after exporting app-icon.svg to a 1024px app-icon.png."""
from pathlib import Path
import struct
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent


def main():
    with tempfile.TemporaryDirectory(prefix='tft-icons-') as temporary:
        iconset = Path(temporary) / 'app.iconset'
        iconset.mkdir()
        for size in (16, 32, 128, 256, 512):
            for scale in (1, 2):
                name = f'icon_{size}x{size}' + ('@2x' if scale == 2 else '') + '.png'
                subprocess.run(['sips', '-z', str(size * scale), str(size * scale),
                                str(ROOT / 'app-icon.png'), '--out', str(iconset / name)],
                               check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['iconutil', '--convert', 'icns', str(iconset),
                        '--output', str(ROOT / 'app-icon.icns')], check=True)
        sizes = (16, 32, 48, 64, 128, 256)
        images = []
        for size in sizes:
            output = Path(temporary) / f'{size}.png'
            subprocess.run(['sips', '-z', str(size), str(size), str(ROOT / 'app-icon.png'),
                            '--out', str(output)], check=True, stdout=subprocess.DEVNULL)
            images.append(output.read_bytes())
        offset = 6 + 16 * len(images)
        entries = []
        for size, image in zip(sizes, images):
            entries.append(struct.pack('<BBBBHHII', size % 256, size % 256, 0, 0, 1, 32, len(image), offset))
            offset += len(image)
        (ROOT / 'app-icon.ico').write_bytes(struct.pack('<HHH', 0, 1, len(images))
                                          + b''.join(entries) + b''.join(images))


if __name__ == '__main__':
    main()
