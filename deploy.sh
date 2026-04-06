#!/bin/bash
# Deploy script for Ubuntu 22.04 VPS (Hetzner / DigitalOcean / Vultr)
# Run as root: bash deploy.sh

set -e

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== Installing PM2 (process manager) ==="
npm install -g pm2

echo "=== Cloning project ==="
cd /opt
git clone https://github.com/VOTRE_REPO/tothemoon.git || true
cd tothemoon
npm install

echo "=== Starting bot with PM2 ==="
pm2 start index.js --name "tothemoon" --max-memory-restart 512M
pm2 save
pm2 startup | tail -n 1 | bash  # Auto-restart on server reboot

echo ""
echo "=== Done! ==="
echo "Commands:"
echo "  pm2 logs tothemoon       — voir les logs en temps réel"
echo "  pm2 restart tothemoon    — redémarrer"
echo "  pm2 stop tothemoon       — arrêter"
echo "  pm2 monit                — dashboard CPU/RAM"
