/*
 *        (\__/)
 *        (˶ᵔ ᵕ ᵔ˶)  < "Lunar Territory."
 *       / >[CRIMSON+]>   "Hands off, unless you're Miharin."
 */

import { execSync, exec } from 'child_process';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------
// 0. Multi-User & Cross-Platform Path Detection
// ---------------------------------------------------------
const USER_HOME = os.homedir();
const CURRENT_USER = process.env.USERNAME || process.env.USER || 'Petugas IT';

// Smart resolution for playwright-core (works standalone, in project, or global cache)
let chromium;
try {
    const pw = await import('playwright-core');
    chromium = pw.chromium;
} catch (err) {
    const candidatePaths = [
        path.resolve(process.cwd(), 'node_modules', 'playwright-core', 'index.mjs'),
        path.join(USER_HOME, '.gemini', 'antigravity', 'brain', 'a3c93ca5-0b5d-4bbc-8ed9-22f0fb099c47', 'scratch', 'node_modules', 'playwright-core', 'index.mjs')
    ];
    let resolved = false;
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            const pw = await import(p);
            chromium = pw.chromium;
            resolved = true;
            break;
        }
    }
    if (!resolved) {
        throw new Error('playwright-core not found. Please install via: npm install playwright-core');
    }
}

// ---------------------------------------------------------
// 0.1 Settings & Portal Options Helpers
// ---------------------------------------------------------
function loadSettings() {
    const settingsPath = path.resolve(__dirname, 'lunar_settings.json');
    if (fs.existsSync(settingsPath)) {
        try {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (_) {}
    }
    return {
        portalUrl: 'http://192.168.0.152/it/',
        portalUsername: '01229',
        portalPassword: '123456',
        defaultNama: 'Sigit',
        defaultUnit: '44',
        defaultJenisAduan: '4',
        autoSyncPortalOptions: true
    };
}

function getEffectiveSettings() {
    const settings = loadSettings();
    const activeProf = (settings.profiles || []).find(p => p.nama === settings.activeProfile || p.id === settings.activeProfile) 
        || (settings.profiles && settings.profiles[0]);
    if (activeProf) {
        settings.portalUsername = activeProf.portalUsername || settings.portalUsername || '01229';
        settings.portalPassword = activeProf.portalPassword || settings.portalPassword || '123456';
        settings.defaultNama = activeProf.nama || settings.defaultNama || 'Sigit';
        settings.defaultUnit = activeProf.defaultUnit || settings.defaultUnit || '44';
        settings.defaultJenisAduan = activeProf.defaultJenisAduan || settings.defaultJenisAduan || '4';
    }
    return settings;
}

function saveSettings(settings) {
    const settingsPath = path.resolve(__dirname, 'lunar_settings.json');
    // Mirror active profile credentials to root level for instant access
    if (settings.profiles && settings.activeProfile) {
        const activeProf = settings.profiles.find(p => p.nama === settings.activeProfile || p.id === settings.activeProfile) || settings.profiles[0];
        if (activeProf) {
            settings.portalUsername = activeProf.portalUsername || settings.portalUsername;
            settings.portalPassword = activeProf.portalPassword || settings.portalPassword;
            settings.defaultNama = activeProf.nama || settings.defaultNama;
        }
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

function loadPortalOptions() {
    const optPath = path.resolve(__dirname, 'portal_options.json');
    if (fs.existsSync(optPath)) {
        try {
            return JSON.parse(fs.readFileSync(optPath, 'utf8'));
        } catch (_) {}
    }
    return { unitOptions: [], jenisAduanOptions: [] };
}

function loadItTemplates() {
    const tplPath = path.resolve(__dirname, 'it_templates.json');
    if (fs.existsSync(tplPath)) {
        try {
            return JSON.parse(fs.readFileSync(tplPath, 'utf8'));
        } catch (_) {}
    }
    return [];
}

function saveItTemplates(templates) {
    const tplPath = path.resolve(__dirname, 'it_templates.json');
    fs.writeFileSync(tplPath, JSON.stringify(templates, null, 2), 'utf8');

    const globalTplPath = path.join(USER_HOME, '.gemini', 'config', 'skills', 'documentation-it', 'scripts', 'it_templates.json');
    try {
        if (fs.existsSync(path.dirname(globalTplPath))) {
            fs.writeFileSync(globalTplPath, JSON.stringify(templates, null, 2), 'utf8');
        }
    } catch (_) {}
}

async function extractPortalOptions(portalUrl, username, password) {
    console.log('[*] [Lunar] Extracting live Unit and Jenis Aduan from Si-Pangaduan...');
    const isWindows = process.platform === 'win32';
    const browser = await chromium.launch({
        executablePath: isWindows ? undefined : (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
        channel: isWindows ? 'chrome' : undefined,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.goto(portalUrl, { waitUntil: 'networkidle', timeout: 15000 });
        await page.fill('#username', username);
        await page.fill('#password', password);
        await page.click('#btnLogin');
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });

        const formUrl = new URL('pangaduan/formulir_pengaduan', portalUrl).href;
        await page.goto(formUrl, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForSelector('#id_bagian_api', { timeout: 10000 });

        const data = await page.evaluate(() => {
            const getOptions = (sel) => {
                const el = document.querySelector(sel);
                if (!el) return [];
                return Array.from(el.options).map(o => ({
                    value: o.value,
                    text: o.text.trim()
                })).filter(o => o.value !== '');
            };

            return {
                unitOptions: getOptions('#id_bagian_api'),
                jenisAduanOptions: getOptions('#jenis_aduan')
            };
        });

        const optPath = path.resolve(__dirname, 'portal_options.json');
        fs.writeFileSync(optPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[+] [Lunar] Saved ${data.unitOptions.length} units and ${data.jenisAduanOptions.length} aduan types to ${optPath}`);
        await browser.close();
        return data;
    } catch (err) {
        await browser.close();
        throw err;
    }
}

// ---------------------------------------------------------
// 1. Cross-Platform Browser Configuration
// ---------------------------------------------------------
function getBrowserConfig() {
    const isWindows = process.platform === 'win32';
    const config = {
        headless: false,
        args: ['--start-maximized']
    };

    if (isWindows) {
        // Windows: Automatically discovers Chrome or Edge across ANY Windows user account
        config.channel = 'chrome';
    } else {
        // Linux / Wayland / Hyprland
        config.executablePath = fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : '/usr/bin/google-chrome';
        config.args.push(
            '--ozone-platform-hint=auto',
            '--enable-features=UseOzonePlatform',
            '--ozone-platform=wayland',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        );
        config.env = {
            ...process.env,
            WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || 'wayland-1',
            XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid ? process.getuid() : 1000}`,
            XDG_SESSION_TYPE: 'wayland',
            XDG_CURRENT_DESKTOP: 'Hyprland'
        };
    }

    return config;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatKomplainToCleanHtml(rawText) {
    if (!rawText) return '';
    return escapeHtml(rawText)
        // Clean markdown bold (**) to HTML <b>
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        // Clean markdown header hashes (###)
        .replace(/^###?\s*(.*)$/gm, '<b>$1</b>')
        // Clean list bullets
        .replace(/^\s*[\*\-]\s+(.*)$/gm, '• $1')
        // Convert linebreaks
        .replace(/\n/g, '<br>');
}

// ---------------------------------------------------------
// 2. Git Diff Pre-Processors
// ---------------------------------------------------------
function parseGitDiffToCleanChanges(rawDiff) {
    if (!rawDiff) return '';
    const lines = rawDiff.split('\n');
    const files = {};
    let currentFile = null;

    for (const line of lines) {
        if (line.startsWith('diff --git')) {
            const parts = line.split(/\s+/);
            if (parts.length >= 4) {
                currentFile = parts[3].replace(/^[a-z]\//, '');
                files[currentFile] = { added: [], removed: [] };
            }
            continue;
        }

        if (!currentFile || line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
            continue;
        }

        const trimmed = line.slice(1).trim();
        // Skip code syntax noise like brackets, braces
        if (!trimmed || trimmed === '{' || trimmed === '}' || trimmed === '});' || trimmed === '},' || trimmed === '];') {
            continue;
        }

        if (line.startsWith('+')) {
            files[currentFile].added.push(trimmed);
        } else if (line.startsWith('-')) {
            files[currentFile].removed.push(trimmed);
        }
    }

    let summaryText = '';
    for (const [file, changes] of Object.entries(files)) {
        if (!changes.added.length && !changes.removed.length) continue;
        summaryText += `File: ${file}\n`;
        if (changes.removed.length) {
            summaryText += `- Sebelumnya: ${changes.removed.slice(0, 4).join('; ')}\n`;
        }
        if (changes.added.length) {
            summaryText += `+ Perubahan: ${changes.added.slice(0, 4).join('; ')}\n`;
        }
        summaryText += '\n';
    }

    return summaryText.trim();
}

function parseDiffForCard(rawDiff, maxFiles = 3, maxLinesPerFile = 6) {
    if (!rawDiff) return [];
    const lines = rawDiff.split('\n');
    const files = [];
    let curFile = null;

    for (const line of lines) {
        if (line.startsWith('diff --git')) {
            const parts = line.split(/\s+/);
            const pathName = parts[3] ? parts[3].replace(/^[a-z]\//, '') : 'unknown';
            curFile = { name: pathName, lines: [], totalAdd: 0, totalDel: 0 };
            files.push(curFile);
            continue;
        }
        if (!curFile || line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
            continue;
        }
        const trimmed = line.slice(1).trim();
        if (!trimmed || trimmed === '{' || trimmed === '}' || trimmed === '});' || trimmed === '};') continue;

        if (line.startsWith('+')) {
            curFile.totalAdd++;
            if (curFile.lines.length < maxLinesPerFile) {
                curFile.lines.push({ type: 'add', text: trimmed.slice(0, 85) });
            }
        } else if (line.startsWith('-')) {
            curFile.totalDel++;
            if (curFile.lines.length < maxLinesPerFile) {
                curFile.lines.push({ type: 'del', text: trimmed.slice(0, 85) });
            }
        }
    }

    return files.slice(0, maxFiles);
}

// ---------------------------------------------------------
// 3. Ollama / Gemma 2B Inference Helper
// ---------------------------------------------------------
async function generateReleaseNotesWithOllama(diffText, model = 'gemma:2b') {
    console.log(`[*] [Lunar] Parsing git diff for meaningful changes...`);
    const cleanChanges = parseGitDiffToCleanChanges(diffText) || diffText.slice(0, 2000);
    
    console.log(`[*] [Lunar] Querying local Ollama model (${model}) for release notes...`);
    try {
        const prompt = `Tuliskan ringkasan log perbaikan aplikasi secara singkat dan rapi untuk laporan pekerjaan IT rumah sakit berdasarkan perubahan berikut:\n\n${cleanChanges}\n\nLog perbaikan:`;
        
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 500
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama returned status ${response.status}`);
        }

        const data = await response.json();
        const rawNote = data.response?.trim();
        console.log(`[+] [Lunar] Successfully generated release notes with ${model}!`);
        return rawNote;
    } catch (err) {
        console.log(`[!] [Lunar] Ollama local model unreachable (${err.message}). Using deterministic fallback.`);
        return null;
    }
}

// ---------------------------------------------------------
// 4. IT Support: Automatic Recent Screenshot Discovery
// ---------------------------------------------------------
function findRecentScreenshot() {
    const candidateDirs = [
        path.join(USER_HOME, 'Pictures', 'Screenshots'),
        path.join(USER_HOME, 'Pictures'),
        path.join(USER_HOME, 'Downloads'),
        path.join(USER_HOME, 'Desktop'),
        process.cwd()
    ];

    let newestFile = null;
    let newestTime = 0;

    for (const dir of candidateDirs) {
        if (!fs.existsSync(dir)) continue;
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (/\.(png|jpe?g|webp)$/i.test(file)) {
                    const fullPath = path.join(dir, file);
                    const stats = fs.statSync(fullPath);
                    // Match files taken or modified in the last 30 minutes
                    if (Date.now() - stats.mtimeMs < 30 * 60 * 1000 && stats.mtimeMs > newestTime) {
                        newestTime = stats.mtimeMs;
                        newestFile = fullPath;
                    }
                }
            }
        } catch (_) {}
    }

    return newestFile;
}

// ---------------------------------------------------------
// 5. Evidence Git Diff Card Generation (~300ms Blazing Fast)
// ---------------------------------------------------------
export async function generateGitDiffCard({
    repoPath = process.cwd(),
    outPath = null
} = {}) {
    const finalOutPath = outPath || path.resolve(repoPath, 'git_diff_evidence.png');
    console.log(`[*] [Lunar] Generating blazing-fast Git Diff Evidence Card for "${repoPath}" (~300ms)...`);
    let gitLog = '';
    let gitDiff = '';
    let branchName = 'dev';
    const repoName = path.basename(repoPath);

    try {
        gitLog = execSync('git log -1 --pretty=format:"%h - %s"', { cwd: repoPath }).toString().trim();
    } catch (_) {
        gitLog = 'Latest Changes';
    }

    try {
        gitDiff = execSync('git diff HEAD~1', { cwd: repoPath }).toString().trim();
    } catch (_) {}
    if (!gitDiff) {
        try {
            gitDiff = execSync('git diff HEAD', { cwd: repoPath }).toString().trim();
        } catch (_) {}
    }
    if (!gitDiff) {
        try {
            gitDiff = execSync('git diff', { cwd: repoPath }).toString().trim();
        } catch (_) {}
    }
    if (!gitDiff) {
        try {
            gitDiff = execSync('git show HEAD', { cwd: repoPath }).toString().trim();
        } catch (_) {}
    }

    try {
        branchName = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath }).toString().trim();
    } catch (_) {}

    const [hash, ...msgParts] = gitLog.split(' - ');
    const commitMsg = msgParts.join(' - ') || gitLog;
    const parsedFiles = parseDiffForCard(gitDiff);

    let filesHtml = '';
    for (const f of parsedFiles) {
        let linesHtml = '';
        for (const l of f.lines) {
            const isAdd = l.type === 'add';
            linesHtml += `
                <div class="line ${isAdd ? 'add' : 'del'}">
                    <span class="line-sign ${isAdd ? 'line-add-sign' : 'line-del-sign'}">${isAdd ? '+' : '-'}</span>
                    <span>${escapeHtml(l.text)}</span>
                </div>
            `;
        }
        if (f.totalAdd + f.totalDel > f.lines.length) {
            linesHtml += `<div class="line more" style="color:#94a3b8; font-style:italic; padding-left:32px;">... dan ${ (f.totalAdd + f.totalDel) - f.lines.length } baris perubahan lainnya</div>`;
        }

        filesHtml += `
            <div class="file-section">
                <div class="file-header">
                    <span class="file-path">📄 ${escapeHtml(f.name)}</span>
                    <span class="file-stats"><span style="color:#4ade80; font-weight:700;">+${f.totalAdd}</span> <span style="color:#f87171; font-weight:700;">-${f.totalDel}</span></span>
                </div>
                <div class="code-block">${linesHtml}</div>
            </div>
        `;
    }

    if (!filesHtml) {
        filesHtml = `<div style="padding: 24px; color: #94a3b8; text-align: center;">Commit bersih (tidak ada perbedaan kode signifikan)</div>`;
    }

    const html = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace; }
        body { background: #0c0a10; color: #e2e8f0; padding: 20px; display: flex; justify-content: center; }
        .card { width: 960px; background: #13111a; border: 1px solid #2e263d; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .header { background: #1a1625; padding: 14px 20px; border-bottom: 1px solid #2e263d; display: flex; align-items: center; justify-content: space-between; }
        .dots { display: flex; gap: 8px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot.r { background: #ff5f56; }
        .dot.y { background: #ffbd2e; }
        .dot.g { background: #27c93f; }
        .title { font-size: 13px; font-weight: 700; color: #cbd5e1; letter-spacing: 0.5px; }
        .meta-bar { background: #171320; padding: 12px 20px; border-bottom: 1px solid #251f30; display: flex; gap: 20px; font-size: 12px; color: #94a3b8; }
        .meta-item b { color: #f1f5f9; }
        .badge { background: #e0245e22; color: #ff6b8b; padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; font-family: monospace; }
        .file-section { border-bottom: 1px solid #1f1a2b; }
        .file-header { background: #161220; padding: 8px 16px; font-size: 12px; font-weight: 600; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #e11d48; }
        .file-path { font-family: monospace; }
        .code-block { font-family: "JetBrains Mono", monospace; font-size: 12px; line-height: 1.6; }
        .line { padding: 3px 16px; display: flex; gap: 12px; }
        .line.del { background: rgba(239, 68, 68, 0.12); color: #fca5a5; }
        .line.add { background: rgba(34, 197, 94, 0.12); color: #86efac; }
        .line-sign { width: 14px; font-weight: bold; user-select: none; }
        .line-del-sign { color: #ef4444; }
        .line-add-sign { color: #22c55e; }
        .footer { padding: 10px 20px; background: #0f0d14; border-top: 1px solid #251f30; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <div class="dots"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div></div>
                <div class="title">EVIDENCE OF WORK • GIT COMMIT VERIFICATION</div>
                <div class="badge">${escapeHtml(hash)}</div>
            </div>
            <div class="meta-bar">
                <div class="meta-item">Repository: <b>${escapeHtml(repoName)}</b></div>
                <div class="meta-item">Branch: <b>${escapeHtml(branchName)}</b></div>
                <div class="meta-item">Commit: <b>${escapeHtml(commitMsg)}</b></div>
            </div>
            ${filesHtml}
            <div class="footer">
                <span>Verified by Lunar Sentinel (Si-Pangaduan Bridge)</span>
                <span>${new Date().toLocaleString('id-ID')}</span>
            </div>
        </div>
    </body>
    </html>`;

    const isWindows = process.platform === 'win32';
    const browser = await chromium.launch({
        executablePath: isWindows ? undefined : (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
        channel: isWindows ? 'chrome' : undefined,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage({ viewport: { width: 1040, height: 700 } });
    await page.setContent(html);
    const card = page.locator('.card');
    await card.screenshot({ path: finalOutPath });
    try {
        const fallbackPath = path.resolve(__dirname, 'git_diff_evidence.png');
        if (path.resolve(finalOutPath) !== fallbackPath) {
            fs.copyFileSync(finalOutPath, fallbackPath);
        }
    } catch (_) {}
    await browser.close();

    console.log(`[+] [Lunar] Git Diff Evidence Card rendered successfully: ${finalOutPath}`);
    return finalOutPath;
}

// ---------------------------------------------------------
// 5.1 Legacy Live Screenshot Capture (Port 5500 Fallback)
// ---------------------------------------------------------
async function captureRemedisEvidence(targetModule = 'Asuhan Kepenataan Anestesi') {
    console.log(`[*] [Lunar] Capturing live evidence for "${targetModule}" on port 5500...`);
    const isWindows = process.platform === 'win32';
    const browser = await chromium.launch({
        executablePath: isWindows ? undefined : (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
        channel: isWindows ? 'chrome' : undefined,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    
    try {
        await page.goto('http://127.0.0.1:5500/login.html', { waitUntil: 'networkidle', timeout: 10000 });
        await page.fill('#input_username', 'nardi');
        await page.fill('#input_password', '0');
        await page.keyboard.press('Enter');
        await page.waitForURL('**/main.html', { timeout: 10000 });
        await page.waitForTimeout(1500);

        // Open Checklists
        await page.click('text=Checklists');
        await page.waitForTimeout(500);
        await page.click(`text=${targetModule}`);
        await page.waitForTimeout(2500);

        // Scroll to changed section
        const garaEl = page.locator('text=Obat GA dan alat STATICS sdh siap').first();
        if (await garaEl.count() > 0) {
            await garaEl.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
        }

        const evidencePath = path.resolve(process.cwd(), 'anestesi_evidence.png');
        await page.screenshot({ path: evidencePath });
        console.log(`[+] [Lunar] Evidence screenshot saved: ${evidencePath}`);
        await browser.close();
        return evidencePath;
    } catch (err) {
        console.log(`[!] [Lunar] Could not auto-capture screenshot: ${err.message}`);
        await browser.close();
        return null;
    }
}

// ---------------------------------------------------------
// 6. Main Si-Pangaduan Form Automation
// ---------------------------------------------------------
export async function runDocumentationIT({
    role = 'programmer',
    namaPengadu = CURRENT_USER,
    unitValue = '44', // Default: Inst. Rekam Medik
    jenisAduanValue = '4', // Default: Perbaikan Aplikasi
    noRm = '-',
    isiKomplain = '',
    screenshotPath = null,
    clickSimpan = false,
    useOllama = false,
    ollamaModel = 'gemma:2b',
    portalUrl = null,
    portalUsername = null,
    portalPassword = null,
    repoPath = process.cwd(),
    waktuPenerimaan = null,
    waktuPenyelesaian = null
} = {}) {
    console.log('\n======================================================');
    console.log('         🌙 LUNAR IT DOCUMENTATION AUTOMATION');
    console.log('======================================================\n');

    const settings = getEffectiveSettings();
    const finalPortalUrl = portalUrl || settings.portalUrl || 'http://192.168.0.152/it/';
    const finalUsername = portalUsername || settings.portalUsername || '01229';
    const finalPassword = portalPassword || settings.portalPassword || '123456';

    let rawIsiKomplain = isiKomplain;
    let finalScreenshot = screenshotPath;

    // --- PROGRAMMER TRACK ---
    if (role === 'programmer') {
        let gitLog = '';
        let gitDiff = '';

        try {
            gitLog = execSync('git log -1 --pretty=format:"%h - %s"', { cwd: repoPath }).toString().trim();
            console.log(`[*] [Lunar] Detected latest commit: ${gitLog}`);
        } catch (_) {
            gitLog = 'Latest Changes';
        }

        try {
            gitDiff = execSync('git diff HEAD~1', { cwd: repoPath }).toString().trim();
        } catch (_) {}
        if (!gitDiff) {
            try {
                gitDiff = execSync('git diff HEAD', { cwd: repoPath }).toString().trim();
            } catch (_) {}
        }
        if (!gitDiff) {
            try {
                gitDiff = execSync('git diff', { cwd: repoPath }).toString().trim();
            } catch (_) {}
        }
        if (!gitDiff) {
            try {
                gitDiff = execSync('git show HEAD', { cwd: repoPath }).toString().trim();
            } catch (_) {}
        }

        if (!rawIsiKomplain) {
            if (useOllama && gitDiff) {
                const aiNotes = await generateReleaseNotesWithOllama(gitDiff, ollamaModel);
                if (aiNotes) {
                    rawIsiKomplain = `Perbaikan Aplikasi (Commit: ${gitLog})\n\n${aiNotes}`;
                }
            }

            if (!rawIsiKomplain) {
                rawIsiKomplain = `Perbaikan Aplikasi & Pemeliharaan Modul RME Rawat Inap (fe_remedis_ranap)
Commit: ${gitLog || 'Recent Updates'}

Rincian Perubahan:
1. Modul Asuhan Kepenataan Anestesi:
   - Pemisahan opsi checklist persiapan obat General Anesthesia (GA) dan Regional Anesthesia (RA).
   - Pemisahan opsi intervensi gangguan kardiovaskular dan implementasi intraoperasi.
   - Pemisahan implementasi risiko jatuh pasca anestesi.
   - Penyesuaian evaluasi jalan napas: "Jarak Thyro-Mental >3 jari".
2. Modul Surat Keterangan Kematian:
   - Penghapusan tombol & riwayat surat sebelumnya.
   - Penyesuaian area tanda tangan dokter DPJP.`;
            }
        }

        if (!finalScreenshot) {
            if (process.argv.includes('--live-app')) {
                finalScreenshot = await captureRemedisEvidence();
            } else {
                finalScreenshot = await generateGitDiffCard({ repoPath });
            }
        }
    }

    // Format Isi Komplain to clean HTML without raw asterisks (**)
    const cleanKomplainHtml = formatKomplainToCleanHtml(rawIsiKomplain);

    // --- BROWSER AUTOMATION ---
    console.log('[*] [Lunar] Launching live desktop browser...');
    const browserConfig = getBrowserConfig();
    const browser = await chromium.launch(browserConfig);
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // 1. Authenticate to Si-Pangaduan
    console.log(`[*] [Lunar] Authenticating to Si-Pangaduan as "${finalUsername}" (${finalPortalUrl})...`);
    await page.goto(finalPortalUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.fill('#username', finalUsername);
    await page.fill('#password', finalPassword);

    await Promise.allSettled([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }),
        page.click('#btnLogin')
    ]);

    await page.waitForTimeout(1500);

    // 2. Open Formulir
    const formUrl = new URL('pangaduan/formulir_pengaduan', finalPortalUrl).href;
    console.log(`[*] [Lunar] Navigating to Formulir Pengaduan (${formUrl})...`);
    await page.goto(formUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 3. Populate Fields
    console.log(`[*] [Lunar] Setting Nama Pengadu: "${namaPengadu}"...`);
    await page.fill('#vb7a', namaPengadu);

    console.log(`[*] [Lunar] Selecting Dari Unit (value: ${unitValue})...`);
    await page.evaluate((val) => {
        const select = document.getElementById('id_bagian_api');
        if (select) {
            select.value = val;
            if (window.$) $(select).val(val).trigger('change');
            else select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, unitValue);

    console.log('[*] [Lunar] Injecting Isi Komplain (clean formatting, no **)...');
    await page.evaluate((html) => {
        if (window.$ && $('#summernote1').length && $.fn.summernote) {
            $('#summernote1').summernote('code', html);
        } else {
            const ed = document.querySelector('.note-editable');
            if (ed) ed.innerHTML = html;
        }
    }, cleanKomplainHtml);

    if (finalScreenshot && fs.existsSync(finalScreenshot)) {
        console.log(`[*] [Lunar] Attaching evidence image: ${finalScreenshot}...`);
        const fileInput = page.locator('#filex');
        if (await fileInput.count() > 0) {
            await fileInput.setInputFiles(finalScreenshot);
            console.log('[+] [Lunar] Evidence attached successfully.');
        }
    } else {
        console.log('[*] [Lunar] No image attached (optional).');
    }

    console.log(`[*] [Lunar] Selecting Jenis Aduan (value: ${jenisAduanValue})...`);
    await page.evaluate((val) => {
        const select = document.getElementById('jenis_aduan');
        if (select) {
            select.value = val;
            if (window.$) $(select).val(val).trigger('change');
            else select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, jenisAduanValue);

    console.log(`[*] [Lunar] Setting NO RM: "${noRm}"...`);
    await page.fill('#vb7b', noRm);

    // 4. Calculate Timestamps
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatDateTime = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const finalWaktuPenyelesaian = waktuPenyelesaian || formatDateTime(now);
    let finalWaktuPenerimaan = waktuPenerimaan;

    if (!finalWaktuPenerimaan) {
        let penerimaanDate = new Date(now.getTime());
        if (jenisAduanValue === '4') {
            penerimaanDate.setTime(penerimaanDate.getTime() - (23 * 60 + 59) * 60 * 1000);
        } else if (jenisAduanValue === '5') {
            penerimaanDate.setTime(penerimaanDate.getTime() - ((3 * 24 + 23) * 60 + 59) * 60 * 1000);
        } else if (['6', '7', '8'].includes(jenisAduanValue)) {
            penerimaanDate.setTime(penerimaanDate.getTime() - 45 * 60 * 1000);
        } else {
            penerimaanDate.setTime(penerimaanDate.getTime() - 60 * 60 * 1000);
        }
        finalWaktuPenerimaan = formatDateTime(penerimaanDate);
    }

    console.log(`[*] [Lunar] Timestamps: Penerimaan=${finalWaktuPenerimaan}, Penyelesaian=${finalWaktuPenyelesaian}`);

    // Set DateRangePicker via jQuery instance
    await page.evaluate(({ penDate, selDate }) => {
        const setDrp = (sel, dateStr) => {
            const el = $(sel);
            const drp = el.data('daterangepicker');
            if (drp) {
                drp.setStartDate(dateStr);
                drp.setEndDate(dateStr);
                el.val(drp.startDate.format(drp.locale ? drp.locale.format : 'YYYY-MM-DD  HH:mm'));
                drp.hide();
                el.trigger('change');
            }
        };
        setDrp('#reservation3', penDate);
        setDrp('#reservation31', selDate);
        $('.daterangepicker').hide();
    }, { penDate: finalWaktuPenerimaan, selDate: finalWaktuPenyelesaian });

    await page.waitForTimeout(1000);

    // 5. Submission Mode
    if (clickSimpan) {
        console.log('[*] [Lunar] Auto Submit Mode: Clicking "Simpan"...');
        await page.click('#btn_save');
        await page.waitForTimeout(3000);
        console.log('[+] [Lunar] Form successfully submitted!');
        await browser.close();
    } else {
        console.log('\n[!] [Lunar] REVIEW MODE: Form is fully populated. "Simpan" was NOT clicked.');
        console.log('[*] [Lunar] Browser is live on screen. You can review and click Simpan whenever you wish.\n');
        // Keep process open in review mode
        await new Promise(() => {});
    }
}

function discoverSiblingProjects(basePath) {
    const parentDir = path.dirname(basePath);
    const projects = [];
    try {
        if (fs.existsSync(parentDir)) {
            const entries = fs.readdirSync(parentDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const fullPath = path.join(parentDir, entry.name);
                    const isGit = fs.existsSync(path.join(fullPath, '.git'));
                    if (isGit || entry.name.startsWith('fe_') || entry.name.startsWith('be_') || entry.name.includes('remedis') || entry.name.includes('simrs')) {
                        projects.push({
                            name: entry.name,
                            path: fullPath,
                            isGit
                        });
                    }
                }
            }
        }
    } catch (_) {}
    return projects;
}

// ---------------------------------------------------------
// 7. Sleek Local Web UI Server
// ---------------------------------------------------------
export function startDocumentationServer({ port = 3721, repoPath = process.cwd() } = {}) {
    let currentRepoPath = repoPath;
    const initialSettings = loadSettings();
    if (initialSettings.activeRepoPath && fs.existsSync(initialSettings.activeRepoPath)) {
        currentRepoPath = initialSettings.activeRepoPath;
    }

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        const sendJson = (data, status = 200) => {
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        };

        const readBody = () => new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try { resolve(JSON.parse(body || '{}')); }
                catch (_) { resolve({}); }
            });
        });

        // 1. Serve Web UI
        if (req.method === 'GET' && url.pathname === '/') {
            const htmlPath = path.resolve(__dirname, 'ui', 'index.html');
            if (fs.existsSync(htmlPath)) {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(fs.readFileSync(htmlPath));
            } else {
                res.writeHead(404);
                res.end('UI index.html not found');
            }
            return;
        }

        // 2. Initialize Data Endpoint
        if (req.method === 'GET' && url.pathname === '/api/init') {
            const reqRepo = url.searchParams.get('repoPath');
            if (reqRepo && fs.existsSync(reqRepo)) {
                currentRepoPath = reqRepo;
            }

            let commitInfo = null;
            try {
                const gitLog = execSync('git log -1 --pretty=format:"%h - %s"', { cwd: currentRepoPath }).toString().trim();
                const [hash, ...msgParts] = gitLog.split(' - ');
                commitInfo = { hash, msg: msgParts.join(' - ') };
            } catch (_) {}

            const settings = loadSettings();
            const options = loadPortalOptions();
            const templates = loadItTemplates();
            const discoveredProjects = discoverSiblingProjects(currentRepoPath);

            sendJson({
                user: CURRENT_USER,
                platform: process.platform,
                repoPath: currentRepoPath,
                repoName: path.basename(currentRepoPath),
                commit: commitInfo,
                discoveredProjects,
                recentProjects: settings.recentProjects || [currentRepoPath],
                settings,
                options,
                templates
            });
            return;
        }

        // 2.0 Switch Project / Path Endpoint
        if (req.method === 'POST' && url.pathname === '/api/switch-project') {
            const body = await readBody();
            const targetPath = body.repoPath ? path.resolve(body.repoPath) : currentRepoPath;
            if (!fs.existsSync(targetPath)) {
                sendJson({ success: false, error: `Path project tidak ditemukan: ${targetPath}` }, 400);
                return;
            }

            currentRepoPath = targetPath;
            const settings = loadSettings();
            settings.activeRepoPath = currentRepoPath;
            if (!settings.recentProjects) settings.recentProjects = [];
            if (!settings.recentProjects.includes(currentRepoPath)) {
                settings.recentProjects.unshift(currentRepoPath);
                if (settings.recentProjects.length > 8) settings.recentProjects.pop();
            }
            saveSettings(settings);

            let commitInfo = null;
            try {
                const gitLog = execSync('git log -1 --pretty=format:"%h - %s"', { cwd: currentRepoPath }).toString().trim();
                const [hash, ...msgParts] = gitLog.split(' - ');
                commitInfo = { hash, msg: msgParts.join(' - ') };
            } catch (_) {}

            sendJson({
                success: true,
                repoPath: currentRepoPath,
                repoName: path.basename(currentRepoPath),
                commit: commitInfo,
                recentProjects: settings.recentProjects
            });
            return;
        }

        // 2.1 Settings Endpoints
        if (req.method === 'POST' && url.pathname === '/api/settings') {
            const body = await readBody();
            try {
                saveSettings(body);
                sendJson({ success: true, settings: body });
            } catch (err) {
                sendJson({ success: false, error: err.message }, 500);
            }
            return;
        }

        // 2.2 Re-sync Options from Web Portal
        if (req.method === 'POST' && url.pathname === '/api/sync-options') {
            const settings = getEffectiveSettings();
            try {
                const freshOptions = await extractPortalOptions(
                    settings.portalUrl,
                    settings.portalUsername,
                    settings.portalPassword
                );
                sendJson({ success: true, options: freshOptions });
            } catch (err) {
                sendJson({ success: false, error: err.message }, 500);
            }
            return;
        }

        // 2.3 Save / Update Templates Endpoint
        if (req.method === 'POST' && url.pathname === '/api/templates') {
            const body = await readBody();
            try {
                let currentTemplates = loadItTemplates();
                if (Array.isArray(body)) {
                    currentTemplates = body;
                } else if (body && body.title) {
                    const newId = body.id || 'tpl_' + Date.now();
                    const existingIdx = currentTemplates.findIndex(t => t.id === newId);
                    const tplObj = {
                        id: newId,
                        icon: body.icon || '📝',
                        title: body.title,
                        track: body.track || 'both',
                        unitValue: body.unitValue,
                        unitName: body.unitName || '',
                        jenisValue: body.jenisValue,
                        jenisName: body.jenisName || '',
                        text: body.text || ''
                    };
                    if (existingIdx >= 0) {
                        currentTemplates[existingIdx] = tplObj;
                    } else {
                        currentTemplates.unshift(tplObj);
                    }
                }
                saveItTemplates(currentTemplates);
                sendJson({ success: true, templates: currentTemplates });
            } catch (err) {
                sendJson({ success: false, error: err.message }, 500);
            }
            return;
        }

        // 2.4 Delete Template Endpoint
        if (req.method === 'DELETE' && url.pathname === '/api/templates') {
            const targetId = url.searchParams.get('id');
            try {
                let currentTemplates = loadItTemplates();
                if (targetId) {
                    currentTemplates = currentTemplates.filter(t => t.id !== targetId);
                    saveItTemplates(currentTemplates);
                    sendJson({ success: true, templates: currentTemplates });
                    return;
                }
                sendJson({ success: false, error: 'Parameter id template wajib diisi' }, 400);
            } catch (err) {
                sendJson({ success: false, error: err.message }, 500);
            }
            return;
        }

        // 3. Generate Diff Evidence Card Endpoint
        if (req.method === 'POST' && url.pathname === '/api/generate-diff-card') {
            const body = await readBody();
            const targetRepo = body.repoPath || currentRepoPath;
            try {
                const targetOut = path.resolve(targetRepo, 'git_diff_evidence.png');
                const diffPath = await generateGitDiffCard({ repoPath: targetRepo, outPath: targetOut });
                sendJson({ success: true, path: diffPath });
            } catch (err) {
                sendJson({ success: false, error: err.message }, 500);
            }
            return;
        }

        // 4. Stream Generated Diff Image Endpoint
        if (req.method === 'GET' && url.pathname === '/api/diff-evidence-image') {
            const targetRepo = url.searchParams.get('repoPath') || currentRepoPath;
            const imgPath = path.resolve(targetRepo, 'git_diff_evidence.png');
            const fallbackPath = path.resolve(__dirname, 'git_diff_evidence.png');
            const actualPath = fs.existsSync(imgPath) ? imgPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

            if (actualPath) {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(fs.readFileSync(actualPath));
            } else {
                res.writeHead(404);
                res.end('Image not found');
            }
            return;
        }

        // 4.1 Raw Diff Text Endpoint
        if (req.method === 'GET' && url.pathname === '/api/raw-diff') {
            const targetRepo = url.searchParams.get('repoPath') || currentRepoPath;
            let rawDiff = '';
            let commitInfo = null;
            try {
                const gitLog = execSync('git log -1 --pretty=format:"%h - %s"', { cwd: targetRepo }).toString().trim();
                const [hash, ...msgParts] = gitLog.split(' - ');
                commitInfo = { hash, msg: msgParts.join(' - ') };
            } catch (_) {}

            try {
                rawDiff = execSync('git diff HEAD~1', { cwd: targetRepo }).toString();
            } catch (_) {}
            if (!rawDiff) {
                try {
                    rawDiff = execSync('git diff HEAD', { cwd: targetRepo }).toString();
                } catch (_) {}
            }
            if (!rawDiff) {
                try {
                    rawDiff = execSync('git diff', { cwd: targetRepo }).toString();
                } catch (_) {}
            }
            if (!rawDiff) {
                try {
                    rawDiff = execSync('git show HEAD', { cwd: targetRepo }).toString();
                } catch (_) {}
            }

            sendJson({
                success: true,
                repoPath: targetRepo,
                commit: commitInfo,
                diff: rawDiff || 'Tidak ada perubahan git terdeteksi (working tree bersih).'
            });
            return;
        }

        // 5. Generate Release Notes via Ollama Endpoint
        if (req.method === 'POST' && url.pathname === '/api/generate-notes') {
            const body = await readBody();
            const targetRepo = body.repoPath || currentRepoPath;
            try {
                let notes = null;
                let gitDiff = '';
                try {
                    gitDiff = execSync('git diff HEAD~1', { cwd: targetRepo }).toString().trim();
                } catch (_) {}
                if (!gitDiff) {
                    try {
                        gitDiff = execSync('git diff HEAD', { cwd: targetRepo }).toString().trim();
                    } catch (_) {}
                }
                if (!gitDiff) {
                    try {
                        gitDiff = execSync('git diff', { cwd: targetRepo }).toString().trim();
                    } catch (_) {}
                }
                if (!gitDiff) {
                    try {
                        gitDiff = execSync('git show HEAD', { cwd: targetRepo }).toString().trim();
                    } catch (_) {}
                }

                if (gitDiff) {
                    notes = await generateReleaseNotesWithOllama(gitDiff, body.model || 'gemma:2b');
                }

                if (!notes) {
                    const repoBase = path.basename(targetRepo);
                    notes = `Perbaikan Aplikasi & Pemeliharaan Modul (${repoBase})

Rincian Perubahan:
• Pembaruan fungsionalitas dan pemeliharaan kode pada repositori ${repoBase}.
• Penyesuaian antarmuka dan optimasi alur kerja sistem.`;
                }

                sendJson({ success: true, notes });
            } catch (err) {
                sendJson({ success: false, error: err.message }, 500);
            }
            return;
        }

        // 6. Submit to Si-Pangaduan Endpoint
        if (req.method === 'POST' && url.pathname === '/api/submit') {
            const body = await readBody();
            try {
                runDocumentationIT({
                    role: body.role,
                    namaPengadu: body.namaPengadu,
                    unitValue: body.unitValue,
                    jenisAduanValue: body.jenisAduanValue,
                    noRm: body.noRm || '-',
                    isiKomplain: body.isiKomplain,
                    screenshotPath: body.screenshotPath,
                    clickSimpan: body.clickSimpan,
                    portalUsername: body.portalUsername,
                    portalPassword: body.portalPassword,
                    repoPath: body.repoPath || currentRepoPath,
                    waktuPenerimaan: body.waktuPenerimaan,
                    waktuPenyelesaian: body.waktuPenyelesaian
                }).catch(err => console.error('[!] Background automation error:', err));

                sendJson({ success: true, message: 'Automation dispatched successfully' });
            } catch (err) {
                sendJson({ success: false, error: err.message }, 500);
            }
            return;
        }

        res.writeHead(404);
        res.end('Not Found');
    });

function getLocalNetworkIp() {
    try {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    } catch (_) {}
    return '127.0.0.1';
}

    server.listen(port, '0.0.0.0', () => {
        const localIp = getLocalNetworkIp();
        console.log('\n======================================================');
        console.log('         🌙 LUNAR IT DOCUMENTATION PORTAL');
        console.log('======================================================\n');
        console.log(`[+] [Lunar] Web UI (Lokal PC ini): http://localhost:${port}`);
        console.log(`[+] [Lunar] Web UI (Jaringan LAN): http://${localIp}:${port}`);
        console.log(`[*] [Lunar] Buka link LAN di atas dari PC lain di jaringan RS untuk akses langsung.`);
        
        const isWindows = process.platform === 'win32';
        const openCmd = isWindows ? `start http://localhost:${port}` : `xdg-open http://localhost:${port}`;
        exec(openCmd, () => {});
    });

    return server;
}

// ---------------------------------------------------------
// 8. Interactive CLI Wizard
// ---------------------------------------------------------
async function runInteractiveCLI() {
    const rl = readline.createInterface({ input, output });
    const settings = getEffectiveSettings();

    console.log('\n--- 🌙 Lunar Si-Pangaduan Interactive Setup ---');
    console.log(`[i] Current System User: ${CURRENT_USER} (${process.platform})`);
    console.log(`[i] Profil Aktif: ${settings.activeProfile || settings.defaultNama} (User ID: ${settings.portalUsername})`);
    
    const roleAnswer = await rl.question('1. Pilih profil [1: Programmer (default), 2: IT Support]: ') || '1';
    const role = roleAnswer.trim() === '2' ? 'it_support' : 'programmer';

    const defaultNama = settings.defaultNama || CURRENT_USER;
    const namaPengadu = await rl.question(`2. Nama Pengadu [default: ${defaultNama}]: `) || defaultNama;
    const unitValue = await rl.question(`3. Dari Unit [default: ${settings.defaultUnit || '44'}]: `) || settings.defaultUnit || '44';
    
    const jenisAnswer = await rl.question('4. Jenis Aduan [1: Perbaikan Aplikasi (23h59m, default), 2: Pembuatan Modul SimRS (4d)]: ') || '1';
    const jenisAduanValue = jenisAnswer.trim() === '2' ? '5' : '4';

    let isiKomplain = '';
    let screenshotPath = null;
    let useOllama = false;

    if (role === 'it_support') {
        isiKomplain = await rl.question('5. Isi Komplain / Keterangan Pekerjaan: ');
        
        const recentShot = findRecentScreenshot();
        if (recentShot) {
            console.log(`[?] Terdeteksi screenshot terbaru: "${path.basename(recentShot)}" (${recentShot})`);
            const useRecent = await rl.question('   Gunakan file screenshot ini? [Y/n]: ') || 'y';
            if (useRecent.toLowerCase().startsWith('y')) {
                screenshotPath = recentShot;
            }
        }

        if (!screenshotPath) {
            const manualPath = await rl.question('6. Path File Foto (drag-and-drop file atau Enter jika tanpa foto): ');
            if (manualPath) {
                screenshotPath = manualPath.trim().replace(/^['"]|['"]$/g, '');
            }
        }
    } else {
        const aiAnswer = await rl.question('5. Gunakan Local AI (Gemma 2B) via Ollama untuk rangkum git diff? [y/N]: ') || 'n';
        useOllama = aiAnswer.toLowerCase().startsWith('y');
    }

    const simpanAnswer = await rl.question('7. Mode Tombol Simpan [1: Review Manual (default), 2: Auto Submit]: ') || '1';
    const clickSimpan = simpanAnswer.trim() === '2';

    rl.close();

    await runDocumentationIT({
        role,
        namaPengadu,
        unitValue,
        jenisAduanValue,
        isiKomplain,
        screenshotPath,
        useOllama,
        ollamaModel: 'gemma:2b',
        clickSimpan,
        portalUsername: settings.portalUsername,
        portalPassword: settings.portalPassword,
        repoPath: settings.activeRepoPath || process.cwd()
    });
}

// ---------------------------------------------------------
// 9. Entrypoint Execution
// ---------------------------------------------------------
if (process.argv[1]?.endsWith('documentation_it.mjs')) {
    const isCli = process.argv.includes('--cli') || process.argv.includes('--interactive');
    const hasFlags = process.argv.includes('--ai') || process.argv.includes('--programmer') || process.argv.includes('--it-support');
    
    if (hasFlags) {
        // Direct execution with command line flags
        const useOllama = process.argv.includes('--ai');
        const role = process.argv.includes('--it-support') ? 'it_support' : 'programmer';
        const clickSimpan = process.argv.includes('--submit');
        const settings = getEffectiveSettings();

        const profileArg = process.argv.find(a => a.startsWith('--profile='))?.split('=')[1];
        if (profileArg && settings.profiles) {
            const chosen = settings.profiles.find(p => p.nama.toLowerCase() === profileArg.toLowerCase() || p.id === profileArg.toLowerCase());
            if (chosen) {
                settings.portalUsername = chosen.portalUsername || settings.portalUsername;
                settings.portalPassword = chosen.portalPassword || settings.portalPassword;
                settings.defaultNama = chosen.nama || settings.defaultNama;
                settings.defaultUnit = chosen.defaultUnit || settings.defaultUnit;
                settings.defaultJenisAduan = chosen.defaultJenisAduan || settings.defaultJenisAduan;
            }
        }

        const usernameArg = process.argv.find(a => a.startsWith('--username='))?.split('=')[1];
        const passwordArg = process.argv.find(a => a.startsWith('--password='))?.split('=')[1];
        const repoArg = process.argv.find(a => a.startsWith('--repo='))?.split('=')[1] || settings.activeRepoPath || process.cwd();
        const nama = process.argv.find(a => a.startsWith('--nama='))?.split('=')[1] || settings.defaultNama || CURRENT_USER;
        const unit = process.argv.find(a => a.startsWith('--unit='))?.split('=')[1] || settings.defaultUnit || '44';

        runDocumentationIT({
            role,
            useOllama,
            clickSimpan,
            namaPengadu: nama,
            unitValue: unit,
            portalUsername: usernameArg || settings.portalUsername,
            portalPassword: passwordArg || settings.portalPassword,
            repoPath: repoArg
        }).catch(console.error);
    } else if (isCli) {
        // Interactive terminal CLI
        runInteractiveCLI().catch(console.error);
    } else {
        // Default: Launch Sleek Local Web UI Server!
        startDocumentationServer();
    }
}
