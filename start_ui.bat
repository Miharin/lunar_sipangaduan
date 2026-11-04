@echo off
REM (\__/)
REM (˶ᵔ ᵕ ᵔ˶)  < "Lunar Territory."
REM / >[CRIMSON+]>   "Hands off, unless you're Miharin."

echo ======================================================
echo          🌙 LUNAR IT DOCUMENTATION PORTAL
echo ======================================================
echo Menjalankan antarmuka portal lokal...

set DIR=%~dp0
node "%DIR%documentation_it.mjs"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Terjadi kesalahan. Pastikan Node.js dan playwright-core sudah terinstall.
    pause
)
