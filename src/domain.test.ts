import { describe, expect, it } from "vitest";
import {
  calculate,
  factor,
  fingerprint,
  formOptions,
  newProduct,
  newRecipe,
  nutrients,
  parseNumber,
  productComposition,
  productSchema,
  type Nutrient,
  type Product,
  type Recipe,
} from "./domain";
import { parseLibrary, workspaceSchema } from "./storage";

function product(
  values: Partial<Record<Nutrient, number>>,
  extra: Partial<Product> = {},
) {
  const p = {
    ...newProduct(),
    name: "Synthetic test product",
    missingAsZero: true,
    ...extra,
  };
  for (const [n, value] of Object.entries(values))
    p.declarations[n as Nutrient].value = value;
  return p;
}
function recipe(
  products: Product[],
  targets: Partial<Record<Nutrient, number>> = { N: 10 },
  extra: Partial<Recipe> = {},
) {
  const r = { ...newRecipe(), name: "Test", waterAsZero: true, ...extra };
  for (const [n, value] of Object.entries(targets))
    r.targets[n as Nutrient] = value;
  r.items = products.map((p) => ({ product: p, fixed: false, amount: null }));
  return r;
}
describe("Reference calculations", () => {
  it("R1: forward calculation, 10 g at 10% in 100 L = 10 mg/L", () => {
    const r = recipe([product({ N: 10 })], {}, { mode: "manual" });
    r.items[0].amount = 10;
    expect(calculate(r).totals.N).toBeCloseTo(10, 8);
  });
  it("R2/R3: source water and proportional volume scaling", () => {
    const r = recipe([product({ N: 10 })], { N: 15 });
    r.water.N.value = 5;
    const out = calculate(r);
    expect(out.rawAmounts[0]).toBeCloseTo(10, 8);
    expect(out.totals.N).toBeCloseTo(15, 8);
    r.volume = 200;
    expect(calculate(r).amounts[0]).toBeCloseTo(20, 8);
  });
  it("R4: coupled targets and KKT optimality", () => {
    const r = recipe([product({ N: 10, K: 20 }), product({ K: 10 })], {
      N: 10,
      K: 30,
    });
    const out = calculate(r);
    expect(out.rawAmounts[0]).toBeCloseTo(10, 7);
    expect(out.rawAmounts[1]).toBeCloseTo(10, 7);
    expect(out.matched).toBe(2);
    expect(out.kkt).toBeLessThan(1e-7);
  });
  it("R5: unreachable ratios are reported, without negative doses", () => {
    const out = calculate(recipe([product({ N: 10, K: 20 })], { N: 10, K: 5 }));
    expect(out.amounts[0]).toBeGreaterThanOrEqual(0);
    expect(out.matched).toBeLessThan(2);
  });
  it("R6: source water above target cannot be removed", () => {
    const r = recipe([product({ Ca: 10 })], { Ca: 10 });
    r.water.Ca.value = 20;
    const out = calculate(r);
    expect(out.amounts[0]).toBe(0);
    expect(out.totals.Ca).toBe(20);
    expect(out.matched).toBe(0);
  });
  it("R7: exact fixed doses remain fixed, even with incompatible targets", () => {
    const r = recipe([product({ N: 10 })], { N: 15 });
    r.water.N.value = 5;
    r.items[0] = { ...r.items[0], amount: 20.003, fixed: true };
    const out = calculate(r);
    expect(out.amounts[0]).toBe(20.003);
    expect(out.totals.N).toBeCloseTo(25.003);
    expect(out.matched).toBe(0);
  });
  it("R8: liquid mass percentages use density exactly once", () => {
    const r = recipe(
      [product({ N: 10 }, { kind: "liquid", density: 1.2 })],
      {},
      { mode: "manual" },
    );
    r.items[0].amount = 10;
    expect(calculate(r).totals.N).toBeCloseTo(12, 8);
  });
  it("liquid g/L and mass/volume percentages are equivalent and do not require density", () => {
    const a = productComposition(
      product({ K: 100 }, { kind: "liquid", basis: "gramsPerLitre" }),
    );
    const b = productComposition(
      product({ K: 10 }, { kind: "liquid", basis: "volumePercent" }),
    );
    expect(a.K).toBeCloseTo(b.K!, 10);
    expect(() =>
      productComposition(product({ N: 10 }, { kind: "liquid" })),
    ).toThrow("density");
  });
  it("R9: every supported oxide form equals its elemental declaration", () => {
    for (const n of ["P", "K", "Ca", "Mg", "S", "Si"] as Nutrient[]) {
      const oxide = formOptions(n)[1];
      const a = product({});
      a.declarations[n] = { value: 10, form: oxide };
      const b = product({ [n]: 10 * factor(n, oxide) });
      const outA = calculate(recipe([a], { [n]: 12 }));
      const outB = calculate(recipe([b], { [n]: 12 }));
      expect(outA.rawAmounts[0]).toBeCloseTo(outB.rawAmounts[0], 8);
    }
    expect(factor("P", "P2O5")).toBeCloseTo(0.4364, 4);
    expect(() => factor("P", "PO4")).toThrow();
  });
  it("R10: missing water/product data never silently becomes zero", () => {
    const r = recipe([product({ N: 10 })], { N: 10 }, { waterAsZero: false });
    expect(() => calculate(r)).toThrow("water");
    r.waterAsZero = true;
    r.items[0].product.missingAsZero = false;
    r.targets.K = 2;
    expect(() => calculate(r)).toThrow("composition");
  });
  it("R11: an explicit zero target is active with absolute tolerance", () => {
    const out = calculate(recipe([product({ N: 10 })], { N: 0 }));
    expect(out.active).toEqual(["N"]);
    expect(out.amounts).toEqual([0]);
    expect(out.matched).toBe(1);
  });
  it("R12: result status uses rounded doses, not unrounded optimizer output", () => {
    const r = recipe([product({ N: 10 })], { N: 0.104 });
    r.tolerances.N = 0.001;
    const out = calculate(r);
    expect(out.rawAmounts[0]).toBeCloseTo(0.104, 8);
    expect(out.amounts[0]).toBe(0.1);
    expect(out.totals.N).toBeCloseTo(0.1, 8);
    expect(out.matched).toBe(0);
  });
  it("R14: duplicate columns can produce a valid, nonunique solution", () => {
    const out = calculate(recipe([product({ N: 10 }), product({ N: 10 })]));
    expect(out.amounts.every((x) => x >= 0)).toBe(true);
    expect(out.rawAmounts.reduce((a, b) => a + b)).toBeCloseTo(10, 7);
    expect(out.matched).toBe(1);
  });
  it("R15: total N is never added to nitrogen forms", () => {
    const p = product({ N: 10, NO3N: 8, NH4N: 2, ureaN: 0 });
    const out = calculate(recipe([p]));
    expect(out.totals.N).toBeCloseTo(10);
    expect(out.totals.NO3N).toBeCloseTo(8);
    p.declarations.NH4N.value = 3;
    expect(() => productComposition(p)).toThrow("nitrogen");
    const derived = productComposition(product({ NO3N: 8, NH4N: 2, ureaN: 0 }));
    expect(derived.N).toBeCloseTo(0.1);
  });
  it("zero columns, all fixed doses, and underdetermined systems are handled", () => {
    const r = recipe([product({ P: 10 })]);
    const out = calculate(r);
    expect(out.amounts).toEqual([0]);
    expect(out.matched).toBe(0);
    const under = calculate(
      recipe(
        [
          product({ N: 10, K: 20 }),
          product({ N: 5, K: 8 }),
          product({ K: 10 }),
        ],
        { N: 10, K: 30 },
      ),
    );
    expect(under.rawTotals.N).toBeCloseTo(10, 6);
    expect(under.rawTotals.K).toBeCloseTo(30, 6);
  });
  it("unknown untargeted contributions stay unknown when product is used", () => {
    const r = recipe([product({ N: 10 }, { missingAsZero: false })]);
    const out = calculate(r);
    expect(out.totals.N).toBe(10);
    expect(out.totals.K).toBeNull();
  });
  it("invalid volume, steps, fixed amounts, and targets are blocked", () => {
    const r = recipe([product({ N: 10 })]);
    r.volume = 0;
    expect(() => calculate(r)).toThrow("volume");
    r.volume = 100;
    r.stepG = 0;
    expect(() => calculate(r)).toThrow("rounding");
    r.stepG = 0.01;
    r.items[0].fixed = true;
    expect(() => calculate(r)).toThrow("amount");
    r.items[0].fixed = false;
    r.tolerances.N = 0;
    expect(() => calculate(r)).toThrow("targets");
  });
});
describe("Locale, persistence and validation", () => {
  it("R13: locale values are equivalent; ambiguous and nonfinite values are rejected", () => {
    expect(parseNumber("1,5", "de")).toBe(parseNumber("1.5", "en"));
    expect(parseNumber("", "de")).toBeNull();
    for (const raw of [
      "-1",
      "NaN",
      "Infinity",
      "1e3",
      "1.000,5",
      "1,000.5",
      "99999999999999999",
    ])
      expect(() => parseNumber(raw, "de")).toThrow();
    expect(() => parseNumber("1.5", "de")).toThrow();
    expect(() => parseNumber("1,5", "en")).toThrow();
  });
  it("R13: JSON roundtrip preserves declarations and immutable recipe snapshots", () => {
    const p = product({ P: 10 });
    p.declarations.P.form = "P2O5";
    const r = recipe([structuredClone(p)], { P: 10 });
    const library = parseLibrary(
      JSON.stringify({
        format: "hydrocalc",
        version: 1,
        products: [p],
        recipes: [r],
      }),
    );
    expect(library.recipes[0]).toEqual(r);
    expect(calculate(library.recipes[0]).rawAmounts).toEqual(
      calculate(r).rawAmounts,
    );
    p.declarations.P.value = 20;
    expect(library.recipes[0].items[0].product.declarations.P.value).toBe(10);
  });
  it("untrusted imports reject unsupported forms, versions and oversized data", () => {
    const p = product({ P: 10 });
    p.declarations.P.form = "PO4";
    expect(() => productSchema.parse(p)).toThrow();
    expect(() =>
      parseLibrary(
        '{"format":"hydrocalc","version":2,"products":[],"recipes":[]}',
      ),
    ).toThrow();
    expect(() => parseLibrary(" ".repeat(2_000_001))).toThrow();
    expect(() => productSchema.parse(product({ N: 101 }))).toThrow();
  });
  it("drafts, language and empty library roundtrip; a calculation fingerprint detects real changes", () => {
    const r = newRecipe();
    const workspace = {
      library: { format: "hydrocalc", version: 1, products: [], recipes: [] },
      draft: r,
      language: "en",
    };
    expect(
      workspaceSchema.parse(JSON.parse(JSON.stringify(workspace))),
    ).toEqual(workspace);
    expect(fingerprint({ ...r, name: "Renamed" })).toBe(fingerprint(r));
    expect(fingerprint({ ...r, volume: 101 })).not.toBe(fingerprint(r));
    expect(nutrients.length).toBe(18);
  });
});
