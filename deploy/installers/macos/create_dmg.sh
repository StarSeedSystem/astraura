#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit AI Engine // macOS DMG Image Creator
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DMG_NAME="Astraura-1.58b-macOS-Universal.dmg"
DMG_TMP="/tmp/Astraura_DMG_Build"
OUTPUT_DIR="$DIR/deploy/dist"

mkdir -p "$OUTPUT_DIR"
rm -rf "$DMG_TMP"
mkdir -p "$DMG_TMP"

echo "📦 Creando contenido para $DMG_NAME..."

# Crear .app en el temporal
mkdir -p "$DMG_TMP/Astraura.app/Contents/MacOS"
mkdir -p "$DMG_TMP/Astraura.app/Contents/Resources"
cp "$DIR/deploy/installers/macos/Info.plist" "$DMG_TMP/Astraura.app/Contents/Info.plist"

cat << 'EOF' > "$DMG_TMP/Astraura.app/Contents/MacOS/Astraura"
#!/bin/bash
if [ ! -d "$HOME/.astraura" ]; then
    bash -c "$(curl -fsSL https://raw.githubusercontent.com/StarSeedSystem/astraura/main/deploy/vercel-app/install.sh)"
else
    cd "$HOME/.astraura"
    source .venv/bin/activate
    (sleep 1.5 && open "http://127.0.0.1:8000") &
    python3 backend/run_backend.py
fi
EOF
chmod +x "$DMG_TMP/Astraura.app/Contents/MacOS/Astraura"

# Enlace a /Applications
ln -s /Applications "$DMG_TMP/Applications"

# Crear DMG con hdiutil nativo de macOS
echo "💿 Creando imagen DMG con hdiutil..."
rm -f "$OUTPUT_DIR/$DMG_NAME"
hdiutil create -volname "Astraura 1.58-Bit Installer" -srcfolder "$DMG_TMP" -ov -format UDZO "$OUTPUT_DIR/$DMG_NAME"

rm -rf "$DMG_TMP"
echo "✅ Imagen DMG generada con éxito en: $OUTPUT_DIR/$DMG_NAME"
