
import {
    useRef,
    useState,
    type FormEvent
  } from "react";
  
  import {
    Plus,
    Camera,
    Images,
    Trash2,
    Utensils,
    Sparkles,
    Leaf,
    Beef,
    Wheat,
    Droplets,
    X,
    Save
  } from "lucide-react";
  
  import {
    dateKey,
    saveFoodDiaryEntry,
    deleteFoodDiaryEntry,
    type FoodDiary,
    type FoodEntry,
    type PrimeProgress
  } from "../lib/progress";
  
  import FoodScanner from "./FoodScanner";
  import "./FoodDashboard.css";
  
  type Props = {
    progress: PrimeProgress;
    onProgressChange: (progress: PrimeProgress) => void;
  };
  
  type FoodEntryWithFibre = FoodEntry & {
    fiber?: number;
    fibre?: number;
  };
  
  const initialForm = {
    name: "",
    grams: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: ""
  };
  
  function formatNumber(value: number, digits = 1) {
    return Number(value.toFixed(digits)).toLocaleString("en-GB", {
      maximumFractionDigits: digits
    });
  }
  
  export default function FoodDashboard({
    progress,
    onProgressChange
  }: Props) {
    const [form, setForm] = useState(initialForm);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
  
    const scannerRef = useRef<HTMLDivElement>(null);
  
    const todayKey = dateKey(new Date());
  
    const diary =
      progress.foodDiary &&
      typeof progress.foodDiary === "object" &&
      !Array.isArray(progress.foodDiary)
        ? (progress.foodDiary as FoodDiary)
        : {};
  
    const entries = (diary[todayKey] ?? []) as FoodEntryWithFibre[];
  
    const totals = entries.reduce(
      (sum, entry) => ({
        calories: sum.calories + (Number(entry.calories) || 0),
        protein: sum.protein + (Number(entry.protein) || 0),
        carbs: sum.carbs + (Number(entry.carbs) || 0),
        fat: sum.fat + (Number(entry.fat) || 0),
        fiber:
          sum.fiber +
          (Number(entry.fiber ?? entry.fibre) || 0)
      }),
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
      }
    );
  
    function updateField(
      key: keyof typeof initialForm,
      value: string
    ) {
      setForm(previous => ({
        ...previous,
        [key]: value
      }));
    }
  
    function openAddMeal() {
      setError("");
      setShowForm(true);
    }
  
    function closeAddMeal() {
      if (saving) return;
  
      setShowForm(false);
      setForm(initialForm);
      setError("");
    }
  
    function openScanner(source: "camera" | "gallery") {
      setShowForm(false);
      setError("");
  
      const selector =
        source === "camera"
          ? 'input[type="file"][capture]'
          : 'input[type="file"]:not([capture])';
  
      const input =
        scannerRef.current?.querySelector<HTMLInputElement>(
          selector
        );
  
      if (input) {
        input.click();
      } else {
        setError(
          "Could not open the scanner. Please check FoodScanner."
        );
      }
    }
  
    async function addMeal(
      event: FormEvent<HTMLFormElement>
    ) {
      event.preventDefault();
  
      if (saving) return;
  
      setError("");
  
      const numericKeys = [
        "grams",
        "calories",
        "protein",
        "carbs",
        "fat",
        "fiber"
      ] as const;
  
      const invalid = numericKeys.some(key => {
        const value = form[key].trim();
  
        if (key === "fiber" && value === "") {
          return false;
        }
  
        return (
          value === "" ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0
        );
      });
  
      if (!form.name.trim() || invalid) {
        setError("Please enter valid nutrition values.");
        return;
      }
  
      const entry: FoodEntryWithFibre = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        grams: Number(form.grams),
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
        fiber: Number(form.fiber || 0),
        createdAt: new Date().toISOString()
      };
  
      setSaving(true);
  
      try {
        const saved = await saveFoodDiaryEntry(
          todayKey,
          entry
        );
  
        onProgressChange(saved);
        setForm(initialForm);
        setShowForm(false);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not save your meal."
        );
      } finally {
        setSaving(false);
      }
    }
  
    async function removeMeal(id: string) {
      if (saving) return;
  
      setSaving(true);
      setError("");
  
      try {
        const saved = await deleteFoodDiaryEntry(
          todayKey,
          id
        );
  
        onProgressChange(saved);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not delete your meal."
        );
      } finally {
        setSaving(false);
      }
    }
  
    return (
      <main className="food-dashboard">
  
        {/* TODAY'S NUTRITION */}
        <section className="food-nutrition-card">
          <div className="food-nutrition-top">
            <div>
              <span className="food-eyebrow">
                TODAY'S NUTRITION
              </span>
  
              <div className="food-calorie-number">
                <strong>
                  {Math.round(totals.calories).toLocaleString(
                    "en-GB"
                  )}
                </strong>
                <span>kcal</span>
              </div>
            </div>
  
            <div className="food-nutrition-sparkle">
              <Sparkles size={19} />
            </div>
          </div>
  
         
<div className="food-macros">
  <div className="food-macro food-macro-protein">
    <Beef
      className="food-macro-icon"
      size={19}
      strokeWidth={1.8}
      aria-hidden="true"
    />
    <span>Protein</span>
    <strong>{formatNumber(totals.protein)}g</strong>
  </div>

  <div className="food-macro food-macro-carbs">
    <Wheat
      className="food-macro-icon"
      size={19}
      strokeWidth={1.8}
      aria-hidden="true"
    />
    <span>Carbs</span>
    <strong>{formatNumber(totals.carbs)}g</strong>
  </div>

  <div className="food-macro food-macro-fat">
    <Droplets
      className="food-macro-icon"
      size={19}
      strokeWidth={1.8}
      aria-hidden="true"
    />
    <span>Fat</span>
    <strong>{formatNumber(totals.fat)}g</strong>
  </div>

  <div className="food-macro food-macro-fiber">
    <Leaf
      className="food-macro-icon"
      size={19}
      strokeWidth={1.8}
      aria-hidden="true"
    />
    <span>Fibre</span>
    <strong>{formatNumber(totals.fiber)}g</strong>
  </div>
</div>

          
        </section>
  
        {/* THREE ACTIONS */}
        <section
          className="food-actions"
          aria-label="Food actions"
        >
          <button
            type="button"
            className="food-action food-action-light"
            onClick={openAddMeal}
          >
            <Plus size={17} />
            <span>Add Meal</span>
          </button>
  
          <button
            type="button"
            className="food-action food-action-primary"
            onClick={() => openScanner("camera")}
          >
            <Camera size={17} />
            <span>Scan Food</span>
          </button>
  
          <button
            type="button"
            className="food-action food-action-light"
            onClick={() => openScanner("gallery")}
          >
            <Images size={17} />
            <span>Gallery</span>
          </button>
        </section>
  
        {/* SCANNER FUNCTIONALITY */}
        <div
          ref={scannerRef}
          className="food-scanner-host"
        >
          <FoodScanner
            onProgressChange={onProgressChange}
          />
        </div>
  
        {/* MANUAL MEAL MODAL */}
        {showForm && (
          <div
            className="food-modal-overlay"
            onMouseDown={event => {
              if (event.target === event.currentTarget) {
                closeAddMeal();
              }
            }}
          >
            <section
              className="food-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="food-add-title"
            >
              <div className="food-modal-header">
                <div>
                  <span className="food-eyebrow">
                    MY PRIME ERA
                  </span>
                  <h2 id="food-add-title">
                    Add your meal
                  </h2>
                  <p>
                    Log your nutrition manually.
                  </p>
                </div>
  
                <button
                  type="button"
                  className="food-modal-close"
                  onClick={closeAddMeal}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
  
              <form
                className="food-form"
                onSubmit={addMeal}
              >
                <label className="food-field">
                  <span>Food name</span>
                  <input
                    type="text"
                    placeholder="e.g. Chicken and rice"
                    value={form.name}
                    onChange={event =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    required
                  />
                </label>
  
                <div className="food-form-grid">
                  {([
                    ["grams", "Weight (g)"],
                    ["calories", "Calories (kcal)"],
                    ["protein", "Protein (g)"],
                    ["carbs", "Carbs (g)"],
                    ["fat", "Fat (g)"],
                    ["fiber", "Fibre (g)"]
                  ] as const).map(([key, label]) => (
                    <label
                      className="food-field"
                      key={key}
                    >
                      <span>{label}</span>
  
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={form[key]}
                        onChange={event =>
                          updateField(
                            key,
                            event.target.value
                          )
                        }
                        required={key !== "fiber"}
                      />
                    </label>
                  ))}
                </div>
  
                {error && (
                  <p className="food-error" role="alert">
                    {error}
                  </p>
                )}
  
                <button
                  type="submit"
                  className="food-save-button"
                  disabled={saving}
                >
                  <Save size={17} />
                  {saving
                    ? "Saving..."
                    : "Save Meal"}
                </button>
              </form>
            </section>
          </div>
        )}
  
        {/* TODAY'S MEALS */}
        <section className="food-diary">
          <div className="food-diary-heading">
            <div>
              <h2>Today's Meals</h2>
              <p>Your daily food diary</p>
            </div>
  
            <span className="food-meal-count">
              {entries.length} logged
            </span>
          </div>
  
          {entries.length === 0 ? (
            <div className="food-empty">
              <div className="food-empty-icon">
                <Utensils size={23} />
              </div>
  
              <strong>No meals logged yet</strong>
  
              <p>
                Add your first meal to start tracking.
              </p>
            </div>
          ) : (
            <div className="food-meal-list">
              {entries.map(entry => {
                const fibre =
                  Number(
                    entry.fiber ?? entry.fibre
                  ) || 0;
  
                return (
                  <article
                    className="food-meal"
                    key={entry.id}
                  >
                    <div className="food-meal-content">
                      <strong>
                        {entry.name}
                      </strong>
  
                      <div className="food-meal-meta">
                        <span>
                          {formatNumber(entry.grams)}g
                        </span>
  
                        <span className="food-meta-dot" />
  
                        <span className="food-meal-calories">
                          {Math.round(
                            entry.calories
                          )} kcal
                        </span>
                      </div>
  
                      <div className="food-meal-nutrients">
                        <span>
                          P {formatNumber(
                            entry.protein
                          )}g
                        </span>
  
                        <span>
                          C {formatNumber(
                            entry.carbs
                          )}g
                        </span>
  
                        <span>
                          F {formatNumber(
                            entry.fat
                          )}g
                        </span>
  
                        <span className="food-fibre">
                          <Leaf size={11} />
                          {formatNumber(fibre)}g
                        </span>
                      </div>
                    </div>
  
                    <button
                      type="button"
                      className="food-delete-button"
                      disabled={saving}
                      onClick={() =>
                        void removeMeal(entry.id)
                      }
                      aria-label={`Delete ${entry.name}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
  
        {!showForm && error && (
          <p className="food-error" role="alert">
            {error}
          </p>
        )}
  
      </main>
    );
  }

  
  