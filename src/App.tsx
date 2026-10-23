import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Leaf,
  FlaskConical,
  Droplets,
  Plus,
  ArrowRight,
  Calculator,
  BookOpen,
  Package,
  X,
  Trash2,
  Check,
  ChevronDown,
  SlidersHorizontal,
  Save,
  Download,
  Upload,
  CircleHelp,
  AlertTriangle,
  Sprout,
  Copy,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import {
  calculate,
  CalculationError,
  factor,
  fingerprint,
  formatNumber,
  formLabel,
  formOptions,
  names,
  newProduct,
  newRecipe,
  nutrients,
  parseNumber,
  primary,
  productComposition,
  productSchema,
  symbols,
  tolerance,
  type Language,
  type Nutrient,
  type Product,
  type Recipe,
  type Result,
} from "./domain";
import {
  download,
  loadWorkspace,
  parseLibrary,
  storageKey,
  type Workspace,
} from "./storage";

type T = (de: string, en: string) => string;
function Numeric({
  value,
  onChange,
  lang,
  label,
  unit,
  placeholder = "—",
  required = false,
  disabled = false,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  lang: Language;
  label: string;
  unit?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [raw, setRaw] = useState(
    value === null ? "" : formatNumber(value, lang, 10),
  );
  const [invalid, setInvalid] = useState(false);
  const last = useRef(value);
  const previousLanguage = useRef(lang);
  useEffect(() => {
    if (value !== last.current || lang !== previousLanguage.current) {
      setRaw(value === null ? "" : formatNumber(value, lang, 10));
      setInvalid(false);
    }
    last.current = value;
    previousLanguage.current = lang;
  }, [value, lang]);
  return (
    <span className={`number-input ${invalid ? "invalid" : ""}`}>
      <input
        aria-label={label}
        disabled={disabled}
        inputMode="decimal"
        value={raw}
        placeholder={placeholder}
        required={required}
        aria-invalid={invalid}
        title={
          invalid
            ? lang === "de"
              ? "Zahl mit Dezimalkomma, ohne Tausendertrennzeichen eingeben."
              : "Use a decimal point, without thousands separators."
            : undefined
        }
        onChange={(e) => {
          const text = e.target.value;
          setRaw(text);
          try {
            const parsed = parseNumber(text, lang);
            last.current = parsed;
            setInvalid(false);
            e.target.setCustomValidity("");
            onChange(parsed);
          } catch {
            last.current = null;
            setInvalid(true);
            e.target.setCustomValidity(
              lang === "de"
                ? "Bitte eine gültige Zahl mit Dezimalkomma eingeben."
                : "Enter a valid number with a decimal point.",
            );
            onChange(null);
          }
        }}
      />
      {unit && <span className="input-unit">{unit}</span>}
      {invalid && (
        <span className="input-error">
          {lang === "de" ? "Ungültiges Zahlenformat" : "Invalid number format"}
        </span>
      )}
    </span>
  );
}
function Section({
  number,
  title,
  subtitle,
  action,
  children,
}: {
  number: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card section">
      <div className="section-heading">
        <div className="section-number">{number}</div>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div className="section-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}
function ProductEditor({
  initial,
  close,
  save,
  lang,
  t,
}: {
  initial: Product;
  close: () => void;
  save: (p: Product) => void;
  lang: Language;
  t: T;
}) {
  const [p, setP] = useState(initial);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const pendingSwitch = useRef<
    Partial<Record<Nutrient, { value: number | null; form: string }>>
  >({});
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const update = (n: Nutrient, value: number | null) => {
    pendingSwitch.current[n] = undefined;
    setP((prev) => ({
      ...prev,
      declarations: {
        ...prev.declarations,
        [n]: { ...prev.declarations[n], value },
      },
    }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const parsed = productSchema.parse(p);
      productComposition(parsed);
      save(parsed);
    } catch (e) {
      setError(
        e instanceof CalculationError && e.code === "density"
          ? t(
              "Für diese Gehaltsbasis ist eine Dichte größer als null erforderlich.",
              "This composition basis requires a density greater than zero.",
            )
          : e instanceof CalculationError && e.code === "nitrogen"
            ? t(
                "Gesamtstickstoff und Stickstoffformen sind widersprüchlich.",
                "Total nitrogen and nitrogen forms are inconsistent.",
              )
            : t(
                "Bitte Name, Gehalte (bei Massen-% höchstens 100) und Gehaltsbasis prüfen.",
                "Check the name, composition (at most 100 for mass %) and basis.",
              ),
      );
    }
  };
  return (
    <dialog
      ref={dialog}
      className="product-dialog"
      onCancel={close}
      aria-labelledby="product-title"
    >
      <form onSubmit={submit}>
        <header className="dialog-header">
          <div>
            <span className="eyebrow">
              {t("DEINE DÜNGERDATEN", "YOUR FERTILIZER DATA")}
            </span>
            <h2 id="product-title">{t("Dünger erfassen", "Add fertilizer")}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={close}
            aria-label={t("Schließen", "Close")}
          >
            <X size={20} />
          </button>
        </header>
        <div className="dialog-body">
          <div className="field">
            <label htmlFor="product-name">
              {t("Produktname", "Product name")}
            </label>
            <input
              id="product-name"
              value={p.name}
              maxLength={120}
              onChange={(e) => setP({ ...p, name: e.target.value })}
              required
              placeholder={t(
                "z. B. mein Kaliumnitrat",
                "e.g. my potassium nitrate",
              )}
              autoFocus
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="kind">{t("Form", "Physical form")}</label>
              <select
                id="kind"
                value={p.kind}
                onChange={(e) =>
                  setP({
                    ...p,
                    kind: e.target.value as Product["kind"],
                    basis: "massPercent",
                  })
                }
              >
                <option value="solid">
                  {t("Fest · Dosierung in g", "Solid · doses in g")}
                </option>
                <option value="liquid">
                  {t("Flüssig · Dosierung in ml", "Liquid · doses in ml")}
                </option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="basis">
                {t("Gehaltsbasis", "Composition basis")}
              </label>
              <select
                id="basis"
                value={p.basis}
                onChange={(e) =>
                  setP({ ...p, basis: e.target.value as Product["basis"] })
                }
              >
                <option value="massPercent">% (m/m)</option>
                {p.kind === "liquid" && (
                  <>
                    <option value="volumePercent">% (m/V) · g/100 ml</option>
                    <option value="gramsPerLitre">g/L</option>
                  </>
                )}
              </select>
            </div>
          </div>
          {p.kind === "liquid" && p.basis === "massPercent" && (
            <div className="field">
              <label>{t("Dichte des Produkts", "Product density")}</label>
              <Numeric
                lang={lang}
                value={p.density}
                onChange={(density) => setP({ ...p, density })}
                label={t("Dichte", "Density")}
                unit="g/ml"
                required
              />
            </div>
          )}
          <div className="info-note">
            <CircleHelp size={17} />
            <span>
              {t(
                "Wert von der Verpackung übernehmen und je Zeile die Bezugsform wählen. Die Vorschau zeigt den reinen Elementgehalt. P₂O₅ ist ein Oxidäquivalent, kein Phosphation.",
                "Enter the label value and select its form for each nutrient. The preview shows elemental content. P₂O₅ is an oxide equivalent, not a phosphate ion.",
              )}
            </span>
          </div>
          <div className="composition-head">
            <span>{t("Nährstoff", "Nutrient")}</span>
            <span>{t("Verpackungsangabe", "Label declaration")}</span>
            <span>{t("Als Element", "As element")}</span>
          </div>
          <div className="composition">
            {nutrients.map((n) => {
              const entry = p.declarations[n];
              const unit = p.basis === "gramsPerLitre" ? "g/L" : "%";
              return (
                <div className="composition-row" key={n}>
                  <label>
                    <b>{symbols[n]}</b>
                    <span>{names[lang][n]}</span>
                  </label>
                  <div className="composition-value">
                    <Numeric
                      lang={lang}
                      value={entry.value}
                      onChange={(value) => update(n, value)}
                      label={`${names[lang][n]} ${t("Gehalt", "content")}`}
                      unit={unit}
                    />
                    <select
                      aria-label={`${names[lang][n]} ${t("Bezugsform", "form")}`}
                      value={entry.form}
                      onChange={(e) => {
                        const original = pendingSwitch.current[n] ?? {
                          value: entry.value,
                          form: entry.form,
                        };
                        pendingSwitch.current[n] = original;
                        const form = e.target.value;
                        const value =
                          original.value === null
                            ? null
                            : (original.value * factor(n, original.form)) /
                              factor(n, form);
                        setP({
                          ...p,
                          declarations: {
                            ...p.declarations,
                            [n]: { form, value },
                          },
                        });
                      }}
                    >
                      {formOptions(n).map((f) => (
                        <option key={f} value={f}>
                          {formLabel(f)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="conversion">
                    {entry.value === null
                      ? "—"
                      : `${formatNumber(entry.value * factor(n, entry.form), lang, 4)} ${unit}`}
                    <small>{n === "N" ? "N" : symbols[n]}</small>
                  </span>
                </div>
              );
            })}
          </div>
          <label className="checkbox-note">
            <input
              type="checkbox"
              checked={p.missingAsZero}
              onChange={(e) => setP({ ...p, missingAsZero: e.target.checked })}
            />
            <span>
              {t(
                "Ich bestätige: Nicht angegebene Nährstoffe sollen als 0 behandelt werden.",
                "I confirm that unspecified nutrients should be treated as zero.",
              )}
            </span>
          </label>
          <div className="field">
            <label htmlFor="product-source">
              {t("Quelle / Notiz", "Source / note")}
            </label>
            <input
              id="product-source"
              value={p.source}
              maxLength={500}
              onChange={(e) => setP({ ...p, source: e.target.value })}
              placeholder={t(
                "Verpackung, Hersteller, Datum …",
                "Label, manufacturer, date …",
              )}
            />
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="dialog-footer">
          <button type="button" className="button secondary" onClick={close}>
            {t("Abbrechen", "Cancel")}
          </button>
          <button className="button primary" type="submit">
            <Check size={17} />
            {t("Dünger speichern", "Save fertilizer")}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default function App() {
  const [loaded] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState<Workspace>(loaded.workspace);
  const { draft: r, library, language: lang } = workspace;
  const t: T = (de, en) => (lang === "de" ? de : en);
  const [page, setPage] = useState<"recipe" | "products" | "recipes">("recipe");
  const [editor, setEditor] = useState<Product | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [storageError, setStorageError] = useState(loaded.blocked);
  const [advanced, setAdvanced] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const change = (patch: Partial<Recipe>) => {
    setWorkspace((w) => ({ ...w, draft: { ...w.draft, ...patch } }));
    setError("");
    setNotice("");
    setPersisted(false);
  };
  useEffect(() => {
    document.documentElement.lang = lang;
    if (loaded.blocked) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace));
      setPersisted(true);
      setStorageError(false);
    } catch {
      setStorageError(true);
      setPersisted(false);
    }
  }, [workspace, lang, loaded.blocked]);
  const available = library.products.filter(
    (p) => !r.items.some((i) => i.product.id === p.id),
  );
  const isCurrent = result?.input === fingerprint(r);
  const visibleNutrients = advanced
    ? [...primary, ...nutrients.filter((n) => !primary.includes(n))]
    : primary;
  const nf = (v: number | null, digits = 3) =>
    v === null ? "—" : formatNumber(v, lang, digits);
  const saveProduct = (input: Product) => {
    const previous = library.products.find((p) => p.id === input.id);
    const p = { ...input, revision: previous ? previous.revision + 1 : 1 };
    setNoticeError(false);
    setWorkspace((w) => ({
      ...w,
      library: {
        ...w.library,
        products: w.library.products.some((i) => i.id === p.id)
          ? w.library.products.map((i) => (i.id === p.id ? p : i))
          : [...w.library.products, p],
      },
    }));
    setEditor(null);
    setNotice(
      t(
        "Dünger gespeichert. Bereits verwendete Rezeptdaten bleiben unverändert.",
        "Fertilizer saved. Existing recipe snapshots remain unchanged.",
      ),
    );
  };
  const run = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const output = calculate(r);
      setResult(output);
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    } catch (err) {
      const messages = {
        volume: t(
          "Bitte ein Endvolumen größer als null angeben.",
          "Enter a final volume greater than zero.",
        ),
        targets: t(
          "Mindestens ein Ziel und positive Toleranzen angeben.",
          "Enter at least one target and positive tolerances.",
        ),
        products: t(
          "Zuerst einen Dünger anlegen und für diese Rezeptur auswählen.",
          "Create a fertilizer and select it for this recipe first.",
        ),
        water: t(
          "Wasserwert fehlt. Ergänzen oder die Nullannahme ausdrücklich bestätigen.",
          "Water value missing. Enter a value or explicitly confirm the zero assumption.",
        ),
        composition: t(
          "Ein Produktgehalt für ein aktives Ziel ist unbekannt. Produkt ergänzen oder Nullannahme bestätigen.",
          "A product composition for an active target is unknown. Complete it or confirm the zero assumption.",
        ),
        density: t(
          "Für diesen Flüssigdünger fehlt eine positive Dichte.",
          "This liquid fertilizer requires a positive density.",
        ),
        amount: t(
          "Bitte eine feste oder manuelle Menge angeben.",
          "Enter a fixed or manual dose.",
        ),
        rounding: t(
          "Dosierschritte müssen größer als null sein.",
          "Dose increments must be greater than zero.",
        ),
        solver: t(
          "Keine numerisch geprüfte Lösung gefunden. Produkte und Ziele prüfen.",
          "No numerically verified solution found. Check the products and targets.",
        ),
        nitrogen: t(
          "Gesamt-N und Stickstoffformen sind widersprüchlich.",
          "Total N and nitrogen forms are inconsistent.",
        ),
      };
      setError(
        err instanceof CalculationError
          ? `${messages[err.code]} ${err.detail}`
          : t("Bitte alle Eingaben prüfen.", "Please check all inputs."),
      );
    }
  };
  const saveRecipe = () => {
    setNoticeError(false);
    if (!r.name.trim()) {
      setError(t("Bitte die Rezeptur benennen.", "Please name this recipe."));
      return;
    }
    if (!form.current?.reportValidity()) return;
    const saved = { ...r, updatedAt: new Date().toISOString() };
    setWorkspace((w) => ({
      ...w,
      draft: saved,
      library: {
        ...w.library,
        recipes: w.library.recipes.some((i) => i.id === r.id)
          ? w.library.recipes.map((i) => (i.id === r.id ? saved : i))
          : [saved, ...w.library.recipes],
      },
    }));
    setNotice(
      t(
        "Rezeptur zur Sammlung hinzugefügt.",
        "Recipe added to your collection.",
      ),
    );
  };
  const startNew = () => {
    const hasData =
      r.name ||
      r.items.length ||
      nutrients.some((n) => r.targets[n] !== null || r.water[n].value !== null);
    if (
      hasData &&
      !window.confirm(
        t(
          "Neuen Entwurf beginnen? Sichere diesen Entwurf vorher über „Zur Sammlung“, wenn du ihn behalten möchtest.",
          "Start a new draft? Save this draft with “Add to collection” first if you want to keep it.",
        ),
      )
    )
      return;
    change(newRecipe());
    setResult(null);
    setPage("recipe");
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("recipe");
          }}
        >
          <span className="brand-mark">
            <Sprout size={25} />
          </span>
          Hydro<span>Calc</span>
        </a>
        <div className="workspace-label">
          {t("DEIN ARBEITSPLATZ", "YOUR WORKSPACE")}
        </div>
        <nav aria-label={t("Hauptnavigation", "Main navigation")}>
          <button
            className={page === "recipe" ? "active" : ""}
            onClick={() => setPage("recipe")}
          >
            <FlaskConical size={19} />
            {t("Nährstoffrechner", "Nutrient calculator")}
            <span className="active-dot" />
          </button>
          <button
            className={page === "products" ? "active" : ""}
            onClick={() => setPage("products")}
          >
            <Package size={19} />
            {t("Meine Dünger", "My fertilizers")}
            <span className="nav-count">{library.products.length}</span>
          </button>
          <button
            className={page === "recipes" ? "active" : ""}
            onClick={() => setPage("recipes")}
          >
            <BookOpen size={19} />
            {t("Meine Rezepturen", "My recipes")}
            <span className="nav-count">{library.recipes.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-icon">
              <Leaf size={20} />
            </span>
            <b>
              {t(
                "Dein Wissen. Deine Rezepte.",
                "Your knowledge. Your recipes.",
              )}
            </b>
            <p>
              {t(
                "Lokal gespeichert. Ohne Konto. Ganz bei dir.",
                "Stored locally. No account. Yours to keep.",
              )}
            </p>
          </div>
          <div className="sidebar-version">
            <span className="dot" />
            HydroCalc <span>v0.1</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            {t("Arbeitsplatz", "Workspace")}
            <span>/</span>
            <b>
              {page === "recipe"
                ? t("Nährstoffrechner", "Nutrient calculator")
                : page === "products"
                  ? t("Meine Dünger", "My fertilizers")
                  : t("Meine Rezepturen", "My recipes")}
            </b>
          </div>
          <div className="topbar-actions">
            <span className={`storage-state ${storageError ? "warning" : ""}`}>
              <span className="dot" />
              {storageError
                ? t("Speicher prüfen", "Check storage")
                : persisted
                  ? t("Lokal gespeichert", "Saved locally")
                  : t("Speichern …", "Saving …")}
            </span>
            <label className="language">
              <span className="sr-only">{t("Sprache", "Language")}</span>
              <select
                value={lang}
                onChange={(e) =>
                  setWorkspace((w) => ({
                    ...w,
                    language: e.target.value as Language,
                  }))
                }
              >
                <option value="de">DE</option>
                <option value="en">EN</option>
              </select>
            </label>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="banner error-message" role="alert">
              {t(
                "Lokaler Speicher ist nicht verfügbar oder enthält unlesbare Daten. Bestehende Daten werden nicht überschrieben. Bitte eine Sicherung exportieren; Änderungen sind derzeit nicht zuverlässig gespeichert.",
                "Local storage is unavailable or contains unreadable data. Existing data will not be overwritten. Export a backup; changes are currently not reliably saved.",
              )}
            </div>
          )}
          {notice && (
            <div
              className={`banner ${noticeError ? "error-message" : "success-message"}`}
              role={noticeError ? "alert" : "status"}
            >
              {noticeError ? (
                <AlertTriangle size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}
              {notice}
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {t("WACHSEN BEGINNT MIT BALANCE", "GROWTH STARTS WITH BALANCE")}
              </span>
              <h1>
                {page === "recipe"
                  ? t("Die richtige Mischung.", "Find your balance.")
                  : page === "products"
                    ? t(
                        "Deine Dünger. Dein Wissen.",
                        "Your fertilizers. Your knowledge.",
                      )
                    : t("Gute Rezepte bleiben.", "Good recipes are keepers.")}
              </h1>
              <p>
                {page === "recipe"
                  ? t(
                      "Plane deine Nährlösung. Präzise berechnet, verständlich erklärt.",
                      "Plan your nutrient solution. Precisely calculated, clearly explained.",
                    )
                  : page === "products"
                    ? t(
                        "Erfasse deine Nährsalze genau so, wie sie auf der Verpackung stehen.",
                        "Add your nutrient salts exactly as declared on the label.",
                      )
                    : t(
                        "Gespeicherte Mischungen für deinen nächsten Ansatz.",
                        "Saved formulas for your next batch.",
                      )}
              </p>
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={
                page === "products" ? () => setEditor(newProduct()) : startNew
              }
            >
              <Plus size={17} />
              {page === "products"
                ? t("Dünger anlegen", "Add fertilizer")
                : t("Neue Rezeptur", "New recipe")}
            </button>
          </div>
          {page === "recipe" && (
            <form ref={form} onSubmit={run}>
              <div className="recipe-toolbar">
                <span className="recipe-icon">
                  <FlaskConical size={21} />
                </span>
                <input
                  className="recipe-name"
                  aria-label={t("Rezeptname", "Recipe name")}
                  placeholder={t("Unbenannte Rezeptur", "Untitled recipe")}
                  value={r.name}
                  maxLength={120}
                  onChange={(e) => change({ name: e.target.value })}
                />
                <span className="draft-badge">{t("REZEPTUR", "RECIPE")}</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={saveRecipe}
                >
                  <Save size={16} />
                  {t("Zur Sammlung", "Add to collection")}
                </button>
              </div>
              <div className="calculator-layout">
                <div className="input-sections">
                  <Section
                    number="01"
                    title={t("Dein Ansatz", "Your batch")}
                    subtitle={t(
                      "Die Grundlage für deine Berechnung.",
                      "The foundation of your calculation.",
                    )}
                  >
                    <div className="batch-grid">
                      <div className="field">
                        <label>
                          {t(
                            "Endvolumen der Nährlösung",
                            "Final solution volume",
                          )}
                        </label>
                        <Numeric
                          value={r.volume}
                          onChange={(volume) => change({ volume })}
                          lang={lang}
                          label={t("Endvolumen", "Final volume")}
                          unit="L"
                          required
                        />
                        <small>
                          {t(
                            "Volumen nach vollständigem Ansetzen.",
                            "Volume after preparing the complete solution.",
                          )}
                        </small>
                      </div>
                      <div className="batch-illustration" aria-hidden="true">
                        <div className="vessel">
                          <div className="water-wave" />
                          <span>
                            {nf(r.volume, 1)} <small>L</small>
                          </span>
                        </div>
                        <Droplets size={19} />
                      </div>
                    </div>
                  </Section>
                  <Section
                    number="02"
                    title={t("Ausgangswasser", "Source water")}
                    subtitle={t(
                      "Was dein Wasser bereits mitbringt.",
                      "What your water already contributes.",
                    )}
                    action={<Droplets className="muted-icon" size={21} />}
                  >
                    <div className="field">
                      <label htmlFor="water-name">
                        {t(
                          "Bezeichnung / Analysequelle",
                          "Name / analysis source",
                        )}
                      </label>
                      <input
                        id="water-name"
                        maxLength={120}
                        value={r.waterName}
                        onChange={(e) => change({ waterName: e.target.value })}
                        placeholder={t(
                          "z. B. Leitungswasser · Analyse vom …",
                          "e.g. tap water · analysis date …",
                        )}
                      />
                    </div>
                    <div className="nutrient-input-grid">
                      {visibleNutrients.map((n) => (
                        <div className="field" key={n}>
                          <label>
                            {symbols[n]} <span>{names[lang][n]}</span>
                          </label>
                          <div className="water-input">
                            <Numeric
                              lang={lang}
                              value={r.water[n].value}
                              onChange={(value) =>
                                change({
                                  water: {
                                    ...r.water,
                                    [n]: { ...r.water[n], value },
                                  },
                                })
                              }
                              label={`${t("Wasser", "Water")} ${symbols[n]}`}
                              unit="mg/L"
                            />
                            {formOptions(n).length > 1 && (
                              <select
                                aria-label={`${t("Wasser", "Water")} ${symbols[n]} ${t("Bezugsform", "form")}`}
                                value={r.water[n].form}
                                onChange={(e) => {
                                  const entry = r.water[n];
                                  const next = e.target.value;
                                  change({
                                    water: {
                                      ...r.water,
                                      [n]: {
                                        form: next,
                                        value:
                                          entry.value === null
                                            ? null
                                            : (entry.value *
                                                factor(n, entry.form)) /
                                              factor(n, next),
                                      },
                                    },
                                  });
                                }}
                              >
                                {formOptions(n).map((f) => (
                                  <option key={f} value={f}>
                                    {formLabel(f)}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <label className="checkbox-note">
                      <input
                        type="checkbox"
                        checked={r.waterAsZero}
                        onChange={(e) =>
                          change({ waterAsZero: e.target.checked })
                        }
                      />
                      <span>
                        {t(
                          "Nicht erfasste Wasserwerte ausdrücklich als 0 annehmen.",
                          "Explicitly assume unspecified water values are zero.",
                        )}
                      </span>
                    </label>
                  </Section>
                  <Section
                    number="03"
                    title={t("Deine Nährstoffziele", "Your nutrient targets")}
                    subtitle={t(
                      "Alle Ziele als Elementgehalt in mg/L. Leer bedeutet: nur beobachten.",
                      "All targets as elemental content in mg/L. Leave blank to observe only.",
                    )}
                  >
                    <div className="target-table">
                      <div className="target-head">
                        <span>{t("Nährstoff", "Nutrient")}</span>
                        <span>{t("Ziel · mg/L", "Target · mg/L")}</span>
                        <span>{t("Toleranz · mg/L", "Tolerance · mg/L")}</span>
                      </div>
                      {visibleNutrients.map((n) => (
                        <div className="target-row" key={n}>
                          <label>
                            <span
                              className={`element-chip ${primary.includes(n) ? "" : "trace"}`}
                            >
                              {symbols[n]}
                            </span>
                            <span>{names[lang][n]}</span>
                          </label>
                          <Numeric
                            lang={lang}
                            value={r.targets[n]}
                            onChange={(value) =>
                              change({ targets: { ...r.targets, [n]: value } })
                            }
                            label={`${t("Ziel", "Target")} ${symbols[n]}`}
                          />
                          <Numeric
                            lang={lang}
                            value={r.tolerances[n]}
                            onChange={(value) =>
                              change({
                                tolerances: { ...r.tolerances, [n]: value },
                              })
                            }
                            label={`${t("Toleranz", "Tolerance")} ${symbols[n]}`}
                            placeholder={
                              r.targets[n] === null ? "—" : nf(tolerance(r, n))
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-button expand-button"
                      aria-expanded={advanced}
                      onClick={() => setAdvanced(!advanced)}
                    >
                      <SlidersHorizontal size={15} />
                      {advanced
                        ? t(
                            "Weniger Nährstoffe anzeigen",
                            "Show fewer nutrients",
                          )
                        : t(
                            "Spurenelemente & Stickstoffformen",
                            "Trace elements & nitrogen forms",
                          )}
                      <ChevronDown
                        size={14}
                        className={advanced ? "rotated" : ""}
                      />
                    </button>
                    <p className="helper">
                      {t(
                        "Standardtoleranz: 5 % des Ziels, mindestens 0,05 mg/L. Alle Ziele sind weich; auch 0 ist kein hartes Verbot.",
                        "Default tolerance: 5% of the target, at least 0.05 mg/L. All targets are soft; even zero is not a strict limit.",
                      )}
                    </p>
                  </Section>
                  <Section
                    number="04"
                    title={t("Deine Dünger", "Your fertilizers")}
                    subtitle={t(
                      "Wähle, womit du deine Lösung ansetzen möchtest.",
                      "Choose what goes into your solution.",
                    )}
                  >
                    {r.items.length === 0 && (
                      <div className="empty-inline">
                        <span className="empty-icon">
                          <Package size={26} />
                        </span>
                        <h3>
                          {t(
                            "Hier beginnt deine Mischung",
                            "Your blend starts here",
                          )}
                        </h3>
                        <p>
                          {library.products.length
                            ? t(
                                "Wähle einen Dünger aus deiner Sammlung.",
                                "Select a fertilizer from your library.",
                              )
                            : t(
                                "Deine Datenbank ist noch leer. Lege dein erstes Nährsalz an.",
                                "Your database is empty. Add your first nutrient salt.",
                              )}
                        </p>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => setEditor(newProduct())}
                        >
                          <Plus size={16} />
                          {t("Dünger anlegen", "Add fertilizer")}
                        </button>
                      </div>
                    )}
                    {r.items.map((item, j) => (
                      <div className="dose-item" key={item.product.id}>
                        <div className="dose-title">
                          <span className="product-symbol">
                            <FlaskConical size={18} />
                          </span>
                          <div>
                            <b>{item.product.name}</b>
                            <small>
                              {item.product.kind === "solid"
                                ? t("Fest · g", "Solid · g")
                                : t("Flüssig · ml", "Liquid · ml")}{" "}
                              · {t("Datenstand", "Revision")}{" "}
                              {item.product.revision}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`${t("Entfernen", "Remove")} ${item.product.name}`}
                            onClick={() =>
                              change({
                                items: r.items.filter((_, k) => k !== j),
                              })
                            }
                          >
                            <X size={17} />
                          </button>
                        </div>
                        <div className="dose-controls">
                          <label className="checkbox-inline">
                            <input
                              type="checkbox"
                              disabled={r.mode === "manual"}
                              checked={item.fixed || r.mode === "manual"}
                              onChange={(e) =>
                                change({
                                  items: r.items.map((i, k) =>
                                    k === j
                                      ? { ...i, fixed: e.target.checked }
                                      : i,
                                  ),
                                })
                              }
                            />
                            {t("Menge fest vorgeben", "Fix dose")}
                          </label>
                          <Numeric
                            disabled={r.mode === "optimize" && !item.fixed}
                            lang={lang}
                            value={item.amount}
                            onChange={(amount) =>
                              change({
                                items: r.items.map((i, k) =>
                                  k === j ? { ...i, amount } : i,
                                ),
                              })
                            }
                            label={`${t("Menge", "Dose")} ${item.product.name}`}
                            unit={item.product.kind === "solid" ? "g" : "ml"}
                            placeholder={
                              item.fixed || r.mode === "manual"
                                ? "—"
                                : t("Automatisch", "Automatic")
                            }
                          />
                        </div>
                        {library.products.some(
                          (p) =>
                            p.id === item.product.id &&
                            p.revision !== item.product.revision,
                        ) && (
                          <button
                            type="button"
                            className="text-button"
                            onClick={() =>
                              change({
                                items: r.items.map((i, k) =>
                                  k === j
                                    ? {
                                        ...i,
                                        product: library.products.find(
                                          (p) => p.id === item.product.id,
                                        )!,
                                      }
                                    : i,
                                ),
                              })
                            }
                          >
                            {t(
                              "Aktualisierte Produktdaten übernehmen",
                              "Use updated product data",
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                    {available.length > 0 && (
                      <div className="add-product">
                        <select
                          aria-label={t(
                            "Dünger auswählen",
                            "Select fertilizer",
                          )}
                          value=""
                          onChange={(e) => {
                            const product = library.products.find(
                              (p) => p.id === e.target.value,
                            );
                            if (product)
                              change({
                                items: [
                                  ...r.items,
                                  {
                                    product: structuredClone(product),
                                    fixed: false,
                                    amount: null,
                                  },
                                ],
                              });
                          }}
                        >
                          <option value="" disabled>
                            {t(
                              "+ Dünger aus Sammlung wählen",
                              "+ Select a fertilizer from your library",
                            )}
                          </option>
                          {available.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {r.items.length > 0 && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setEditor(newProduct())}
                      >
                        <Plus size={15} />
                        {t("Weiteren Dünger anlegen", "Add another fertilizer")}
                      </button>
                    )}
                  </Section>
                </div>
                <aside className="calculation-sidebar">
                  <div className="card summary-card">
                    <span className="eyebrow">
                      {t(
                        "DEINE REZEPTUR IM ÜBERBLICK",
                        "YOUR RECIPE AT A GLANCE",
                      )}
                    </span>
                    <h2>{t("Alles in Balance.", "A balanced approach.")}</h2>
                    <div className="summary-row">
                      <span>
                        <Droplets size={16} />
                        {t("Endvolumen", "Final volume")}
                      </span>
                      <b>{nf(r.volume)} L</b>
                    </div>
                    <div className="summary-row">
                      <span>
                        <SlidersHorizontal size={16} />
                        {t("Aktive Ziele", "Active targets")}
                      </span>
                      <b>
                        {nutrients.filter((n) => r.targets[n] !== null).length}
                      </b>
                    </div>
                    <div className="summary-row">
                      <span>
                        <FlaskConical size={16} />
                        {t("Ausgewählte Dünger", "Selected fertilizers")}
                      </span>
                      <b>{r.items.length}</b>
                    </div>
                    <div className="summary-divider" />
                    <div className="field">
                      <label htmlFor="mode">
                        {t("Berechnungsmodus", "Calculation mode")}
                      </label>
                      <select
                        id="mode"
                        value={r.mode}
                        onChange={(e) =>
                          change({ mode: e.target.value as Recipe["mode"] })
                        }
                      >
                        <option value="optimize">
                          {t("Mengen optimieren", "Optimize doses")}
                        </option>
                        <option value="manual">
                          {t("Manuelle Mengen prüfen", "Check manual doses")}
                        </option>
                      </select>
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <label>
                          {t("Dosierschritt", "Dose increment")} · g
                        </label>
                        <Numeric
                          lang={lang}
                          value={r.stepG}
                          onChange={(stepG) => change({ stepG })}
                          label={t("Dosierschritt g", "Dose increment g")}
                        />
                      </div>
                      <div className="field">
                        <label>
                          {t("Dosierschritt", "Dose increment")} · ml
                        </label>
                        <Numeric
                          lang={lang}
                          value={r.stepMl}
                          onChange={(stepMl) => change({ stepMl })}
                          label={t("Dosierschritt ml", "Dose increment ml")}
                        />
                      </div>
                    </div>
                    {error && (
                      <p className="error-message" role="alert">
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="button primary calculate-button"
                    >
                      <Calculator size={18} />
                      {t("Rezeptur berechnen", "Calculate recipe")}
                      <ArrowRight size={17} />
                    </button>
                    <p className="summary-footnote">
                      {t(
                        "Nichtnegative Mengen. Transparente Ergebnisse.",
                        "Nonnegative doses. Transparent results.",
                      )}
                    </p>
                  </div>
                  <div className="tip-card">
                    <span className="tip-icon">
                      <Sprout size={21} />
                    </span>
                    <h3>
                      {t(
                        "Die Werte machen den Unterschied.",
                        "Good data makes the difference.",
                      )}
                    </h3>
                    <p>
                      {t(
                        "Verwende eine aktuelle Wasseranalyse und die Gehalte deiner Produktverpackung. Unbekannte Werte sind keine Nullwerte.",
                        "Use a current water analysis and your product label. Unknown values are not zero values.",
                      )}
                    </p>
                  </div>
                </aside>
              </div>
              <section className="card results-section" ref={resultRef}>
                <div className="section-heading">
                  <div className="section-number result-number">
                    <Leaf size={18} />
                  </div>
                  <div>
                    <h2>{t("Dein Ergebnis", "Your results")}</h2>
                    <p>
                      {t(
                        "Von der Berechnung zum nächsten Ansatz.",
                        "From calculation to your next batch.",
                      )}
                    </p>
                  </div>
                  {result && isCurrent && (
                    <span
                      className={`result-badge ${result.matched === result.active.length ? "good" : "partial"}`}
                    >
                      {result.active.length
                        ? `${result.matched}/${result.active.length} ${t("Ziele erreicht", "targets met")}`
                        : t("Manuelle Prüfung", "Manual check")}
                    </span>
                  )}
                </div>
                {!result ? (
                  <div className="empty-results">
                    <div className="chart-decoration" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <h3>
                      {t(
                        "Platz für deine nächste gute Mischung.",
                        "Room for your next great blend.",
                      )}
                    </h3>
                    <p>
                      {t(
                        "Trage deine Werte ein und starte die Berechnung.",
                        "Enter your values and start calculating.",
                      )}
                    </p>
                  </div>
                ) : !isCurrent ? (
                  <div className="banner stale">
                    <AlertTriangle size={18} />
                    {t(
                      "Eingaben geändert. Bitte neu berechnen, um aktuelle Ergebnisse zu sehen.",
                      "Inputs changed. Recalculate to see current results.",
                    )}
                  </div>
                ) : (
                  <>
                    <div className="result-doses">
                      {r.items.map((item, j) => (
                        <div key={item.product.id}>
                          <span>{item.product.name}</span>
                          <b>
                            {nf(result.amounts[j], 8)}{" "}
                            <small>
                              {item.product.kind === "solid" ? "g" : "ml"}
                            </small>
                          </b>
                          <small>
                            {item.fixed || r.mode === "manual"
                              ? t("Fest vorgegeben", "Fixed dose")
                              : t(
                                  "Optimiert & gerundet",
                                  "Optimized & rounded",
                                )}
                          </small>
                        </div>
                      ))}
                    </div>
                    <div className="table-scroll">
                      <table className="results-table">
                        <caption className="sr-only">
                          {t(
                            "Nährstoffbilanz in mg/L",
                            "Nutrient balance in mg/L",
                          )}
                        </caption>
                        <thead>
                          <tr>
                            <th>{t("Nährstoff", "Nutrient")}</th>
                            <th>{t("Ziel", "Target")}</th>
                            <th>{t("Wasser", "Water")}</th>
                            <th>{t("Dünger", "Fertilizer")}</th>
                            <th>{t("Gesamt", "Total")}</th>
                            <th>Δ mg/L</th>
                            <th>{t("Status", "Status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nutrients.map((n) => {
                            const active = r.targets[n] !== null;
                            const total = result.totals[n];
                            const delta =
                              active && total !== null
                                ? total - r.targets[n]!
                                : null;
                            const match =
                              delta !== null &&
                              Math.abs(delta) <= tolerance(r, n) + 1e-9;
                            return (
                              <tr key={n}>
                                <th>
                                  {symbols[n]}
                                  <small>{names[lang][n]}</small>
                                </th>
                                <td>{nf(r.targets[n])}</td>
                                <td>{nf(result.water[n])}</td>
                                <td>{nf(result.added[n])}</td>
                                <td>
                                  <strong>{nf(total)}</strong>
                                </td>
                                <td>
                                  {delta === null
                                    ? "—"
                                    : `${delta > 0 ? "+" : ""}${nf(delta)}`}
                                </td>
                                <td>
                                  <span
                                    className={`status-pill ${active ? (match ? "good" : "partial") : ""}`}
                                  >
                                    {total === null
                                      ? t("Unbekannt", "Unknown")
                                      : !active
                                        ? t("Beobachtet", "Observed")
                                        : match
                                          ? t("Im Ziel", "Within target")
                                          : delta! > 0
                                            ? t("Zu hoch", "Too high")
                                            : t("Zu niedrig", "Too low")}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="result-notes">
                      <p>
                        {t(
                          "Alle Konzentrationen in mg/L als Element. „—“ bedeutet unbekannt oder kein Ziel.",
                          "All concentrations in mg/L as element. “—” means unknown or no target.",
                        )}
                      </p>
                      {r.waterAsZero && (
                        <p>
                          {t(
                            "Annahme: Nicht erfasste Wasserwerte wurden als 0 behandelt.",
                            "Assumption: unspecified water values were treated as zero.",
                          )}
                        </p>
                      )}
                      {r.items.some((i) => i.product.missingAsZero) && (
                        <p>
                          {t(
                            "Bei entsprechend bestätigten Produkten wurden nicht erfasste Gehalte als 0 behandelt.",
                            "Unspecified product contents were treated as zero where explicitly confirmed.",
                          )}
                        </p>
                      )}
                      {result.rounded && (
                        <p>
                          {t(
                            "Die Bilanz verwendet die ausgegebenen gerundeten Mengen. Feste Mengen bleiben unverändert.",
                            "The balance uses the displayed rounded doses. Fixed doses remain unchanged.",
                          )}
                        </p>
                      )}
                      {result.active
                        .filter(
                          (n) =>
                            result.water[n]! > r.targets[n]! + tolerance(r, n),
                        )
                        .map((n) => (
                          <p key={n} className="warning">
                            {symbols[n]}:{" "}
                            {t(
                              "Ausgangswasser liegt bereits über dem Ziel.",
                              "Source water already exceeds the target.",
                            )}
                          </p>
                        ))}
                      <p>
                        <AlertTriangle size={14} />
                        {t(
                          "Löslichkeit, Mischverträglichkeit und Eignung für eine Kultur werden nicht geprüft. Das Endvolumen wird als Wasservolumen angenommen.",
                          "Solubility, mixing compatibility and crop suitability are not assessed. Final volume is assumed equal to source water volume.",
                        )}
                      </p>
                      <small>
                        {result.model} · KKT {result.kkt.toExponential(1)}
                      </small>
                    </div>
                  </>
                )}
              </section>
            </form>
          )}
          {page === "products" && (
            <section className="card library-card">
              {library.products.length === 0 ? (
                <div className="empty-inline large">
                  <span className="empty-icon">
                    <FlaskConical size={32} />
                  </span>
                  <h2>
                    {t(
                      "Deine Datenbank startet mit dir.",
                      "Your database starts with you.",
                    )}
                  </h2>
                  <p>
                    {t(
                      "Keine vorgegebenen Produkte. Erfasse dein erstes Nährsalz anhand der Verpackung.",
                      "No preloaded products. Add your first nutrient salt using its label.",
                    )}
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setEditor(newProduct())}
                  >
                    <Plus size={17} />
                    {t("Ersten Dünger anlegen", "Add first fertilizer")}
                  </button>
                </div>
              ) : (
                library.products.map((p) => (
                  <article className="library-row" key={p.id}>
                    <span className="product-symbol">
                      <FlaskConical size={23} />
                    </span>
                    <div className="library-row-info">
                      <h3>{p.name}</h3>
                      <p>
                        {p.source ||
                          t("Keine Quelle hinterlegt", "No source recorded")}
                      </p>
                      <div className="product-tags">
                        {nutrients
                          .filter((n) => (p.declarations[n].value ?? 0) > 0)
                          .map((n) => (
                            <span key={n}>
                              {formLabel(p.declarations[n].form)}{" "}
                              {nf(p.declarations[n].value)}
                              {p.basis === "gramsPerLitre" ? " g/L" : "%"}
                            </span>
                          ))}
                      </div>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`${t("Bearbeiten", "Edit")} ${p.name}`}
                      onClick={() => setEditor(structuredClone(p))}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`${t("Löschen", "Delete")} ${p.name}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            t(
                              "Dünger aus der Sammlung löschen? Gespeicherte Rezepturen behalten ihre Produktdaten.",
                              "Delete fertilizer from the library? Saved recipes retain their product data.",
                            ),
                          )
                        )
                          setWorkspace((w) => ({
                            ...w,
                            library: {
                              ...w.library,
                              products: w.library.products.filter(
                                (i) => i.id !== p.id,
                              ),
                            },
                          }));
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))
              )}
            </section>
          )}
          {page === "recipes" && (
            <section className="card library-card">
              {library.recipes.length === 0 ? (
                <div className="empty-inline large">
                  <span className="empty-icon">
                    <BookOpen size={32} />
                  </span>
                  <h2>
                    {t(
                      "Dein Rezeptbuch ist bereit.",
                      "Your recipe book is ready.",
                    )}
                  </h2>
                  <p>
                    {t(
                      "Speichere deine erste Rezeptur über „Zur Sammlung“ im Rechner.",
                      "Save your first recipe using “Add to collection” in the calculator.",
                    )}
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setPage("recipe")}
                  >
                    {t("Zum Rechner", "Open calculator")}
                    <ArrowRight size={17} />
                  </button>
                </div>
              ) : (
                library.recipes.map((recipe) => (
                  <article className="library-row" key={recipe.id}>
                    <span className="product-symbol">
                      <BookOpen size={23} />
                    </span>
                    <div className="library-row-info">
                      <h3>{recipe.name}</h3>
                      <p>
                        {nf(recipe.volume)} L · {recipe.items.length}{" "}
                        {t("Dünger", "fertilizers")} ·{" "}
                        {new Date(recipe.updatedAt).toLocaleDateString(lang)}
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => {
                        change(structuredClone(recipe));
                        setResult(null);
                        setPage("recipe");
                      }}
                    >
                      {t("Öffnen", "Open")}
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${t("Duplizieren", "Duplicate")} ${recipe.name}`}
                      onClick={() => {
                        change({
                          ...structuredClone(recipe),
                          id: crypto.randomUUID(),
                          name: `${recipe.name} (${t("Kopie", "copy")})`,
                        });
                        setResult(null);
                        setPage("recipe");
                      }}
                    >
                      <Copy size={17} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`${t("Löschen", "Delete")} ${recipe.name}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            t(
                              "Gespeicherte Rezeptur löschen?",
                              "Delete saved recipe?",
                            ),
                          )
                        )
                          setWorkspace((w) => ({
                            ...w,
                            library: {
                              ...w.library,
                              recipes: w.library.recipes.filter(
                                (i) => i.id !== recipe.id,
                              ),
                            },
                          }));
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))
              )}
            </section>
          )}
          <footer className="page-footer">
            <span>
              <Leaf size={15} />
              {t("Mit Wissen wachsen.", "Grow with knowledge.")}
            </span>
            <div>
              <button
                className="text-button"
                onClick={() =>
                  download(
                    "hydrocalc-backup.json",
                    JSON.stringify(library, null, 2),
                  )
                }
              >
                <Download size={14} />
                {t("Sammlung sichern", "Back up library")}
              </button>
              <button
                className="text-button"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={14} />
                {t("Importieren", "Import")}
              </button>
            </div>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept=".json,application/json"
              aria-label={t("Sicherung importieren", "Import backup")}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setNoticeError(false);
                try {
                  if (file.size > 2_000_000) throw new Error("size");
                  const imported = parseLibrary(await file.text());
                  const productIds = new Map(
                    imported.products.map((p) => [p.id, crypto.randomUUID()]),
                  );
                  const products = imported.products.map((p) => ({
                    ...p,
                    id: productIds.get(p.id)!,
                  }));
                  const recipes = imported.recipes.map((recipe) => ({
                    ...recipe,
                    id: crypto.randomUUID(),
                    items: recipe.items.map((item) => ({
                      ...item,
                      product: {
                        ...item.product,
                        id: productIds.get(item.product.id) ?? item.product.id,
                      },
                    })),
                  }));
                  if (
                    library.products.length + products.length > 200 ||
                    library.recipes.length + recipes.length > 100
                  )
                    throw new Error("limit");
                  setWorkspace((w) => ({
                    ...w,
                    library: {
                      ...w.library,
                      products: [...w.library.products, ...products],
                      recipes: [...w.library.recipes, ...recipes],
                    },
                  }));
                  setNotice(
                    t(
                      "Sicherung als Kopien importiert. Bestehende Daten bleiben erhalten.",
                      "Backup imported as copies. Existing data is preserved.",
                    ),
                  );
                } catch {
                  setNoticeError(true);
                  setNotice(
                    t(
                      "Import fehlgeschlagen: Format, Version oder Größenlimit prüfen (2 MB, 200 Produkte, 100 Rezepte).",
                      "Import failed: check format, version or size limit (2 MB, 200 products, 100 recipes).",
                    ),
                  );
                }
                e.target.value = "";
              }}
            />
          </footer>
        </main>
      </div>
      {editor && (
        <ProductEditor
          key={editor.id}
          initial={editor}
          close={() => setEditor(null)}
          save={saveProduct}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
}
