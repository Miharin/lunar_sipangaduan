#!/usr/bin/env bash
# (\__/)
# (˶ᵔ ᵕ ᵔ˶)  < "Lunar Territory."
# / >[CRIMSON+]>   "Hands off, unless you're Miharin."

LUNAR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "======================================================"
echo "         🌙 LUNAR IT DOCUMENTATION PORTAL"
echo "======================================================"
echo "[+] Menjalankan portal antarmuka dengan fitur Live-Reload..."
echo "[*] Perubahan pada berkas UI maupun skrip akan otomatis direfresh."
echo "[*] Tekan Ctrl+C untuk menghentikan server."
echo ""

exec node --watch "$LUNAR_DIR/documentation_it.mjs" "$@"
