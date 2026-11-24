
import { supabase } from "./supabase";
import {
  getWorkoutPlan,
  isPlannedWorkout
} from "./workoutPlan";

export type WorkoutChecks = Record<
  string,
  Record<string, boolean>
>;

export type PrimeProgress = {
  stepGoal?: number;

  daily?: Record<string, {
    steps?: number;
    water?: number;
    meals?: number;
    mobility?: number;
    cardio?: number;
  }>;

  plans?: Record<string, unknown>;
  completed?: Record<string, unknown>;
  workoutVideos?: Record<string, unknown>;
  workoutChecks?: WorkoutChecks;

  workoutGoal?: number;
  overallGoal?: number;
  goalWorkouts?: number;

  goalDate?: string;
  targetDate?: string;
  startDate?: string;
  programStartDate?: string;

  [key: string]: unknown;
};

export function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day, 12);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function mondayOf(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);

  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7)
  );

  return monday;
}

export function getWorkoutChecks(
  progress: PrimeProgress
): WorkoutChecks {
  const value = progress.workoutChecks;

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value;
}

export function isWorkoutDayCompleted(
  progress: PrimeProgress,
  dayKey: string
): boolean {
  const date = parseDateKey(dayKey);
  if (!date) return false;

  const monday = mondayOf(date);
  const dayIndex = (date.getDay() + 6) % 7;

  const plan = getWorkoutPlan(progress, dateKey(monday));
  const day = plan[dayIndex];

  if (!day || !isPlannedWorkout(day)) {
    return false;
  }

  const requiredIndices = day.items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.type !== "recovery" &&
        item.type !== "stretch"
    )
    .map(({ index }) => index);

  if (requiredIndices.length === 0) {
    return false;
  }

  const checks = getWorkoutChecks(progress)[dayKey] ?? {};

  return requiredIndices.every(
    index => checks[String(index)] === true
  );
}

export function countCompletedWorkouts(
  progress: PrimeProgress
): number {
  const checks = getWorkoutChecks(progress);

  return Object.keys(checks).filter(
    dayKey => isWorkoutDayCompleted(progress, dayKey)
  ).length;
}

export function getWorkoutGoal(
  progress: PrimeProgress
): number {
  const candidates = [
    progress.workoutGoal,
    progress.overallGoal,
    progress.goalWorkouts
  ];

  const goal = candidates.find(
    value =>
      typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0
  );

  return typeof goal === "number" ? goal : 241;
}

export async function loadProgress():
  Promise<PrimeProgress | null> {
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError) throw authError;

  if (!auth.user) {
    throw new Error("Please sign in to My Prime Era");
  }

  const { data, error } = await supabase
    .from("user_progress")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) throw error;

  return (data?.data as PrimeProgress) ?? null;
}

export async function saveWorkoutCheck(
  dayKey: string,
  workoutIndex: number,
  completed: boolean
): Promise<PrimeProgress> {
  if (!parseDateKey(dayKey)) {
    throw new Error("Invalid workout date.");
  }

  if (!Number.isInteger(workoutIndex) || workoutIndex < 0) {
    throw new Error("Invalid workout index.");
  }

  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError) throw authError;

  if (!auth.user) {
    throw new Error("Please sign in to save workouts.");
  }

  const { data: stored, error: readError } =
    await supabase
      .from("user_progress")
      .select("data")
      .eq("user_id", auth.user.id)
      .maybeSingle();

  if (readError) throw readError;

  const existing: PrimeProgress =
    stored?.data &&
    typeof stored.data === "object" &&
    !Array.isArray(stored.data)
      ? stored.data as PrimeProgress
      : {};

  const checks = getWorkoutChecks(existing);

  const updated: PrimeProgress = {
    ...existing,
    workoutChecks: {
      ...checks,
      [dayKey]: {
        ...(checks[dayKey] ?? {}),
        [String(workoutIndex)]: completed
      }
    }
  };

  const { error: writeError } =
    await supabase
      .from("user_progress")
      .upsert(
        {
          user_id: auth.user.id,
          data: updated
        },
        {
          onConflict: "user_id"
        }
      );

  if (writeError) throw writeError;

  return updated;
}
