import fs from "node:fs";
import path from "node:path";

const root = path.resolve("dist");
const requiredFiles = ["index.html"];
const pageExtensions = new Set([".html", ".css", ".js"]);
const externalProtocol = /^(?:https?:|tel:|sms:|viber:|mailto:|data:|javascript:)/i;
const errors = [];
const warnings = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) {
    errors.push(`Missing required file: dist/${relative}`);
  }
}

if (!fs.existsSync(root)) {
  console.error("Site validation failed: dist/ does not exist.");
  process.exit(1);
}

const files = walk(root);
const pages = files.filter((file) => path.extname(file) === ".html");

for (const page of pages) {
  const source = fs.readFileSync(page, "utf8");
  const name = path.relative(root, page);
  if (!/^<!doctype html>/i.test(source.trimStart())) errors.push(`${name}: missing HTML doctype`);
  if (!/<html[^>]+lang=["']uk["']/i.test(source)) errors.push(`${name}: missing lang=\"uk\"`);
  if (!/<meta[^>]+name=["']viewport["']/i.test(source)) errors.push(`${name}: missing viewport meta tag`);
  if (!/<title>[^<]+<\/title>/i.test(source)) errors.push(`${name}: missing page title`);
  if (name !== "404.html" && !/<meta[^>]+name=["']description["']/i.test(source)) {
    errors.push(`${name}: missing meta description`);
  }
}

const referencePattern = /(?:src|href)=["']([^"'#]+)|url\(\s*["']?([^)"']+)/g;
for (const file of files.filter((item) => pageExtensions.has(path.extname(item)))) {
  const source = fs.readFileSync(file, "utf8");
  let match;
  while ((match = referencePattern.exec(source))) {
    const raw = (match[1] || match[2] || "").trim();
    if (!raw || externalProtocol.test(raw)) continue;
    const clean = raw.split("?")[0].split("#")[0];
    if (!clean) continue;
    const target = path.resolve(path.dirname(file), clean);
    if (!target.startsWith(root + path.sep) && target !== root) {
      errors.push(`${path.relative(root, file)}: reference leaves dist/: ${raw}`);
    } else if (!fs.existsSync(target)) {
      errors.push(`${path.relative(root, file)}: broken local reference: ${raw}`);
    }
  }
}

for (const file of files) {
  const size = fs.statSync(file).size;
  if (size > 5 * 1024 * 1024) {
    warnings.push(`${path.relative(root, file)} is ${(size / 1024 / 1024).toFixed(1)} MB`);
  }
}

if (warnings.length) {
  console.warn("Site validation warnings:");
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error("Site validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Site validation passed: ${pages.length} pages, ${files.length} files, no broken local references.`);
