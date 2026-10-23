import { z } from "zod";
import { fcnnls } from "ml-fcnnls";
import { Matrix } from "ml-matrix";

export type Language = "de" | "en";
export const nutrients = [
  "N",
  "NO3N",
  "NH4N",
  "ureaN",
  "P",
  "K",
  "Ca",
  "Mg",
  "S",
  "Fe",
  "Mn",
  "Zn",
  "B",
  "Cu",
  "Mo",
  "Si",
  "Na",
  "Cl",
] as const;
export type Nutrient = (typeof nutrients)[number];
export const primary: Nutrient[] = ["N", "P", "K", "Ca", "Mg", "S"];
export const symbols: Record<Nutrient, string> = {
  N: "N",
  NO3N: "NO₃–N",
  NH4N: "NH₄–N",
  ureaN: "Urea–N",
  P: "P",
  K: "K",
  Ca: "Ca",
  Mg: "Mg",
  S: "S",
  Fe: "Fe",
  Mn: "Mn",
  Zn: "Zn",
  B: "B",
  Cu: "Cu",
  Mo: "Mo",
  Si: "Si",
  Na: "Na",
  Cl: "Cl",
};
export const names: Record<Language, Record<Nutrient, string>> = {
  de: {
    N: "Gesamtstickstoff",
    NO3N: "Nitrat-Stickstoff",
    NH4N: "Ammonium-Stickstoff",
    ureaN: "Harnstoff-Stickstoff",
    P: "Phosphor",
    K: "Kalium",
    Ca: "Calcium",
    Mg: "Magnesium",
    S: "Schwefel",
    Fe: "Eisen",
    Mn: "Mangan",
    Zn: "Zink",
    B: "Bor",
    Cu: "Kupfer",
    Mo: "Molybdän",
    Si: "Silicium",
    Na: "Natrium",
    Cl: "Chlorid als Cl",
  },
  en: {
    N: "Total nitrogen",
    NO3N: "Nitrate nitrogen",
    NH4N: "Ammonium nitrogen",
    ureaN: "Urea nitrogen",
    P: "Phosphorus",
    K: "Potassium",
    Ca: "Calcium",
    Mg: "Magnesium",
    S: "Sulfur",
    Fe: "Iron",
    Mn: "Manganese",
    Zn: "Zinc",
    B: "Boron",
    Cu: "Copper",
    Mo: "Molybdenum",
    Si: "Silicon",
    Na: "Sodium",
    Cl: "Chloride as Cl",
  },
};
// Version 1: conventional standard atomic weights. No HydroBuddy code/data used.
export const atomicMass = {
  N: 14.007,
  H: 1.008,
  O: 15.999,
  P: 30.973761998,
  K: 39.0983,
  Ca: 40.078,
  Mg: 24.305,
  S: 32.06,
  Si: 28.085,
};
const { N, H, O, P, K, Ca, Mg, S, Si } = atomicMass;
export const forms: Partial<Record<Nutrient, Record<string, number>>> = {
  P: { P: 1, P2O5: (2 * P) / (2 * P + 5 * O) },
  K: { K: 1, K2O: (2 * K) / (2 * K + O) },
  Ca: { Ca: 1, CaO: Ca / (Ca + O) },
  Mg: { Mg: 1, MgO: Mg / (Mg + O) },
  S: { S: 1, SO3: S / (S + 3 * O), SO4: S / (S + 4 * O) },
  Si: { Si: 1, SiO2: Si / (Si + 2 * O) },
  NO3N: { NO3N: 1, NO3: N / (N + 3 * O) },
  NH4N: { NH4N: 1, NH4: N / (N + 4 * H) },
};
export const formOptions = (n: Nutrient) => Object.keys(forms[n] ?? { [n]: 1 });
export const factor = (n: Nutrient, form: string): number => {
  const result = (forms[n] ?? { [n]: 1 })[form];
  if (result === undefined) throw new Error("Invalid nutrient form");
  return result;
};
export const formLabel = (form: string) =>
  ({
    P2O5: "P₂O₅",
    K2O: "K₂O",
    CaO: "CaO",
    MgO: "MgO",
    SO3: "SO₃",
    SO4: "SO₄²⁻",
    SiO2: "SiO₂",
    NO3: "NO₃⁻",
    NH4: "NH₄⁺",
    NO3N: "NO₃–N",
    NH4N: "NH₄–N",
    ureaN: "Urea–N",
  })[form] ?? form;
export function parseNumber(raw: string, lang: Language): number | null {
  if (raw.trim() === "") return null;
  const separator = lang === "de" ? "," : ".";
  const pattern = lang === "de" ? /^\d+(,\d*)?$/ : /^\d+(\.\d*)?$/;
  if (!pattern.test(raw.trim())) throw new Error("number");
  const value = Number(raw.trim().replace(separator, "."));
  if (!Number.isFinite(value) || value > 1e12) throw new Error("number");
  return value;
}
export const formatNumber = (value: number, lang: Language, digits = 3) =>
  new Intl.NumberFormat(lang, {
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);

const quantity = z.number().finite().min(0).max(1e12);
const nutrientEnum = z.enum(nutrients);
const valuesSchema = z.record(nutrientEnum, quantity.nullable());
const declarationSchema = z.object({
  value: quantity.nullable(),
  form: z.string().max(20),
});
const declarationsSchema = z
  .record(nutrientEnum, declarationSchema)
  .superRefine((v, ctx) => {
    for (const n of nutrients)
      if (!formOptions(n).includes(v[n].form))
        ctx.addIssue({
          code: "custom",
          message: "Invalid form",
          path: [n, "form"],
        });
  });
export const productSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(120),
    source: z.string().max(500),
    kind: z.enum(["solid", "liquid"]),
    basis: z.enum(["massPercent", "volumePercent", "gramsPerLitre"]),
    density: quantity.nullable(),
    declarations: declarationsSchema,
    missingAsZero: z.boolean(),
    revision: z.number().int().positive(),
  })
  .superRefine((p, ctx) => {
    if (p.kind === "solid" && p.basis !== "massPercent")
      ctx.addIssue({ code: "custom", message: "Solid basis" });
    if (p.density !== null && p.density <= 0)
      ctx.addIssue({ code: "custom", message: "Density" });
    if (
      p.basis === "massPercent" &&
      nutrients.some((n) => (p.declarations[n].value ?? 0) > 100)
    )
      ctx.addIssue({ code: "custom", message: "Percentage > 100" });
  });
export type Product = z.infer<typeof productSchema>;
export const recipeSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().max(120),
  volume: quantity.nullable(),
  water: declarationsSchema,
  waterName: z.string().max(120),
  waterAsZero: z.boolean(),
  targets: valuesSchema,
  tolerances: valuesSchema,
  mode: z.enum(["optimize", "manual"]),
  stepG: quantity.nullable(),
  stepMl: quantity.nullable(),
  items: z
    .array(
      z.object({
        product: productSchema,
        fixed: z.boolean(),
        amount: quantity.nullable(),
      }),
    )
    .max(100)
    .refine(
      (items) => new Set(items.map((i) => i.product.id)).size === items.length,
      "Duplicate products",
    ),
  updatedAt: z.string().max(50),
});
export type Recipe = z.infer<typeof recipeSchema>;
export const librarySchema = z.object({
  format: z.literal("hydrocalc"),
  version: z.literal(1),
  products: z.array(productSchema).max(200),
  recipes: z.array(recipeSchema).max(100),
});
export type Library = z.infer<typeof librarySchema>;
export type Values = z.infer<typeof valuesSchema>;
export const blankValues = (): Values =>
  Object.fromEntries(nutrients.map((n) => [n, null])) as Values;
export const blankDeclarations = (): Product["declarations"] =>
  Object.fromEntries(
    nutrients.map((n) => [n, { value: null, form: n }]),
  ) as Product["declarations"];
export const newProduct = (): Product => ({
  id: crypto.randomUUID(),
  name: "",
  source: "",
  kind: "solid",
  basis: "massPercent",
  density: null,
  declarations: blankDeclarations(),
  missingAsZero: false,
  revision: 1,
});
export const newRecipe = (): Recipe => ({
  id: crypto.randomUUID(),
  name: "",
  volume: 100,
  water: blankDeclarations(),
  waterName: "",
  waterAsZero: false,
  targets: blankValues(),
  tolerances: blankValues(),
  mode: "optimize",
  stepG: 0.01,
  stepMl: 0.1,
  items: [],
  updatedAt: new Date().toISOString(),
});
export class CalculationError extends Error {
  constructor(
    public code:
      | "volume"
      | "targets"
      | "products"
      | "water"
      | "composition"
      | "density"
      | "amount"
      | "rounding"
      | "solver"
      | "nitrogen",
    public detail = "",
  ) {
    super(code);
  }
}
const nitrogenForms: Nutrient[] = ["NO3N", "NH4N", "ureaN"];
function normalize(
  declarations: Product["declarations"],
  assumeZero: boolean,
): Values {
  const v = Object.fromEntries(
    nutrients.map((n) => [
      n,
      declarations[n].value === null
        ? null
        : declarations[n].value! * factor(n, declarations[n].form),
    ]),
  ) as Values;
  const knownParts = nitrogenForms.filter((n) => v[n] !== null);
  const sum = knownParts.reduce((acc, n) => acc + v[n]!, 0);
  if (
    v.N !== null &&
    (sum > v.N + 1e-8 ||
      (knownParts.length === 3 && Math.abs(sum - v.N) > 1e-8))
  )
    throw new CalculationError("nitrogen");
  if (
    v.N === null &&
    (knownParts.length === 3 || (assumeZero && knownParts.length > 0))
  )
    v.N = sum;
  return Object.fromEntries(
    nutrients.map((n) => [n, v[n] ?? (assumeZero ? 0 : null)]),
  ) as Values;
}
export function productComposition(p: Product): Values {
  productSchema.parse(p);
  const base = normalize(p.declarations, p.missingAsZero);
  // Fractions per gram of solid, per ml of liquid. No duplicate purity correction.
  let multiplier = 0.01;
  if (p.kind === "liquid") {
    if (p.basis === "massPercent") {
      if (!p.density || p.density <= 0)
        throw new CalculationError("density", p.name);
      multiplier = p.density * 0.01;
    } else multiplier = p.basis === "volumePercent" ? 0.01 : 0.001;
  }
  return Object.fromEntries(
    nutrients.map((n) => [n, base[n] === null ? null : base[n]! * multiplier]),
  ) as Values;
}
export function tolerance(r: Recipe, n: Nutrient) {
  return r.tolerances[n] ?? Math.max(0.05, (r.targets[n] ?? 0) * 0.05);
}
export interface Result {
  model: string;
  input: string;
  amounts: number[];
  rawAmounts: number[];
  water: Values;
  added: Values;
  totals: Values;
  rawTotals: Values;
  matched: number;
  active: Nutrient[];
  iterations: number;
  kkt: number;
  rounded: boolean;
}
export const fingerprint = (r: Recipe) =>
  JSON.stringify({
    ...r,
    updatedAt: undefined,
    name: undefined,
    id: undefined,
  });
export function calculate(recipe: Recipe): Result {
  const r = recipeSchema.parse(recipe);
  if (!r.volume || r.volume <= 0) throw new CalculationError("volume");
  if (!r.stepG || !r.stepMl) throw new CalculationError("rounding");
  const active = nutrients.filter((n) => r.targets[n] !== null);
  if (!active.length && r.mode === "optimize")
    throw new CalculationError("targets");
  if (!r.items.length) throw new CalculationError("products");
  for (const n of active)
    if (tolerance(r, n) <= 0) throw new CalculationError("targets", symbols[n]);
  if (
    r.targets.N !== null &&
    nitrogenForms.every((n) => r.targets[n] !== null)
  ) {
    const sum = nitrogenForms.reduce((a, n) => a + r.targets[n]!, 0);
    const spread =
      tolerance(r, "N") +
      nitrogenForms.reduce((a, n) => a + tolerance(r, n), 0);
    if (Math.abs(r.targets.N - sum) > spread)
      throw new CalculationError("nitrogen");
  }
  const water = normalize(r.water, r.waterAsZero);
  for (const n of active)
    if (water[n] === null) throw new CalculationError("water", symbols[n]);
  const comp = r.items.map(({ product }) => productComposition(product));
  for (let j = 0; j < comp.length; j++)
    for (const n of active)
      if (comp[j][n] === null)
        throw new CalculationError(
          "composition",
          `${r.items[j].product.name} · ${symbols[n]}`,
        );
  const rawAmounts = r.items.map((item) => {
    if (r.mode === "manual" || item.fixed) {
      if (item.amount === null)
        throw new CalculationError("amount", item.product.name);
      return item.amount;
    }
    return 0;
  });
  const coefficient = (i: Nutrient, j: number) =>
    (1000 / r.volume!) * (comp[j][i] ?? 0);
  const variable = r.items
    .map((_, j) => j)
    .filter((j) => r.mode === "optimize" && !r.items[j].fixed);
  // Remove zero columns: they have no effect on any active target.
  const columns = variable.filter((j) =>
    active.some((n) => coefficient(n, j) > 0),
  );
  let iterations = 0,
    kkt = 0;
  if (columns.length) {
    const a = active.map((n) =>
      columns.map((j) => coefficient(n, j) / tolerance(r, n)),
    );
    const b = active.map(
      (n) =>
        (r.targets[n]! -
          water[n]! -
          rawAmounts.reduce((s, x, j) => s + x * coefficient(n, j), 0)) /
        tolerance(r, n),
    );
    const scales = columns.map((_, j) => Math.hypot(...a.map((row) => row[j])));
    const matrix = a.map((row) => row.map((v, j) => v / scales[j]));
    try {
      const solved = fcnnls(new Matrix(matrix), Matrix.columnVector(b), {
        info: true,
        maxIterations: Math.max(100, columns.length * 20),
        gradientTolerance: 1e-12,
      });
      const x = solved.K.to1DArray();
      iterations = solved.info.iterations;
      const residual = matrix.map(
        (row, i) => row.reduce((s, v, j) => s + v * x[j], 0) - b[i],
      );
      const gradients = columns.map((_, j) =>
        matrix.reduce((s, row, i) => s + row[j] * residual[i], 0),
      );
      kkt = Math.max(
        ...gradients.map((g, j) =>
          x[j] > 1e-9 ? Math.abs(g) : Math.max(0, -g),
        ),
      );
      if (
        x.some((v) => !Number.isFinite(v) || v < -1e-9) ||
        !Number.isFinite(kkt) ||
        kkt > 1e-7 * Math.max(1, Math.hypot(...b))
      )
        throw new Error("KKT");
      columns.forEach((j, k) => {
        rawAmounts[j] = Math.max(0, x[k]) / scales[k];
      });
    } catch {
      throw new CalculationError("solver");
    }
  }
  const amounts = rawAmounts.map((v, j) => {
    // Exact fixed/manual doses are not silently changed to match the automatic step.
    if (r.mode === "manual" || r.items[j].fixed) return v;
    const step = r.items[j].product.kind === "solid" ? r.stepG! : r.stepMl!;
    return Number((Math.round(v / step) * step).toPrecision(12));
  });
  const contributions = (xs: number[]): Values =>
    Object.fromEntries(
      nutrients.map((n) => {
        const unknown = comp.some((c, j) => xs[j] > 0 && c[n] === null);
        return [
          n,
          unknown ? null : xs.reduce((s, x, j) => s + x * coefficient(n, j), 0),
        ];
      }),
    ) as Values;
  const added = contributions(amounts),
    rawAdded = contributions(rawAmounts);
  const totalsFor = (adds: Values): Values =>
    Object.fromEntries(
      nutrients.map((n) => [
        n,
        water[n] === null || adds[n] === null ? null : water[n]! + adds[n]!,
      ]),
    ) as Values;
  const totals = totalsFor(added);
  if (
    rawAmounts.some((x) => !Number.isFinite(x) || x > 1e12) ||
    nutrients.some(
      (n) =>
        (totals[n] !== null && !Number.isFinite(totals[n])) ||
        (rawAdded[n] !== null && !Number.isFinite(rawAdded[n])),
    )
  )
    throw new CalculationError("solver");
  return {
    model: "hydrocalc-1 / masses-1 / ml-fcnnls-3.1.0",
    input: fingerprint(r),
    amounts,
    rawAmounts,
    water,
    added,
    totals,
    rawTotals: totalsFor(rawAdded),
    active,
    matched: active.filter(
      (n) => Math.abs(totals[n]! - r.targets[n]!) <= tolerance(r, n) + 1e-9,
    ).length,
    iterations,
    kkt,
    rounded: amounts.some((v, i) => Math.abs(v - rawAmounts[i]) > 1e-10),
  };
}
