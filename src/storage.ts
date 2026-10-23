import { z } from "zod";
import {
  librarySchema,
  recipeSchema,
  newRecipe,
  type Language,
  type Library,
  type Recipe,
} from "./domain";

export const storageKey = "hydrocalc.workspace.v1";
export const workspaceSchema = z.object({
  library: librarySchema,
  draft: recipeSchema,
  language: z.enum(["de", "en"]),
});
export type Workspace = { library: Library; draft: Recipe; language: Language };
export function loadWorkspace(): { workspace: Workspace; blocked: boolean } {
  const fallback: Workspace = {
    library: { format: "hydrocalc", version: 1, products: [], recipes: [] },
    draft: newRecipe(),
    language: "de",
  };
  try {
    const raw = localStorage.getItem(storageKey);
    return {
      workspace: raw ? workspaceSchema.parse(JSON.parse(raw)) : fallback,
      blocked: false,
    };
  } catch {
    return { workspace: fallback, blocked: true };
  }
}
export function download(
  name: string,
  data: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function parseLibrary(raw: string): Library {
  if (raw.length > 2_000_000) throw new Error("File too large");
  const parsed = librarySchema.parse(JSON.parse(raw));
  if (
    new Set(parsed.products.map((p) => p.id)).size !== parsed.products.length ||
    new Set(parsed.recipes.map((r) => r.id)).size !== parsed.recipes.length
  )
    throw new Error("Duplicate IDs");
  return parsed;
}
