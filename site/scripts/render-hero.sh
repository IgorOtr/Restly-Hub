#!/bin/sh
# Gera a ilustração do topo (public/art/hero-1x.webp e hero-2x.webp) a partir de art/hero.html.
# Requer o site rodando em desenvolvimento (porta 5175), Google Chrome e Python com Pillow.
set -e
cd "$(dirname "$0")/.."
URL=${URL:-http://localhost:5175/art/hero.html}
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
TMP=$(mktemp -d)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --default-background-color=00000000 --window-size=720,560 --virtual-time-budget=6000 \
  --screenshot="$TMP/hero.png" "$URL" >/dev/null 2>&1
python3 - "$TMP/hero.png" <<'PY'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
im.save('public/art/hero-2x.webp', 'WEBP', quality=86, method=6)
im.resize((im.width // 2, im.height // 2), Image.LANCZOS).save('public/art/hero-1x.webp', 'WEBP', quality=86, method=6)
print('ok', im.size)
PY
rm -rf "$TMP"
ls -l public/art
