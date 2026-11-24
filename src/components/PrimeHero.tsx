
import { useState } from "react";
import type { PointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  Footprints,
  Sparkles,
  Target
} from "lucide-react";

import {
  type PrimeProgress,
  countCompletedWorkouts,
  getWorkoutGoal
} from "../lib/progress";

import "./PrimeHero.css";

type Props = {
  progress: PrimeProgress;
};

function validDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
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

export default function PrimeHero({ progress }: Props) {
  const reducedMotion = useReducedMotion();

  const [tilt, setTilt] = useState({
    x: 0,
    y: 0
  });

  const completed = countCompletedWorkouts(progress);
  const total = getWorkoutGoal(progress);

  const percentage = Math.min(
    100,
    (completed / Math.max(total, 1)) * 100
  );

  const goalDate =
    validDate(progress.goalDate) ??
    validDate(progress.targetDate) ??
    new Date(2027, 5, 1);

  const startDate =
    validDate(progress.startDate) ??
    validDate(progress.programStartDate);

  const today = new Date();

  const currentWeek = startDate
    ? Math.max(
        1,
        Math.floor(
          (today.getTime() - startDate.getTime()) /
          604800000
        ) + 1
      )
    : null;

  const daysLeft = Math.ceil(
    (
      new Date(
        goalDate.getFullYear(),
        goalDate.getMonth(),
        goalDate.getDate()
      ).getTime() -
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime()
    ) / 86400000
  );

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const progressOffset =
    circumference * (1 - percentage / 100);

  function handlePointerMove(
    event: PointerEvent<HTMLElement>
  ) {
    if (reducedMotion || event.pointerType !== "mouse") {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      (event.clientX - rect.left) / rect.width - 0.5;

    const y =
      (event.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      x: -y * 4,
      y: x * 4
    });
  }

  return (
    <div className="prime-aurora-area">
      <motion.section
        className="prime-aurora-card"
        onPointerMove={handlePointerMove}
        onPointerLeave={() =>
          setTilt({ x: 0, y: 0 })
        }
        initial={
          reducedMotion
            ? false
            : { opacity: 0, y: 12 }
        }
        animate={{
          opacity: 1,
          y: 0,
          rotateX: tilt.x,
          rotateY: tilt.y
        }}
        transition={{
          type: "spring",
          stiffness: 140,
          damping: 22
        }}
      >
        <div className="prime-aurora-light" />
        <div className="prime-aurora-sheen" />

        <div className="prime-aurora-main">
          <div className="prime-aurora-ring">
            <svg
              viewBox="0 0 144 144"
              role="img"
              aria-label={`${completed} of ${total} training days completed`}
            >
              <defs>
                <linearGradient
                  id="primeGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#EBD7FF" />
                  <stop offset="50%" stopColor="#B687E7" />
                  <stop offset="100%" stopColor="#7452B6" />
                </linearGradient>
              </defs>

              <circle
                cx="72"
                cy="72"
                r={radius}
                fill="none"
                stroke="rgba(118,91,146,.18)"
                strokeWidth="9"
              />

              <motion.circle
                cx="72"
                cy="72"
                r={radius}
                fill="none"
                stroke="url(#primeGradient)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                transform="rotate(-90 72 72)"
                initial={
                  reducedMotion
                    ? false
                    : { strokeDashoffset: circumference }
                }
                animate={{
                  strokeDashoffset: progressOffset
                }}
                transition={{
                  duration: reducedMotion ? 0 : 1.5
                }}
              />

              {!reducedMotion && (
                <g className="prime-aurora-orbit">
                  <circle
                    cx="72"
                    cy="16"
                    r="9"
                    fill="#CBA3FF"
                    opacity=".3"
                    className="prime-orbit-halo"
                  />

                  <circle
                    cx="72"
                    cy="16"
                    r="4.5"
                    fill="white"
                    className="prime-orbit-dot"
                  />
                </g>
              )}
            </svg>

            <div className="prime-aurora-ring-text">
              <strong>
                {completed}
                <span> / {total}</span>
              </strong>
              <small>Training days done</small>
            </div>
          </div>

          <div className="prime-aurora-details">
            <div className="prime-aurora-detail">
              <div className="prime-aurora-icon lavender">
                <CalendarDays size={15} />
              </div>

              <div>
                <span>CURRENT PROGRAM</span>
                <strong>
                  {currentWeek
                    ? `Week ${currentWeek}`
                    : "Weekly training"}
                </strong>
              </div>
            </div>

            <div className="prime-aurora-detail">
              <div className="prime-aurora-icon peach">
                <Target size={15} />
              </div>

              <div>
                <span>GOAL DATE</span>
                <strong>
                  {goalDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}
                </strong>
                <small>
                  {daysLeft > 0
                    ? `${daysLeft} days left`
                    : daysLeft === 0
                      ? "Today!"
                      : "Goal date passed"}
                </small>
              </div>
            </div>

            <div className="prime-aurora-detail">
              <div className="prime-aurora-icon mint">
                <Footprints size={15} />
              </div>

              <div>
                <span>DAILY STEP GOAL</span>
                <strong>
                  {(progress.stepGoal ?? 6000)
                    .toLocaleString("en-GB")} steps
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="prime-aurora-quote">
          <Sparkles size={11} />
          <span>
            Discipline today, confidence tomorrow.
          </span>
          <Sparkles size={11} />
        </div>
      </motion.section>
    </div>
  );
}
