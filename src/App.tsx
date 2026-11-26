
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { User } from "@supabase/supabase-js";
import FoodDashboard from "./components/FoodDashboard";
import {
  House,
  Dumbbell,
  Utensils,
  ChartNoAxesColumn,
  LogOut,
  UserRound,
  Sparkles
} from "lucide-react";

import HomeDashboard from "./components/HomeDashboard";
import Login from "./components/Login";
import { supabase } from "./lib/supabase";

import {
  loadProgress,
  type PrimeProgress
} from "./lib/progress";

import "./App.css";

type Page = "Home" | "Train" | "Food" | "Progress";
type Gender = "female" | "male" | "neutral";

const navigation = [
  { name: "Home", icon: House },
  { name: "Train", icon: Dumbbell },
  { name: "Food", icon: Utensils },
  { name: "Progress", icon: ChartNoAxesColumn }
] as const;

function getGender(user: User | null): Gender {
  const value = user?.user_metadata?.gender;

  if (value === "female") return "female";
  if (value === "male") return "male";

  return "neutral";
}

function getFirstName(user: User | null): string {
  const fullName = user?.user_metadata?.full_name;

  if (
    typeof fullName === "string" &&
    fullName.trim()
  ) {
    return fullName.trim().split(/\s+/)[0];
  }

  const emailName = user?.email?.split("@")[0];

  if (emailName) {
    return emailName.split(/[._-]/)[0];
  }

  return "there";
}

export default function App() {
  const [progress, setProgress] =
    useState<PrimeProgress | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activePage, setActivePage] =
    useState<Page>("Home");

  const [user, setUser] = useState<User | null>(null);

  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const { data, error: authError } =
          await supabase.auth.getUser();

        if (cancelled) return;

        if (authError || !data.user) {
          setUser(null);
          setProgress(null);
          setLoadError("Please sign in to My Prime Era");
          return;
        }

        setUser(data.user);

        const savedProgress = await loadProgress();

        if (cancelled) return;

        setProgress(savedProgress ?? {});
        setLoadError("");
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Loading failed";

        if (
          /auth session missing|please sign in/i.test(message)
        ) {
          setUser(null);
          setProgress(null);
          setLoadError("Please sign in to My Prime Era");
        } else {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setUser(null);
      setProgress(null);
      setActivePage("Home");
      setLoadError("Please sign in to My Prime Era");
    } catch (error) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : "Could not sign out. Please try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  const needsLogin =
    !loading &&
    (
      !user ||
      loadError === "Please sign in to My Prime Era" ||
      /auth session missing/i.test(loadError)
    );

  if (needsLogin) {
    return (
      <Login
        onLogin={() => window.location.reload()}
      />
    );
  }

  const gender = getGender(user);
  const rawFirstName = getFirstName(user);
  const firstName =
    rawFirstName.charAt(0).toUpperCase() +
    rawFirstName.slice(1);


  const greeting =
    gender === "female"
      ? "Your glow, your strength, your journey."
      : gender === "male"
        ? "Build strength. Own your progress."
        : "Your journey. Your prime era.";

  return (
    <div className={`app-shell prime-gender-${gender}`}>
      {!loading && user && (
        <motion.header
          className="prime-account-header"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="prime-account-identity">
            <div className="prime-account-avatar">
              <UserRound size={22} strokeWidth={1.7} />

              <span className="prime-avatar-sparkle">
                <Sparkles size={10} />
              </span>
            </div>

            <div className="prime-account-copy">
              <h2>
                Hello, {firstName}!
                <Sparkles
                  className="prime-greeting-sparkle"
                  size={15}
                />
              </h2>

              <p>{greeting}</p>
            </div>
          </div>

          <button
            type="button"
            className="prime-signout-button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out of My Prime Era"
            title="Sign Out"
          >
            <LogOut size={18} strokeWidth={2} />
            <span>
              {signingOut ? "Leaving..." : "Sign Out"}
            </span>
          </button>
        </motion.header>
      )}

      {signOutError && (
        <p className="prime-signout-error" role="alert">
          {signOutError}
        </p>
      )}

      <main>
        {loading && (
          <div className="prime-status">
            Loading your progress...
          </div>
        )}

        {!loading && loadError && (
          <div className="prime-status" role="alert">
            {loadError}
          </div>
        )}

        {!loading && !loadError && !progress && (
          <div className="prime-status">
            No saved progress found.
          </div>
        )}

        {!loading && !loadError && progress && (
          <>
            {activePage === "Home" && (
              <HomeDashboard
  progress={progress}
  onProgressChange={setProgress}
/>
)}

            {activePage === "Train" && (
              <section className="prime-page">
                <h1>Training</h1>
                <p>
                  Your existing workout plans will
                  be connected here.
                </p>
              </section>
            )}

{activePage === "Food" && (
  <FoodDashboard
    progress={progress}
    onProgressChange={setProgress}
  />
)}
            

            {activePage === "Progress" && (
              <section className="prime-page">
                <h1>Progress</h1>
                <p>
                  Your achievements and history
                  will be connected here.
                </p>
              </section>
            )}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        {navigation.map(({ name, icon: Icon }) => (
          <motion.button
            key={name}
            type="button"
            className={
              `nav-item ${
                activePage === name ? "active" : ""
              }`
            }
            onClick={() => setActivePage(name)}
            whileTap={{ scale: 0.85 }}
          >
            <Icon size={21} />
            <span>{name}</span>
          </motion.button>
        ))}
      </nav>
    </div>
  );

  
}
