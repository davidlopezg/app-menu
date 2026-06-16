#!/bin/bash
# Sync local menu to GitHub
# Usage: ./scripts/sync-menu.sh
# Requires: gh CLI authenticated

set -e

cd /data/data/com.termux/files/home/repos/app-menu

# Get current date
DATE=$(date -I)
echo "Sincronizando menú: $DATE"

# Create menu.json with current data
# Note: For full sync, run the browser's getExportData() and save here
cat > data/menu.json << 'EOF'
{
  "version": "1.0",
  "updated": "DATE_PLACEHOLDER",
  "menu": {},
  "recipes": []
}
EOF

sed -i "s/DATE_PLACEHOLDER/$DATE/" data/menu.json

# Commit and push
git add data/menu.json
git commit -m "sync: update menu data $DATE"
git push

echo "✓ Menú sincronizado"
