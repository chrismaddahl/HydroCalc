import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";

const root = resolve(import.meta.dirname, "../..");
const version = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
).version;
const archivePath = resolve(
  root,
  "downloads",
  `HydroCalc-Offline-v${version}.zip`,
);
let extracted: string;
let entry: string;
let htmlPath: string;
const intercepted = process.env.HYDROCALC_OFFLINE_TEST_MODE === "intercept";

test.beforeAll(() => {
  // Test the delivered archive, extracted to a path with spaces and Unicode.
  extracted = mkdtempSync(resolve(tmpdir(), "HydroCalc Offline ä "));
  const files = unzipSync(readFileSync(archivePath));
  for (const [name, bytes] of Object.entries(files)) {
    const path = resolve(extracted, name);
    if (!path.startsWith(extracted + sep))
      throw new Error("Unexpected ZIP path");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
  htmlPath = resolve(extracted, "HydroCalc-Offline/HydroCalc.html");
  entry = intercepted
    ? "http://localhost/hydrocalc-offline/HydroCalc.html"
    : pathToFileURL(htmlPath).href;
});
test.afterAll(() => rmSync(extracted, { recursive: true, force: true }));
test.beforeEach(async ({ context }) => {
  if (!intercepted) return;
  // Policy-compatible fallback: serve the identical ZIP bytes through Playwright,
  // without starting a server or enabling networking. This does not test file://.
  await context.route(/^https?:/, (route) =>
    route.request().url() === entry
      ? route.fulfill({
          path: htmlPath,
          contentType: "text/html; charset=utf-8",
        })
      : route.abort(),
  );
});

async function createRecipe(page: Page) {
  await page
    .getByRole("button", { name: "Dünger anlegen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Produktname").fill("Mein Offline-Salz");
  await dialog
    .getByRole("textbox", { name: "Gesamtstickstoff Gehalt", exact: true })
    .fill("10");
  await dialog
    .getByRole("combobox", { name: "Kalium Bezugsform", exact: true })
    .selectOption("K2O");
  await dialog
    .getByRole("textbox", { name: "Kalium Gehalt", exact: true })
    .fill("10");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Dünger speichern" }).click();
  await page
    .getByRole("combobox", { name: "Dünger auswählen", exact: true })
    .selectOption({ label: "Mein Offline-Salz" });
  await page
    .getByRole("textbox", { name: "Rezeptname", exact: true })
    .fill("Offline-Rezept");
  await page
    .getByRole("checkbox", {
      name: "Nicht erfasste Wasserwerte ausdrücklich als 0 annehmen.",
    })
    .check();
  await page.getByRole("textbox", { name: "Ziel N", exact: true }).fill("10");
  await page
    .getByRole("textbox", { name: "Ziel K", exact: true })
    .fill("8,301");
  await page
    .getByRole("button", { name: "Rezeptur berechnen", exact: true })
    .click();
  await expect(page.getByText("2/2 Ziele erreicht")).toBeVisible();
  await expect(page.locator(".result-doses")).toContainText("10 g");
  await page.getByRole("button", { name: "Zur Sammlung", exact: true }).click();
}

test("ZIP contains a self-contained application, instructions, licenses and matching checksum", () => {
  const archive = readFileSync(archivePath);
  const checksum = readFileSync(`${archivePath}.sha256`, "utf8").split(/\s/)[0];
  expect(createHash("sha256").update(archive).digest("hex")).toBe(checksum);
  const files = unzipSync(archive);
  expect(Object.keys(files).sort()).toEqual([
    "HydroCalc-Offline/BITTE-LESEN.txt",
    "HydroCalc-Offline/HydroCalc.html",
    "HydroCalc-Offline/THIRD-PARTY-LICENSES.txt",
  ]);
  const html = new TextDecoder().decode(
    files["HydroCalc-Offline/HydroCalc.html"],
  );
  expect(html).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
  expect(html).not.toMatch(/<script\b[^>]*\btype=["']module/i);
  expect(html).not.toMatch(/<link\b[^>]*\brel=["']stylesheet/i);
  const licenses = new TextDecoder().decode(
    files["HydroCalc-Offline/THIRD-PARTY-LICENSES.txt"],
  );
  for (const name of [
    "react",
    "react-dom",
    "lucide-react",
    "ml-fcnnls",
    "ml-matrix",
    "zod",
    "scheduler",
  ])
    expect(licenses).toContain(name);
});

test("archive HTML runs from cold start without networking; calculation, reload and language switch work", async ({
  page,
  context,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (
      /^https?:/i.test(request.url()) &&
      !(intercepted && request.url() === entry)
    )
      requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  if (!intercepted) await context.route(/^https?:/, (route) => route.abort());
  await page.goto(entry);
  await expect(page).toHaveTitle(`HydroCalc ${version} · Offline`);
  await expect(
    page.getByRole("heading", { name: "Hier beginnt deine Mischung" }),
  ).toBeVisible();
  await expect(page.getByText(/Offline-Version ·/)).toBeVisible();
  await createRecipe(page);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Rezeptname", exact: true }),
  ).toHaveValue("Offline-Rezept");
  await page
    .getByRole("button", { name: "Rezeptur berechnen", exact: true })
    .click();
  await expect(page.getByText("2/2 Ziele erreicht")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sprache", exact: true })
    .selectOption("en");
  await expect(page.getByText(/Offline edition ·/)).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Target K", exact: true }),
  ).toHaveValue("8.301");
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("JSON backup downloads and imports offline without overwriting products or recipe snapshots", async ({
  page,
}) => {
  await page.goto(entry);
  await createRecipe(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Sammlung sichern", exact: true })
    .click();
  const backup = await pending;
  expect(backup.suggestedFilename()).toBe("hydrocalc-backup.json");
  const path = await backup.path();
  expect(path).not.toBeNull();
  const bytes = readFileSync(path!);
  const original = JSON.parse(bytes.toString());
  expect(original.products).toHaveLength(1);
  expect(original.products[0].declarations.K.form).toBe("K2O");
  expect(original.recipes[0].name).toBe("Offline-Rezept");
  await page
    .getByLabel("Sicherung importieren", { exact: true })
    .setInputFiles({
      name: "offline-backup.json",
      mimeType: "application/json",
      buffer: bytes,
    });
  await expect(page.getByRole("status")).toContainText("als Kopien importiert");
  const library = await page.evaluate(
    () => JSON.parse(localStorage.getItem("hydrocalc.workspace.v1")!).library,
  );
  expect(library.products).toHaveLength(2);
  expect(library.recipes).toHaveLength(2);
  expect(library.products[0].id).not.toBe(library.products[1].id);
});

test("blocked browser storage still allows calculating and exporting a portable backup", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked by browser", "QuotaExceededError");
    };
  });
  await page.goto(entry);
  await expect(page.getByRole("alert")).toContainText(
    "Lokaler Speicher ist nicht verfügbar",
  );
  await createRecipe(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Sammlung sichern", exact: true })
    .click();
  const backup = await pending;
  const saved = JSON.parse(readFileSync((await backup.path())!, "utf8"));
  expect(saved.products).toHaveLength(1);
  expect(saved.recipes[0].name).toBe("Offline-Rezept");
  await expect(
    page.getByText("Speicher prüfen", { exact: true }),
  ).toBeVisible();
});
