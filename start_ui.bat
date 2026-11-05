@echo off
REM (\__/)
REM (˶ᵔ ᵕ ᵔ˶)  < "Lunar Territory."
REM / >[CRIMSON+]>   "Hands off, unless you're Miharin."

title 🌙 Lunar IT Documentation Portal - Si-Pangaduan

echo ======================================================
echo          🌙 LUNAR IT DOCUMENTATION PORTAL
echo ======================================================
echo [+] Menjalankan portal antarmuka dengan fitur Live-Reload...
echo [*] Perubahan pada berkas UI maupun skrip akan otomatis direfresh.
echo [*] Tekan Ctrl+C untuk menghentikan server.
echo.

set LUNAR_DIR=%~dp0
node --watch "%LUNAR_DIR%documentation_it.mjs" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Terjadi kesalahan. Pastikan Node.js sudah terinstall dengan benar.
    pause
)
