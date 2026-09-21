import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { A4_INTRO_STEP, ONBOARDING_STORAGE_KEYS, safeReadOnboarding, safeWriteOnboarding, WELCOME_TOUR_STEPS } from "../utils/onboarding";
import { OnboardingContext } from "./onboardingContext";

export default function OnboardingProvider({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const [tour, setTour] = useState(null);
  const attemptedRef = useRef(new Set());
  const runIdRef = useRef(0);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const startWelcomeTour = useCallback((manual = true) => {
    if (pathname !== "/") navigate("/");
    runIdRef.current += 1;
    setTour({ id: "welcome", steps: WELCOME_TOUR_STEPS, index: 0, manual, runId: runIdRef.current });
  }, [navigate, pathname]);

  const closeTour = useCallback((completed = false) => {
    setTour((current) => {
      if (current && !current.manual && (completed || current.id === "welcome" || current.id === "a4")) {
        safeWriteOnboarding(window.localStorage, ONBOARDING_STORAGE_KEYS[current.id]);
      }
      return null;
    });
  }, []);

  const goToStep = useCallback((index) => setTour((current) => current ? { ...current, index } : current), []);

  useEffect(() => {
    if (tour) return;
    const candidate = pathname === "/"
      ? { id: "welcome", steps: WELCOME_TOUR_STEPS }
      : pathname === "/a4-tasarimlar" ? { id: "a4", steps: [A4_INTRO_STEP] } : null;
    if (!candidate || attemptedRef.current.has(candidate.id)) return;
    attemptedRef.current.add(candidate.id);
    if (safeReadOnboarding(window.localStorage, ONBOARDING_STORAGE_KEYS[candidate.id])) return;
    runIdRef.current += 1;
    setTour({ ...candidate, index: 0, manual: false, runId: runIdRef.current });
  }, [pathname, tour]);

  const value = useMemo(() => ({ tour, user, startWelcomeTour, closeTour, goToStep }), [closeTour, goToStep, startWelcomeTour, tour, user]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
