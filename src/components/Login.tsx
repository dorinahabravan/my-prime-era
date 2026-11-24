
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./Login.css";

type LoginProps = {
  onLogin: () => void;
};

type AuthMode = "login" | "signup";
type Gender = "female" | "male" | "neutral";

const INTRO_DURATION = 10000;
const INTRO_GIF = "/intro/my-prime-era-intro-vertical.gif";

export default function Login({ onLogin }: LoginProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("neutral");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      setShowIntro(false);
      return;
    }

    const timer = window.setTimeout(
      () => setShowIntro(false),
      INTRO_DURATION
    );

    return () => window.clearTimeout(timer);
  }, []);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });

        if (loginError) throw loginError;

        onLogin();
        return;
      }

      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              gender
            }
          }
        });

      if (signupError) throw signupError;

      if (data.session) {
        onLogin();
      } else {
        setMessage(
          "Account created! Please check your email to confirm your account before signing in."
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="prime-auth-scene">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.section
            key="intro"
            className="prime-cinematic-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.04,
              filter: "blur(14px)"
            }}
            transition={{ duration: 0.8 }}
          >
            <div
              className="prime-intro-aurora"
              aria-hidden="true"
            >
              <span className="prime-aurora-light prime-light-one" />
              <span className="prime-aurora-light prime-light-two" />
              <span className="prime-aurora-light prime-light-three" />
            </div>

            <div className="prime-intro-picture">
              <img
                className="prime-intro-gif"
                src={INTRO_GIF}
                alt="My Prime Era fitness and nutrition introduction"
              />
            </div>

            <div className="prime-intro-overlay" />

            <motion.button
              type="button"
              className="prime-skip-intro"
              onClick={() => setShowIntro(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Skip Intro
              <ArrowRight size={16} />
            </motion.button>

            <div className="prime-intro-bottom">
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                YOUR BODY. YOUR POWER. YOUR ERA.
              </motion.p>

              <div className="prime-intro-progress">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: INTRO_DURATION / 1000,
                    ease: "linear"
                  }}
                />
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="auth"
            className="prime-auth-panel"
            initial={{
              opacity: 0,
              y: 45,
              scale: 0.94,
              filter: "blur(12px)"
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)"
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.85,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <div className="prime-auth-symbol">
              <Sparkles size={34} strokeWidth={1.4} />
            </div>

            <div className="prime-auth-brand">
              MY PRIME ERA
            </div>

            <h1>
              {mode === "login"
                ? "Welcome Back"
                : "Begin Your Era"}
            </h1>

            <p className="prime-auth-subtitle">
              {mode === "login"
                ? "Your journey continues here."
                : "Your prime era starts here."}
            </p>

            <div className="prime-auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "selected" : ""}
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>

              <button
                type="button"
                className={mode === "signup" ? "selected" : ""}
                onClick={() => switchMode("signup")}
              >
                Sign Up
              </button>
            </div>

            <form
              className="prime-auth-form"
              onSubmit={handleSubmit}
            >
              {mode === "signup" && (
                <>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />

                  <select
                    value={gender}
                    onChange={e =>
                      setGender(e.target.value as Gender)
                    }
                    aria-label="Gender"
                  >
                    <option value="neutral">
                      Prefer not to say
                    </option>
                    <option value="female">
                      Female
                    </option>
                    <option value="male">
                      Male
                    </option>
                  </select>
                </>
              )}

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <input
                type="password"
                placeholder={
                  mode === "signup"
                    ? "Create password (min. 6 characters)"
                    : "Password"
                }
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                minLength={
                  mode === "signup" ? 6 : undefined
                }
                required
              />

              {error && (
                <p className="prime-auth-error" role="alert">
                  {error}
                </p>
              )}

              {message && (
                <p className="prime-auth-message" role="status">
                  {message}
                </p>
              )}

              <button
                className="prime-auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Enter My Prime Era"
                    : "Create My Account"}

                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <p className="prime-auth-footer">
              {mode === "login"
                ? "New to My Prime Era?"
                : "Already have an account?"}{" "}

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    mode === "login" ? "signup" : "login"
                  )
                }
              >
                {mode === "login"
                  ? "Sign Up"
                  : "Sign In"}
              </button>
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
