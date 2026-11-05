# (\__/)
# (˶ᵔ ᵕ ᵔ˶)  < "Lunar Territory."
# / >[CRIMSON+]>   "Hands off, unless you're Miharin."

[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$LunarRemainingArgs
)

$LunarScriptDir = $PSScriptRoot
if (-not $LunarScriptDir) {
    $LunarScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}

$Host.UI.RawUI.WindowTitle = "🌙 Lunar IT Documentation Portal • Si-Pangaduan"

Write-Host "======================================================" -ForegroundColor Magenta
Write-Host "         🌙 LUNAR IT DOCUMENTATION PORTAL             " -ForegroundColor Red
Write-Host "======================================================" -ForegroundColor Magenta
Write-Host "[+] Menjalankan portal antarmuka dengan fitur Live-Reload..." -ForegroundColor Cyan
Write-Host "[*] Perubahan pada berkas UI & skrip akan otomatis direfresh." -ForegroundColor Gray
Write-Host "[*] Tekan Ctrl+C di terminal ini untuk berhenti." -ForegroundColor DarkGray
Write-Host ""

# Verifikasi dependensi Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Node.js tidak ditemukan di PATH sistem!" -ForegroundColor Red
    Write-Host "    Silakan install Node.js (https://nodejs.org) terlebih dahulu." -ForegroundColor Yellow
    Read-Host "Tekan Enter untuk keluar..."
    exit 1
}

$LunarTargetScript = Join-Path $LunarScriptDir "documentation_it.mjs"

if (-not (Test-Path $LunarTargetScript)) {
    Write-Host "[!] Berkas skrip tidak ditemukan: $LunarTargetScript" -ForegroundColor Red
    Read-Host "Tekan Enter untuk keluar..."
    exit 1
}

Set-Location $LunarScriptDir
& node --watch $LunarTargetScript @LunarRemainingArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[!] Portal berhenti dengan kode status $LASTEXITCODE." -ForegroundColor Yellow
}
