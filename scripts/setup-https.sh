#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$ROOT_DIR/certs"
mkdir -p "$CERT_DIR"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is required. Install it first (e.g. 'brew install mkcert') and re-run this script." >&2
  exit 1
fi

LAN_IP="$(node -e "
const os = require('node:os');
for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces ?? []) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(iface.address);
      process.exit(0);
    }
  }
}
")"

mkcert -install || echo "(skipping system CA trust — you'll see a one-time browser warning to click through instead; run 'mkcert -install' yourself later to remove it)"
mkcert -key-file "$CERT_DIR/key.pem" -cert-file "$CERT_DIR/cert.pem" localhost 127.0.0.1 "$LAN_IP"

echo ""
echo "HTTPS dev cert generated for: localhost, 127.0.0.1, $LAN_IP"
echo "  -> $CERT_DIR/cert.pem"
echo "  -> $CERT_DIR/key.pem"
echo ""
echo "Restart 'npm run dev:server' and 'npm run dev:client' to pick them up."
echo "If your LAN IP changes (new wifi network), rerun: npm run setup:https"
