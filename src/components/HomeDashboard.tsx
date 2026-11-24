
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Footprints,
  Droplets,
  Utensils,
  TrendingUp
} from "lucide-react";

import PrimeHero from "./PrimeHero";
import WorkoutCalendar from "./WorkoutCalendar";
import type { PrimeProgress } from "../lib/progress";
import {
  getWorkoutPlan,
  isPlannedWorkout
} from "../lib/workoutPlan";

import "./HomeDashboard.css";

type Props = {
  progress: PrimeProgress;
};

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export default function HomeDashboard({ progress }: Props) {
  const [currentProgress, setCurrentProgress] = useState(progress);

  useEffect(() => {
    setCurrentProgress(progress);
  }, [progress]);

  const today = new Date();
  const todayKey = dateKey(today);

  const daily = currentProgress.daily?.[todayKey];

  const steps = daily?.steps ?? 0;
  const stepGoal = currentProgress.stepGoal ?? 6000;
  const water = daily?.water ?? 0;
  const meals = daily?.meals ?? 0;

  const monday = new Date(today);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7)
  );

  const plan = getWorkoutPlan(currentProgress, dateKey(monday));
  const plannedCount = plan.filter(isPlannedWorkout).length;

  const rawChecks = currentProgress.workoutChecks;
  const checks =
    rawChecks && typeof rawChecks === "object" && !Array.isArray(rawChecks)
      ? rawChecks as Record<string, Record<string, boolean>>
      : {};

  const completedCount = plan.filter((day, index) => {
    if (!isPlannedWorkout(day)) return false;

    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dayChecks = checks[dateKey(date)] ?? {};

    const required = day.items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) =>
        item.type !== "recovery" && item.type !== "stretch"
      );

    return required.length > 0 &&
      required.every(({ i }) => dayChecks[String(i)] === true);
  }).length;

  const stepsPercent = Math.min(
    100, (steps / Math.max(stepGoal, 1)) * 100
  );

  const waterPercent = Math.min(100, (water / 8) * 100);

  const weeklyPercent = plannedCount
    ? (completedCount / plannedCount) * 100
    : 0;

  return (
    <div className="fit-home">
      <PrimeHero progress={currentProgress} />

      <WorkoutCalendar
        progress={currentProgress}
        onProgressChange={setCurrentProgress}
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

      <section className="fit-stats">
        <motion.div
          className="fit-stat steps"
          whileTap={{ scale: .98 }}
        >
          <div className="fit-stat-top">
            <Footprints size={16} />
            <span>Steps</span>
          </div>
          <strong>{steps.toLocaleString("en-GB")}</strong>
          <small>Goal {stepGoal.toLocaleString("en-GB")}</small>
          <div className="fit-bar">
            <div style={{ width: `${stepsPercent}%` }} />
          </div>
        </motion.div>

        <motion.div
          className="fit-stat water"
          whileTap={{ scale: .98 }}
        >
          <div className="fit-stat-top">
            <Droplets size={16} />
            <span>Water</span>
          </div>
          <strong>{water} <em>glasses</em></strong>
          <small>Goal 8 glasses</small>
          <div className="fit-bar">
            <div style={{ width: `${waterPercent}%` }} />
          </div>
        </motion.div>

        <motion.div
          className="fit-stat meals"
          whileTap={{ scale: .98 }}
        >
          <div className="fit-stat-top">
            <Utensils size={16} />
            <span>Meals</span>
          </div>
          <strong>{meals}</strong>
          <small>Meals recorded</small>
        </motion.div>

        <motion.div
          className="fit-stat weekly"
          whileTap={{ scale: .98 }}
        >
          <div className="fit-stat-top">
            <TrendingUp size={16} />
            <span>Weekly</span>
          </div>
          <strong>{completedCount}/{plannedCount}</strong>
          <small>Days completed</small>
          <div className="fit-bar">
            <div style={{ width: `${weeklyPercent}%` }} />
          </div>
        </motion.div>
      </section>
    </div>
  );
}
