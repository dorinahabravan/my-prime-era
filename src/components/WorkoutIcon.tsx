
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type IconStyle = "female" | "male" | "neutral";

type WorkoutIconProps = {
  type?: string;
  label?: string;
  size?: number;
  className?: string;
};

function normalizeGender(value: unknown): IconStyle {
  if (value === "female") return "female";
  if (value === "male") return "male";
  return "neutral";
}

function getCategory(type = "", label = ""): string {
  const text = `${type} ${label}`.toLowerCase();

  if (/walk|steps/.test(text)) return "walking";
  if (/recover|rest/.test(text)) return "recovery";
  if (/posture|back|shoulder mobility/.test(text)) {
    return "posture";
  }
  if (/stretch|mobility|flexibility/.test(text)) {
    return "mobility";
  }
  if (/pilates|yoga/.test(text)) return "pilates";
  if (/glute|bridge|booty|hip thrust/.test(text)) {
    return "glutes";
  }
  if (/core|abs|abdominal|plank/.test(text)) {
    return "core";
  }
  if (/cardio|run|treadmill|incline/.test(text)) {
    return "cardio";
  }
  if (/lower|leg|squat|lunge/.test(text)) {
    return "lower";
  }

  return "upper";
}

export default function WorkoutIcon({
  type = "",
  label = "",
  size = 36,
  className = ""
}: WorkoutIconProps) {
  const [style, setStyle] = useState<IconStyle>("neutral");

  useEffect(() => {
    let active = true;

    async function loadGender() {
      const { data } = await supabase.auth.getUser();

      if (!active) return;

      setStyle(
        normalizeGender(data.user?.user_metadata?.gender)
      );
    }

    void loadGender();

    const { data: subscription } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setStyle(
          normalizeGender(
            session?.user?.user_metadata?.gender
          )
        );
      });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const category = getCategory(type, label);

  return (
    <img
      src={`/workout-icons/${style}/${category}.webp`}
      alt=""
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
        borderRadius: "10px"
      }}
    />
  );
}
