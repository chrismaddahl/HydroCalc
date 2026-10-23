import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFile(resolve(root, path), "utf8");
const { version } = JSON.parse(await read("package.json"));
const script = await read(".hydrocalc/offline-build/hydrocalc.js");
const style = await read(".hydrocalc/offline-build/hydrocalc.css");
const template = await read("index.html");
const html = template
  .replace(
    /<title>.*?<\/title>/s,
    `<title>HydroCalc ${version} · Offline</title>`,
  )
  .replace(
    "</head>",
    `<style>${style.replace(/<\/style/gi, "<\\/style")}</style></head>`,
  )
  .replace(
    /<script\b[^>]*src="\/src\/main\.tsx"[^>]*><\/script>/,
    () => `<script>${script.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
if (
  /<script\b[^>]*\bsrc\s*=/i.test(html) ||
  /<script\b[^>]*\btype\s*=\s*["']module/i.test(html) ||
  /<link\b[^>]*\brel\s*=\s*["']stylesheet/i.test(html) ||
  html === template
) {
  throw new Error(
    "Offline packaging left an external asset or module reference.",
  );
}

// Include the complete license texts of the shipped runtime dependencies.
const lock = JSON.parse(await read("package-lock.json"));
const licenses = [];
for (const [path, pkg] of Object.entries(lock.packages).sort()) {
  if (!path.startsWith("node_modules/") || pkg.dev) continue;
  const files = (await readdir(resolve(root, path)))
    .filter((name) => /^(licen[sc]e|copying|notice)(\.|$)/i.test(name))
    .sort();
  if (!files.length) throw new Error(`Missing license text: ${path}`);
  licenses.push(
    `\n${"=".repeat(72)}\n${path.replace(/^node_modules\//, "")} ${pkg.version}\nLicense: ${pkg.license ?? "See text below"}\n`,
  );
  for (const name of files) licenses.push(await read(`${path}/${name}`));
}
const instructions = (await read("docs/Offline-Anleitung.txt")).replaceAll(
  "{{VERSION}}",
  version,
);
const files = {
  "HydroCalc.html": html,
  "BITTE-LESEN.txt": instructions,
  "THIRD-PARTY-LICENSES.txt": licenses.join("\n"),
};
const staging = resolve(root, "dist-offline/HydroCalc-Offline");
await mkdir(staging, { recursive: true });
const archiveEntries = {};
for (const [name, contents] of Object.entries(files)) {
  await writeFile(resolve(staging, name), contents);
  archiveEntries[`HydroCalc-Offline/${name}`] = strToU8(contents);
}
const archive = zipSync(archiveEntries, {
  level: 9,
  // A stable ZIP timestamp makes repeated builds byte-for-byte comparable.
  mtime: new Date(2000, 0, 1, 0, 0, 0),
});
const filename = `HydroCalc-Offline-v${version}.zip`;
await mkdir(resolve(root, "downloads"), { recursive: true });
await writeFile(resolve(root, "downloads", filename), archive);
const checksum = createHash("sha256").update(archive).digest("hex");
await writeFile(
  resolve(root, "downloads", `${filename}.sha256`),
  `${checksum}  ${filename}\n`,
);
console.log(`Created downloads/${filename} (${archive.length} bytes)`);
console.log(`SHA-256: ${checksum}`);
