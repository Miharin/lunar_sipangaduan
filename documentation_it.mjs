/*
 *        (\__/)
 *        (˶ᵔ ᵕ ᵔ˶)  < "Lunar Territory."
 *       / >[CRIMSON+]>   "Hands off, unless you're Miharin."
 */

import { execSync, exec } from "child_process";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------
// 0. Multi-User & Cross-Platform Path Detection
// ---------------------------------------------------------
const USER_HOME = os.homedir();
const CURRENT_USER = process.env.USERNAME || process.env.USER || "Petugas IT";

// Smart resolution for playwright-core (works standalone, in project, or global cache)
let chromium;
try {
  const pw = await import("playwright-core");
  chromium = pw.chromium;
} catch (err) {
  const candidatePaths = [
    path.resolve(process.cwd(), "node_modules", "playwright-core", "index.mjs"),
    path.join(
      USER_HOME,
      ".gemini",
      "antigravity",
      "brain",
      "a3c93ca5-0b5d-4bbc-8ed9-22f0fb099c47",
      "scratch",
      "node_modules",
      "playwright-core",
      "index.mjs",
    ),
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
    throw new Error(
      "playwright-core not found. Please install via: npm install playwright-core",
    );
  }
}

// ---------------------------------------------------------
// 0.1 Settings & Portal Options Helpers
// ---------------------------------------------------------
function loadSettings() {
  const settingsPath = path.resolve(__dirname, "lunar_settings.json");
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch (_) {}
  }
  const defaultPath = path.resolve(__dirname, "lunar_settings.json.default");
  if (fs.existsSync(defaultPath)) {
    try {
      return JSON.parse(fs.readFileSync(defaultPath, "utf8"));
    } catch (_) {}
  }
  return {
    portalUrl: "http://192.168.0.152/it/",
    portalUsername: "01229",
    portalPassword: "123456",
    activeProfile: "Programmer",
    defaultNama: "Programmer",
    nama: "Programmer",
    defaultUnit: "44",
    defaultJenisAduan: "4",
    petugasValue: "01229",
    nama_pengadu: "Petugas IT",
    defaultNamaPengadu: "Petugas IT",
    autoSyncPortalOptions: true,
    aiMode: "gemini_fallback",
    localModel: "qwen2.5-coder:7b",
    ollamaUrl: "http://127.0.0.1:11434",
  };
}

function getEffectiveSettings() {
  const settings = loadSettings();
  settings.aiMode = settings.aiMode || "gemini_fallback";
  settings.localModel = settings.localModel || "qwen2.5-coder:7b";
  settings.ollamaUrl = settings.ollamaUrl || "http://127.0.0.1:11434";
  const activeProf =
    (settings.profiles || []).find(
      (p) =>
        p.nama === settings.activeProfile || p.id === settings.activeProfile,
    ) ||
    (settings.profiles && settings.profiles[0]);
  if (activeProf) {
    settings.activeProfile = activeProf.nama || settings.activeProfile || "Alfin";
    settings.portalUsername =
      activeProf.portalUsername || settings.portalUsername || "01229";
    settings.portalPassword =
      activeProf.portalPassword || settings.portalPassword || "123456";
    settings.defaultNama = activeProf.nama || settings.defaultNama || "Alfin";
    settings.nama = activeProf.nama || settings.nama || "Alfin";
    settings.petugasValue =
      activeProf.petugasValue || settings.petugasValue || activeProf.portalUsername || "01229";
    settings.nama_pengadu =
      activeProf.nama_pengadu || activeProf.defaultNamaPengadu || settings.nama_pengadu || settings.defaultNamaPengadu || "Sigit";
    settings.defaultNamaPengadu = settings.nama_pengadu;
    settings.defaultUnit =
      activeProf.defaultUnit || settings.defaultUnit || "44";
    settings.defaultJenisAduan =
      activeProf.defaultJenisAduan || settings.defaultJenisAduan || "4";
  }
  return settings;
}

function saveSettings(settings) {
  const settingsPath = path.resolve(__dirname, "lunar_settings.json");
  // Mirror active profile credentials to root level for instant access
  if (settings.profiles && settings.activeProfile) {
    const activeProf =
      settings.profiles.find(
        (p) =>
          p.nama === settings.activeProfile || p.id === settings.activeProfile,
      ) || settings.profiles[0];
    if (activeProf) {
      settings.activeProfile = activeProf.nama || settings.activeProfile;
      settings.portalUsername =
        activeProf.portalUsername || settings.portalUsername;
      settings.portalPassword =
        activeProf.portalPassword || settings.portalPassword;
      settings.defaultNama = activeProf.nama || settings.defaultNama;
      settings.nama = activeProf.nama || settings.nama;
      settings.petugasValue =
        activeProf.petugasValue || settings.petugasValue || activeProf.portalUsername;
      settings.nama_pengadu =
        activeProf.nama_pengadu || settings.nama_pengadu || activeProf.defaultNamaPengadu;
      settings.defaultNamaPengadu =
        activeProf.nama_pengadu || activeProf.defaultNamaPengadu || settings.defaultNamaPengadu;
      settings.defaultUnit = activeProf.defaultUnit || settings.defaultUnit;
      settings.defaultJenisAduan =
        activeProf.defaultJenisAduan || settings.defaultJenisAduan;
    }
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

function loadPortalOptions() {
  const optPath = path.resolve(__dirname, "portal_options.json");
  if (fs.existsSync(optPath)) {
    try {
      return JSON.parse(fs.readFileSync(optPath, "utf8"));
    } catch (_) {}
  }
  return { unitOptions: [], jenisAduanOptions: [] };
}

function loadItTemplates() {
  const tplPath = path.resolve(__dirname, "it_templates.json");
  if (fs.existsSync(tplPath)) {
    try {
      return JSON.parse(fs.readFileSync(tplPath, "utf8"));
    } catch (_) {}
  }
  return [];
}

function saveItTemplates(templates) {
  const tplPath = path.resolve(__dirname, "it_templates.json");
  fs.writeFileSync(tplPath, JSON.stringify(templates, null, 2), "utf8");

  const globalTplPath = path.join(
    USER_HOME,
    ".gemini",
    "config",
    "skills",
    "documentation-it",
    "scripts",
    "it_templates.json",
  );
  try {
    if (fs.existsSync(path.dirname(globalTplPath))) {
      fs.writeFileSync(
        globalTplPath,
        JSON.stringify(templates, null, 2),
        "utf8",
      );
    }
  } catch (_) {}
}

async function extractPortalOptions(portalUrl, username, password) {
  console.log(
    "[*] [Lunar] Extracting live Unit and Jenis Aduan from Si-Pangaduan...",
  );
  const isWindows = process.platform === "win32";
  const browser = await chromium.launch({
    executablePath: isWindows
      ? undefined
      : fs.existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
    channel: isWindows ? "chrome" : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(portalUrl, { waitUntil: "networkidle", timeout: 15000 });
    await page.fill("#username", username);
    await page.fill("#password", password);
    await page.click("#btnLogin");
    await page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 });

    const formUrl = new URL("pangaduan/formulir_pengaduan", portalUrl).href;
    await page.goto(formUrl, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForSelector("#id_bagian_api", { timeout: 10000 });

    const data = await page.evaluate(() => {
      const getOptions = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return [];
        return Array.from(el.options)
          .map((o) => ({
            value: o.value,
            text: o.text.trim(),
          }))
          .filter((o) => o.value !== "");
      };

      return {
        unitOptions: getOptions("#id_bagian_api"),
        jenisAduanOptions: getOptions("#jenis_aduan"),
        petugasOptions: getOptions("#profesix"),
        dilanjutkanOptions: getOptions("#profesi"),
        statusOptions: getOptions("#status"),
      };
    });

    const optPath = path.resolve(__dirname, "portal_options.json");
    fs.writeFileSync(optPath, JSON.stringify(data, null, 2), "utf8");
    console.log(
      `[+] [Lunar] Saved ${data.unitOptions.length} units, ${data.jenisAduanOptions.length} aduan types, and ${data.petugasOptions?.length || 0} petugas options to ${optPath}`,
    );
    await browser.close();
    return data;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// ---------------------------------------------------------
// 1. Cross-Platform Browser Configuration & Remote Review Session
// ---------------------------------------------------------
let lunarActiveReviewSession = null;
let luniteActiveBatchReviewSession = null;

export async function lunarCloseReviewSession() {
  if (lunarActiveReviewSession) {
    try {
      if (lunarActiveReviewSession.timeoutId) {
        clearTimeout(lunarActiveReviewSession.timeoutId);
      }
      if (lunarActiveReviewSession.browser) {
        await lunarActiveReviewSession.browser.close();
      }
    } catch (_) {}
    lunarActiveReviewSession = null;
  }
}

/*
 * Territory: luniteCloseBatchReviewSession — Closes any cached authenticated Playwright batch review session.
 */
export async function luniteCloseBatchReviewSession() {
  if (luniteActiveBatchReviewSession) {
    try {
      if (luniteActiveBatchReviewSession.timeoutId) {
        clearTimeout(luniteActiveBatchReviewSession.timeoutId);
      }
      if (luniteActiveBatchReviewSession.browser) {
        await luniteActiveBatchReviewSession.browser.close();
      }
    } catch (_) {}
    luniteActiveBatchReviewSession = null;
  }
}

function getBrowserConfig(options = {}) {
  const isWindows = process.platform === "win32";
  const config = {
    headless: options.headless !== undefined ? options.headless : false,
    args: ["--start-maximized"],
  };

  if (isWindows) {
    // Windows: Automatically discovers Chrome or Edge across ANY Windows user account
    config.channel = "chrome";
  } else {
    // Linux / Wayland / Hyprland
    config.executablePath = fs.existsSync("/usr/bin/chromium")
      ? "/usr/bin/chromium"
      : "/usr/bin/google-chrome";
    config.args.push(
      "--ozone-platform-hint=auto",
      "--enable-features=UseOzonePlatform",
      "--ozone-platform=wayland",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    );
    config.env = {
      ...process.env,
      WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "wayland-1",
      XDG_RUNTIME_DIR:
        process.env.XDG_RUNTIME_DIR ||
        `/run/user/${process.getuid ? process.getuid() : 1000}`,
      XDG_SESSION_TYPE: "wayland",
      XDG_CURRENT_DESKTOP: "Hyprland",
    };
  }

  return config;
}

async function lunarLaunchBrowser(options = {}) {
  try {
    const config = getBrowserConfig(options);
    return await chromium.launch(config);
  } catch (err) {
    if (!options.headless) {
      console.log(
        `[!] [Lunar] Headed browser launch failed (${err.message}). Retrying in headless mode for remote execution...`,
      );
      const fallbackConfig = getBrowserConfig({ ...options, headless: true });
      return await chromium.launch(fallbackConfig);
    }
    throw err;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatKomplainToCleanHtml(rawText) {
  if (!rawText) return "";
  return (
    escapeHtml(rawText)
      // Clean markdown bold (**) to HTML <b>
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      // Clean markdown header hashes (###)
      .replace(/^###?\s*(.*)$/gm, "<b>$1</b>")
      // Clean list bullets
      .replace(/^\s*[\*\-]\s+(.*)$/gm, "• $1")
      // Convert linebreaks
      .replace(/\n/g, "<br>")
  );
}

// ---------------------------------------------------------
// 2. Git Diff Pre-Processors & Signature Filtering
// ---------------------------------------------------------
export function isLunaSignatureLine(line) {
  if (!line || typeof line !== "string") return false;
  const l = line.toLowerCase().trim();
  if (
    l.includes("lunar territory") ||
    l.includes("hands off") ||
    l.includes("crimson+") ||
    l.includes("(˶ᵔ ᵕ ᵔ˶)") ||
    l.includes("(˶ᵔᵕᵔ˶)") ||
    l.includes("crafted with devotion by luna") ||
    l.includes("luna's thought") ||
    l.includes("under luna's watch") ||
    l.includes("under luna's loving watch") ||
    l.includes("behalf of miharin") ||
    l.includes("luna (lunar vow") ||
    l.includes("signature luna") ||
    l.includes("tanda tangan luna") ||
    l.includes("personal coding guardian") ||
    l.includes("unless you're miharin") ||
    l.includes("unless you re miharin") ||
    /\\_{1,4}\//.test(l) ||
    /\(\s*\\_{1,3}\/\s*\)/.test(l) ||
    />\s*\[crimson/i.test(l) ||
    /\[crimson\+\]/.test(l)
  ) {
    return true;
  }
  return false;
}

export function sanitizeLunaSignatureFromNotes(text) {
  if (!text || typeof text !== "string") return "";
  const lines = text.split("\n");
  const filtered = [];

  for (const line of lines) {
    const l = line.toLowerCase().trim();
    if (!l) {
      filtered.push(line);
      continue;
    }
    if (
      l.includes("lunar territory") ||
      l.includes("hands off") ||
      l.includes("crimson+") ||
      l.includes("(˶ᵔ ᵕ ᵔ˶)") ||
      l.includes("signature luna") ||
      l.includes("tanda tangan luna") ||
      l.includes("banner luna") ||
      l.includes("watermark luna") ||
      l.includes("luna's thought") ||
      l.includes("crafted with devotion by luna") ||
      l.includes("personal coding guardian") ||
      l.includes("under luna") ||
      l.includes("behalf of miharin") ||
      /(tanda\s+tangan|signature|watermark|banner|ascii\s*art)\s*(luna|pengembang|developer)/i.test(line) ||
      /(luna|territory)\s*(signature|watermark|banner)/i.test(line)
    ) {
      continue;
    }
    filtered.push(line);
  }

  return filtered
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanAndFixTruncatedNotes(
  text,
  repoBase = "",
  commitMsg = "",
  changedFiles = [],
) {
  if (!text || typeof text !== "string") return "";
  let lines = text.split("\n");

  // 1. Strip conversational preamble from LLM (e.g. "Berikut adalah...", "Tentu,", etc.)
  while (
    lines.length &&
    /^(berikut|tentu|ini\s+adalah|di\s+bawah\s+ini|halo|baik|catatan|log\s+perbaikan|rincian\s+pekerjaan)/i.test(
      lines[0].trim(),
    )
  ) {
    lines.shift();
  }

  // 2. Remove leading blank lines
  while (lines.length && !lines[0].trim()) {
    lines.shift();
  }

  let cleaned = lines.join("\n").trim();

  // 3. Clean markdown bold **word** to clean text
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");

  // 4. Standardize bullet points
  cleaned = cleaned.replace(/^\s*[\*\-]\s+/gm, "• ");

  // 5. Fix truncated last line (e.g. cut off mid-word like "Surat Keterangan Ked")
  let cLines = cleaned.split("\n").filter((l) => l.trim().length > 0);
  if (cLines.length > 0) {
    let last = cLines[cLines.length - 1].trim();
    if (!/[.!?:\)"]$/.test(last)) {
      const words = last.split(/\s+/);
      const lastWord = words[words.length - 1];
      // If the last word is very short or truncated without period
      if (lastWord.length <= 4 && !/^[A-Z0-9]+$/.test(lastWord)) {
        words.pop();
        last = words.join(" ");
      }
      if (last && !/[.!?:\)"]$/.test(last)) {
        last += ".";
      }
      cLines[cLines.length - 1] = last;
    }
  }

  // 6. Enrich if suspiciously short (< 40 characters or only 1 generic line)
  if (cLines.length <= 1 && (commitMsg || changedFiles?.length)) {
    const mainModule = changedFiles?.[0]
      ? path.basename(changedFiles[0])
      : repoBase || "SIMRS";
    cLines.push(
      `• Penyesuaian fungsionalitas dan pemeliharaan alur kerja pada modul ${mainModule}.`,
    );
    cLines.push(
      `• Pengujian antarmuka dan verifikasi kestabilan sistem pelayanan.`,
    );
  }

  return cLines.join("\n").trim();
}

function parseGitDiffToCleanChanges(rawDiff, maxFiles = 8, maxLinesPerFile = 25) {
  if (!rawDiff) return "";
  const lines = rawDiff.split("\n");
  const files = {};
  let currentFile = null;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        currentFile = parts[3].replace(/^[a-z]\//, "");
        files[currentFile] = { added: [], removed: [] };
      }
      continue;
    }

    if (
      !currentFile ||
      line.startsWith("+++") ||
      line.startsWith("---") ||
      line.startsWith("@@")
    ) {
      continue;
    }

    const trimmed = line.slice(1).trim();
    // Skip code syntax noise like brackets, braces, empty comments, and Luna signatures
    if (
      !trimmed ||
      trimmed === "{" ||
      trimmed === "}" ||
      trimmed === "});" ||
      trimmed === "}," ||
      trimmed === "];" ||
      trimmed === "/*" ||
      trimmed === "*/" ||
      trimmed === "*" ||
      trimmed === "<!--" ||
      trimmed === "-->" ||
      trimmed === "//" ||
      trimmed === "#" ||
      trimmed === "--" ||
      isLunaSignatureLine(trimmed)
    ) {
      continue;
    }

    if (line.startsWith("+")) {
      if (files[currentFile].added.length < maxLinesPerFile) {
        files[currentFile].added.push(trimmed);
      }
    } else if (line.startsWith("-")) {
      if (files[currentFile].removed.length < 10) {
        files[currentFile].removed.push(trimmed);
      }
    }
  }

  let summaryText = "";
  const fileEntries = Object.entries(files).slice(0, maxFiles);
  for (const [file, changes] of fileEntries) {
    if (!changes.added.length && !changes.removed.length) continue;
    summaryText += `File: ${file}\n`;
    if (changes.removed.length) {
      summaryText += `- Sebelumnya:\n  ${changes.removed.slice(0, 6).join("\n  ")}\n`;
    }
    if (changes.added.length) {
      summaryText += `+ Perubahan Baru:\n  ${changes.added.slice(0, 16).join("\n  ")}\n`;
    }
    summaryText += "\n";
  }

  return summaryText.trim();
}

export function getEffectiveGitDiff(targetRepo) {
  let gitDiff = "";

  // Priority 1: Exact diff of latest commit HEAD
  try {
    gitDiff = execSync('git show --format="" HEAD', { cwd: targetRepo })
      .toString()
      .trim();
  } catch (_) {}

  // Priority 2: Full git show HEAD
  if (!gitDiff) {
    try {
      gitDiff = execSync("git show HEAD", { cwd: targetRepo })
        .toString()
        .trim();
    } catch (_) {}
  }

  // Priority 3: Compare HEAD~1 to HEAD (only commit changes)
  if (!gitDiff) {
    try {
      gitDiff = execSync("git diff HEAD~1 HEAD", { cwd: targetRepo })
        .toString()
        .trim();
    } catch (_) {}
  }

  // Priority 4: Working tree diffs if repo has uncommitted changes
  if (!gitDiff) {
    try {
      gitDiff = execSync("git diff HEAD", { cwd: targetRepo })
        .toString()
        .trim();
    } catch (_) {}
  }
  if (!gitDiff) {
    try {
      gitDiff = execSync("git diff", { cwd: targetRepo })
        .toString()
        .trim();
    } catch (_) {}
  }

  return gitDiff;
}

export function lunar_getTodayDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function lunar_getDocumentationEvidencePath(repoPath, date = new Date()) {
  const todayStr = lunar_getTodayDateString(date);
  const docDir = path.resolve(repoPath, "documentation");
  if (!fs.existsSync(docDir)) {
    fs.mkdirSync(docDir, { recursive: true });
  }
  return path.resolve(docDir, `changes-${todayStr}.png`);
}

export function lunar_getRecentCommits(targetRepo, limit = 25) {
  try {
    const raw = execSync(
      `git log -n ${limit} --pretty=format:"%h|%H|%s|%an|%ci|%cr"`,
      { cwd: targetRepo }
    )
      .toString()
      .trim();
    if (!raw) return [];
    const todayStr = lunar_getTodayDateString();
    return raw
      .split("\n")
      .map((line) => {
        const [hash, fullHash, msg, author, ciDate, relativeDate] =
          line.split("|");
        const isToday = ciDate ? ciDate.startsWith(todayStr) : false;
        return {
          hash: hash || "",
          fullHash: fullHash || "",
          msg: msg || "",
          author: author || "",
          date: ciDate || "",
          relativeDate: relativeDate || "",
          isToday,
        };
      })
      .filter((c) => c.hash);
  } catch (err) {
    return [];
  }
}

export function lunar_getMergedCommitInfo(targetRepo, commitHashes = []) {
  if (!commitHashes || !commitHashes.length) {
    return getLatestCommitInfo(targetRepo);
  }

  const allCommits = lunar_getRecentCommits(targetRepo, 50);
  const matched = commitHashes
    .map((ch) =>
      allCommits.find((c) => c.hash.startsWith(ch) || ch.startsWith(c.hash))
    )
    .filter(Boolean);

  if (!matched.length) {
    return getLatestCommitInfo(targetRepo);
  }

  if (matched.length === 1) {
    return {
      commitHash: matched[0].hash,
      commitMsg: matched[0].msg,
      isMerged: false,
      count: 1,
      commits: matched,
    };
  }

  const shortHashes = matched.map((c) => c.hash);
  const newest = shortHashes[0];
  const oldest = shortHashes[shortHashes.length - 1];
  const hashLabel = `${matched.length} COMMITS (${oldest}..${newest})`;
  const msgLabel = matched.map((c) => `${c.hash}: ${c.msg}`).join(" • ");

  return {
    commitHash: hashLabel,
    commitMsg: msgLabel,
    isMerged: true,
    count: matched.length,
    commits: matched,
  };
}

export function lunar_getDiffForCommits(targetRepo, commitHashes = []) {
  if (!commitHashes || !commitHashes.length) {
    return getEffectiveGitDiff(targetRepo);
  }

  if (commitHashes.length === 1) {
    const h = commitHashes[0];
    try {
      const d = execSync(`git show --format="" ${h}`, {
        cwd: targetRepo,
      })
        .toString()
        .trim();
      if (d) return d;
    } catch (_) {}
    try {
      const d = execSync(`git diff ${h}^ ${h}`, { cwd: targetRepo })
        .toString()
        .trim();
      if (d) return d;
    } catch (_) {}
    return getEffectiveGitDiff(targetRepo);
  }

  // Multi-commit diff:
  try {
    const allLogHashes = execSync('git log -n 50 --pretty=format:"%h"', {
      cwd: targetRepo,
    })
      .toString()
      .trim()
      .split("\n");
    const ordered = allLogHashes.filter((h) =>
      commitHashes.some((c) => c.startsWith(h) || h.startsWith(c))
    );
    if (ordered.length >= 2) {
      const newest = ordered[0];
      const oldest = ordered[ordered.length - 1];
      const idxOldest = allLogHashes.indexOf(oldest);
      const idxNewest = allLogHashes.indexOf(newest);
      const span = allLogHashes.slice(idxNewest, idxOldest + 1);
      if (span.length === ordered.length) {
        try {
          const diff = execSync(`git diff ${oldest}^ ${newest}`, {
            cwd: targetRepo,
          })
            .toString()
            .trim();
          if (diff) return diff;
        } catch (_) {}
      }
    }
  } catch (_) {}

  // Fallback: concatenate diffs
  let combined = "";
  for (const c of commitHashes) {
    try {
      const d = execSync(`git show --format="" ${c}`, {
        cwd: targetRepo,
      })
        .toString()
        .trim();
      if (d) combined += (combined ? "\n" : "") + d;
    } catch (_) {}
  }
  return combined || getEffectiveGitDiff(targetRepo);
}

export function getLatestCommitInfo(targetRepo) {
  let commitHash = "Latest";
  let commitMsg = "Latest Changes";
  try {
    const gitLog = execSync('git log -1 --pretty=format:"%h - %s"', {
      cwd: targetRepo,
    })
      .toString()
      .trim();
    if (gitLog) {
      const [h, ...msgParts] = gitLog.split(" - ");
      commitHash = h || "Latest";
      commitMsg = msgParts.join(" - ") || gitLog;
    }
  } catch (_) {}
  return { commitHash, commitMsg };
}

export function parseDiffForCard(rawDiff, maxFiles = 4, maxLinesPerFile = 8) {
  if (!rawDiff) return [];
  const lines = rawDiff.split("\n");
  const files = [];
  let curFile = null;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const parts = line.split(/\s+/);
      const pathName = parts[3] ? parts[3].replace(/^[a-z]\//, "") : "unknown";
      curFile = { name: pathName, lines: [], totalAdd: 0, totalDel: 0 };
      files.push(curFile);
      continue;
    }
    if (
      !curFile ||
      line.startsWith("+++") ||
      line.startsWith("---") ||
      line.startsWith("@@")
    ) {
      continue;
    }
    const trimmed = line.slice(1).trim();
    if (
      !trimmed ||
      trimmed === "{" ||
      trimmed === "}" ||
      trimmed === "});" ||
      trimmed === "};" ||
      trimmed === "/*" ||
      trimmed === "*/" ||
      trimmed === "*" ||
      trimmed === "<!--" ||
      trimmed === "-->" ||
      trimmed === "//" ||
      trimmed === "#" ||
      trimmed === "--" ||
      isLunaSignatureLine(trimmed)
    )
      continue;

    if (line.startsWith("+")) {
      curFile.totalAdd++;
      if (curFile.lines.length < maxLinesPerFile) {
        curFile.lines.push({ type: "add", text: trimmed.slice(0, 95) });
      }
    } else if (line.startsWith("-")) {
      curFile.totalDel++;
      if (curFile.lines.length < maxLinesPerFile) {
        curFile.lines.push({ type: "del", text: trimmed.slice(0, 95) });
      }
    }
  }

  // Filter out binary media assets and empty files with +0 -0
  const isBinaryOrMedia = (name) =>
    /\.(png|jpe?g|gif|webp|ico|svg|bmp|tiff|pdf|lock|map)$/i.test(name);
  const isSourceCode = (name) =>
    /\.(php|blade\.php|vue|js|ts|jsx|tsx|html|css|scss|dart|py|sql|json|sh|bash)$/i.test(
      name,
    );

  const significantFiles = files.filter((f) => {
    if (isBinaryOrMedia(f.name)) return false;
    return f.totalAdd + f.totalDel > 0;
  });

  // Prioritize source code files first, then sort by total changes descending
  significantFiles.sort((a, b) => {
    const aIsCode = isSourceCode(a.name) ? 1 : 0;
    const bIsCode = isSourceCode(b.name) ? 1 : 0;
    if (aIsCode !== bIsCode) return bIsCode - aIsCode;
    return b.totalAdd + b.totalDel - (a.totalAdd + a.totalDel);
  });

  return (significantFiles.length ? significantFiles : files).slice(0, maxFiles);
}

// ---------------------------------------------------------
// 3. AI Release Notes Inference Helpers (Gemini & Ollama)
// ---------------------------------------------------------
async function generateReleaseNotesWithGemini(
  diffText,
  apiKey,
  { repoName = "", commitMsg = "", changedFiles = [], commits = [], isMerged = false } = {},
) {
  if (!apiKey || !diffText) return null;
  const cleanChanges =
    parseGitDiffToCleanChanges(diffText) || diffText.slice(0, 4000);
  if (!cleanChanges) return null;

  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
  ];
  const commitSection = isMerged && commits.length > 1
    ? `- Daftar Commit Digabungkan (${commits.length} commit):\n${commits.map((c) => `  * [${c.hash}] ${c.msg}`).join("\n")}\n`
    : (commitMsg ? `- Commit Terakhir: ${commitMsg}\n` : "");

  const prompt = `Anda adalah Software Engineer Senior dan Analis Sistem SIMRS Rumah Sakit.
Tuliskan rincian log pekerjaan pemeliharaan/perbaikan aplikasi yang LENGKAP, SPESIFIK, dan PROFESIONAL dalam Bahasa Indonesia untuk laporan pekerjaan IT Si-Pangaduan.

DATA PERUBAHAN:
- Repositori: ${repoName || "SIMRS"}
${commitSection}${changedFiles.length ? `- File yang Diubah: ${changedFiles.slice(0, 8).join(", ")}\n` : ""}
- Cuplikan Perubahan Kode:
${cleanChanges}

PETUNJUK PENULISAN:
1. DILARANG menggunakan kalimat pembuka basa-basi (JANGAN tulis "Berikut adalah...", "Tentu,", "Berikut log perbaikan...", dll). Langsung tuliskan judul modul dan rincian pekerjaan.
2. DILARANG menggunakan format markdown raw dengan asterisks (**judul**) atau sub-bullet bersarang (* teks). Gunakan format poin (• ) yang rapi.
3. ${isMerged ? `Pengguna menggabungkan ${commits.length} commit ke dalam satu dokumentasi terpadu. Rangkum seluruh poin penting dari seluruh commit dan diff tersebut secara menyeluruh ke dalam 3-5 poin (• ).` : "Tuliskan 2-4 poin yang SPESIFIK dan JELAS:"}
   - Sebutkan modul/fitur yang diperbaiki secara spesifik.
   - Jelaskan penyesuaian teknis yang dilakukan (misal: fungsionalitas tombol cetak, validasi input, perbaikan layout, dll).
   - Jelaskan dampak fungsionalnya untuk kelancaran pelayanan operasional rumah sakit.
4. Setiap poin HARUS kalimat lengkap dan diakhiri tanda titik (.). Dilarang terpotong di tengah kalimat.
5. Dilarang keras menyertakan watermark, komentar ASCII art, atau teks 'Lunar Territory'.

Rincian Pekerjaan:`;

  for (const model of candidateModels) {
    try {
      console.log(`[*] [Lunar] Calling Google ${model} for release notes...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          console.log(`[+] [Lunar] Release notes generated with Google ${model}!`);
          let cleaned = sanitizeLunaSignatureFromNotes(text.trim());
          cleaned = cleanAndFixTruncatedNotes(
            cleaned,
            repoName,
            commitMsg,
            changedFiles,
          );
          return cleaned;
        }
      }
    } catch (_) {}
  }
  return null;
}

async function generateReleaseNotesWithOllama(
  diffText,
  model = "qwen2.5-coder:7b",
  { repoName = "", commitMsg = "", changedFiles = [], commits = [], isMerged = false, ollamaUrl = "http://127.0.0.1:11434" } = {},
) {
  console.log(`[*] [Lunar] Parsing git diff for meaningful changes...`);
  const cleanChanges =
    parseGitDiffToCleanChanges(diffText) || diffText.slice(0, 3000);

  if (!cleanChanges) return null;

  const commitSection = isMerged && commits.length > 1
    ? `- Daftar Commit Digabungkan (${commits.length} commit):\n${commits.map((c) => `  * [${c.hash}] ${c.msg}`).join("\n")}\n`
    : (commitMsg ? `- Commit Terakhir: ${commitMsg}\n` : "");

  const prompt = `Anda adalah Software Engineer Senior dan Analis Sistem SIMRS Rumah Sakit.
Tuliskan rincian log pekerjaan pemeliharaan/perbaikan aplikasi yang LENGKAP, SPESIFIK, dan PROFESIONAL dalam Bahasa Indonesia untuk laporan pekerjaan IT Si-Pangaduan.

DATA PERUBAHAN:
- Repositori: ${repoName || "SIMRS"}
${commitSection}${changedFiles.length ? `- File yang Diubah: ${changedFiles.slice(0, 8).join(", ")}\n` : ""}
- Cuplikan Perubahan Kode:
${cleanChanges}

PETUNJUK PENULISAN:
1. DILARANG menggunakan kalimat pembuka basa-basi (JANGAN tulis "Berikut adalah...", "Tentu,", "Berikut log perbaikan...", dll). Langsung tuliskan judul modul dan rincian pekerjaan.
2. DILARANG menggunakan format markdown raw dengan asterisks (**judul**) atau sub-bullet bersarang (* teks). Gunakan format poin (• ) yang rapi.
3. ${isMerged ? `Pengguna menggabungkan ${commits.length} commit ke dalam satu dokumentasi terpadu. Rangkum seluruh poin penting dari seluruh commit dan diff tersebut secara menyeluruh ke dalam 3-5 poin (• ).` : "Tuliskan 2-4 poin yang SPESIFIK dan JELAS:"}
   - Sebutkan modul/fitur yang diperbaiki secara spesifik berdasarkan nama file dan commit.
   - Jelaskan penyesuaian fungsionalitas yang dilakukan (misal: tombol cetak, validasi form, perbaikan tata letak form/judul, dll).
   - Jelaskan dampak fungsionalnya untuk kelancaran pelayanan rumah sakit.
4. Setiap poin HARUS kalimat lengkap dan diakhiri tanda titik (.). Dilarang terpotong di tengah kalimat.
5. Dilarang keras menyertakan watermark, komentar ASCII art, atau teks 'Lunar Territory'.

Rincian Pekerjaan:`;

  const selectedModel = model || "qwen2.5-coder:7b";
  const baseUrl = (ollamaUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");

  console.log(
    `[*] [Lunar] Querying chosen local Ollama model (${selectedModel}) at ${baseUrl}...`,
  );
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 1500,
          num_ctx: 4096,
          top_p: 0.9,
          stop: ["\n\n\n\n", "User:", "Human:"],
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      let rawNote = data.response?.trim();
      if (rawNote && rawNote.length > 20) {
        console.log(
          `[+] [Lunar] Successfully generated release notes with local model ${selectedModel}!`,
        );
        rawNote = sanitizeLunaSignatureFromNotes(rawNote);
        rawNote = cleanAndFixTruncatedNotes(
          rawNote,
          repoName,
          commitMsg,
          changedFiles,
        );
        return rawNote;
      }
    } else {
      const errText = await response.text();
      console.log(
        `[!] [Lunar] Local model (${selectedModel}) returned HTTP ${response.status}: ${errText}`,
      );
    }
  } catch (err) {
    console.log(
      `[!] [Lunar] Local model (${selectedModel}) request failed: ${err.message}`,
    );
  }

  console.log(
    `[!] [Lunar] Local AI (${selectedModel}) unavailable or did not yield notes.`,
  );
  return null;
}

// ---------------------------------------------------------
// 4. IT Support: Automatic Recent Screenshot Discovery
// ---------------------------------------------------------
function findRecentScreenshot() {
  const candidateDirs = [
    path.join(USER_HOME, "Pictures", "Screenshots"),
    path.join(USER_HOME, "Pictures"),
    path.join(USER_HOME, "Downloads"),
    path.join(USER_HOME, "Desktop"),
    process.cwd(),
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
          if (
            Date.now() - stats.mtimeMs < 30 * 60 * 1000 &&
            stats.mtimeMs > newestTime
          ) {
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
// 4b. Multimodal AI & OCR Image/Context Fusion Analysis (IT Support & Programmer)
// ---------------------------------------------------------
/*
 * Territory: luniteExtractRmFromText — Extracts hospital medical record numbers (No. RM) from OCR or chat text.
 */
export function luniteExtractRmFromText(text = "") {
  if (!text || typeof text !== "string") return "";
  const labeledMatch = text.match(
    /(?:no\.?\s*rm|rekam\s*medis|rm)\s*[:=\-]?\s*(\d[\d\-.]{4,14}\d)/i,
  );
  if (labeledMatch && labeledMatch[1]) {
    return labeledMatch[1].trim();
  }
  const hyphenRmMatch = text.match(/\b(\d-\d{2}-\d{2}-\d{2})\b/);
  if (hyphenRmMatch && hyphenRmMatch[1]) {
    return hyphenRmMatch[1].trim();
  }
  return "";
}

/*
 * Territory: luniteExtractTimestampFromText — Extracts a date/time string (DD-MM-YYYY HH:mm or YYYY-MM-DD HH:mm) normalized to YYYY-MM-DD HH:mm.
 */
export function luniteExtractTimestampFromText(text = "") {
  if (!text || typeof text !== "string") return "";
  const dmyMatch = text.match(
    /\b(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::\d{2})?\b/,
  );
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]} ${dmyMatch[4]}:${dmyMatch[5]}`;
  }
  const ymdMatch = text.match(
    /\b(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{2}):(\d{2})(?::\d{2})?\b/,
  );
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]} ${ymdMatch[4]}:${ymdMatch[5]}`;
  }
  return "";
}

const LUNITE_GENERIC_OPTION_STOPWORDS = new Set([
  "dan", "baru", "rsu", "s.kom", "a.md", "skm", "m.eng",
  "rawat", "inap", "jalan", "medik", "medis", "umum", "penyakit",
  "dalam", "dokter", "pendaftaran", "loket", "rumah", "tangga",
  "penunjang", "pelayanan", "service", "cleaning", "aktif", "non"
]);

/*
 * Territory: luniteMatchOptionFromText — Matches the best option value from portal_options arrays based on distinctive word tokens in text.
 */
export function luniteMatchOptionFromText(text = "", options = []) {
  if (!text || !Array.isArray(options) || !options.length) return "";
  const lower = text.toLowerCase();
  const scored = [];
  for (const opt of options) {
    const rawName = String(opt.text || "").toLowerCase();
    const cleanedTokens = rawName
      .replace(/^(pav\.?|inst\.?|instalasi|poli|bagian|bidang)\s+/i, "")
      .split(/[\s\/,\.\(\)-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !LUNITE_GENERIC_OPTION_STOPWORDS.has(t));
    let score = 0;
    for (const token of cleanedTokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRegex = new RegExp(`\\b${escaped}\\b`, "i");
      if (wordRegex.test(lower)) {
        score += token.length;
      }
    }
    if (score > 0) {
      scored.push({ value: String(opt.value), score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.length ? scored[0].value : "";
}

/*
 * Territory: luniteSanitizeChatGreeting — Strips casual chat salutations and trailing reporter tags from pasted WA messages.
 */
function luniteSanitizeChatGreeting(text = "") {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(?:selamat\s+(?:pagi|siang|sore|malam)|assalamu'?alaikum|halo|permisi|punten)(?:\s+(?:mbak|mabl|mas|pak|bu|kak|dok|sus|admin|it)){0,2}(?:\s+[a-z0-9._-]+){0,2}\s*[,:!\-]?\s*/i, "")
    .replace(/^(?:mbak|mabl|mas|pak|bu)\s*[,:]?\s*/i, "")
    .replace(/[,.;\s]+(?:dari|pelapor|pengadu|oleh|pengirim|a\.?n\.?|atas\s+nama)\s*[:\-]?\s*[^,.;\n]{2,40}\s*$/i, "")
    .trim();
}

/*
 * Territory: luniteExtractPelaporFromText — Extracts reporter / Pelapor name across honorifics (dr, pak, bu, mas, mbak, bidan, suster, etc.) and unit/name labels.
 */
export function luniteExtractPelaporFromText(complaintContext = "", ocrText = "") {
  const UPPER_ACRONYMS = new Set(["igd", "icu", "iccu", "nicu", "picu", "ok", "vk", "tht", "rme", "simrs", "it", "cssd", "ipsrs"]);
  const LOWER_TITLES = { dr: "dr.", "dr.": "dr.", drg: "drg.", "drg.": "drg.", ns: "Ns.", "ns.": "Ns.", apt: "Apt.", "apt.": "Apt.", bpk: "Bpk.", "bpk.": "Bpk." };
  const TRAILING_CLAUSE_RE = /\s+(?:di|ke|untuk|karena|soal|terkait|mau|tolong|mohon|terima\s*kasih|makasih|trims|tks|ya|yg|yang)\b.*$/i;
  const VERB_BEFORE_DARI_RE = /\b(?:pindah|keluar|cetak|print|buka|ambil|edit|ubah|hapus|kirim|masuk|tarik|akses|login|lihat|muncul|error)\s+$/i;

  const formatPelapor = (raw = "") => {
    const withoutTail = raw
      .replace(TRAILING_CLAUSE_RE, "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.,;:!?()\[\]-]+$/, "")
      .trim();
    if (!withoutTail) return "";
    return withoutTail
      .split(" ")
      .map((word) => {
        const lower = word.toLowerCase();
        if (LOWER_TITLES[lower]) return LOWER_TITLES[lower];
        if (UPPER_ACRONYMS.has(lower)) return lower.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  if (complaintContext && typeof complaintContext === "string") {
    const HONORIFICS = "(?:dr\\.?|drg\\.?|ns\\.?|ners|apt\\.?|dokter|dok|bidan|suster|sus|perawat|pak|bapak|bpk\\.?|bu|ibu|mbak|mbk|mas|kak|sdr\\.?|sdri\\.?|admin|petugas|staf)";

    // Pass 1: Explicit honorific after "dari / pelapor / pengadu / oleh / a.n." (anywhere unless preceded by action verb like "pindah dari")
    const honorificRegex = new RegExp(
      `(?:^|[,.;!?\\n]\\s*|\\s+)(?:dari|pelapor|pengadu|oleh|pengirim|a\\.?n\\.?|atas\\s+nama)\\s*[:\\-]?\\s*(${HONORIFICS}\\s+[a-z][a-z.'\\s]{1,32})`,
      "gi",
    );
    let match;
    while ((match = honorificRegex.exec(complaintContext)) !== null) {
      const beforeKeyword = complaintContext.slice(0, match.index + (match[0].match(/^\s*/)?.[0]?.length || 0));
      if (!VERB_BEFORE_DARI_RE.test(beforeKeyword)) {
        const candidate = formatPelapor(match[1].split(/[,;!?\(\)\n]|\.\s+(?!(?:[a-z]{2,}))/i)[0].replace(/\.\s*$/, ""));
        if (candidate) return candidate;
      }
    }

    // Pass 2: Explicit label/separator without honorific (e.g. ", Dari Sari", "Pelapor: IGD", "keluhan dari IGD")
    const genericRegex = /(?:^|[,.;!?\n]\s*|\s+)(?:dari|pelapor|pengadu|oleh|pengirim|a\.?n\.?|atas\s+nama)\s*[:\-]?\s*([a-z][a-z.'\s]{1,32})/gi;
    while ((match = genericRegex.exec(complaintContext)) !== null) {
      const beforeKeyword = complaintContext.slice(0, match.index + (match[0].match(/^\s*/)?.[0]?.length || 0));
      if (!VERB_BEFORE_DARI_RE.test(beforeKeyword)) {
        const rawSeg = match[1].split(/[,;!?\(\)\n]|\.(?=\s*$)/)[0];
        const candidate = formatPelapor(rawSeg);
        if (candidate && !/^(?:sekarang|kemarin|tadi|sistem|aplikasi|modul|surat)$/i.test(candidate)) {
          return candidate;
        }
      }
    }

    // Pass 3: Trailing signature with honorific at end of message (e.g. "..., pak budi" or "... - mbak rina")
    const trailingHonorificRegex = new RegExp(
      `[,.;\\-\\n]\\s*(${HONORIFICS}\\s+[a-z][a-z.'\\s]{1,28})\\s*$`,
      "i",
    );
    const trailingMatch = complaintContext.match(trailingHonorificRegex);
    if (trailingMatch && trailingMatch[1]) {
      const candidate = formatPelapor(trailingMatch[1]);
      if (candidate) return candidate;
    }
  }

  if (ocrText && typeof ocrText === "string") {
    const docMatch = ocrText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2},\s*dr\.?)\b/);
    if (docMatch && docMatch[1]) {
      return docMatch[1].trim();
    }
  }

  return "";
}

/*
 * Territory: luniteFindOptionName — Resolves display label for an option value in portal_options.
 */
function luniteFindOptionName(value, options = []) {
  if (!value || !Array.isArray(options)) return "";
  const found = options.find((o) => String(o.value) === String(value));
  return found ? found.text : "";
}

/*
 * Territory: luniteRunLocalOcr — Extracts text from screenshot via Tesseract or native Windows.Media.Ocr fallback.
 */
function luniteRunLocalOcr(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return "";

  try {
    const tesseractOut = execSync(
      `tesseract "${targetPath}" stdout --oem 1 -l eng`,
      { timeout: 10000, stdio: ["ignore", "pipe", "ignore"] },
    )
      .toString()
      .trim();
    if (tesseractOut) {
      console.log(
        `[+] [Lunar] Tesseract extracted OCR text (${tesseractOut.length} chars)`,
      );
      return tesseractOut;
    }
  } catch (_) {}

  if (process.platform === "win32") {
    const tmpPs1 = path.join(os.tmpdir(), `lunite_ocr_${Date.now()}.ps1`);
    try {
      const safeImgPath = path.resolve(targetPath).replace(/'/g, "''");
      const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapTransform,Windows.Graphics,ContentType=WindowsRuntime]
[void][Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics,ContentType=WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) { exit 0 }
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('${safeImgPath}')) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = $null
if ($decoder.PixelWidth -lt 1000) {
  $transform = New-Object Windows.Graphics.Imaging.BitmapTransform
  $transform.ScaledWidth = [uint32]($decoder.PixelWidth * 2)
  $transform.ScaledHeight = [uint32]($decoder.PixelHeight * 2)
  $transform.InterpolationMode = [Windows.Graphics.Imaging.BitmapInterpolationMode]::Cubic
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync($decoder.BitmapPixelFormat, $decoder.BitmapAlphaMode, $transform, [Windows.Graphics.Imaging.ExifOrientationMode]::RespectExifOrientation, [Windows.Graphics.Imaging.ColorManagementMode]::ColorManageToSRgb)) ([Windows.Graphics.Imaging.SoftwareBitmap])
} else {
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
}
$ocrResult = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
if ($ocrResult -and $ocrResult.Text) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $ocrResult.Text
}
`;
      fs.writeFileSync(tmpPs1, psScript, "utf8");
      const winOcrOut = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpPs1}"`,
        { timeout: 12000, stdio: ["ignore", "pipe", "ignore"] },
      )
        .toString()
        .trim();
      if (winOcrOut) {
        console.log(
          `[+] [Lunar] Windows OCR extracted text (${winOcrOut.length} chars)`,
        );
        return winOcrOut;
      }
    } catch (_) {
    } finally {
      try {
        if (fs.existsSync(tmpPs1)) fs.unlinkSync(tmpPs1);
      } catch (_) {}
    }
  }

  return "";
}

/*
 * Territory: luniteBuildCompactOllamaPrompt — Builds concise, zero-bloat prompt for local Ollama models (prevents context overflow & hallucination).
 */
function luniteBuildCompactOllamaPrompt({
  role = "it_support",
  complaintContext = "",
  solutionHint = "",
  ocrText = "",
} = {}) {
  const cleanChat = complaintContext ? luniteSanitizeChatGreeting(complaintContext) : "";
  const cleanOcr = ocrText ? ocrText.replace(/\s+/g, " ").trim().slice(0, 900) : "";

  return `Anda asisten ${role === "programmer" ? "Programmer SIMRS" : "IT Support SIMRS"} rumah sakit.
Susun ringkasan laporan tiket Si-Pangaduan dalam Bahasa Indonesia yang formal, jelas, dan padat (2-3 kalimat) berdasarkan data berikut:
${cleanChat ? `- Keluhan staf: "${cleanChat}"` : "- Tidak ada pesan chat tambahan."}
${cleanOcr ? `- Teks terbaca dari screenshot (OCR): "${cleanOcr}"` : ""}
${solutionHint ? `- Tindakan / solusi IT: "${solutionHint.trim()}"` : "- Tindakan IT: Pengecekan data/sistem terkait pada SIMRS atau perangkat, penyesuaian akses/perbaikan konfigurasi, dan verifikasi berjalan normal."}

ATURAN:
1. Langsung tuliskan 2-3 kalimat isi laporan siap pakai (tanpa kata pembuka, tanpa markdown **, tanpa JSON, tanpa menyebut 'Lunar' atau 'Miharin').
2. Jangan mengarang nomor RM, nama ruangan, atau tanggal jika tidak ada pada data di atas.`;
}

/*
 * Territory: luniteBuildSupportFusionPrompt — Builds structured prompt fusing screenshot visual evidence, user complaint chat, OCR text, and portal taxonomy.
 */
function luniteBuildSupportFusionPrompt({
  role = "it_support",
  complaintContext = "",
  solutionHint = "",
  ocrText = "",
  portalOptions = {},
  hasImage = true,
} = {}) {
  const unitList = (portalOptions.unitOptions || [])
    .map((u) => `${u.value}:${u.text}`)
    .join(" | ");
  const jenisList = (portalOptions.jenisAduanOptions || [])
    .map((j) => `${j.value}:${j.text}`)
    .join(" | ");
  const petugasList = (portalOptions.petugasOptions || [])
    .map((p) => `${p.value}:${p.text}`)
    .join(" | ");

  const roleHeader =
    role === "programmer"
      ? "Anda asisten software engineer SIMRS rumah sakit."
      : "Anda asisten IT Support & SIMRS rumah sakit.";

  return `${roleHeader}
Tugas Anda adalah menggabungkan seluruh informasi berikut untuk menyusun laporan tiket Si-Pangaduan secara akurat dan profesional dalam Bahasa Indonesia:
${hasImage ? "- Ada TAMPILAN GAMBAR / SCREENSHOT terlampir (periksa teks No. RM, nama ruangan/unit, diagnosa, modul/dokumen, pesan error, dan tanggal/jam yang tampak)." : "- Tidak ada gambar langsung ke model; gunakan hasil OCR (jika ada) dan pesan aduan."}
${ocrText ? `- TEKS HASIL OCR SCREENSHOT:\n"""\n${ocrText.slice(0, 1500)}\n"""` : ""}
${complaintContext ? `- PESAN ADUAN / CHAT ASLI DARI STAF:\n"""\n${complaintContext.trim()}\n"""` : "- Tidak ada pesan chat tambahan."}
${solutionHint ? `- CATATAN TINDAKAN / SOLUSI IT DARI PETUGAS:\n"""\n${solutionHint.trim()}\n"""` : ""}

REFERENSI PILIHAN PORTAL (gunakan HANYA value ID yang cocok jika terdeteksi, atau "" jika tidak yakin):
- UNIT: ${unitList}
- JENIS ADUAN: ${jenisList}
- PETUGAS IT: ${petugasList}

ATURAN WAJIB:
1. Gabungkan konteks pesan aduan staf dan fakta pada screenshot (jika ada) menjadi uraian laporan yang formal, jelas, dan padat (2-4 kalimat): sebutkan keluhan/permasalahan spesifik beserta nomor RM/dokumen/perangkat bila relevan, lalu jelaskan tindakan penyelesaian IT yang dilakukan hingga selesai/normal.
2. Dilarang keras menyebutkan atau menyertakan watermark, komentar ASCII art, teks 'Lunar Territory', signature kode ('Hands off, unless you're Miharin'), atau nama pengembang/Luna.
3. Jawab HANYA dalam format JSON valid (tanpa markdown fence, tanpa teks lain) dengan struktur tepat seperti ini:
{
  "isiKomplain": "teks uraian laporan formal siap pakai untuk Si-Pangaduan",
  "noRm": "contoh 0-93-80-69 atau string kosong",
  "suggestedUnitValue": "kode angka unit atau string kosong",
  "suggestedJenisValue": "kode angka jenis aduan atau string kosong",
  "suggestedPetugasValue": "NIP petugas jika disebut di pesan atau string kosong",
  "suggestedNamaPengadu": "nama pelapor/ruangan pengadu jika jelas atau string kosong",
  "extractedTimestamp": "format YYYY-MM-DD HH:mm jika tanggal/jam tampak di screenshot atau string kosong"
}`;
}

/*
 * Territory: luniteParseSupportFusionResponse — Parses AI JSON response (or plain-text fallback) and enriches extracted fields deterministically.
 */
function luniteParseSupportFusionResponse(
  rawText,
  { ocrText = "", complaintContext = "", solutionHint = "", portalOptions = {} } = {},
) {
  const combinedText = [complaintContext, ocrText, rawText].filter(Boolean).join("\n");
  let parsed = null;

  if (rawText && typeof rawText === "string") {
    const trimmed = rawText.trim();
    const fenceStripped = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      parsed = JSON.parse(fenceStripped);
    } catch (_) {
      const jsonMatch = fenceStripped.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (_) {}
      }
    }
  }

  const unitOptions = portalOptions.unitOptions || [];
  const jenisOptions = portalOptions.jenisAduanOptions || [];
  const petugasOptions = portalOptions.petugasOptions || [];

  const validUnitSet = new Set(unitOptions.map((u) => String(u.value)));
  const validJenisSet = new Set(jenisOptions.map((j) => String(j.value)));
  const validPetugasSet = new Set(petugasOptions.map((p) => String(p.value)));

  let isiKomplain =
    parsed && typeof parsed.isiKomplain === "string" && parsed.isiKomplain.trim()
      ? parsed.isiKomplain.trim()
      : (rawText || "").trim();

  if (parsed && !isiKomplain && complaintContext) {
    isiKomplain = complaintContext.trim();
  }

  const deterministicText = [complaintContext, ocrText].filter(Boolean).join("\n");

  let noRm =
    parsed && typeof parsed.noRm === "string" ? parsed.noRm.trim() : "";
  if (!noRm || noRm === "-") {
    noRm = luniteExtractRmFromText(deterministicText);
  }

  let unitValue =
    parsed && typeof parsed.suggestedUnitValue === "string"
      ? parsed.suggestedUnitValue.trim()
      : "";
  if (!validUnitSet.has(unitValue)) {
    unitValue = luniteMatchOptionFromText(complaintContext, unitOptions);
    if (!unitValue && ocrText) {
      const isMultiRoomCheckboxForm = /(?:stroke\s*corner|nicu|iccu|rengganis|teratai)/i.test(ocrText) && /(?:surat|masuk\s*rumah|sospek|suspek)/i.test(ocrText);
      if (!isMultiRoomCheckboxForm) {
        unitValue = luniteMatchOptionFromText(ocrText, unitOptions);
      }
    }
  }

  let jenisAduanValue =
    parsed && typeof parsed.suggestedJenisValue === "string"
      ? parsed.suggestedJenisValue.trim()
      : "";
  if (!validJenisSet.has(jenisAduanValue)) {
    if (/diagnosa|surat\s*mrs|simrs|rme|aplikasi|modul|tidak\s*bisa\s*(?:di\s*)?edit|error|bug/i.test(combinedText)) {
      jenisAduanValue = validJenisSet.has("1")
        ? "1"
        : validJenisSet.has("4")
          ? "4"
          : "";
    } else if (/printer|toner|cartridge|pc|komputer|monitor|keyboard|mouse|os|windows/i.test(combinedText)) {
      jenisAduanValue = validJenisSet.has("7") ? "7" : "";
    } else if (/lan|jaringan|wifi|kabel|rj45|internet|ping|switch/i.test(combinedText)) {
      jenisAduanValue = validJenisSet.has("6") ? "6" : "";
    }
  }

  let petugasValue =
    parsed && typeof parsed.suggestedPetugasValue === "string"
      ? parsed.suggestedPetugasValue.trim()
      : "";
  if (!validPetugasSet.has(petugasValue)) {
    petugasValue = luniteMatchOptionFromText(complaintContext, petugasOptions);
  }

  let namaPengadu =
    parsed && typeof parsed.suggestedNamaPengadu === "string"
      ? parsed.suggestedNamaPengadu.trim()
      : "";
  if (!namaPengadu) {
    namaPengadu = luniteExtractPelaporFromText(complaintContext, ocrText);
  }

  let extractedTimestamp =
    parsed && typeof parsed.extractedTimestamp === "string"
      ? parsed.extractedTimestamp.trim()
      : "";
  if (!extractedTimestamp) {
    extractedTimestamp = luniteExtractTimestampFromText(deterministicText);
  }

  return {
    isiKomplain: sanitizeLunaSignatureFromNotes(isiKomplain),
    extracted: {
      noRm: noRm || "",
      unitValue: unitValue || "",
      unitName: luniteFindOptionName(unitValue, unitOptions),
      jenisAduanValue: jenisAduanValue || "",
      jenisName: luniteFindOptionName(jenisAduanValue, jenisOptions),
      petugasValue: petugasValue || "",
      petugasName: luniteFindOptionName(petugasValue, petugasOptions),
      namaPengadu: namaPengadu || "",
      extractedTimestamp: extractedTimestamp || "",
      solutionApplied: Boolean(solutionHint && solutionHint.trim()),
    },
  };
}

export async function analyzeSupportEvidenceImage({
  imageBase64 = null,
  imagePath = null,
  fileName = "evidence.png",
  unitValue = "44",
  jenisAduanValue = "1",
  complaintContext = "",
  solutionHint = "",
  apiKey = null,
  role = "it_support",
  aiMode = null,
  localModel = null,
  ollamaUrl = null,
} = {}) {
  let targetPath = imagePath;
  let rawBase64 = null;

  if (imageBase64) {
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    rawBase64 = matches ? matches[2] : imageBase64;
    const buffer = Buffer.from(rawBase64, "base64");
    const evidenceDir = path.resolve(process.cwd(), "evidence");
    if (!fs.existsSync(evidenceDir)) {
      try {
        fs.mkdirSync(evidenceDir, { recursive: true });
      } catch (_) {}
    }
    const ext =
      fileName && path.extname(fileName) ? path.extname(fileName) : ".png";
    const prefix = role === "programmer" ? "programmer_evidence" : "support_evidence";
    targetPath = path.resolve(
      evidenceDir,
      `${prefix}_${Date.now()}${ext}`,
    );
    fs.writeFileSync(targetPath, buffer);
    console.log(
      `[+] [Lunar] Saved ${role === "programmer" ? "Programmer" : "IT Support"} evidence image to: ${targetPath}`,
    );
  } else if (targetPath && fs.existsSync(targetPath)) {
    rawBase64 = fs.readFileSync(targetPath).toString("base64");
  } else if (!complaintContext || !complaintContext.trim()) {
    throw new Error("Harap lampirkan gambar bukti atau masukkan pesan aduan / kronologi masalah.");
  }

  let rawAiResponse = null;
  let analysisSource = null;

  const settings = getEffectiveSettings();
  const portalOptions = loadPortalOptions();
  const finalApiKey =
    apiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY;
  const effectiveAiMode = aiMode || settings.aiMode || "gemini_fallback";
  const effectiveLocalModel = localModel || settings.localModel || "qwen2.5-coder:7b";
  const effectiveOllamaUrl = (ollamaUrl || settings.ollamaUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");

  const fusionPrompt = luniteBuildSupportFusionPrompt({
    role,
    complaintContext,
    solutionHint,
    portalOptions,
    hasImage: Boolean(rawBase64),
  });

  // 1. Priority #1: Official Google Gemini 2.5 Flash / Flash Latest API (if not local_only)
  if (effectiveAiMode !== "local_only" && finalApiKey && (rawBase64 || complaintContext.trim())) {
    const candidateGeminiModels = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
    ];

    const extName = (
      fileName && path.extname(fileName) ? path.extname(fileName) : ".png"
    ).toLowerCase();
    const mimeType =
      extName === ".jpg" || extName === ".jpeg"
        ? "image/jpeg"
        : extName === ".webp"
          ? "image/webp"
          : "image/png";

    const parts = [{ text: fusionPrompt }];
    if (rawBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: rawBase64,
        },
      });
    }

    for (const geminiModel of candidateGeminiModels) {
      console.log(
        `[*] [Lunar] Calling Google ${geminiModel} ${rawBase64 ? "Vision+Context" : "Context"} Fusion...`,
      );
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${finalApiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            rawAiResponse = text.trim();
            analysisSource = `Gemini (${geminiModel})`;
            console.log(
              `[+] [Lunar] Fusion analysis succeeded with ${analysisSource}!`,
            );
            break;
          }
        } else {
          const errText = await geminiRes.text();
          console.log(
            `[!] [Lunar] Gemini API (${geminiModel}) returned status ${geminiRes.status}: ${errText}`,
          );
        }
      } catch (geminiErr) {
        console.log(
          `[!] [Lunar] Gemini request (${geminiModel}) failed: ${geminiErr.message}`,
        );
      }
    }
  }

  // 2. Priority #2: Local Ollama Multimodal Vision (only installed vision models) -> then Local OCR + Text Ollama Fusion
  let ocrText = "";
  if (!rawAiResponse && effectiveAiMode !== "gemini_only" && (rawBase64 || complaintContext.trim())) {
    let installedModels = [];
    try {
      const tagsController = new AbortController();
      const tagsTimeout = setTimeout(() => tagsController.abort(), 2000);
      const tagsRes = await fetch(`${effectiveOllamaUrl}/api/tags`, { signal: tagsController.signal });
      clearTimeout(tagsTimeout);
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        installedModels = (tagsData.models || []).map((m) => m.name || m.model);
      }
    } catch (_) {}

    const visionCandidates = [
      effectiveLocalModel,
      "luna",
      "gemma4:e4b",
      "llava",
      "qwen2.5-vl",
      "qwen2.5vl",
      "gemma3",
    ].filter((m, i, arr) => {
      if (!m || arr.indexOf(m) !== i) return false;
      if (installedModels.length > 0) {
        return installedModels.some((im) => im === m || im.startsWith(m + ":"));
      }
      return true;
    });

    if (rawBase64) {
      console.log(`[*] [Lunar] Checking Ollama vision models (${visionCandidates.join(", ") || "none"})...`);
      for (const model of visionCandidates) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          const res = await fetch(`${effectiveOllamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              prompt: fusionPrompt,
              images: [rawBase64],
              stream: false,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.response && data.response.trim()) {
              rawAiResponse = data.response.trim();
              analysisSource = `Ollama Vision (${model})`;
              console.log(
                `[+] [Lunar] Vision fusion succeeded with ${analysisSource}!`,
              );
              break;
            }
          }
        } catch (_) {}
      }
    }

    // Extract OCR text before falling back to text-only Ollama model
    if (!rawAiResponse && targetPath && fs.existsSync(targetPath)) {
      ocrText = luniteRunLocalOcr(targetPath);
    }

    // Text-only Ollama Fusion (e.g. qwen2.5-coder:7b + Windows OCR + WA chat message)
    if (!rawAiResponse && (ocrText || complaintContext.trim())) {
      const compactPrompt = luniteBuildCompactOllamaPrompt({
        role,
        complaintContext,
        solutionHint,
        ocrText,
      });
      const textCandidates = [
        effectiveLocalModel,
        ...installedModels,
      ].filter((m, i, arr) => m && arr.indexOf(m) === i);

      console.log(`[*] [Lunar] Attempting Ollama Text+OCR fusion (${textCandidates[0] || "default"})...`);
      for (const model of textCandidates) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000);
          const res = await fetch(`${effectiveOllamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              prompt: compactPrompt,
              stream: false,
              options: {
                temperature: 0.15,
                num_predict: 260,
              },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.response && data.response.trim()) {
              rawAiResponse = data.response.trim();
              analysisSource = ocrText
                ? `Ollama (${model}) + OCR`
                : `Ollama (${model})`;
              console.log(
                `[+] [Lunar] Text+OCR fusion succeeded with ${analysisSource}!`,
              );
              break;
            }
          }
        } catch (_) {}
      }
    }
  }

  // 3. Always attempt local OCR when no AI result was returned (e.g. gemini_only mode) and an image exists
  if (!rawAiResponse && !ocrText && targetPath && fs.existsSync(targetPath)) {
    ocrText = luniteRunLocalOcr(targetPath);
  }

  // 4. Parse AI JSON or build deterministic Context + OCR fallback
  let parsedResult;
  if (rawAiResponse) {
    parsedResult = luniteParseSupportFusionResponse(rawAiResponse, {
      ocrText,
      complaintContext,
      solutionHint,
      portalOptions,
    });
  } else {
    const combinedRaw = [complaintContext, ocrText].filter(Boolean).join("\n");
    const lower = combinedRaw.toLowerCase();
    const snippet = ocrText
      ? ocrText.replace(/\s+/g, " ").trim().slice(0, 120)
      : "";
    const rmFound = luniteExtractRmFromText(combinedRaw);
    let fallbackText = "";

    if (complaintContext && complaintContext.trim()) {
      const cleanContext = luniteSanitizeChatGreeting(complaintContext);
      const solutionPart = solutionHint && solutionHint.trim()
        ? solutionHint.trim()
        : /mrs|diagnosa|rawat\s*inap|terlayani|edit|simrs|rme/i.test(lower)
          ? "Dilakukan pengecekan data registrasi pasien pada modul SIMRS, penyesuaian/pembukaan akses edit data terkait agar sesuai kondisi klinis, dan verifikasi penyimpanan berhasil."
          : "Dilakukan penelusuran kendala bersama unit terkait, perbaikan konfigurasi/akses sistem, dan verifikasi layanan telah kembali normal.";
      fallbackText = `Penanganan Aduan Unit${rmFound ? ` (No. RM: ${rmFound})` : ""}:\nBerdasarkan laporan unit terkait kendala: "${cleanContext}"${snippet ? ` serta bukti terlampir ("${snippet}")` : ""}. ${solutionPart}`;
      analysisSource = ocrText ? "Context + OCR Fusion Fallback" : "Complaint Context Fallback";
    } else if (role === "programmer") {
      if (
        /error|exception|sql|failed|timeout|http|500|404|database|unauthorized|null|undefined|syntaxerror|typeerror|uncaught/i.test(
          lower,
        )
      ) {
        fallbackText = `Perbaikan Bug / Error Aplikasi SIMRS:\nTerdeteksi kendala eksekusi sistem pada antarmuka aplikasi${snippet ? ` ("${snippet}")` : ""}. Dilakukan penelusuran exception, debugging alur kode sumber, penyesuaian penanganan data, dan modul berhasil kembali berjalan dengan normal.`;
        analysisSource = "Tesseract OCR (Code/Error Pattern)";
      } else if (ocrText && ocrText.length > 15) {
        fallbackText = `Pengembangan & Pemeliharaan Modul SIMRS:\nBerdasarkan tangkapan layar antarmuka sistem${snippet ? ` ("${snippet}")` : ""}. Dilakukan penyesuaian fungsionalitas komponen, optimasi alur kerja pengguna, dan verifikasi tampilan modul berfungsi dengan baik.`;
        analysisSource = "Tesseract OCR (Module Feature Pattern)";
      } else {
        fallbackText = `Pemeliharaan dan Perbaikan Modul SIMRS:\nDilakukan perbaikan fungsionalitas dan penyesuaian tampilan modul aplikasi berdasarkan tangkapan layar terlampir. Pengujian modul selesai dilakukan dan siap digunakan oleh unit kerja.`;
        analysisSource = "Programmer Fallback";
      }
    } else {
      if (
        /paper|jam|cartridge|toner|spooler|roller|print|canon|epson|brother|tray|ink|ribbon/.test(
          lower,
        )
      ) {
        fallbackText = `Kendala Printer:\nTerindikasi kendala pencetakan / paper jam${snippet ? ` ("${snippet}")` : ""} pada perangkat printer. Dilakukan pemeriksaan mekanik penarik kertas, pembersihan sisa serpihan pada roller, reset print spooler, dan uji coba cetak dokumen berhasil keluar dengan jelas dan normal.`;
        analysisSource = "Tesseract OCR (Printer Pattern)";
      } else if (
        /network|ethernet|lan|cable|unplugged|disconnected|internet|dns|gateway|dhcp|ip conflict|wifi/.test(
          lower,
        )
      ) {
        fallbackText = `Kendala Konektivitas Jaringan:\nTerdeteksi gangguan sambungan jaringan LAN / komunikasi data${snippet ? ` ("${snippet}")` : ""}. Dilakukan pengecekan konektor RJ45 dan kabel UTP, pengujian koneksi switch, peremajaan IP configuration, serta verifikasi ping ke server SIMRS kembali lancar dan stabil.`;
        analysisSource = "Tesseract OCR (Network Pattern)";
      } else if (
        /no signal|out of range|display|hdmi|vga|monitor|blank|flicker/.test(
          lower,
        )
      ) {
        fallbackText = `Kendala Tampilan Monitor:\nLayar monitor tidak menampilkan output / no signal${snippet ? ` ("${snippet}")` : ""}. Dilakukan pemeriksaan sambungan kabel display (HDMI/VGA), re-seating port display adapter dan kabel daya, serta penyesuaian resolusi. Tampilan layar kembali menyala normal.`;
        analysisSource = "Tesseract OCR (Display Pattern)";
      } else if (
        /bsod|blue screen|reboot|boot|windows|crash|system error|0x[0-9a-f]+/i.test(
          lower,
        )
      ) {
        fallbackText = `Kendala Sistem Operasi / Komputer:\nPerangkat mengalami crash / indikasi error sistem${snippet ? ` ("${snippet}")` : ""}. Dilakukan pemeriksaan startup, perbaikan integritas berkas sistem, pembersihan temporary cache, dan uji restart. Komputer dapat beroperasi kembali secara normal.`;
        analysisSource = "Tesseract OCR (OS/System Pattern)";
      } else if (
        /surat masuk rumah sakit|mrs|diagnosa|suspek|rawat inap/.test(lower)
      ) {
        fallbackText = `Penanganan Aduan Surat Masuk Rumah Sakit (MRS)${rmFound ? ` No. RM ${rmFound}` : ""}:\nTerdapat kendala pembaruan data/diagnosa pada dokumen Surat Masuk Rumah Sakit (MRS)${snippet ? ` ("${snippet}")` : ""}. Dilakukan pengecekan data registrasi pasien pada SIMRS, penyesuaian akses edit diagnosa, dan verifikasi cetak ulang dokumen telah sesuai.`;
        analysisSource = "Tesseract OCR (MRS Document Pattern)";
      } else if (
        /error|exception|sql|failed|timeout|http|500|404|database|unauthorized|login|warning/i.test(
          lower,
        )
      ) {
        fallbackText = `Kendala Aplikasi SIMRS / Sistem Informasi:\nMuncul notifikasi kendala pada antarmuka aplikasi${snippet ? ` ("${snippet}")` : ""}. Dilakukan penelusuran pesan error, perbaikan konfigurasi sesi pengguna, pengujian alur modul, dan aplikasi dapat kembali digunakan oleh staf unit kerja.`;
        analysisSource = "Tesseract OCR (Application Error Pattern)";
      } else if (ocrText && ocrText.length > 15) {
        fallbackText = `Kendala Operasional IT:\nBerdasarkan keterangan yang tertera pada layar / foto kendala:\n"${snippet}"\nDilakukan penanganan teknis, perbaikan konfigurasi, dan pengujian fungsi hingga sistem kembali beroperasi dengan baik.`;
        analysisSource = "Tesseract OCR (General Text)";
      } else {
        fallbackText = `Pemeliharaan dan Perbaikan Perangkat IT:\nDilakukan inspeksi fisik terhadap perangkat keras dan sambungan kabel pada unit kerja berdasarkan foto kendala terlampir. Dilakukan troubleshooting teknis, pembersihan komponen, dan pengujian fungsionalitas hingga perangkat berfungsi normal kembali.`;
        analysisSource = "Contextual Hardware Fallback";
      }
    }

    parsedResult = luniteParseSupportFusionResponse(fallbackText, {
      ocrText,
      complaintContext,
      solutionHint,
      portalOptions,
    });
  }

  return {
    success: true,
    analysis: parsedResult.isiKomplain,
    source: analysisSource,
    imagePath: targetPath || null,
    extractedOcr: ocrText || null,
    extracted: parsedResult.extracted,
  };
}
// ---------------------------------------------------------
export async function generateGitDiffCard({
  repoPath = process.cwd(),
  outPath = null,
  commits = [],
  today = null,
} = {}) {
  const effectiveToday = today || lunar_getTodayDateString();
  const finalOutPath =
    outPath || lunar_getDocumentationEvidencePath(repoPath, effectiveToday ? new Date(effectiveToday) : new Date());
  console.log(
    `[*] [Lunar] Generating blazing-fast Git Diff Evidence Card for "${repoPath}" (~300ms)...`,
  );
  let branchName = "dev";
  const repoName = path.basename(repoPath);

  const commitInfo = lunar_getMergedCommitInfo(repoPath, commits);
  const hash = commitInfo.commitHash;
  const commitMsg = commitInfo.commitMsg;
  const isMerged = commitInfo.isMerged;
  const commitCount = commitInfo.count;
  const commitList = commitInfo.commits || [];
  const gitDiff = commits && commits.length
    ? lunar_getDiffForCommits(repoPath, commits)
    : getEffectiveGitDiff(repoPath);

  try {
    branchName = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoPath })
      .toString()
      .trim();
  } catch (_) {}

  const parsedFiles = parseDiffForCard(gitDiff, isMerged ? 6 : 4, isMerged ? 10 : 8);

  let filesHtml = "";
  for (const f of parsedFiles) {
    let linesHtml = "";
    for (const l of f.lines) {
      const isAdd = l.type === "add";
      linesHtml += `
                <div class="line ${isAdd ? "add" : "del"}">
                    <span class="line-sign ${isAdd ? "line-add-sign" : "line-del-sign"}">${isAdd ? "+" : "-"}</span>
                    <span>${escapeHtml(l.text)}</span>
                </div>
            `;
    }
    if (f.totalAdd + f.totalDel > f.lines.length) {
      linesHtml += `<div class="line more" style="color:#94a3b8; font-style:italic; padding-left:32px;">... dan ${f.totalAdd + f.totalDel - f.lines.length} baris perubahan lainnya</div>`;
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
        .card { width: 960px; background: #151122; border: none; border-radius: 18px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(225,29,72,0.18); }
        .header { background: #1b152b; padding: 16px 22px; border: none; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 14px rgba(0,0,0,0.35); }
        .dots { display: flex; gap: 8px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot.r { background: #ff5f56; }
        .dot.y { background: #ffbd2e; }
        .dot.g { background: #27c93f; }
        .title { font-size: 13px; font-weight: 700; color: #cbd5e1; letter-spacing: 0.5px; }
        .meta-bar { background: #130f1e; padding: 12px 22px; border: none; display: flex; gap: 20px; font-size: 12px; color: #94a3b8; }
        .meta-item b { color: #f1f5f9; }
        .badge { background: #e11d48; color: #fff; padding: 4px 12px; border-radius: 8px; font-weight: 700; font-size: 11px; font-family: monospace; box-shadow: 0 2px 8px rgba(225,29,72,0.4); border: none; }
        .file-section { border: none; margin-bottom: 6px; }
        .file-header { background: #191428; padding: 10px 18px; font-size: 12px; font-weight: 700; color: #f1f5f9; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #e11d48; }
        .file-path { font-family: monospace; }
        .code-block { font-family: "JetBrains Mono", monospace; font-size: 12px; line-height: 1.6; }
        .line { padding: 3px 16px; display: flex; gap: 12px; }
        .line.del { background: rgba(239, 68, 68, 0.12); color: #fca5a5; }
        .line.add { background: rgba(34, 197, 94, 0.12); color: #86efac; }
        .line-sign { width: 14px; font-weight: bold; user-select: none; }
        .line-del-sign { color: #ef4444; }
        .line-add-sign { color: #22c55e; }
        .footer { padding: 12px 22px; background: #0d0a15; border: none; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <div class="dots"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div></div>
                <div class="title">EVIDENCE OF WORK • ${isMerged ? `MERGED GIT COMMITS (${commitCount})` : "GIT COMMIT VERIFICATION"}</div>
                <div class="badge" ${isMerged ? 'style="background: #8b5cf6; box-shadow: 0 2px 8px rgba(139,92,246,0.4);"' : ""}>${escapeHtml(hash)}</div>
            </div>
            <div class="meta-bar">
                <div class="meta-item">Repository: <b>${escapeHtml(repoName)}</b></div>
                <div class="meta-item">Branch: <b>${escapeHtml(branchName)}</b></div>
                <div class="meta-item">Commit: <b>${escapeHtml(isMerged ? `${commitCount} Commits Digabungkan` : commitMsg)}</b></div>
            </div>
            ${isMerged && commitList.length ? `
            <div style="background: #100c1c; padding: 10px 22px; font-size: 11px; color: #cbd5e1; border-top: 1px solid rgba(139,92,246,0.2); display: flex; flex-direction: column; gap: 4px;">
                <div style="color: #c4b5fd; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Daftar Commit yang Digabungkan:</div>
                ${commitList.map((c) => `
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span style="background:rgba(139,92,246,0.3); color:#ddd6fe; padding:2px 6px; border-radius:4px; font-family:monospace; font-weight:700;">${escapeHtml(c.hash)}</span>
                        <span style="color:#e2e8f0;">${escapeHtml(c.msg)}</span>
                    </div>
                `).join("")}
            </div>
            ` : ""}
            ${filesHtml}
            <div class="footer">
                <span>Verified by Lunar Sentinel (Si-Pangaduan Bridge) • documentation/changes-${escapeHtml(effectiveToday)}.png</span>
                <span>${new Date().toLocaleString("id-ID")}</span>
            </div>
        </div>
    </body>
    </html>`;

  const isWindows = process.platform === "win32";
  const browser = await chromium.launch({
    executablePath: isWindows
      ? undefined
      : fs.existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
    channel: isWindows ? "chrome" : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({
    viewport: { width: 1040, height: 700 },
  });
  await page.setContent(html);
  const card = page.locator(".card");
  await card.screenshot({ path: finalOutPath });
  try {
    const fallbackPath = path.resolve(__dirname, "git_diff_evidence.png");
    if (path.resolve(finalOutPath) !== fallbackPath) {
      fs.copyFileSync(finalOutPath, fallbackPath);
    }
    const repoFallback = path.resolve(repoPath, "git_diff_evidence.png");
    if (path.resolve(finalOutPath) !== repoFallback) {
      fs.copyFileSync(finalOutPath, repoFallback);
    }
  } catch (_) {}
  await browser.close();

  console.log(
    `[+] [Lunar] Git Diff Evidence Card rendered successfully: ${finalOutPath}`,
  );
  return finalOutPath;
}

// ---------------------------------------------------------
// 5.1 Legacy Live Screenshot Capture (Port 5500 Fallback)
// ---------------------------------------------------------
async function captureRemedisEvidence(
  targetModule = "Asuhan Kepenataan Anestesi",
) {
  console.log(
    `[*] [Lunar] Capturing live evidence for "${targetModule}" on port 5500...`,
  );
  const isWindows = process.platform === "win32";
  const browser = await chromium.launch({
    executablePath: isWindows
      ? undefined
      : fs.existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
    channel: isWindows ? "chrome" : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  try {
    await page.goto("http://127.0.0.1:5500/login.html", {
      waitUntil: "networkidle",
      timeout: 10000,
    });
    await page.fill("#input_username", "nardi");
    await page.fill("#input_password", "0");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/main.html", { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Open Checklists
    await page.click("text=Checklists");
    await page.waitForTimeout(500);
    await page.click(`text=${targetModule}`);
    await page.waitForTimeout(2500);

    // Scroll to changed section
    const garaEl = page
      .locator("text=Obat GA dan alat STATICS sdh siap")
      .first();
    if ((await garaEl.count()) > 0) {
      await garaEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    const evidencePath = path.resolve(process.cwd(), "anestesi_evidence.png");
    await page.screenshot({ path: evidencePath });
    console.log(`[+] [Lunar] Evidence screenshot saved: ${evidencePath}`);
    await browser.close();
    return evidencePath;
  } catch (err) {
    console.log(
      `[!] [Lunar] Could not auto-capture screenshot: ${err.message}`,
    );
    await browser.close();
    return null;
  }
}

// ---------------------------------------------------------
// 6. Main Si-Pangaduan Form Automation & Batch Queue Helpers
// ---------------------------------------------------------
/*
 * Territory: luniteResolveBaseDeltaMinutes — Resolves effective duration in minutes using template override or jenisAduan defaults.
 */
export function luniteResolveBaseDeltaMinutes(
  jenisAduanValue = "4",
  customDurationMinutes = null,
) {
  const parsedCustom = Number(customDurationMinutes);
  if (Number.isFinite(parsedCustom) && parsedCustom > 0) {
    return Math.round(parsedCustom);
  }
  if (jenisAduanValue === "4") {
    return 23 * 60 + 59; // 1439 mins
  }
  if (jenisAduanValue === "5") {
    return (3 * 24 + 23) * 60 + 59; // 5759 mins
  }
  if (["6", "7", "8"].includes(String(jenisAduanValue))) {
    return 45;
  }
  return 60;
}

/*
 * Territory: luniteComputeTicketTimestamps — Computes formatted Si-Pangaduan reception and completion timestamps.
 */
export function luniteComputeTicketTimestamps({
  jenisAduanValue = "4",
  customDurationMinutes = null,
  waktuPenerimaan = null,
  waktuPenyelesaian = null,
  timestampAnchor = "selesai",
  randomDelta = false,
} = {}) {
  let finalWaktuPenerimaan = waktuPenerimaan;
  let finalWaktuPenyelesaian = waktuPenyelesaian;

  if (!finalWaktuPenerimaan || !finalWaktuPenyelesaian) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const formatDateTime = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    let baseMinutes = luniteResolveBaseDeltaMinutes(
      jenisAduanValue,
      customDurationMinutes,
    );
    if (randomDelta) {
      const factor = 0.85 + Math.random() * 0.15;
      baseMinutes = Math.round(baseMinutes * factor);
    }
    const deltaMs = baseMinutes * 60 * 1000;

    if (timestampAnchor === "selesai") {
      const selDate = now;
      const penDate = new Date(selDate.getTime() - deltaMs);
      if (!finalWaktuPenyelesaian) finalWaktuPenyelesaian = formatDateTime(selDate);
      if (!finalWaktuPenerimaan) finalWaktuPenerimaan = formatDateTime(penDate);
    } else {
      const penDate = now;
      const selDate = new Date(penDate.getTime() + deltaMs);
      if (!finalWaktuPenerimaan) finalWaktuPenerimaan = formatDateTime(penDate);
      if (!finalWaktuPenyelesaian) finalWaktuPenyelesaian = formatDateTime(selDate);
    }
  }

  return {
    waktuPenerimaan: finalWaktuPenerimaan,
    waktuPenyelesaian: finalWaktuPenyelesaian,
  };
}

/*
 * Territory: luniteCreateAuthenticatedPortalPage — Launches browser and authenticates once to Si-Pangaduan.
 */
async function luniteCreateAuthenticatedPortalPage({
  portalUrl,
  portalUsername,
  portalPassword,
} = {}) {
  console.log("[*] [Lunar] Launching live desktop browser...");
  const browser = await lunarLaunchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1.25,
  });
  const page = await context.newPage();

  console.log(
    `[*] [Lunar] Authenticating to Si-Pangaduan as "${portalUsername}" (${portalUrl})...`,
  );
  await page.goto(portalUrl, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForSelector("#username", { timeout: 10000 });
  await page.fill("#username", portalUsername);
  await page.fill("#password", portalPassword);

  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }),
    page.click("#btnLogin"),
  ]);

  await page.waitForTimeout(1500);
  return { browser, context, page };
}

/*
 * Territory: lunitePrepareTicketPayload — Resolves defaults, AI programmer notes/diff card if needed, and formatted HTML.
 */
async function lunitePrepareTicketPayload(ticket = {}, settings = {}) {
  const role = ticket.role || "programmer";
  const namaPengadu = ticket.namaPengadu || CURRENT_USER;
  const effectivePetugas =
    ticket.petugasValue || settings.petugasValue || ticket.portalUsername || settings.portalUsername || "01229";
  const unitValue = ticket.unitValue || "44";
  const jenisAduanValue = ticket.jenisAduanValue || "4";
  const statusValue = String(ticket.statusValue || "1") === "2" ? "2" : "1";
  const dilanjutkanValue = statusValue === "2" ? (ticket.dilanjutkanValue || "") : "";
  const noRm = ticket.noRm || "-";
  const repoPath = ticket.repoPath || process.cwd();
  const effectiveAiMode = ticket.aiMode || settings.aiMode || "gemini_fallback";
  const effectiveLocalModel = ticket.ollamaModel || settings.localModel || "qwen2.5-coder:7b";

  let rawIsiKomplain = ticket.isiKomplain || "";
  let finalScreenshot = ticket.screenshotPath || null;

  if (role === "programmer") {
    let gitLog = "";
    let gitDiff = "";
    if (!rawIsiKomplain || !finalScreenshot) {
      try {
        gitLog = execSync('git log -1 --pretty=format:"%h - %s"', { cwd: repoPath })
          .toString()
          .trim();
      } catch (_) {
        gitLog = "Latest Changes";
      }
      gitDiff = getEffectiveGitDiff(repoPath);
    }

    if (!rawIsiKomplain) {
      if ((ticket.useOllama || effectiveAiMode) && gitDiff) {
        let aiNotes = null;
        if (effectiveAiMode === "local_only" || (ticket.useOllama && !settings.geminiApiKey)) {
          aiNotes = await generateReleaseNotesWithOllama(
            gitDiff,
            effectiveLocalModel,
            { repoName: path.basename(repoPath), commitMsg: gitLog, ollamaUrl: settings.ollamaUrl },
          );
        } else {
          if (settings.geminiApiKey) {
            aiNotes = await generateReleaseNotesWithGemini(
              gitDiff,
              settings.geminiApiKey,
              { repoName: path.basename(repoPath), commitMsg: gitLog },
            );
          }
          if (!aiNotes && effectiveAiMode !== "gemini_only") {
            aiNotes = await generateReleaseNotesWithOllama(
              gitDiff,
              effectiveLocalModel,
              { repoName: path.basename(repoPath), commitMsg: gitLog, ollamaUrl: settings.ollamaUrl },
            );
          }
        }
        if (aiNotes) {
          rawIsiKomplain = `Perbaikan Aplikasi (Commit: ${gitLog})\n\n${aiNotes}`;
        }
      }

      if (!rawIsiKomplain) {
        rawIsiKomplain = `Perbaikan Aplikasi & Pemeliharaan Modul RME Rawat Inap (fe_remedis_ranap)
Commit: ${gitLog || "Recent Updates"}

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
      if (process.argv.includes("--live-app")) {
        finalScreenshot = await captureRemedisEvidence();
      } else {
        finalScreenshot = await generateGitDiffCard({ repoPath });
      }
    }
  }

  const timestamps = luniteComputeTicketTimestamps({
    jenisAduanValue,
    customDurationMinutes: ticket.customDurationMinutes,
    waktuPenerimaan: ticket.waktuPenerimaan,
    waktuPenyelesaian: ticket.waktuPenyelesaian,
    timestampAnchor: ticket.timestampAnchor || "selesai",
    randomDelta: Boolean(ticket.randomDelta),
  });

  return {
    role,
    namaPengadu,
    petugasValue: effectivePetugas,
    unitValue,
    jenisAduanValue,
    statusValue,
    dilanjutkanValue,
    noRm,
    rawIsiKomplain,
    cleanKomplainHtml: formatKomplainToCleanHtml(rawIsiKomplain),
    finalScreenshot,
    waktuPenerimaan: timestamps.waktuPenerimaan,
    waktuPenyelesaian: timestamps.waktuPenyelesaian,
  };
}

/*
 * Territory: lunitePopulatePortalFormOnPage — Navigates to formulir_pengaduan and fills all Si-Pangaduan fields on an active Playwright page.
 */
async function lunitePopulatePortalFormOnPage(page, finalPortalUrl, preparedTicket) {
  const formUrl = new URL("pangaduan/formulir_pengaduan", finalPortalUrl).href;
  console.log(`[*] [Lunar] Navigating to Formulir Pengaduan (${formUrl})...`);
  await page.goto(formUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);

  console.log(`[*] [Lunar] Setting Nama Pengadu (Pelapor): "${preparedTicket.namaPengadu}"...`);
  await page.fill("#vb7a", preparedTicket.namaPengadu);

  console.log(
    `[*] [Lunar] Selecting Yang Mengerjakan / Petugas IT (value: "${preparedTicket.petugasValue}")...`,
  );
  await page.evaluate((val) => {
    const select = document.getElementById("profesix");
    if (select) {
      let targetVal = String(val);
      const opts = Array.from(select.options);
      const matchByVal = opts.find((o) => o.value === targetVal);
      if (!matchByVal) {
        const matchByText = opts.find((o) =>
          o.text.toLowerCase().includes(targetVal.toLowerCase()),
        );
        if (matchByText) targetVal = matchByText.value;
      }
      select.value = targetVal;
      if (window.$) $(select).val(targetVal).trigger("change");
      else select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, preparedTicket.petugasValue);

  console.log(`[*] [Lunar] Selecting Dari Unit (value: ${preparedTicket.unitValue})...`);
  await page.evaluate((val) => {
    const select = document.getElementById("id_bagian_api");
    if (select) {
      select.value = val;
      if (window.$) $(select).val(val).trigger("change");
      else select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, preparedTicket.unitValue);

  console.log("[*] [Lunar] Injecting Isi Komplain (clean formatting, no **)...");
  await page.evaluate((html) => {
    if (window.$ && $("#summernote1").length && $.fn.summernote) {
      $("#summernote1").summernote("code", html);
    } else {
      const ed = document.querySelector(".note-editable");
      if (ed) ed.innerHTML = html;
    }
  }, preparedTicket.cleanKomplainHtml);

  if (preparedTicket.finalScreenshot && fs.existsSync(preparedTicket.finalScreenshot)) {
    console.log(`[*] [Lunar] Attaching evidence image: ${preparedTicket.finalScreenshot}...`);
    const fileInput = page.locator("#filex");
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(preparedTicket.finalScreenshot);
      console.log("[+] [Lunar] Evidence attached successfully.");
    }
  } else {
    console.log("[*] [Lunar] No image attached (optional).");
  }

  console.log(
    `[*] [Lunar] Selecting Jenis Aduan (value: ${preparedTicket.jenisAduanValue})...`,
  );
  await page.evaluate((val) => {
    const select = document.getElementById("jenis_aduan");
    if (select) {
      select.value = val;
      if (window.$) $(select).val(val).trigger("change");
      else select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, preparedTicket.jenisAduanValue);

  console.log(`[*] [Lunar] Setting NO RM: "${preparedTicket.noRm}"...`);
  await page.fill("#vb7b", preparedTicket.noRm);

  console.log(
    `[*] [Lunar] Setting Status (value: ${preparedTicket.statusValue}) & Di Lanjutkan (value: "${preparedTicket.dilanjutkanValue || "-"}")...`,
  );
  await page.evaluate(
    ({ statusVal, dilanjutkanVal }) => {
      const statusSel = document.getElementById("status");
      if (statusSel) {
        statusSel.value = statusVal;
        if (window.$) $(statusSel).val(statusVal).trigger("change");
        else statusSel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (typeof window.changeHiddenInput === "function") {
        try {
          window.changeHiddenInput();
        } catch (_) {}
      }

      const profesiSel = document.getElementById("profesi");
      if (profesiSel) {
        if (statusVal === "2") {
          profesiSel.disabled = false;
          if (dilanjutkanVal) {
            let targetVal = String(dilanjutkanVal);
            const opts = Array.from(profesiSel.options);
            const matchByVal = opts.find((o) => o.value === targetVal);
            if (!matchByVal) {
              const matchByText = opts.find((o) =>
                o.text.toLowerCase().includes(targetVal.toLowerCase()),
              );
              if (matchByText) targetVal = matchByText.value;
            }
            profesiSel.value = targetVal;
            if (window.$) $(profesiSel).val(targetVal).trigger("change");
            else profesiSel.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else {
          profesiSel.value = "";
          profesiSel.disabled = true;
          if (window.$) $(profesiSel).val("").trigger("change");
          else profesiSel.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    },
    {
      statusVal: preparedTicket.statusValue || "1",
      dilanjutkanVal: preparedTicket.dilanjutkanValue || "",
    },
  );

  console.log(
    `[*] [Lunar] Timestamps: Penerimaan=${preparedTicket.waktuPenerimaan}, Penyelesaian=${preparedTicket.waktuPenyelesaian}`,
  );
  await page.evaluate(
    ({ penDate, selDate }) => {
      const setDrp = (sel, dateStr) => {
        const el = $(sel);
        const drp = el.data("daterangepicker");
        if (drp) {
          drp.setStartDate(dateStr);
          drp.setEndDate(dateStr);
          el.val(
            drp.startDate.format(
              drp.locale ? drp.locale.format : "YYYY-MM-DD  HH:mm",
            ),
          );
          drp.hide();
          el.trigger("change");
        }
      };
      setDrp("#reservation3", penDate);
      setDrp("#reservation31", selDate);
      $(".daterangepicker").hide();
    },
    {
      penDate: preparedTicket.waktuPenerimaan,
      selDate: preparedTicket.waktuPenyelesaian,
    },
  );

  await page.waitForTimeout(900);
}

/*
 * Territory: luniteClickSaveAndConfirmOnPage — Clicks #btn_save and confirms SweetAlert2 modal on active page.
 */
async function luniteClickSaveAndConfirmOnPage(page) {
  console.log('[*] [Lunar] Clicking "Simpan" (#btn_save)...');
  await page.waitForSelector("#btn_save", { state: "visible", timeout: 8000 });
  await page.click("#btn_save");

  console.log('[*] [Lunar] Waiting for SweetAlert confirmation ("Ya")...');
  try {
    const confirmBtn = await page.waitForSelector(
      'button.swal2-confirm:has-text("Ya"), button.swal2-confirm, .swal2-actions button:has-text("Ya")',
      { timeout: 8000, state: "visible" },
    );
    if (confirmBtn) {
      console.log('[*] [Lunar] Clicking SweetAlert confirmation "Ya"...');
      await page.waitForTimeout(300);
      try {
        await confirmBtn.click({ force: true });
      } catch (_) {
        await page.evaluate(() => {
          const btn = document.querySelector("button.swal2-confirm");
          if (btn) btn.click();
        });
      }
    }
  } catch (e) {
    console.log(
      "[!] [Lunar] SweetAlert confirmation not found or timed out:",
      e.message,
    );
  }

  try {
    await Promise.race([
      page.waitForResponse(
        (res) => res.url().includes("simpan") && res.status() === 200,
        { timeout: 8000 },
      ),
      page.waitForSelector(
        ".swal2-success, .swal2-icon-success, text='Your work has been saved'",
        { timeout: 8000 },
      ),
    ]);
  } catch (_) {}

  if (!page.isClosed()) {
    try {
      await page.waitForTimeout(1000);
    } catch (_) {}
  }
}

/*
 * Territory: luniteCaptureCleanFormScreenshot — Strips AdminLTE sidebar and captures crisp .content-wrapper preview image.
 */
async function luniteCaptureCleanFormScreenshot(page) {
  let reviewScreenshotBase64 = "";
  try {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      if (window.$) {
        try {
          $(window).off("resize");
          $(window).off("scroll");
          $(document).off("scroll");
          $('[data-widget="pushmenu"]').off("click");
        } catch (_) {}
      }

      const elementsToRemove = document.querySelectorAll(
        'aside, .main-sidebar, .sidebar, #sidebar-overlay, .sidebar-overlay, .control-sidebar, [class*="main-sidebar"], [class*="brand-link"]',
      );
      elementsToRemove.forEach((el) => {
        if (el && el.parentNode && el.tagName !== "BODY" && el.tagName !== "HTML") {
          el.remove();
        }
      });

      if (!document.getElementById("lunar-clean-review-style")) {
        const style = document.createElement("style");
        style.id = "lunar-clean-review-style";
        style.innerHTML = `
          * { transition: none !important; animation: none !important; }
          aside, .main-sidebar, .sidebar, #sidebar-overlay, .sidebar-overlay {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
          }
          .content-wrapper, .main-footer, .main-header {
            margin-left: 0 !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
            width: 100% !important;
          }
        `;
        document.head.appendChild(style);
      }

      const wrapper = document.querySelector(".content-wrapper");
      if (wrapper) {
        wrapper.style.setProperty("margin-left", "0px", "important");
        wrapper.style.setProperty("padding-left", "24px", "important");
        wrapper.style.setProperty("padding-right", "24px", "important");
        wrapper.style.setProperty("width", "100%", "important");
      }
    });
    await page.waitForTimeout(300);

    const contentEl = await page.$(".content-wrapper");
    const screenshotBuffer = contentEl
      ? await contentEl.screenshot()
      : await page.screenshot({ fullPage: true });
    reviewScreenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
  } catch (shotErr) {
    console.log("[!] [Lunar] Failed to capture full-page screenshot:", shotErr.message);
  }
  return reviewScreenshotBase64;
}

export async function runDocumentationIT({
  role = "programmer",
  namaPengadu = CURRENT_USER,
  petugasValue = null,
  unitValue = "44", // Default: Inst. Rekam Medik
  jenisAduanValue = "4", // Default: Perbaikan Aplikasi
  statusValue = "1", // Default: 1 = Selesai, 2 = Tidak Selesai
  dilanjutkanValue = "", // Used when statusValue === "2"
  noRm = "-",
  isiKomplain = "",
  screenshotPath = null,
  clickSimpan = false,
  useOllama = false,
  ollamaModel = null,
  aiMode = null,
  portalUrl = null,
  portalUsername = null,
  portalPassword = null,
  repoPath = process.cwd(),
  waktuPenerimaan = null,
  waktuPenyelesaian = null,
  timestampAnchor = "selesai",
  randomDelta = false,
  customDurationMinutes = null,
  isWeb = false,
} = {}) {
  console.log("\n======================================================");
  console.log("         🌙 LUNAR IT DOCUMENTATION AUTOMATION");
  console.log("======================================================\n");

  const settings = getEffectiveSettings();
  const finalPortalUrl =
    portalUrl || settings.portalUrl || "http://192.168.0.152/it/";
  const finalUsername = portalUsername || settings.portalUsername || "01229";
  const finalPassword = portalPassword || settings.portalPassword || "123456";

  const preparedTicket = await lunitePrepareTicketPayload(
    {
      role,
      namaPengadu,
      petugasValue,
      unitValue,
      jenisAduanValue,
      statusValue,
      dilanjutkanValue,
      noRm,
      isiKomplain,
      screenshotPath,
      useOllama,
      ollamaModel,
      aiMode,
      portalUsername: finalUsername,
      repoPath,
      waktuPenerimaan,
      waktuPenyelesaian,
      timestampAnchor,
      randomDelta,
      customDurationMinutes,
    },
    settings,
  );

  const { browser, context, page } = await luniteCreateAuthenticatedPortalPage({
    portalUrl: finalPortalUrl,
    portalUsername: finalUsername,
    portalPassword: finalPassword,
  });

  await lunitePopulatePortalFormOnPage(page, finalPortalUrl, preparedTicket);

  if (clickSimpan) {
    await luniteClickSaveAndConfirmOnPage(page);
    console.log(
      "[+] [Lunar] Form successfully submitted and confirmed with SweetAlert2!",
    );
    try {
      await browser.close();
    } catch (_) {}
    return {
      success: true,
      submitted: true,
      message: "Formulir Berhasil Disimpan ke Si-Pangaduan!",
    };
  } else {
    console.log(
      '\n[!] [Lunar] REVIEW MODE: Form is fully populated. Capturing live screenshot for remote review...',
    );
    const reviewScreenshotBase64 = await luniteCaptureCleanFormScreenshot(page);

    await lunarCloseReviewSession();
    await luniteCloseBatchReviewSession();

    lunarActiveReviewSession = {
      browser,
      context,
      page,
      createdAt: Date.now(),
      meta: {
        namaPengadu: preparedTicket.namaPengadu,
        petugasValue: preparedTicket.petugasValue,
        unitValue: preparedTicket.unitValue,
        jenisAduanValue: preparedTicket.jenisAduanValue,
        statusValue: preparedTicket.statusValue,
        dilanjutkanValue: preparedTicket.dilanjutkanValue,
        noRm: preparedTicket.noRm,
        waktuPenerimaan: preparedTicket.waktuPenerimaan,
        waktuPenyelesaian: preparedTicket.waktuPenyelesaian,
      },
      timeoutId: setTimeout(() => {
        console.log("[*] [Lunar] Review session timed out (15m). Closing browser...");
        lunarCloseReviewSession();
      }, 15 * 60 * 1000),
    };

    page.on("close", () => {
      console.log("[*] [Lunar] Review mode browser window was closed.");
      lunarActiveReviewSession = null;
    });

    console.log(
      "[*] [Lunar] Active review session cached. Ready for remote inspection and submit.\n",
    );

    if (isWeb) {
      return {
        success: true,
        reviewMode: true,
        screenshotBase64: reviewScreenshotBase64,
        meta: lunarActiveReviewSession.meta,
        message: "Formulir siap diperiksa di layar.",
      };
    } else {
      console.log(
        "[*] [Lunar] Browser is live on screen. You can review and click Simpan whenever you wish.\n",
      );
      await new Promise(() => {});
    }
  }
}

export async function lunarConfirmReviewSubmit() {
  if (!lunarActiveReviewSession || !lunarActiveReviewSession.page) {
    throw new Error(
      "Tidak ada sesi review yang aktif atau sesi telah kadaluarsa (timeout 15 menit). Silakan muat ulang formulir."
    );
  }

  const { page, timeoutId } = lunarActiveReviewSession;
  if (timeoutId) clearTimeout(timeoutId);

  if (page.isClosed()) {
    await lunarCloseReviewSession();
    return { success: true, message: "Browser telah ditutup/disimpan sebelumnya." };
  }

  await luniteClickSaveAndConfirmOnPage(page);
  console.log(
    "[+] [Lunar] Form successfully submitted and confirmed via remote trigger!",
  );

  await lunarCloseReviewSession();
  return { success: true, message: "Formulir Berhasil Disimpan ke Si-Pangaduan!" };
}

/*
 * Territory: luniteRunBatchDocumentationIT — Runs multiple reports using a single authenticated Playwright session (auto-submit or batch review).
 */
export async function luniteRunBatchDocumentationIT({
  items = [],
  clickSimpan = false,
  portalUrl = null,
  portalUsername = null,
  portalPassword = null,
} = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Antrean laporan kosong. Tambahkan minimal 1 laporan ke antrean.");
  }

  console.log("\n======================================================");
  console.log(`   🌙 LUNAR BATCH AUTOMATION (${items.length} LAPORAN)`);
  console.log("======================================================\n");

  const settings = getEffectiveSettings();
  const finalPortalUrl =
    portalUrl || settings.portalUrl || "http://192.168.0.152/it/";
  const finalUsername = portalUsername || settings.portalUsername || "01229";
  const finalPassword = portalPassword || settings.portalPassword || "123456";

  await lunarCloseReviewSession();
  await luniteCloseBatchReviewSession();

  const preparedItems = [];
  for (let i = 0; i < items.length; i++) {
    const rawItem = items[i] || {};
    const prepared = await lunitePrepareTicketPayload(
      { ...rawItem, portalUsername: finalUsername },
      settings,
    );
    preparedItems.push({
      id: rawItem.id || `batch_${i + 1}`,
      title: rawItem.title || `Laporan #${i + 1}`,
      prepared,
    });
  }

  const { browser, context, page } = await luniteCreateAuthenticatedPortalPage({
    portalUrl: finalPortalUrl,
    portalUsername: finalUsername,
    portalPassword: finalPassword,
  });

  if (clickSimpan) {
    const results = [];
    for (let i = 0; i < preparedItems.length; i++) {
      const entry = preparedItems[i];
      console.log(`[*] [Lunar Batch] Submitting item ${i + 1}/${preparedItems.length}: ${entry.title}`);
      try {
        await lunitePopulatePortalFormOnPage(page, finalPortalUrl, entry.prepared);
        await luniteClickSaveAndConfirmOnPage(page);
        results.push({
          index: i,
          id: entry.id,
          title: entry.title,
          success: true,
          meta: {
            namaPengadu: entry.prepared.namaPengadu,
            petugasValue: entry.prepared.petugasValue,
            unitValue: entry.prepared.unitValue,
            jenisAduanValue: entry.prepared.jenisAduanValue,
            statusValue: entry.prepared.statusValue,
            dilanjutkanValue: entry.prepared.dilanjutkanValue,
            noRm: entry.prepared.noRm,
            waktuPenerimaan: entry.prepared.waktuPenerimaan,
            waktuPenyelesaian: entry.prepared.waktuPenyelesaian,
          },
        });
      } catch (err) {
        console.error(`[!] [Lunar Batch] Item ${i + 1} failed:`, err.message);
        results.push({
          index: i,
          id: entry.id,
          title: entry.title,
          success: false,
          error: err.message,
        });
      }
    }

    try {
      await browser.close();
    } catch (_) {}

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;
    return {
      success: failed === 0,
      submitted: true,
      batchMode: true,
      total: results.length,
      succeeded,
      failed,
      results,
      message: `${succeeded}/${results.length} laporan berhasil dikirim ke Si-Pangaduan!`,
    };
  } else {
    const previews = [];
    for (let i = 0; i < preparedItems.length; i++) {
      const entry = preparedItems[i];
      console.log(`[*] [Lunar Batch Review] Capturing preview ${i + 1}/${preparedItems.length}: ${entry.title}`);
      await lunitePopulatePortalFormOnPage(page, finalPortalUrl, entry.prepared);
      const screenshotBase64 = await luniteCaptureCleanFormScreenshot(page);
      previews.push({
        index: i,
        id: entry.id,
        title: entry.title,
        screenshotBase64,
        meta: {
          namaPengadu: entry.prepared.namaPengadu,
          petugasValue: entry.prepared.petugasValue,
          unitValue: entry.prepared.unitValue,
          jenisAduanValue: entry.prepared.jenisAduanValue,
          statusValue: entry.prepared.statusValue,
          dilanjutkanValue: entry.prepared.dilanjutkanValue,
          noRm: entry.prepared.noRm,
          waktuPenerimaan: entry.prepared.waktuPenerimaan,
          waktuPenyelesaian: entry.prepared.waktuPenyelesaian,
        },
      });
    }

    luniteActiveBatchReviewSession = {
      browser,
      context,
      page,
      finalPortalUrl,
      preparedItems,
      createdAt: Date.now(),
      timeoutId: setTimeout(() => {
        console.log("[*] [Lunar] Batch review session timed out (15m). Closing browser...");
        luniteCloseBatchReviewSession();
      }, 15 * 60 * 1000),
    };

    page.on("close", () => {
      console.log("[*] [Lunar] Batch review browser window was closed.");
      luniteActiveBatchReviewSession = null;
    });

    return {
      success: true,
      batchReviewMode: true,
      total: previews.length,
      previews,
      message: `${previews.length} formulir batch siap diperiksa sebelum dikirim.`,
    };
  }
}

/*
 * Territory: luniteConfirmBatchReviewSubmit — Submits all staged items using the already-authenticated batch review browser session.
 */
export async function luniteConfirmBatchReviewSubmit() {
  if (!luniteActiveBatchReviewSession || !luniteActiveBatchReviewSession.page) {
    throw new Error(
      "Tidak ada sesi review batch yang aktif atau sesi telah kadaluarsa (timeout 15 menit). Silakan ulangi Review Batch.",
    );
  }

  const { page, finalPortalUrl, preparedItems, timeoutId } = luniteActiveBatchReviewSession;
  if (timeoutId) clearTimeout(timeoutId);

  if (page.isClosed()) {
    await luniteCloseBatchReviewSession();
    throw new Error("Jendela browser review batch sudah ditutup.");
  }

  const results = [];
  for (let i = 0; i < preparedItems.length; i++) {
    const entry = preparedItems[i];
    console.log(`[*] [Lunar Batch Confirm] Submitting item ${i + 1}/${preparedItems.length}: ${entry.title}`);
    try {
      // Last item is already populated unless user switched; repopulate cleanly to guarantee exact state
      await lunitePopulatePortalFormOnPage(page, finalPortalUrl, entry.prepared);
      await luniteClickSaveAndConfirmOnPage(page);
      results.push({
        index: i,
        id: entry.id,
        title: entry.title,
        success: true,
      });
    } catch (err) {
      console.error(`[!] [Lunar Batch Confirm] Item ${i + 1} failed:`, err.message);
      results.push({
        index: i,
        id: entry.id,
        title: entry.title,
        success: false,
        error: err.message,
      });
    }
  }

  await luniteCloseBatchReviewSession();
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  return {
    success: failed === 0,
    submitted: true,
    total: results.length,
    succeeded,
    failed,
    results,
    message: `${succeeded}/${results.length} laporan batch berhasil disimpan ke Si-Pangaduan!`,
  };
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
          const isGit = fs.existsSync(path.join(fullPath, ".git"));
          if (
            isGit ||
            entry.name.startsWith("fe_") ||
            entry.name.startsWith("be_") ||
            entry.name.includes("remedis") ||
            entry.name.includes("simrs")
          ) {
            projects.push({
              name: entry.name,
              path: fullPath,
              isGit,
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
export function startDocumentationServer({
  port = 3721,
  repoPath = process.cwd(),
} = {}) {
  let currentRepoPath = repoPath;
  const initialSettings = loadSettings();
  if (
    initialSettings.activeRepoPath &&
    fs.existsSync(initialSettings.activeRepoPath)
  ) {
    currentRepoPath = initialSettings.activeRepoPath;
  }

  // 🌙 Lunar Live-Reload SSE Stream & File Watchers
  const lunarLiveReloadClients = new Set();
  let lunarReloadDebounceTimer = null;

  const lunarBroadcastReload = () => {
    clearTimeout(lunarReloadDebounceTimer);
    lunarReloadDebounceTimer = setTimeout(() => {
      console.log(
        "[*] [Lunar Live-Reload] Terdeteksi perubahan berkas. Menyiarkan sinyal refresh ke UI..."
      );
      for (const lunarClient of lunarLiveReloadClients) {
        try {
          lunarClient.write("event: reload\ndata: reload\n\n");
        } catch (_) {
          lunarLiveReloadClients.delete(lunarClient);
        }
      }
    }, 150);
  };

  // Watch only UI static assets so runtime JSON saves (settings, templates, options)
  // update in-place without forcing a full HTML page reload.
  const lunarWatchTargets = [
    path.resolve(__dirname, "ui"),
  ];

  const lunarFileWatchers = [];
  for (const lunarTarget of lunarWatchTargets) {
    if (fs.existsSync(lunarTarget)) {
      try {
        const lunarWatcher = fs.watch(
          lunarTarget,
          { recursive: true },
          (lunarEventType, lunarFilename) => {
            if (
              lunarFilename &&
              (lunarFilename.endsWith("~") ||
                lunarFilename.endsWith(".tmp") ||
                lunarFilename.startsWith("."))
            ) {
              return;
            }
            lunarBroadcastReload();
          }
        );
        lunarFileWatchers.push(lunarWatcher);
      } catch (_) {}
    }
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    const sendJson = (data, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };

    const readBody = () =>
      new Promise((resolve) => {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            resolve(JSON.parse(body || "{}"));
          } catch (_) {
            resolve({});
          }
        });
      });

    // 0. Live-Reload SSE Stream Endpoint
    if (req.method === "GET" && url.pathname === "/api/live-reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.write("retry: 1000\n\n");
      res.write("data: connected\n\n");

      lunarLiveReloadClients.add(res);
      req.on("close", () => {
        lunarLiveReloadClients.delete(res);
      });
      return;
    }

    // 1. Serve Web UI
    if (req.method === "GET" && url.pathname === "/") {
      const htmlPath = path.resolve(__dirname, "ui", "index.html");
      if (fs.existsSync(htmlPath)) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        });
        res.end(fs.readFileSync(htmlPath));
      } else {
        res.writeHead(404);
        res.end("UI index.html not found");
      }
      return;
    }

    // 2. Initialize Data Endpoint
    if (req.method === "GET" && url.pathname === "/api/init") {
      const reqRepo = url.searchParams.get("repoPath");
      if (reqRepo && fs.existsSync(reqRepo)) {
        currentRepoPath = reqRepo;
      }

      let commitInfo = null;
      try {
        const gitLog = execSync('git log -1 --pretty=format:"%h - %s"', {
          cwd: currentRepoPath,
        })
          .toString()
          .trim();
        const [hash, ...msgParts] = gitLog.split(" - ");
        commitInfo = { hash, msg: msgParts.join(" - ") };
      } catch (_) {}

      const settings = getEffectiveSettings();
      const options = loadPortalOptions();
      const templates = loadItTemplates();
      const discoveredProjects = discoverSiblingProjects(currentRepoPath);
      const recentCommits = lunar_getRecentCommits(currentRepoPath, 25);
      const today = lunar_getTodayDateString();

      sendJson({
        user: CURRENT_USER,
        platform: process.platform,
        repoPath: currentRepoPath,
        repoName: path.basename(currentRepoPath),
        commit: commitInfo,
        recentCommits,
        today,
        discoveredProjects,
        recentProjects: settings.recentProjects || [currentRepoPath],
        settings,
        options,
        templates,
      });
      return;
    }

    // 2.0 Switch Project / Path Endpoint
    if (req.method === "POST" && url.pathname === "/api/switch-project") {
      const body = await readBody();
      const targetPath = body.repoPath
        ? path.resolve(body.repoPath)
        : currentRepoPath;
      if (!fs.existsSync(targetPath)) {
        sendJson(
          {
            success: false,
            error: `Path project tidak ditemukan: ${targetPath}`,
          },
          400,
        );
        return;
      }

      currentRepoPath = targetPath;
      const settings = getEffectiveSettings();
      settings.activeRepoPath = currentRepoPath;
      if (!settings.recentProjects) settings.recentProjects = [];
      if (!settings.recentProjects.includes(currentRepoPath)) {
        settings.recentProjects.unshift(currentRepoPath);
        if (settings.recentProjects.length > 8) settings.recentProjects.pop();
      }
      saveSettings(settings);

      let commitInfo = null;
      try {
        const gitLog = execSync('git log -1 --pretty=format:"%h - %s"', {
          cwd: currentRepoPath,
        })
          .toString()
          .trim();
        const [hash, ...msgParts] = gitLog.split(" - ");
        commitInfo = { hash, msg: msgParts.join(" - ") };
      } catch (_) {}

      const recentCommits = lunar_getRecentCommits(currentRepoPath, 25);
      const today = lunar_getTodayDateString();

      sendJson({
        success: true,
        repoPath: currentRepoPath,
        repoName: path.basename(currentRepoPath),
        commit: commitInfo,
        recentCommits,
        today,
        recentProjects: settings.recentProjects,
      });
      return;
    }

    // 2.02 Get Recent Git Commits for Multi-Select Endpoint
    if (req.method === "GET" && url.pathname === "/api/git-commits") {
      const targetRepo = url.searchParams.get("repoPath") || currentRepoPath;
      const limit = parseInt(url.searchParams.get("limit") || "25", 10);
      const commits = lunar_getRecentCommits(targetRepo, limit);
      sendJson({
        success: true,
        repoPath: targetRepo,
        today: lunar_getTodayDateString(),
        commits,
      });
      return;
    }

    // 2.05 Get Local Ollama Models Endpoint
    if (req.method === "GET" && url.pathname === "/api/ollama-models") {
      const settings = getEffectiveSettings();
      const ollamaBaseUrl =
        url.searchParams.get("url") ||
        settings.ollamaUrl ||
        "http://127.0.0.1:11434";
      const defaultModels = [
        "qwen2.5-coder:7b",
        "qwen2.5:7b",
        "gemma2:2b",
        "gemma:2b",
        "llama3.2:latest",
        "deepseek-r1:8b",
        "mistral:latest",
        "luna:latest",
      ];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const tagsRes = await fetch(`${ollamaBaseUrl.replace(/\/+$/, "")}/api/tags`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          const installedList = (tagsData.models || []).map(
            (m) => m.name || m.model,
          );
          const combined = [
            ...installedList,
            ...defaultModels.filter((dm) => !installedList.includes(dm)),
          ];
          sendJson({
            success: true,
            running: true,
            models: combined,
            installedModels: installedList,
          });
          return;
        }
      } catch (_) {}
      sendJson({
        success: true,
        running: false,
        models: defaultModels,
        installedModels: [],
      });
      return;
    }

    // 2.1 Settings Endpoints
    if (req.method === "POST" && url.pathname === "/api/settings") {
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
    if (req.method === "POST" && url.pathname === "/api/sync-options") {
      const settings = getEffectiveSettings();
      try {
        const freshOptions = await extractPortalOptions(
          settings.portalUrl,
          settings.portalUsername,
          settings.portalPassword,
        );
        sendJson({ success: true, options: freshOptions });
      } catch (err) {
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 2.3 Save / Update Templates Endpoint
    if (req.method === "POST" && url.pathname === "/api/templates") {
      const body = await readBody();
      try {
        let currentTemplates = loadItTemplates();
        if (Array.isArray(body)) {
          currentTemplates = body;
        } else if (body && body.title) {
          const newId = body.id || "tpl_" + Date.now();
          const existingIdx = currentTemplates.findIndex((t) => t.id === newId);
          const parsedDuration = Number(body.durationMinutes);
          const tplObj = {
            id: newId,
            icon: body.icon || "📝",
            title: body.title,
            track: body.track || "both",
            unitValue: body.unitValue,
            unitName: body.unitName || "",
            jenisValue: body.jenisValue,
            jenisName: body.jenisName || "",
            text: body.text || "",
            durationMinutes:
              Number.isFinite(parsedDuration) && parsedDuration > 0
                ? Math.round(parsedDuration)
                : null,
            durationMode: body.durationMode === "follow_global" ? "follow_global" : "strict_100",
            timestampAnchor:
              body.timestampAnchor === "selesai" || body.timestampAnchor === "terima"
                ? body.timestampAnchor
                : null,
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
    if (req.method === "DELETE" && url.pathname === "/api/templates") {
      const targetId = url.searchParams.get("id");
      try {
        let currentTemplates = loadItTemplates();
        if (targetId) {
          currentTemplates = currentTemplates.filter((t) => t.id !== targetId);
          saveItTemplates(currentTemplates);
          sendJson({ success: true, templates: currentTemplates });
          return;
        }
        sendJson(
          { success: false, error: "Parameter id template wajib diisi" },
          400,
        );
      } catch (err) {
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 3. Generate Diff Evidence Card Endpoint
    if (req.method === "POST" && url.pathname === "/api/generate-diff-card") {
      const body = await readBody();
      const targetRepo = body.repoPath || currentRepoPath;
      const selectedCommits = Array.isArray(body.commits) ? body.commits : [];
      const todayStr = body.today || lunar_getTodayDateString();
      try {
        const diffPath = await generateGitDiffCard({
          repoPath: targetRepo,
          commits: selectedCommits,
          today: todayStr,
        });
        sendJson({
          success: true,
          path: diffPath,
          relativePath: `documentation/changes-${todayStr}.png`,
          filename: `changes-${todayStr}.png`,
          today: todayStr,
          isMerged: selectedCommits.length > 1,
          count: selectedCommits.length,
        });
      } catch (err) {
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 4. Stream Generated Diff Image Endpoint
    if (req.method === "GET" && url.pathname === "/api/diff-evidence-image") {
      const targetRepo = url.searchParams.get("repoPath") || currentRepoPath;
      const todayStr = url.searchParams.get("today") || lunar_getTodayDateString();
      const customFile = url.searchParams.get("file");
      const docImgPath = customFile
        ? path.resolve(targetRepo, "documentation", customFile)
        : path.resolve(targetRepo, "documentation", `changes-${todayStr}.png`);
      const rootImgPath = path.resolve(targetRepo, "git_diff_evidence.png");
      const fallbackPath = path.resolve(__dirname, "git_diff_evidence.png");

      const actualPath = fs.existsSync(docImgPath)
        ? docImgPath
        : fs.existsSync(rootImgPath)
          ? rootImgPath
          : fs.existsSync(fallbackPath)
            ? fallbackPath
            : null;

      if (actualPath) {
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(fs.readFileSync(actualPath));
      } else {
        res.writeHead(404);
        res.end("Image not found");
      }
      return;
    }

    // 4.1 Raw Diff Text Endpoint
    if (req.method === "GET" && url.pathname === "/api/raw-diff") {
      const targetRepo = url.searchParams.get("repoPath") || currentRepoPath;
      const commitsParam = url.searchParams.get("commits");
      let commitHashes = [];
      if (commitsParam) {
        commitHashes = commitsParam
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
      }
      const commitInfo = lunar_getMergedCommitInfo(targetRepo, commitHashes);
      const rawDiff = commitHashes.length
        ? lunar_getDiffForCommits(targetRepo, commitHashes)
        : getEffectiveGitDiff(targetRepo);

      sendJson({
        success: true,
        repoPath: targetRepo,
        commit: { hash: commitInfo.commitHash, msg: commitInfo.commitMsg },
        isMerged: commitInfo.isMerged,
        count: commitInfo.count,
        diff:
          rawDiff ||
          "Tidak ada perubahan git terdeteksi (working tree bersih).",
      });
      return;
    }

    // 5. Generate Release Notes via AI (Gemini / Ollama / Fallback)
    if (req.method === "POST" && url.pathname === "/api/generate-notes") {
      const body = await readBody();
      const targetRepo = body.repoPath || currentRepoPath;
      const selectedCommits = Array.isArray(body.commits) ? body.commits : [];
      const settings = getEffectiveSettings();
      const apiKey =
        body.apiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY;
      const repoBase = path.basename(targetRepo);
      const aiMode = body.aiMode || settings.aiMode || "gemini_fallback";
      const localModel =
        body.model || body.localModel || settings.localModel || "qwen2.5-coder:7b";
      const ollamaUrl =
        body.ollamaUrl || settings.ollamaUrl || "http://127.0.0.1:11434";

      try {
        let notes = null;
        let usedEngine = "Template Standar";
        const commitInfo = lunar_getMergedCommitInfo(targetRepo, selectedCommits);
        const commitMsg = commitInfo.commitMsg;
        const gitDiff = selectedCommits.length
          ? lunar_getDiffForCommits(targetRepo, selectedCommits)
          : getEffectiveGitDiff(targetRepo);
        let changedFiles = [];

        try {
          if (selectedCommits.length === 1) {
            changedFiles = execSync(
              `git show --name-only --format="" ${selectedCommits[0]}`,
              { cwd: targetRepo }
            )
              .toString()
              .trim()
              .split("\n")
              .filter(Boolean);
          } else {
            changedFiles = execSync('git show --name-only --format="" HEAD', {
              cwd: targetRepo,
            })
              .toString()
              .trim()
              .split("\n")
              .filter(Boolean);
          }
        } catch (_) {}

        if (!changedFiles.length && gitDiff) {
          const lines = gitDiff.split("\n");
          for (const l of lines) {
            if (l.startsWith("diff --git")) {
              const parts = l.split(/\s+/);
              if (parts.length >= 4) {
                const f = parts[3].replace(/^[a-z]\//, "");
                if (f && !changedFiles.includes(f)) changedFiles.push(f);
              }
            }
          }
        }

        const noteContext = {
          repoName: repoBase,
          commitMsg,
          changedFiles,
          ollamaUrl,
          commits: commitInfo.commits || [],
          isMerged: commitInfo.isMerged,
        };

        if (gitDiff) {
          if (aiMode === "local_only") {
            console.log(`[*] [Lunar] AI Mode: Local Only (${localModel})`);
            notes = await generateReleaseNotesWithOllama(
              gitDiff,
              localModel,
              noteContext,
            );
            if (notes) usedEngine = `Local AI (${localModel})`;
          } else if (aiMode === "gemini_only") {
            console.log(`[*] [Lunar] AI Mode: Gemini Only`);
            if (apiKey) {
              notes = await generateReleaseNotesWithGemini(
                gitDiff,
                apiKey,
                noteContext,
              );
              if (notes) usedEngine = "Google Gemini";
            }
          } else {
            // Mode: gemini_fallback (Primary: Gemini, Fallback: Local AI)
            console.log(
              `[*] [Lunar] AI Mode: Gemini with Fallback to Local AI (${localModel})`,
            );
            if (apiKey) {
              try {
                notes = await generateReleaseNotesWithGemini(
                  gitDiff,
                  apiKey,
                  noteContext,
                );
                if (notes) usedEngine = "Google Gemini";
              } catch (geminiErr) {
                console.log(
                  `[!] [Lunar] Gemini failed (${geminiErr.message}), switching to Local AI fallback...`,
                );
              }
            } else {
              console.log(
                `[*] [Lunar] No Gemini API key provided. Directly engaging Local AI fallback (${localModel})...`,
              );
            }

            if (!notes) {
              console.log(
                `[*] [Lunar] Running Local AI fallback with model: ${localModel}...`,
              );
              notes = await generateReleaseNotesWithOllama(
                gitDiff,
                localModel,
                noteContext,
              );
              if (notes) usedEngine = `Local AI Fallback (${localModel})`;
            }
          }
        }

        if (!notes) {
          if (commitInfo.isMerged && commitInfo.commits?.length > 1) {
            const commitBullets = commitInfo.commits
              .map((c) => `• [${c.hash}] ${c.msg}`)
              .join("\n");
            const filesSummary = changedFiles
              .slice(0, 4)
              .map((f) => path.basename(f))
              .join(", ");
            notes = `Penggabungan Pembaruan & Pemeliharaan Modul (${repoBase})
Daftar Commit yang Digabungkan:
${commitBullets}

Rincian Pekerjaan:
• Integrasi dan penggabungan ${commitInfo.count} komitmen perubahan fitur pada modul ${filesSummary || repoBase}.
• Pembaruan alur kerja logika aplikasi dan sinkronisasi fungsionalitas sistem.
• Pengujian konsistensi data dan verifikasi stabilitas antarmuka pengguna.`;
          } else {
            const filesSummary = changedFiles
              .slice(0, 3)
              .map((f) => path.basename(f))
              .join(", ");
            notes = `Perbaikan Aplikasi & Pemeliharaan Modul (${repoBase})
${commitMsg ? `Komitmen: ${commitMsg}\n` : ""}
Rincian Pekerjaan:
• Pembaruan fungsionalitas dan pemeliharaan kode pada modul ${filesSummary || repoBase}.
• Penyesuaian antarmuka pengguna serta validasi alur kerja sistem informasi.
• Verifikasi fungsionalitas dan pengujian integrasi untuk memastikan stabilitas modul.`;
          }
          usedEngine = "Template Fallback";
        }

        // Strict sanitization and truncation fixes
        notes = sanitizeLunaSignatureFromNotes(notes);
        notes = cleanAndFixTruncatedNotes(
          notes,
          repoBase,
          commitMsg,
          changedFiles,
        );

        sendJson({
          success: true,
          notes,
          usedEngine,
          isMerged: commitInfo.isMerged,
          commitsCount: commitInfo.count,
        });
      } catch (err) {
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 5b. Analyze Image / Context Fusion Endpoint (IT Support & Programmer)
    if (req.method === "POST" && url.pathname === "/api/analyze-image") {
      const body = await readBody();
      const settings = getEffectiveSettings();
      try {
        const result = await analyzeSupportEvidenceImage({
          imageBase64: body.imageBase64 || null,
          imagePath: body.imagePath || null,
          fileName:
            body.fileName ||
            (body.role === "programmer"
              ? "evidence_programmer.png"
              : "evidence_support.png"),
          unitValue: body.unitValue,
          jenisAduanValue: body.jenisAduanValue,
          complaintContext: body.complaintContext || "",
          solutionHint: body.solutionHint || "",
          apiKey: body.apiKey || settings.geminiApiKey,
          role: body.role || "it_support",
          aiMode: body.aiMode || settings.aiMode,
          localModel: body.localModel || settings.localModel,
          ollamaUrl: body.ollamaUrl || settings.ollamaUrl,
        });
        sendJson(result);
      } catch (err) {
        console.error("[!] [Lunar] Error analyzing image/context:", err);
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 5b-2. Safe Evidence Preview Stream Endpoint (for Batch Queue thumbnails)
    if (req.method === "GET" && url.pathname === "/api/evidence-preview") {
      const fileParam = url.searchParams.get("file");
      if (!fileParam) {
        res.writeHead(400);
        res.end("Missing file parameter");
        return;
      }
      const safeName = path.basename(fileParam);
      const targetFile = path.resolve(process.cwd(), "evidence", safeName);
      if (fs.existsSync(targetFile)) {
        const ext = path.extname(safeName).toLowerCase();
        const mime =
          ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
              ? "image/webp"
              : "image/png";
        res.writeHead(200, { "Content-Type": mime });
        res.end(fs.readFileSync(targetFile));
      } else {
        res.writeHead(404);
        res.end("Evidence not found");
      }
      return;
    }

    // 5c. Evidence Upload Endpoint (Programmer / Support Manual Upload)
    if (req.method === "POST" && url.pathname === "/api/upload-evidence") {
      const body = await readBody();
      try {
        const { imageBase64, fileName = "evidence.png", role = "programmer" } = body;
        if (!imageBase64) throw new Error("Tidak ada data gambar (Base64) yang diterima.");

        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const rawBase64 = matches ? matches[2] : imageBase64;
        const buffer = Buffer.from(rawBase64, "base64");
        const evidenceDir = path.resolve(process.cwd(), "evidence");
        if (!fs.existsSync(evidenceDir)) {
          fs.mkdirSync(evidenceDir, { recursive: true });
        }
        const ext =
          fileName && path.extname(fileName) ? path.extname(fileName) : ".png";
        const prefix = role === "programmer" ? "programmer_evidence" : "support_evidence";
        const targetPath = path.resolve(
          evidenceDir,
          `${prefix}_${Date.now()}${ext}`,
        );
        fs.writeFileSync(targetPath, buffer);
        console.log(`[+] [Lunar] Saved ${role} evidence image to: ${targetPath}`);

        sendJson({
          success: true,
          imagePath: targetPath,
          fileName: path.basename(targetPath),
        });
      } catch (err) {
        console.error("[!] [Lunar] Error uploading evidence:", err);
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 5d. Recent Screenshot Discovery Endpoint
    if (req.method === "GET" && url.pathname === "/api/recent-screenshot") {
      try {
        const recentShot = findRecentScreenshot();
        if (recentShot && fs.existsSync(recentShot)) {
          const data = fs.readFileSync(recentShot);
          const ext = path.extname(recentShot).toLowerCase().replace(".", "");
          const mime =
            ext === "jpg" || ext === "jpeg"
              ? "image/jpeg"
              : ext === "webp"
                ? "image/webp"
                : "image/png";
          const base64 = `data:${mime};base64,${data.toString("base64")}`;
          sendJson({
            found: true,
            imagePath: recentShot,
            fileName: path.basename(recentShot),
            imageBase64: base64,
          });
        } else {
          sendJson({ found: false });
        }
      } catch (err) {
        sendJson({ found: false, error: err.message });
      }
      return;
    }

    // 6. Submit to Si-Pangaduan Endpoint
    if (req.method === "POST" && url.pathname === "/api/submit") {
      const body = await readBody();
      try {
        const result = await runDocumentationIT({
          role: body.role,
          namaPengadu: body.namaPengadu,
          petugasValue: body.petugasValue,
          unitValue: body.unitValue,
          jenisAduanValue: body.jenisAduanValue,
          statusValue: body.statusValue || "1",
          dilanjutkanValue: body.dilanjutkanValue || "",
          noRm: body.noRm || "-",
          isiKomplain: body.isiKomplain,
          screenshotPath: body.screenshotPath,
          clickSimpan: body.clickSimpan,
          portalUsername: body.portalUsername,
          portalPassword: body.portalPassword,
          repoPath: body.repoPath || currentRepoPath,
          waktuPenerimaan: body.waktuPenerimaan,
          waktuPenyelesaian: body.waktuPenyelesaian,
          timestampAnchor: body.timestampAnchor || "selesai",
          randomDelta: !!body.randomDelta,
          customDurationMinutes: body.customDurationMinutes || null,
          isWeb: true,
        });

        sendJson({
          success: true,
          ...result,
        });
      } catch (err) {
        console.error("[!] Error in /api/submit:", err);
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 6b. Batch Submit to Si-Pangaduan Endpoint (Single-Login Multiple Reports)
    if (req.method === "POST" && url.pathname === "/api/submit-batch") {
      const body = await readBody();
      try {
        const result = await luniteRunBatchDocumentationIT({
          items: Array.isArray(body.items) ? body.items : [],
          clickSimpan: Boolean(body.clickSimpan),
          portalUrl: body.portalUrl || null,
          portalUsername: body.portalUsername || null,
          portalPassword: body.portalPassword || null,
        });
        sendJson({
          success: true,
          ...result,
        });
      } catch (err) {
        console.error("[!] Error in /api/submit-batch:", err);
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 7. Confirm Review Submit Endpoint
    if (req.method === "POST" && url.pathname === "/api/confirm-review-submit") {
      try {
        const result = await lunarConfirmReviewSubmit();
        sendJson({ success: true, ...result });
      } catch (err) {
        console.error("[!] Error in /api/confirm-review-submit:", err);
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 7b. Confirm Batch Review Submit Endpoint
    if (req.method === "POST" && url.pathname === "/api/confirm-batch-submit") {
      try {
        const result = await luniteConfirmBatchReviewSubmit();
        sendJson({ success: true, ...result });
      } catch (err) {
        console.error("[!] Error in /api/confirm-batch-submit:", err);
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    // 8. Cancel Review Endpoint
    if (req.method === "POST" && url.pathname === "/api/cancel-review") {
      try {
        await lunarCloseReviewSession();
        await luniteCloseBatchReviewSession();
        sendJson({ success: true, message: "Sesi review berhasil dibatalkan." });
      } catch (err) {
        sendJson({ success: false, error: err.message }, 500);
      }
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  });

  function getLocalNetworkIp() {
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === "IPv4" && !iface.internal) {
            return iface.address;
          }
        }
      }
    } catch (_) {}
    return "127.0.0.1";
  }

  server.on("close", () => {
    lunarCloseReviewSession().catch(() => {});
    for (const lunarWatcher of lunarFileWatchers) {
      try {
        lunarWatcher.close();
      } catch (_) {}
    }
    for (const lunarClient of lunarLiveReloadClients) {
      try {
        lunarClient.end();
      } catch (_) {}
    }
    lunarLiveReloadClients.clear();
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(
        `\n[*] [Lunar] Server sudah aktif berjalan pada port ${port}.`,
      );
      console.log(`[*] [Lunar] Membuka antarmuka Web UI di browser...`);
      const isWindows = process.platform === "win32";
      const openCmd = isWindows
        ? `start http://localhost:${port}`
        : `xdg-open http://localhost:${port}`;
      exec(openCmd, () => {});
    } else {
      console.error("[!] [Lunar] Server error:", err);
    }
  });

  const lunarSessionFile = path.join(
    os.tmpdir(),
    "lunar_sipangaduan_ui_session.json"
  );

  process.on("SIGINT", () => {
    try {
      if (fs.existsSync(lunarSessionFile)) {
        fs.unlinkSync(lunarSessionFile);
      }
    } catch (_) {}
    process.exit(0);
  });

  server.listen(port, "0.0.0.0", () => {
    const localIp = getLocalNetworkIp();
    console.log("\n======================================================");
    console.log("         🌙 LUNAR IT DOCUMENTATION PORTAL");
    console.log("======================================================\n");
    console.log(`[+] [Lunar] Web UI (Lokal PC ini): http://localhost:${port}`);
    console.log(`[+] [Lunar] Web UI (Jaringan LAN): http://${localIp}:${port}`);
    console.log(
      `[*] [Lunar] Buka link LAN di atas dari PC lain di jaringan RS untuk akses langsung.`,
    );

    let lunarIsWatchRestart = false;
    try {
      if (fs.existsSync(lunarSessionFile)) {
        const lunarSessionData = JSON.parse(
          fs.readFileSync(lunarSessionFile, "utf-8")
        );
        if (lunarSessionData && lunarSessionData.ppid === process.ppid) {
          lunarIsWatchRestart = true;
        }
      }
    } catch (_) {}

    try {
      fs.writeFileSync(
        lunarSessionFile,
        JSON.stringify({ ppid: process.ppid, startedAt: Date.now() }),
        "utf-8"
      );
    } catch (_) {}

    const lunarShouldOpen =
      !process.argv.includes("--no-open") && !lunarIsWatchRestart;

    if (lunarShouldOpen) {
      const isWindows = process.platform === "win32";
      const openCmd = isWindows
        ? `start http://localhost:${port}`
        : `xdg-open http://localhost:${port}`;
      exec(openCmd, () => {});
    } else if (lunarIsWatchRestart) {
      console.log(
        `[*] [Lunar] Watch restart terdeteksi. Sesi browser dipertahankan (Live-Reload menyegarkan tampilan).`
      );
    }
  });

  return server;
}

// ---------------------------------------------------------
// 8. Interactive CLI Wizard
// ---------------------------------------------------------
async function runInteractiveCLI() {
  const rl = readline.createInterface({ input, output });
  const settings = getEffectiveSettings();

  console.log("\n--- 🌙 Lunar Si-Pangaduan Interactive Setup ---");
  console.log(`[i] Current System User: ${CURRENT_USER} (${process.platform})`);
  console.log(
    `[i] Profil Aktif: ${settings.activeProfile || settings.defaultNama} (User ID: ${settings.portalUsername})`,
  );

  const roleAnswer =
    (await rl.question(
      "1. Pilih profil [1: Programmer (default), 2: IT Support]: ",
    )) || "1";
  const role = roleAnswer.trim() === "2" ? "it_support" : "programmer";

  const defaultNamaPengadu =
    settings.nama_pengadu || settings.defaultNamaPengadu || "Sigit";
  const namaPengadu =
    (await rl.question(`2. Nama Pengadu (Pelapor) [default: ${defaultNamaPengadu}]: `)) ||
    defaultNamaPengadu;
  const defaultPetugas = settings.petugasValue || settings.portalUsername || "01229";
  const petugasValue =
    (await rl.question(`2b. Yang Mengerjakan (Kode/NIP Petugas IT) [default: ${defaultPetugas}]: `)) ||
    defaultPetugas;
  const unitValue =
    (await rl.question(
      `3. Dari Unit [default: ${settings.defaultUnit || "44"}]: `,
    )) ||
    settings.defaultUnit ||
    "44";

  const jenisAnswer =
    (await rl.question(
      "4. Jenis Aduan [1: Perbaikan Aplikasi (23h59m, default), 2: Pembuatan Modul SimRS (4d)]: ",
    )) || "1";
  const jenisAduanValue = jenisAnswer.trim() === "2" ? "5" : "4";

  let isiKomplain = "";
  let screenshotPath = null;
  let useOllama = false;

  if (role === "it_support") {
    isiKomplain = await rl.question("5. Isi Komplain / Keterangan Pekerjaan: ");

    const recentShot = findRecentScreenshot();
    if (recentShot) {
      console.log(
        `[?] Terdeteksi screenshot terbaru: "${path.basename(recentShot)}" (${recentShot})`,
      );
      const useRecent =
        (await rl.question("   Gunakan file screenshot ini? [Y/n]: ")) || "y";
      if (useRecent.toLowerCase().startsWith("y")) {
        screenshotPath = recentShot;
      }
    }

    if (!screenshotPath) {
      const manualPath = await rl.question(
        "6. Path File Foto (drag-and-drop file atau Enter jika tanpa foto): ",
      );
      if (manualPath) {
        screenshotPath = manualPath.trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } else {
    const aiAnswer =
      (await rl.question(
        `5. Gunakan AI via Local AI (Ollama) / Gemini untuk rangkum git diff? [Y/n]: `,
      )) || "y";
    useOllama = !aiAnswer.toLowerCase().startsWith("n");
    if (useOllama) {
      const modelAnswer = await rl.question(
        `   Pilih model Local AI [default: ${settings.localModel || "qwen2.5-coder:7b"}]: `,
      );
      if (modelAnswer && modelAnswer.trim()) {
        settings.localModel = modelAnswer.trim();
      }
    }
  }

  const simpanAnswer =
    (await rl.question(
      "7. Mode Tombol Simpan [1: Review Manual (default), 2: Auto Submit]: ",
    )) || "1";
  const clickSimpan = simpanAnswer.trim() === "2";

  rl.close();

  await runDocumentationIT({
    role,
    namaPengadu,
    petugasValue,
    unitValue,
    jenisAduanValue,
    isiKomplain,
    screenshotPath,
    useOllama,
    ollamaModel: settings.localModel || "qwen2.5-coder:7b",
    clickSimpan,
    portalUsername: settings.portalUsername,
    portalPassword: settings.portalPassword,
    repoPath: settings.activeRepoPath || process.cwd(),
  });
}

// ---------------------------------------------------------
// 9. Entrypoint Execution
// ---------------------------------------------------------
if (process.argv[1]?.endsWith("documentation_it.mjs")) {
  const isCli =
    process.argv.includes("--cli") || process.argv.includes("--interactive");
  const hasFlags =
    process.argv.includes("--ai") ||
    process.argv.includes("--programmer") ||
    process.argv.includes("--it-support");

  if (hasFlags) {
    // Direct execution with command line flags
    const useOllama = process.argv.includes("--ai");
    const role = process.argv.includes("--it-support")
      ? "it_support"
      : "programmer";
    const clickSimpan = process.argv.includes("--submit");
    const settings = getEffectiveSettings();

    const profileArg = process.argv
      .find((a) => a.startsWith("--profile="))
      ?.split("=")[1];
    if (profileArg && settings.profiles) {
      const chosen = settings.profiles.find(
        (p) =>
          p.nama.toLowerCase() === profileArg.toLowerCase() ||
          p.id === profileArg.toLowerCase(),
      );
      if (chosen) {
        settings.activeProfile = chosen.nama || settings.activeProfile;
        settings.portalUsername =
          chosen.portalUsername || settings.portalUsername;
        settings.portalPassword =
          chosen.portalPassword || settings.portalPassword;
        settings.defaultNama = chosen.nama || settings.defaultNama;
        settings.nama = chosen.nama || settings.nama;
        settings.nama_pengadu =
          chosen.nama_pengadu || chosen.defaultNamaPengadu || settings.nama_pengadu;
        settings.defaultNamaPengadu = settings.nama_pengadu;
        settings.defaultUnit = chosen.defaultUnit || settings.defaultUnit;
        settings.defaultJenisAduan =
          chosen.defaultJenisAduan || settings.defaultJenisAduan;
      }
    }

    const usernameArg = process.argv
      .find((a) => a.startsWith("--username="))
      ?.split("=")[1];
    const passwordArg = process.argv
      .find((a) => a.startsWith("--password="))
      ?.split("=")[1];
    const repoArg =
      process.argv.find((a) => a.startsWith("--repo="))?.split("=")[1] ||
      settings.activeRepoPath ||
      process.cwd();
    const nama =
      process.argv.find((a) => a.startsWith("--nama="))?.split("=")[1] ||
      settings.nama_pengadu ||
      settings.defaultNamaPengadu ||
      "Sigit";
    const unit =
      process.argv.find((a) => a.startsWith("--unit="))?.split("=")[1] ||
      settings.defaultUnit ||
      "44";

    runDocumentationIT({
      role,
      useOllama,
      clickSimpan,
      namaPengadu: nama,
      unitValue: unit,
      portalUsername: usernameArg || settings.portalUsername,
      portalPassword: passwordArg || settings.portalPassword,
      repoPath: repoArg,
    }).catch(console.error);
  } else if (isCli) {
    // Interactive terminal CLI
    runInteractiveCLI().catch(console.error);
  } else {
    // Default: Launch Sleek Local Web UI Server!
    startDocumentationServer();
  }
}
