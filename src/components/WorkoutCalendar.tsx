
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Play,
  Sparkles
} from "lucide-react";

import WorkoutIcon from "./WorkoutIcon";


import {
  type PrimeProgress,
  dateKey,
  mondayOf,
  getWorkoutChecks,
  isWorkoutDayCompleted,
  saveWorkoutCheck
} from "../lib/progress";

import {
  getWorkoutPlan,
  getWorkoutVideo,
  isPlannedWorkout
} from "../lib/workoutPlan";

import "./WorkoutCalendar.css";

type Props = {
  progress: PrimeProgress;
  onProgressChange?: (progress: PrimeProgress) => void;
};

function youtubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let id: string | null = null;

    if (host === "youtu.be" || host === "www.youtu.be") {
      id = parsed.pathname.split("/")[1];
    } else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com"
      ].includes(host)
    ) {
      id = parsed.pathname === "/watch"
        ? parsed.searchParams.get("v")
        : parsed.pathname.match(
            /^\/(?:embed|shorts|live)\/([^/]+)/
          )?.[1] ?? null;
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(id ?? "")
      ? id
      : null;
  } catch {
    return null;
  }
}

export default function WorkoutCalendar({
  progress,
  onProgressChange
}: Props) {
  const [localProgress, setLocalProgress] =
    useState<PrimeProgress>(progress);

  const [weekOffset, setWeekOffset] = useState(0);

  const [selectedDate, setSelectedDate] = useState(
    () => dateKey(new Date())
  );

  const [showDetails, setShowDetails] = useState(false);
  const [expandedIndex, setExpandedIndex] =
    useState<number | null>(null);

  const [playingIndex, setPlayingIndex] =
    useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalProgress(progress);
  }, [progress]);

  const monday = useMemo(() => {
    const result = mondayOf(new Date());
    result.setDate(result.getDate() + weekOffset * 7);
    return result;
  }, [weekOffset]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      return {
        key: dateKey(date),
        label: date.toLocaleDateString("en-GB", {
          weekday: "short"
        }),
        number: date.getDate()
      };
    }),
    [monday]
  );

  const plan = getWorkoutPlan(
    localProgress,
    dateKey(monday)
  );

  const checks = getWorkoutChecks(localProgress);

  const selectedIndex = days.findIndex(
    day => day.key === selectedDate
  );

  const selectedDay =
    selectedIndex >= 0
      ? plan[selectedIndex]
      : undefined;

  const items = selectedDay?.items ?? [];

  const minutes = items.reduce(
    (sum, item) => sum + (item.duration ?? 0),
    0
  );

  const isDone = (day: string, index: number) =>
    checks[day]?.[String(index)] === true;

  const completedDays = days.filter(
    day => isWorkoutDayCompleted(localProgress, day.key)
  ).length;

  const plannedDays = plan.filter(
    isPlannedWorkout
  ).length;

  const completedItems = items.filter(
    (_, index) => isDone(selectedDate, index)
  ).length;

  const selectedDayComplete =
    isWorkoutDayCompleted(
      localProgress,
      selectedDate
    );

  function stopVideo() {
    setPlayingIndex(null);
  }

  function selectDay(key: string) {
    setSelectedDate(key);
    setShowDetails(false);
    setExpandedIndex(null);
    stopVideo();
    setError("");
  }

  function changeWeek(direction: number) {
    const next = new Date(monday);
    next.setDate(next.getDate() + direction * 7);

    setWeekOffset(value => value + direction);
    selectDay(dateKey(next));
  }

  function toggleExercise(index: number) {
    setExpandedIndex(current =>
      current === index ? null : index
    );
    stopVideo();
  }

  async function toggleWorkout(index: number) {
    if (saving || !selectedDay) return;

    const previous = localProgress;
    const nextValue = !isDone(selectedDate, index);

    const optimistic: PrimeProgress = {
      ...localProgress,
      workoutChecks: {
        ...checks,
        [selectedDate]: {
          ...(checks[selectedDate] ?? {}),
          [String(index)]: nextValue
        }
      }
    };

    setLocalProgress(optimistic);
    setSaving(true);
    setError("");

    try {
      const saved = await saveWorkoutCheck(
        selectedDate,
        index,
        nextValue
      );

      setLocalProgress(saved);
      onProgressChange?.(saved);
    } catch (reason) {
      setLocalProgress(previous);

      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save workout."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="aurora-calendar">
      <div className="aurora-calendar-heading">
        <div>
          <span className="aurora-calendar-kicker">
            YOUR TRAINING SCHEDULE
          </span>

          <h2>
            Weekly Workout
            <Sparkles size={15} />
          </h2>
        </div>

        <div className="aurora-week-counter">
          <strong>
            {completedDays}/{plannedDays}
          </strong>
          <span>days done</span>
        </div>
      </div>

      <div className="aurora-calendar-glass">
        <div className="aurora-week-navigation">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => changeWeek(-1)}
          >
            <ChevronLeft size={17} />
          </button>

          <strong>
            {monday.toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric"
            })}
          </strong>

          <button
            type="button"
            aria-label="Next week"
            onClick={() => changeWeek(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="aurora-week-days">
          {days.map(day => {
            const selected = selectedDate === day.key;

            const done = isWorkoutDayCompleted(
              localProgress,
              day.key
            );

            const today =
              day.key === dateKey(new Date());

            return (
              <button
                key={day.key}
                type="button"
                className={
                  `aurora-calendar-day ` +
                  `${selected ? "selected" : ""} ` +
                  `${done ? "completed" : ""}`
                }
                aria-pressed={selected}
                onClick={() => selectDay(day.key)}
              >
                <span>{day.label}</span>

                <div className="aurora-day-number">
                  {done
                    ? <Check size={16} />
                    : day.number}
                </div>

                <i className={today ? "today" : ""} />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="aurora-compact-toggle"
          aria-expanded={showDetails}
          onClick={() => {
            setShowDetails(value => !value);
            stopVideo();
          }}
        >
          <div className="aurora-compact-summary-icon">
            {selectedDayComplete ? (
              <Check size={16} />
            ) : items.length > 0 ? (
              <WorkoutIcon
                type={items[0].type}
                label={items[0].label}
                size={22}
              />
            ) : (
              <WorkoutIcon
                type="recovery"
                size={22}
              />
            )}
          </div>

          <div className="aurora-compact-summary-text">
            <strong>
              {selectedDay?.day ?? "Select a day"}
              {selectedDayComplete ? " ✓" : ""}
            </strong>

            <span>
              {items.length} activities
              {minutes > 0
                ? ` · ${minutes} min`
                : ""}
              {completedItems > 0
                ? ` · ${completedItems} done`
                : ""}
            </span>
          </div>

          <ChevronDown
            size={17}
            className={showDetails ? "open" : ""}
          />
        </button>

        <AnimatePresence initial={false}>
          {showDetails && selectedDay && (
            <motion.div
              className="aurora-workout-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: "auto",
                opacity: 1
              }}
              exit={{
                height: 0,
                opacity: 0
              }}
              transition={{ duration: 0.25 }}
            >
              <div className="aurora-workout-panel-inner">
                <div className="aurora-workout-panel-heading">
                  <strong>
                    {selectedDay.day}'s Workout
                  </strong>
                  <span>
                    {completedItems}/{items.length}
                  </span>
                </div>

                <div className="aurora-workout-progress">
                  <div
                    style={{
                      width: `${
                        items.length
                          ? (completedItems / items.length) * 100
                          : 0
                      }%`
                    }}
                  />
                </div>

                <div className="aurora-workout-list">
                  {items.map((item, index) => {
                    const done = isDone(
                      selectedDate,
                      index
                    );

                    const expanded =
                      expandedIndex === index;

                    const video = getWorkoutVideo(
                      localProgress,
                      item
                    );

                    const id = youtubeId(video);

                    const playing =
                      playingIndex === index;

                    return (
                      <div
                        key={`${item.label}-${index}`}
                        className={
                          `aurora-workout-item ` +
                          `${done ? "is-done" : ""}`
                        }
                      >
                        <button
                          type="button"
                          className="aurora-workout-item-header"
                          aria-expanded={expanded}
                          onClick={() =>
                            toggleExercise(index)
                          }
                        >
                          <WorkoutIcon
                            type={item.type}
                            label={item.label}
                            size={25}
                          />

                          <div className="aurora-workout-name">
                            <strong>
                              {item.label}
                            </strong>

                            <span>
                              {item.duration ?? 0} min
                            </span>
                          </div>

                          <ChevronDown
                            size={16}
                            className={
                              expanded ? "open" : ""
                            }
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.div
                              className="aurora-workout-expand"
                              initial={{
                                height: 0,
                                opacity: 0
                              }}
                              animate={{
                                height: "auto",
                                opacity: 1
                              }}
                              exit={{
                                height: 0,
                                opacity: 0
                              }}
                              transition={{
                                duration: 0.2
                              }}
                            >
                              <div className="aurora-workout-expand-inner">
                                {id ? (
                                  <>
                                    <div className="aurora-inline-video">
                                      {playing ? (
                                        <iframe
                                          key={`${selectedDate}-${index}-${id}`}
                                          src={
                                            `https://www.youtube-nocookie.com/embed/` +
                                            `${id}?autoplay=1&playsinline=1&rel=0`
                                          }
                                          title={item.label}
                                          allow={
                                            "accelerometer; autoplay; " +
                                            "clipboard-write; encrypted-media; " +
                                            "gyroscope; picture-in-picture; " +
                                            "web-share"
                                          }
                                          referrerPolicy="strict-origin-when-cross-origin"
                                          allowFullScreen
                                        />
                                      ) : (
                                        <button
                                          type="button"
                                          className="aurora-inline-thumbnail"
                                          onClick={() =>
                                            setPlayingIndex(index)
                                          }
                                          aria-label={`Play ${item.label}`}
                                        >
                                          <img
                                            src={
                                              `https://i.ytimg.com/vi/` +
                                              `${id}/hqdefault.jpg`
                                            }
                                            alt={item.label}
                                            loading="lazy"
                                          />

                                          <span className="aurora-video-play">
                                            <Play
                                              size={24}
                                              fill="currentColor"
                                            />
                                          </span>
                                        </button>
                                      )}
                                    </div>

                                    <div className="aurora-video-actions">
                                      {playing && (
                                        <button
                                          type="button"
                                          className="aurora-stop-video"
                                          onClick={stopVideo}
                                        >
                                          Stop video
                                        </button>
                                      )}

                                      <a
                                        className="aurora-watch-link"
                                        href={video}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Open on YouTube
                                        <ExternalLink size={13} />
                                      </a>
                                    </div>
                                  </>
                                ) : (
                                  <div className="aurora-video-empty">
                                    No YouTube video linked
                                  </div>
                                )}

                                <button
                                  type="button"
                                  disabled={saving}
                                  className={
                                    `aurora-complete-button ` +
                                    `${done ? "done" : ""}`
                                  }
                                  onClick={() =>
                                    toggleWorkout(index)
                                  }
                                >
                                  {done ? (
                                    <>
                                      <Check size={16} />
                                      Completed — Undo
                                    </>
                                  ) : (
                                    <>
                                      <CircleCheck size={16} />
                                      Mark as Completed
                                    </>
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {items.length === 0 && (
                  <p className="aurora-empty-day">
                    Rest day — no activities planned.
                  </p>
                )}

                {selectedDayComplete && (
                  <p className="aurora-saving">
                    ✓ Training day completed!
                  </p>
                )}

                {saving && (
                  <p className="aurora-saving">
                    Saving to Supabase...
                  </p>
                )}

                {error && (
                  <p
                    className="aurora-save-error"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
