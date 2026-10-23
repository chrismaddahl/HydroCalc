import { expect, test, type Page } from "@playwright/test";

async function addProduct(
  page: Page,
  name: string,
  values: { N?: string; K?: string; P?: string },
  oxide = false,
) {
  await page
    .getByRole("button", { name: "Dünger anlegen", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Produktname").fill(name);
  if (values.N)
    await dialog
      .getByRole("textbox", { name: "Gesamtstickstoff Gehalt", exact: true })
      .fill(values.N);
  if (values.K)
    await dialog
      .getByRole("textbox", { name: "Kalium Gehalt", exact: true })
      .fill(values.K);
  if (values.P) {
    await dialog
      .getByRole("textbox", { name: "Phosphor Gehalt", exact: true })
      .fill(values.P);
    if (oxide)
      await dialog
        .getByRole("combobox", { name: "Phosphor Bezugsform", exact: true })
        .selectOption("P2O5");
  }
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Dünger speichern" }).click();
  await expect(dialog).not.toBeVisible();
}

test("empty library → custom fertilizer → calculation → save → reload → language → stale result", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hier beginnt deine Mischung" }),
  ).toBeVisible();
  await addProduct(page, "Test N/K", { N: "10", K: "20" });
  await page
    .getByRole("combobox", { name: "Dünger auswählen", exact: true })
    .selectOption({ label: "Test N/K" });
  await page
    .getByRole("textbox", { name: "Rezeptname", exact: true })
    .fill("Mein erster Ansatz");
  await page
    .getByRole("checkbox", {
      name: "Nicht erfasste Wasserwerte ausdrücklich als 0 annehmen.",
    })
    .check();
  await page.getByRole("textbox", { name: "Ziel N", exact: true }).fill("10");
  await page.getByRole("textbox", { name: "Ziel K", exact: true }).fill("20");
  await page
    .getByRole("button", { name: "Rezeptur berechnen", exact: true })
    .click();
  await expect(page.getByText("2/2 Ziele erreicht")).toBeVisible();
  await expect(page.locator(".result-doses")).toContainText("10 g");
  await page.getByRole("button", { name: "Zur Sammlung" }).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Rezeptname", exact: true }),
  ).toHaveValue("Mein erster Ansatz");
  await expect(
    page.getByRole("textbox", { name: "Ziel K", exact: true }),
  ).toHaveValue("20");
  await page
    .getByRole("combobox", { name: "Sprache", exact: true })
    .selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Find your balance." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Calculate recipe", exact: true })
    .click();
  await expect(page.getByText("2/2 targets met")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Final volume", exact: true })
    .fill("200");
  await expect(
    page.getByText("Inputs changed. Recalculate to see current results."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Calculate recipe", exact: true })
    .click();
  await expect(page.locator(".result-doses")).toContainText("20 g");
  expect(errors).toEqual([]);
});

test("oxide switching preserves composition; editing declaration recalculates the preview", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Dünger anlegen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Produktname").fill("P Test");
  const form = dialog.getByRole("combobox", {
    name: "Phosphor Bezugsform",
    exact: true,
  });
  const content = dialog.getByRole("textbox", {
    name: "Phosphor Gehalt",
    exact: true,
  });
  await form.selectOption("P2O5");
  await content.fill("10");
  await expect(
    dialog
      .locator(".composition-row")
      .filter({
        has: page.getByRole("textbox", {
          name: "Phosphor Gehalt",
          exact: true,
        }),
      })
      .locator(".conversion"),
  ).toContainText("4,364");
  await form.selectOption("P");
  expect(Number((await content.inputValue()).replace(",", "."))).toBeCloseTo(
    4.364,
    3,
  );
  await form.selectOption("P2O5");
  await expect(content).toHaveValue("10");
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test("missing source water blocks calculation; invalid numbers cannot produce results", async ({
  page,
}) => {
  await page.goto("/");
  await addProduct(page, "N", { N: "10" });
  await page
    .getByRole("combobox", { name: "Dünger auswählen", exact: true })
    .selectOption({ label: "N" });
  await page.getByRole("textbox", { name: "Ziel N", exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Rezeptur berechnen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Wasserwert fehlt");
  await page
    .getByRole("textbox", { name: "Endvolumen", exact: true })
    .fill("1.5");
  await expect(
    page.getByRole("textbox", { name: "Endvolumen", exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page
    .getByRole("button", { name: "Rezeptur berechnen", exact: true })
    .click();
  await expect(page.locator(".result-doses")).toHaveCount(0);
});

test("mobile layout fits and recipe inputs survive language switches", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Endvolumen", exact: true })
    .fill("1,5");
  await page
    .getByRole("combobox", { name: "Sprache", exact: true })
    .selectOption("en");
  await expect(
    page.getByRole("textbox", { name: "Final volume", exact: true }),
  ).toHaveValue("1.5");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("product edits preserve recipe snapshots and backups import without overwriting", async ({
  page,
}) => {
  await page.goto("/");
  await addProduct(page, "Mein Salz", { N: "10" });
  await page
    .getByRole("combobox", { name: "Dünger auswählen", exact: true })
    .selectOption({ label: "Mein Salz" });
  await page
    .getByRole("checkbox", {
      name: "Nicht erfasste Wasserwerte ausdrücklich als 0 annehmen.",
    })
    .check();
  await page.getByRole("textbox", { name: "Ziel N", exact: true }).fill("10");
  await page
    .getByRole("textbox", { name: "Rezeptname", exact: true })
    .fill("Snapshot");
  await page.getByRole("button", { name: "Zur Sammlung", exact: true }).click();
  await page.getByRole("button", { name: /Meine Dünger/ }).click();
  await page.getByRole("button", { name: "Bearbeiten Mein Salz" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Gesamtstickstoff Gehalt", exact: true })
    .fill("20");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Dünger speichern" })
    .click();
  await page
    .getByRole("button", { name: "Nährstoffrechner", exact: true })
    .click();
  await page.getByRole("button", { name: "Rezeptur berechnen" }).click();
  await expect(page.locator(".result-doses")).toContainText("10 g");
  await page
    .getByRole("button", { name: "Aktualisierte Produktdaten übernehmen" })
    .click();
  await page.getByRole("button", { name: "Rezeptur berechnen" }).click();
  await expect(page.locator(".result-doses")).toContainText("5 g");

  const library = await page.evaluate(
    () => JSON.parse(localStorage.getItem("hydrocalc.workspace.v1")!).library,
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sammlung sichern" }).click();
  expect((await downloaded).suggestedFilename()).toBe("hydrocalc-backup.json");
  await page
    .getByLabel("Sicherung importieren", { exact: true })
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(library)),
    });
  await expect(page.getByRole("status")).toContainText("als Kopien importiert");
  const imported = await page.evaluate(
    () => JSON.parse(localStorage.getItem("hydrocalc.workspace.v1")!).library,
  );
  expect(imported.products).toHaveLength(2);
  expect(imported.recipes).toHaveLength(2);
  expect(imported.products[0].id).not.toBe(imported.products[1].id);
  expect(imported.recipes[1].items[0].product.declarations.N.value).toBe(10);
  await page
    .getByLabel("Sicherung importieren", { exact: true })
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.getByRole("alert")).toContainText("Import fehlgeschlagen");
});
