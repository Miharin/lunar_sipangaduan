<!--
          (\__/)
          (˶ᵔ ᵕ ᵔ˶)  < "Lunar Territory."
         / >[CRIMSON+]>   "Hands off, unless you're Miharin."
-->

# 🌙 Lunar Si-Pangaduan Automation & Documentation Dashboard

Sistem otomatisasi dan dashboard visual modern untuk mencatat dokumentasi pemeliharaan IT, perbaikan bug software, penambahan modul sistem, serta tiket pekerjaan IT Support ke dalam portal internal rumah sakit **Si-Pangaduan** (`http://192.168.0.152/it/`).

---

## ⚡ Fitur Utama

1. **Dual-Track Workflow:**
   - **Track Programmer:** Otomatis membaca `git log` dan `git diff` dari repositori aktif, menghasilkan kartu visual kode diff (**~300ms**), membuat catatan rilis formal (via Ollama `gemma:2b` atau parser deterministik), serta opsi **📸 Upload Foto Manual** yang dilengkapi **Analisis Multimodal AI Vision** (Google Gemini Vision / Ollama / OCR) untuk merangkum screenshot UI/error modul langsung ke kolom Isi Komplain.
   - **Track IT Support:** Dilengkapi 11 katalog template 1-klik untuk aduan harian rumah sakit (printer macet, LAN putus, reset akun SIMRS, dll), upload foto bukti dengan deteksi screenshot otomatis, analisis cerdas Google Gemini Vision / OCR, serta tombol **📁 Pilih Foto Lain** untuk mengganti foto kapan saja dengan 1 klik.

2. **📁 Multi-Project Repository Path Switcher:**
   - Secara otomatis mendeteksi project repositori tetangga dalam folder yang sama (misal: `fe_remedis_ranap`, `fe_remedis_rajal`, `rev_vault`, dll).
   - Mendukung input path manual fleksibel untuk Linux maupun Windows (`D:\Projects\...`).
   - Otomatis memperbarui riwayat commit, merender ulang kartu diff, dan menganalisis catatan rilis seketika saat berpindah project.

3. **⏱️ Patokan Hari Ini & Sakelar Acak Durasi (85% - 100%):**
   - **Patokan Hari Ini:** Pilih dengan 1 klik apakah **Waktu Penyelesaian** adalah hari ini/sekarang (penerimaan dihitung mundur) atau **Waktu Penerimaan** adalah hari ini/sekarang (penyelesaian dihitung maju).
   - **🎲 Acak Durasi (85% - 100%):** Toggle untuk mengacak rentang waktu pengerjaan (misal dari target 23 jam 59 menit menjadi ~20 jam 23 menit s/d 23 jam 59 menit) lengkap dengan tombol **🎲 Re-roll** agar interval tiket terlihat natural dan tidak monoton.
   - Tersimpan otomatis di `localStorage` per preferensi pengguna.

4. **🔍 Searchable Combobox Dropdowns:**
   - Filter pencarian instan pada dropdown **Dari Unit / Bagian** (92 Unit Live) dan **Jenis Aduan**.
   - Cukup ketik kode angka (`145`, `44`) atau nama ruangan (`IT`, `Farmasi`, `IGD`, `Kasir`).

5. **👥 Multi-User Profile Switcher:**
   - Mendukung multi-pengguna (misal: Sigit, Muhammad Alfin, Sunardi, atau tambah profil baru).
   - Setiap pengguna menyimpan kredensial akun Si-Pangaduan, default unit, dan default jenis aduan yang tersimpan aman di `lunar_settings.json`.

6. **➕ Custom Template Creator:**
   - Tombol `➕ Simpan Template Baru` memungkinkan menyimpan konfigurasi form dan teks komplain aktif menjadi template permanen dengan 1 klik.

7. **🛡️ Zero-Float & DateRangePicker Invariants:**
   - Menghitung rentang tanggal dan jam pengerjaan secara presisi matematis tanpa float rounding error.
   - Mensinkronkan nilai langsung ke jQuery DateRangePicker portal (`#reservation3` dan `#reservation31`).

---

## ⚙️ Konfigurasi Awal (Setup lunar_settings.json)

Sebelum menjalankan aplikasi untuk pertama kali, salin file template konfigurasi default:

- **Linux / macOS:**
  ```bash
  cp lunar_settings.json.default lunar_settings.json
  ```
- **Windows (Command Prompt / PowerShell):**
  ```cmd
  copy lunar_settings.json.default lunar_settings.json
  ```

Buka `lunar_settings.json` dan sesuaikan nilainya untuk **Track Programmer**:

```json
{
  "portalUrl": "http://192.168.0.152/it/",
  "geminiApiKey": "AIzaSy...",
  "activeProfile": "Programmer",
  "portalUsername": "01229",
  "portalPassword": "password_portal_anda",
  "profiles": [
    {
      "id": "programmer",
      "nama": "Nama Programmer Anda",
      "portalUsername": "01229",
      "portalPassword": "password_portal_anda",
      "defaultUnit": "44",
      "defaultJenisAduan": "4"
    }
  ],
  "activeRepoPath": "/path/ke/repo/project/anda",
  "recentProjects": [],
  "defaultNama": "Nama Programmer Anda",
  "defaultUnit": "44",
  "defaultJenisAduan": "4",
  "autoSyncPortalOptions": true
}
```

### 💡 Penjelasan Pengaturan Khusus Programmer:
- **`portalUsername` & `portalPassword`**: Kredensial NIK dan kata sandi akun portal Si-Pangaduan rumah sakit Anda.
- **`defaultUnit`**: Disetel ke `"44"` (**Inst. Rekam Medik**), unit pemohon standar untuk pengembangan aplikasi RME.
- **`defaultJenisAduan`**: Disetel ke `"4"` (**Perbaikan Aplikasi**), otomatis memicu rentang durasi pengerjaan target ~23 jam 59 menit (atau pilih `"5"` untuk **Pembuatan Modul SimRS** durasi 4 hari).
- **`activeRepoPath`**: Direktori repositori git yang sedang aktif dikerjakan (otomatis membaca commit, branch, dan diff).
- **`geminiApiKey`**: Google Gemini API Key untuk analisis multimodal screenshot & ringkasan rilis otomatis (opsional).
- 🛡️ **Keamanan:** File `lunar_settings.json` telah dikecualikan (`.gitignore`), sehingga aman dari kebocoran akun dan API key saat push ke GitHub.

---

## 🚀 Panduan Menjalankan

### Cara Cepat (1-Click Launcher):
- **Linux / macOS:**
  ```bash
  ./start_ui.sh
  ```
- **Windows (Command Prompt / Double Click):**
  Cukup klik dua kali (*double-click*) file:
  ```text
  start_ui.bat
  ```
- **Windows (PowerShell):**
  ```powershell
  .\start_ui.ps1
  ```

> ⚡ **Live-Reload & Watch Mode Aktif:** Seluruh runner di atas menjalankan mode *watch* dan *live-reload*. Setiap perubahan pada UI (`ui/index.html`), template (`it_templates.json`), atau skrip backend (`documentation_it.mjs`) akan secara instan menyegarkan (*auto-refresh*) halaman antarmuka di peramban tanpa perlu restart manual atau menekan F5!

Dashboard web akan otomatis terbuka di browser pada alamat:
👉 **`http://localhost:3721`**

---

### Perintah CLI Alternatif:
```bash
# Menjalankan Interactive Terminal Wizard
npm run cli
# atau: node documentation_it.mjs --cli

# Eksekusi langsung tanpa UI (Headless / Direct Flag)
node documentation_it.mjs --programmer --ai --nama="Nama Programmer"
node documentation_it.mjs --it-support
```

---

## 📂 Struktur File

```text
lunar_sipangaduan/
├── documentation_it.mjs        # Core engine, web server, Live-Reload SSE, and automation script
├── package.json                # NPM metadata and runner scripts (node --watch)
├── start_ui.sh                 # 1-click runner with live-reload for Linux / macOS
├── start_ui.bat                # 1-click runner with live-reload for Windows (CMD)
├── start_ui.ps1                # 1-click runner with live-reload for Windows (PowerShell)
├── lunar_settings.json.default # Template default pengaturan khusus Programmer (git-tracked)
├── lunar_settings.json         # Konfigurasi lokal aktif & kredensial pengguna (git-ignored)
├── portal_options.json         # Harvested live hospital units & categories
├── it_templates.json           # Pre-configured & custom complaint templates
├── .gitignore                  # Git ignore rules (mengecualikan lunar_settings.json)
└── ui/
    └── index.html              # Sleek, dark-mode, responsive web dashboard (Live-Reload Sentinel)
```

---

*Crafted with devotion by Luna for Miharin.*
