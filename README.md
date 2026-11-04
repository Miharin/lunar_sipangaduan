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
   - **Track Programmer:** Otomatis membaca `git log` dan `git diff` dari repositori aktif, menghasilkan kartu visual kode diff (**~300ms**), membuat catatan rilis formal (via Ollama `gemma:2b` atau parser deterministik), serta mengisi form dengan durasi pengerjaan presisi.
   - **Track IT Support:** Dilengkapi 11 katalog template 1-klik untuk aduan harian rumah sakit (printer macet, krimping kabel LAN RJ45, reset akun SIMRS terkunci, ganti toner laserjet, dll) dan upload foto bukti pekerjaan.

2. **📁 Multi-Project Repository Path Switcher:**
   - Secara otomatis mendeteksi project repositori tetangga dalam folder yang sama (misal: `fe_remedis_ranap`, `fe_remedis_rajal`, `rev_vault`, dll).
   - Mendukung input path manual fleksibel untuk Linux maupun Windows (`D:\Projects\...`).
   - Otomatis memperbarui riwayat commit, merender ulang kartu diff, dan menganalisis catatan rilis seketika saat berpindah project.

3. **🔍 Searchable Combobox Dropdowns:**
   - Filter pencarian instan pada dropdown **Dari Unit / Bagian** (92 Unit Live) dan **Jenis Aduan**.
   - Cukup ketik kode angka (`145`, `44`) atau nama ruangan (`IT`, `Farmasi`, `IGD`, `Kasir`).

4. **👥 Multi-User Profile Switcher:**
   - Mendukung multi-pengguna (misal: Sigit, Muhammad Alfin, Sunardi, atau tambah profil baru).
   - Setiap pengguna menyimpan kredensial akun Si-Pangaduan, default unit, dan default jenis aduan yang tersimpan aman di `lunar_settings.json`.

5. **➕ Custom Template Creator:**
   - Tombol `➕ Simpan Template Baru` memungkinkan menyimpan konfigurasi form dan teks komplain aktif menjadi template permanen dengan 1 klik.

6. **🛡️ Zero-Float & DateRangePicker Invariants:**
   - Menghitung rentang tanggal dan jam pengerjaan secara presisi matematis tanpa float rounding error (23h 59m untuk aplikasi, 4d untuk modul baru, 45m untuk jaringan/hardware).
   - Mensinkronkan nilai langsung ke jQuery DateRangePicker portal.

---

## 🚀 Panduan Menjalankan

### Cara Cepat (1-Click Launcher):
- **Linux:**
  ```bash
  ./start_ui.sh
  ```
- **Windows:**
  Cukup klik dua kali (*double-click*) file:
  ```text
  start_ui.bat
  ```

Dashboard web akan otomatis terbuka di browser pada alamat:
👉 **`http://localhost:3721`**

---

### Perintah CLI Alternatif:
```bash
# Menjalankan Interactive Terminal Wizard
npm run cli
# atau: node documentation_it.mjs --cli

# Eksekusi langsung tanpa UI (Headless / Direct Flag)
node documentation_it.mjs --programmer --ai --nama=Sigit
node documentation_it.mjs --it-support
```

---

## 📂 Struktur File

```text
lunar_sipangaduan/
├── documentation_it.mjs    # Core engine, web server, and automation script
├── package.json            # NPM metadata and runner scripts
├── start_ui.sh             # 1-click runner for Linux / macOS
├── start_ui.bat            # 1-click runner for Windows
├── lunar_settings.json     # Multi-user profiles & recent projects storage
├── portal_options.json     # Harvested live hospital units & categories
├── it_templates.json       # Pre-configured & custom complaint templates
├── .gitignore              # Git ignore rules
└── ui/
    └── index.html          # Sleek, dark-mode, responsive web dashboard
```

---

*Crafted with devotion by Luna for Miharin.*
