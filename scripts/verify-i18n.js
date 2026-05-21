const fs = require("fs");
const path = require("path");

const english = JSON.parse(fs.readFileSync(path.join("locales", "en", "common.json"), "utf8"));
const englishKeys = Object.keys(english);

function extractDefaultTranslationKeys() {
  const text = fs.readFileSync(path.join("shared", "i18n.js"), "utf8");
  const startTag = "const DEFAULT_TRANSLATIONS = {";
  const start = text.indexOf(startTag);
  if (start === -1) {
    return new Set();
  }
  const close = text.indexOf("\n  };\n\n  const LANGUAGE_NAME_OVERRIDES", start);
  if (close === -1) {
    return new Set();
  }
  const block = text.slice(start + startTag.length, close);
  const keys = new Set();
  for (const match of block.matchAll(/\n\s+(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))\s*:/g)) {
    keys.add(match[1] || match[2]);
  }
  return keys;
}

const defaultI18nKeys = extractDefaultTranslationKeys();
const localeIssues = [];

for (const locale of fs.readdirSync("locales")) {
  const file = path.join("locales", locale, "common.json");
  if (!fs.existsSync(file)) {
    continue;
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const missing = englishKeys.filter((key) => !(key in data));
  const extra = Object.keys(data).filter((key) => !(key in english));
  if (missing.length || extra.length) {
    localeIssues.push({ locale, missing, extra });
  }
}

function walkSourceFiles(dir, extensions, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkSourceFiles(full, extensions, out);
    } else if (extensions.some((ext) => full.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const popupSourceDir = path.join("popup-ui", "src");
const popupSources = walkSourceFiles(popupSourceDir, [".tsx", ".ts"]);
const keysFromPopupT = new Set();
for (const file of popupSources) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\bt\("([^"]+)"\)/g)) {
    keysFromPopupT.add(match[1]);
  }
}
const missingPopupKeys = Array.from(keysFromPopupT).filter(
  (key) => !(key in english) && !defaultI18nKeys.has(key),
);

const floatingHelpers = fs.readFileSync(path.join("content", "floating-helpers.js"), "utf8");
const missingFloatingKeys = Array.from(
  new Set(
    Array.from(floatingHelpers.matchAll(/(?<![A-Za-z0-9_])t\("([^"]+)"\)/g), (match) => match[1]).filter(
      (key) => !(key in english) && !defaultI18nKeys.has(key),
    ),
  ),
);

const result = {
  locales: fs.readdirSync("locales").filter((locale) =>
    fs.existsSync(path.join("locales", locale, "common.json")),
  ).length,
  keys: englishKeys.length,
  localeIssues,
  missingPopupKeys,
  missingFloatingKeys,
};

console.log(JSON.stringify(result, null, 2));

if (
  localeIssues.length ||
  missingPopupKeys.length ||
  missingFloatingKeys.length
) {
  process.exitCode = 1;
}
