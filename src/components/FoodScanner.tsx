
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type RefObject,
  } from "react";
  import {
    Sparkles,
    X,
    Check,
    Save,
    RotateCcw,
    AlertCircle,
    LoaderCircle,
    CheckCircle2,
    ChevronRight,
  } from "lucide-react";
  import { supabase } from "../lib/supabase";
  import {
    dateKey,
    saveFoodDiaryEntry,
    type FoodEntry,
    type PrimeProgress,
  } from "../lib/progress";
  import "./FoodScanner.css";
  

  import { Beef, Wheat, Droplets, Leaf } from "lucide-react";
  type Props = {
    cameraRef?: RefObject<HTMLInputElement | null>;
    galleryRef?: RefObject<HTMLInputElement | null>;
    onProgressChange: (progress: PrimeProgress) => void;
  };
  
  type AnalysisFood = {
    name: string;
    estimated_grams: number;
    confidence?: string;
    notes?: string;
  };
  
  type AnalysisResponse = {
    analysis?: {
      foods?: AnalysisFood[];
      description?: string;
      warnings?: string[];
    };
  };
  
  type Nutrients = {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  
  type NutritionFood = {
    name?: string;
    grams?: number;
    matched?: boolean;
    sourceName?: string;
    nutrients?: Nutrients | null;
  };
  
  type NutritionResponse = {
    foods?: NutritionFood[];
  };
  
  type NutrientKey =
    | "calories"
    | "protein"
    | "carbs"
    | "fat"
    | "fiber";
  
  type EditableFood = {
    id: string;
    name: string;
    grams: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
    matched: boolean;
    confirmed: boolean;
    sourceName: string;
  };
  
  const nutrientFields: {
    key: NutrientKey;
    label: string;
    unit: string;
  }[] = [
    { key: "calories", label: "Calories", unit: "kcal" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "carbs", label: "Carbs", unit: "g" },
    { key: "fat", label: "Fat", unit: "g" },
    { key: "fiber", label: "Fibre", unit: "g" },
  ];
  
  function num(value: string): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }
  
  function fmt(value: number): string {
    return Number.isFinite(value)
      ? String(Math.round(value * 10) / 10)
      : "0";
  }
  
  function errorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
  }
  
  async function functionErrorMessage(
    error: unknown,
    fallback: string
  ): Promise<string> {
    if (error && typeof error === "object" && "context" in error) {
      const context = (error as { context?: unknown }).context;
  
      if (context instanceof Response) {
        try {
          const body = await context.clone().json();
  
          if (typeof body?.error === "string") return body.error;
          if (typeof body?.message === "string") return body.message;
        } catch {
          // Use HTTP status.
        }
  
        return `${fallback} (HTTP ${context.status})`;
      }
    }
  
    return errorMessage(error);
  }
  
  function readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Could not read image."));
        }
      };
  
      reader.onerror = () =>
        reject(new Error("Could not read image."));
  
      reader.readAsDataURL(file);
    });
  }
  
  function createFood(
    detected: AnalysisFood,
    nutrition?: NutritionFood
  ): EditableFood {
    const nutrients = nutrition?.nutrients;
    const matched = Boolean(nutrition?.matched && nutrients);
  
    return {
      id: crypto.randomUUID(),
      name: detected.name,
      grams: fmt(detected.estimated_grams),
      calories: fmt(nutrients?.calories ?? 0),
      protein: fmt(nutrients?.protein ?? 0),
      carbs: fmt(nutrients?.carbs ?? 0),
      fat: fmt(nutrients?.fat ?? 0),
      fiber: fmt(nutrients?.fiber ?? 0),
      matched,
      confirmed: matched,
      sourceName: nutrition?.sourceName ?? "",
    };
  }
  
  function validFood(food: EditableFood): boolean {
    const values = [
      food.grams,
      food.calories,
      food.protein,
      food.carbs,
      food.fat,
      food.fiber,
    ];
  
    return (
      food.name.trim().length > 0 &&
      num(food.grams) > 0 &&
      values.every(
        (value) =>
          value.trim() !== "" &&
          Number.isFinite(Number(value)) &&
          Number(value) >= 0
      )
    );
  }
  
  export default function FoodScanner({
    cameraRef,
    galleryRef,
    onProgressChange,
  }: Props) {
    const internalCameraRef = useRef<HTMLInputElement>(null);
    const internalGalleryRef = useRef<HTMLInputElement>(null);
  
    const [open, setOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [imageBase64, setImageBase64] = useState("");
    const [mimeType, setMimeType] = useState("");
  
    const [foods, setFoods] = useState<EditableFood[]>([]);
    const [description, setDescription] = useState("");
  
    const [editingId, setEditingId] = useState<string | null>(
      null
    );
    const [draft, setDraft] = useState<EditableFood | null>(
      null
    );
  
    const [busy, setBusy] = useState(false);
    const [busyText, setBusyText] = useState("");
    const [error, setError] = useState("");
    const [editError, setEditError] = useState("");
  
    const isScanning =
      busy && busyText === "Analysing your meal...";
  
    const totals = foods.reduce(
      (total, food) => ({
        calories: total.calories + num(food.calories),
        protein: total.protein + num(food.protein),
        carbs: total.carbs + num(food.carbs),
        fat: total.fat + num(food.fat),
        fiber: total.fiber + num(food.fiber),
      }),
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      }
    );
  
    const pendingCount = foods.filter(
      (food) => !food.confirmed || !validFood(food)
    ).length;
  
    const canSave =
      foods.length > 0 &&
      foods.every(
        (food) => food.confirmed && validFood(food)
      );
  
    useEffect(() => {
      if (!open) return;
  
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
  
      function onKeyDown(event: KeyboardEvent) {
        if (event.key !== "Escape" || busy) return;
  
        if (editingId) {
          setEditingId(null);
          setDraft(null);
          setEditError("");
        } else {
          setOpen(false);
        }
      }
  
      window.addEventListener("keydown", onKeyDown);
  
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", onKeyDown);
      };
    }, [open, editingId, busy]);
  
    function resetScanner() {
      setImageUrl("");
      setImageBase64("");
      setMimeType("");
      setFoods([]);
      setDescription("");
      setEditingId(null);
      setDraft(null);
      setError("");
      setEditError("");
    }
  
    function closeScanner() {
      if (busy) return;
      setOpen(false);
      setEditingId(null);
      setDraft(null);
    }
  
    async function chooseFile(
      event: ChangeEvent<HTMLInputElement>
    ) {
      const file = event.target.files?.[0];
      event.target.value = "";
  
      if (!file) return;
  
      resetScanner();
      setOpen(true);
  
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(
          file.type
        )
      ) {
        setError("Please choose a JPG, PNG or WebP image.");
        return;
      }
  
      if (file.size > 6 * 1024 * 1024) {
        setError("Image must be smaller than 6 MB.");
        return;
      }
  
      try {
        const dataUrl = await readImage(file);
        const base64 = dataUrl.split(",")[1];
  
        if (!base64) {
          throw new Error("Invalid image data.");
        }
  
        setImageUrl(dataUrl);
        setImageBase64(base64);
        setMimeType(file.type);
      } catch (reason) {
        setError(errorMessage(reason));
      }
    }
  
    async function lookupNutrition(
      items: { name: string; grams: number }[]
    ): Promise<NutritionFood[]> {
      const { data, error: functionError } =
        await supabase.functions.invoke<NutritionResponse>(
          "nutrition-lookup",
          { body: { foods: items } }
        );
  
      if (functionError) {
        throw new Error(
          await functionErrorMessage(
            functionError,
            "Nutrition lookup failed"
          )
        );
      }
  
      if (!data || !Array.isArray(data.foods)) {
        throw new Error("Invalid nutrition response.");
      }
  
      return data.foods;
    }
  
    async function analyzeMeal() {
      if (!imageBase64 || !mimeType || busy) return;
  
      setBusy(true);
      setBusyText("Analysing your meal...");
      setError("");
      setFoods([]);
      setDescription("");
  
      try {
        const { data, error: functionError } =
          await supabase.functions.invoke<AnalysisResponse>(
            "analyze-food",
            {
              body: { imageBase64, mimeType },
            }
          );
  
        if (functionError) {
          throw new Error(
            await functionErrorMessage(
              functionError,
              "Food analysis failed"
            )
          );
        }
  
        const detected = data?.analysis?.foods ?? [];
  
        if (!detected.length) {
          throw new Error(
            "No food detected. Try another photo."
          );
        }
  
        setDescription(data?.analysis?.description ?? "");
        setBusyText("Calculating nutrition...");
  
        const nutrition = await lookupNutrition(
          detected.map((food) => ({
            name: food.name,
            grams: Math.max(1, food.estimated_grams || 1),
          }))
        );
  
        setFoods(
          detected.map((food, index) =>
            createFood(food, nutrition[index])
          )
        );
      } catch (reason) {
        setError(errorMessage(reason));
      } finally {
        setBusy(false);
        setBusyText("");
      }
    }
  
    function openEditor(food: EditableFood) {
      setEditingId(food.id);
      setDraft({ ...food });
      setEditError("");
    }
  
    function closeEditor() {
      if (busy) return;
      setEditingId(null);
      setDraft(null);
      setEditError("");
    }
  
    function updateDraftName(value: string) {
      setDraft((previous) =>
        previous
          ? { ...previous, name: value, matched: false }
          : previous
      );
    }
  
    function updateDraftNumeric(
      key: NutrientKey | "grams",
      value: string
    ) {
      const cleaned = value.replace(",", ".");
  
      if (!/^\d*\.?\d*$/.test(cleaned)) return;
  
      setDraft((previous) => {
        if (!previous) return previous;
  
        if (key === "grams") {
          const oldGrams = num(previous.grams);
          const newGrams = num(cleaned);
  
          if (oldGrams > 0 && newGrams > 0) {
            const ratio = newGrams / oldGrams;
  
            return {
              ...previous,
              grams: cleaned,
              calories: fmt(num(previous.calories) * ratio),
              protein: fmt(num(previous.protein) * ratio),
              carbs: fmt(num(previous.carbs) * ratio),
              fat: fmt(num(previous.fat) * ratio),
              fiber: fmt(num(previous.fiber) * ratio),
            };
          }
        }
  
        return { ...previous, [key]: cleaned };
      });
    }
  
    async function recalculateDraft() {
      if (!draft || busy) return;
  
      const grams = num(draft.grams);
  
      if (!draft.name.trim() || grams <= 0) {
        setEditError("Enter a food name and valid weight.");
        return;
      }
  
      setBusy(true);
      setBusyText("Checking USDA...");
      setEditError("");
  
      try {
        const result = await lookupNutrition([
          { name: draft.name.trim(), grams },
        ]);
  
        const match = result[0];
  
        if (!match?.matched || !match.nutrients) {
          setEditError(
            "USDA could not find a suitable match. You can enter the values manually."
          );
          return;
        }
  
        setDraft((previous) =>
          previous
            ? {
                ...previous,
                calories: fmt(match.nutrients?.calories ?? 0),
                protein: fmt(match.nutrients?.protein ?? 0),
                carbs: fmt(match.nutrients?.carbs ?? 0),
                fat: fmt(match.nutrients?.fat ?? 0),
                fiber: fmt(match.nutrients?.fiber ?? 0),
                matched: true,
                sourceName: match.sourceName ?? "",
              }
            : previous
        );
      } catch (reason) {
        setEditError(errorMessage(reason));
      } finally {
        setBusy(false);
        setBusyText("");
      }
    }
  
    function saveIngredientChanges() {
      if (!draft) return;
  
      if (!validFood(draft)) {
        setEditError(
          "Please enter a food name, valid portion and nutrition values."
        );
        return;
      }
  
      const updated: EditableFood = {
        ...draft,
        name: draft.name.trim(),
        confirmed: true,
      };
  
      setFoods((previous) =>
        previous.map((food) =>
          food.id === updated.id ? updated : food
        )
      );
  
      closeEditor();
      setError("");
    }
  
    async function saveMeal() {
      if (busy || !canSave) return;
  
      setBusy(true);
      setBusyText("Saving meal...");
      setError("");
  
      try {
        const entry: FoodEntry = {
          id: crypto.randomUUID(),
          name:
            description.trim() ||
            foods.map((food) => food.name).join(", "),
          grams: foods.reduce(
            (sum, food) => sum + num(food.grams),
            0
          ),
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          createdAt: new Date().toISOString(),
        };
  
        const saved = await saveFoodDiaryEntry(
          dateKey(new Date()),
          entry
        );
  
        onProgressChange(saved);
        setOpen(false);
        resetScanner();
      } catch (reason) {
        setError(errorMessage(reason));
      } finally {
        setBusy(false);
        setBusyText("");
      }
    }
  
    return (
      <>
        <input
          ref={(element) => {
            internalCameraRef.current = element;
            if (cameraRef) cameraRef.current = element;
          }}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          hidden
          onChange={chooseFile}
        />
  
        <input
          ref={(element) => {
            internalGalleryRef.current = element;
            if (galleryRef) galleryRef.current = element;
          }}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={chooseFile}
        />
  
        {open && (
          <div
            className="scanner-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeScanner();
              }
            }}
          >
            <section
              className="scanner-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Food Scanner"
            >
              <header className="scanner-modal-header">
                <div>
                  <span className="scanner-kicker">
                    MY PRIME ERA · AI
                  </span>
  
                  <h2>
                    <Sparkles size={21} />
                    Food Scanner
                  </h2>
                </div>
  
                <button
                  type="button"
                  className="scanner-icon-button"
                  onClick={closeScanner}
                  disabled={busy}
                  aria-label="Close scanner"
                >
                  <X size={20} />
                </button>
              </header>
  
              <div className="scanner-modal-content">
                {imageUrl && (
                  <div className="scanner-hero">
                    <div
                      className={`scanner-photo-wrap ${
                        isScanning ? "scanner-is-scanning" : ""
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt="Selected meal"
                        className="scanner-photo"
                      />
  
                      {isScanning && (
                        <div
                          className="scanner-scan-overlay"
                          aria-hidden="true"
                        >
                          <div className="scanner-scan-line" />
                        </div>
                      )}
                    </div>
  
                    {foods.length > 0 && (
                      <div className="scanner-hero-copy">
                        <span className="scanner-kicker">
                          AI FOOD ANALYSIS
                        </span>
  
                        <p>
                          {description ||
                            "Your meal has been analysed."}
                        </p>
  
                        <small>
                          {foods.length} ingredients detected
                        </small>
                      </div>
                    )}
                  </div>
                )}
  
                {foods.length === 0 && imageUrl && (
                  <button
                    type="button"
                    className="scanner-primary-button"
                    disabled={busy}
                    onClick={() => void analyzeMeal()}
                  >
                    <Sparkles size={16} />
                    Analyze Meal
                  </button>
                )}
  
                {busy && (
                  <div className="scanner-status">
                    <LoaderCircle
                      size={16}
                      className="scanner-spin"
                    />
                    {busyText}
                  </div>
                )}
  
                {error && (
                  <div className="scanner-error" role="alert">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
  
                {foods.length > 0 && (
                  <>
                    <section className="scanner-nutrition-card">
                      <div className="scanner-nutrition-content">
                        <span className="scanner-kicker">
                          ESTIMATED CALORIES
                        </span>
  
                        <div className="scanner-calorie-value">
                          <strong>
                            {Math.round(
                              totals.calories
                            ).toLocaleString()}
                          </strong>
                          <span>kcal</span>
                        </div>
  
                     
<div className="scanner-nutrient-grid">
  <div className="scanner-nutrient scanner-nutrient-protein">
    <Beef size={17} strokeWidth={1.8} />
    <strong>{fmt(totals.protein)}g</strong>
    <span>Protein</span>
  </div>

  <div className="scanner-nutrient scanner-nutrient-carbs">
    <Wheat size={17} strokeWidth={1.8} />
    <strong>{fmt(totals.carbs)}g</strong>
    <span>Carbs</span>
  </div>

  <div className="scanner-nutrient scanner-nutrient-fat">
    <Droplets size={17} strokeWidth={1.8} />
    <strong>{fmt(totals.fat)}g</strong>
    <span>Fat</span>
  </div>

  <div className="scanner-nutrient scanner-nutrient-fiber">
    <Leaf size={17} strokeWidth={1.8} />
    <strong>{fmt(totals.fiber)}g</strong>
    <span>Fibre</span>
  </div>
</div>

                      </div>
                    </section>
  
                    <div className="scanner-section-heading">
                      <h3>Ingredients</h3>
                      <span>Tap to edit</span>
                    </div>
  
                    <div className="scanner-ingredient-list">
                      {foods.map((food) => (
                        <button
                          type="button"
                          className={`scanner-ingredient-row ${
                            !food.confirmed
                              ? "scanner-needs-review"
                              : ""
                          }`}
                          key={food.id}
                          onClick={() => openEditor(food)}
                        >
                          <div className="scanner-ingredient-details">
                            <strong>{food.name}</strong>
                            <small>
                              {food.grams} g
                              <span className="scanner-dot">
                                ·
                              </span>
                              {fmt(num(food.calories))} kcal
                            </small>
                          </div>
  
                          <div className="scanner-ingredient-action">
                            {food.confirmed ? (
                              <CheckCircle2
                                size={17}
                                className="scanner-checked"
                              />
                            ) : (
                              <AlertCircle size={17} />
                            )}
  
                            <ChevronRight size={17} />
                          </div>
                        </button>
                      ))}
                    </div>
  
                    {pendingCount > 0 && (
                      <div className="scanner-review-notice">
                        <AlertCircle size={16} />
                        {pendingCount} ingredient
                        {pendingCount === 1 ? "" : "s"} need
                        review. Edit only those ingredients.
                      </div>
                    )}
  
                    <p className="scanner-disclaimer">
                      Nutrition values are estimates. Check
                      ingredients and portions before saving.
                    </p>
  
                    <button
                      type="button"
                      className="scanner-primary-button scanner-save-meal"
                      disabled={busy || !canSave}
                      onClick={() => void saveMeal()}
                    >
                      <Save size={17} />
                      <span>Save Meal</span>
                    </button>
                  </>
                )}
              </div>
  
              {editingId && draft && (
                <div className="scanner-edit-layer">
                  <div
                    className="scanner-edit-card"
                    role="dialog"
                    aria-label="Edit ingredient"
                  >
                    <div className="scanner-edit-header">
                      <div>
                        <span className="scanner-kicker">
                          INGREDIENT DETAILS
                        </span>
                        <h3>Edit ingredient</h3>
                      </div>
  
                      <button
                        type="button"
                        className="scanner-icon-button"
                        onClick={closeEditor}
                        disabled={busy}
                        aria-label="Close editor"
                      >
                        <X size={18} />
                      </button>
                    </div>
  
                    <div className="scanner-edit-body">
                      <label className="scanner-edit-label">
                        Food name
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(event) =>
                            updateDraftName(
                              event.target.value
                            )
                          }
                        />
                      </label>
  
                      <label className="scanner-edit-label">
                        Portion (grams)
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft.grams}
                          onChange={(event) =>
                            updateDraftNumeric(
                              "grams",
                              event.target.value
                            )
                          }
                        />
                      </label>
  
                      <div className="scanner-edit-divider">
                        Nutrition for this portion
                      </div>
  
                      <div className="scanner-edit-nutrients">
                        {nutrientFields.map((field) => (
                          <label
                            className="scanner-edit-label"
                            key={field.key}
                          >
                            {field.label} ({field.unit})
                            <input
                              type="text"
                              inputMode="decimal"
                              value={draft[field.key]}
                              onChange={(event) =>
                                updateDraftNumeric(
                                  field.key,
                                  event.target.value
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
  
                      {draft.sourceName && (
                        <p className="scanner-usda-source">
                          USDA: {draft.sourceName}
                        </p>
                      )}
  
                      {!draft.matched && (
                        <p className="scanner-edit-note">
                          Check these nutrition values manually
                          or try Recalculate USDA.
                        </p>
                      )}
  
                      {editError && (
                        <div
                          className="scanner-error"
                          role="alert"
                        >
                          <AlertCircle size={15} />
                          {editError}
                        </div>
                      )}
                    </div>
  
                    <div className="scanner-edit-actions">
                      <button
                        type="button"
                        className="scanner-recalculate"
                        disabled={busy}
                        onClick={() =>
                          void recalculateDraft()
                        }
                      >
                        <RotateCcw size={15} />
                        Recalculate USDA
                      </button>
  
                      <button
                        type="button"
                        className="scanner-confirm"
                        disabled={busy}
                        onClick={saveIngredientChanges}
                      >
                        <Check size={16} />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </>
    );
  }
  