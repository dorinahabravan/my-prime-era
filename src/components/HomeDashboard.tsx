
import { useState } from "react";
import { motion } from "motion/react";
import {
  Footprints,
  Droplets,
  Utensils,
  TrendingUp,
  Plus,
  Minus,
  Pencil,
  Check,
  X
} from "lucide-react";

import PrimeHero from "./PrimeHero";
import WorkoutCalendar from "./WorkoutCalendar";

import {
  type PrimeProgress,
  type DailyMetric,
  dateKey,
  mondayOf,
  isWorkoutDayCompleted,
  saveDailyMetric
} from "../lib/progress";

import {
  getWorkoutPlan,
  isPlannedWorkout
} from "../lib/workoutPlan";

import "./HomeDashboard.css";

type Props = {
  progress: PrimeProgress;
  onProgressChange: (progress: PrimeProgress) => void;
};

export default function HomeDashboard({
  progress,
  onProgressChange
}: Props) {
  const [editingSteps, setEditingSteps] = useState(false);
  const [stepsInput, setStepsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const todayKey = dateKey(today);
  const daily = progress.daily?.[todayKey];

  const steps = daily?.steps ?? 0;
  const stepGoal = progress.stepGoal ?? 6000;
  const water = daily?.water ?? 0;
  const meals = daily?.meals ?? 0;

  const monday = mondayOf(today);
  const plan = getWorkoutPlan(progress, dateKey(monday));

  const plannedCount = plan.filter(isPlannedWorkout).length;

  const completedCount = plan.filter((day, index) => {
    if (!isPlannedWorkout(day)) return false;

    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return isWorkoutDayCompleted(
      progress,
      dateKey(date)
    );
  }).length;

  const percent = (value: number, goal: number) =>
    Math.min(100, (value / Math.max(goal, 1)) * 100);

  async function updateMetric(
    metric: DailyMetric,
    value: number
  ) {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const saved = await saveDailyMetric(
        todayKey,
        metric,
        Math.max(0, value)
      );

      onProgressChange(saved);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save your progress."
      );
    } finally {
      setSaving(false);
    }
  }

  function saveSteps() {
    const trimmed = stepsInput.trim();

    if (!/^\d+$/.test(trimmed)) {
      setError("Enter a valid number of steps.");
      return;
    }

    const value = Number(trimmed);

    if (!Number.isSafeInteger(value)) {
      setError("The step count is too large.");
      return;
    }

    void updateMetric("steps", value).then(() => {
      // Close the editor only after a successful save.
      // Errors remain visible in the dashboard.
    });

    setEditingSteps(false);
  }

  return (
    <div className="fit-home">
      <PrimeHero progress={progress} />

      <WorkoutCalendar
        progress={progress}
        onProgressChange={onProgressChange}
      />

      <div className="fit-section-title">
        <h2>Daily Overview</h2>
        <span>
          {today.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short"
          })}
        </span>
      </div>

      {error && (
        <p className="fit-save-error" role="alert">
          {error}
        </p>
      )}

      <section className="fit-stats">
        <motion.div className="fit-stat steps" whileTap={{ scale: 0.99 }}>
          <div className="fit-stat-top">
            <Footprints size={16} />
            <span>Steps</span>
          </div>

          {editingSteps ? (
            <div className="fit-step-editor">
              <input
                type="number"
                min="0"
                step="1"
                value={stepsInput}
                onChange={e => setStepsInput(e.target.value)}
                aria-label="Steps today"
              />
              <button
                type="button"
                onClick={saveSteps}
                disabled={saving}
                aria-label="Save steps"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => setEditingSteps(false)}
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="fit-value-row">
              <strong>{steps.toLocaleString("en-GB")}</strong>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setStepsInput(String(steps));
                  setEditingSteps(true);
                  setError("");
                }}
                aria-label="Edit steps"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}

          <small>Goal {stepGoal.toLocaleString("en-GB")}</small>
          <div className="fit-bar">
            <div style={{ width: `${percent(steps, stepGoal)}%` }} />
          </div>
        </motion.div>

        <motion.div className="fit-stat water" whileTap={{ scale: 0.99 }}>
          <div className="fit-stat-top">
            <Droplets size={16} />
            <span>Water</span>
          </div>

          <div className="fit-value-row">
            <strong>{water} <em>glasses</em></strong>
            <div className="fit-counter-actions">
              <button
                type="button"
                disabled={saving || water === 0}
                onClick={() => void updateMetric("water", water - 1)}
                aria-label="Remove one glass"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void updateMetric("water", water + 1)}
                aria-label="Add one glass"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <small>Goal 8 glasses</small>
          <div className="fit-bar">
            <div style={{ width: `${percent(water, 8)}%` }} />
          </div>
        </motion.div>

        <motion.div className="fit-stat meals" whileTap={{ scale: 0.99 }}>
          <div className="fit-stat-top">
            <Utensils size={16} />
            <span>Meals</span>
          </div>

          <div className="fit-value-row">
            <strong>{meals}</strong>
            <div className="fit-counter-actions">
              <button
                type="button"
                disabled={saving || meals === 0}
                onClick={() => void updateMetric("meals", meals - 1)}
                aria-label="Remove one meal"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void updateMetric("meals", meals + 1)}
                aria-label="Add one meal"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <small>Meals recorded</small>
        </motion.div>

        <motion.div className="fit-stat weekly" whileTap={{ scale: 0.99 }}>
          <div className="fit-stat-top">
            <TrendingUp size={16} />
            <span>Weekly</span>
          </div>

          <strong>{completedCount}/{plannedCount}</strong>
          <small>Days completed</small>
          <div className="fit-bar">
            <div
              style={{
                width: `${percent(completedCount, plannedCount)}%`
              }}
            />
          </div>
        </motion.div>
      </section>

      {saving && (
        <p className="fit-saving" role="status">
          Saving your progress...
        </p>
      )}
    </div>
  );
}
