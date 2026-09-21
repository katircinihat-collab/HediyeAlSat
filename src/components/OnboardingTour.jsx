import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { calculateTourPlacement, findVisibleTourTarget } from "../utils/onboarding";
import { useOnboarding } from "../context/onboardingContext";
import "../styles/components/onboarding-tour.css";

const TARGET_RETRY_MS = 100;
const TARGET_MAX_ATTEMPTS = 25;

export default function OnboardingTour() {
  const { tour, user, closeTour, goToStep } = useOnboarding();
  const bubbleRef = useRef(null);
  const [target, setTarget] = useState(null);
  const [layout, setLayout] = useState(null);
  const step = tour?.steps[tour.index];

  const advancePastMissingTarget = useCallback(() => {
    if (!tour) return;
    if (tour.index < tour.steps.length - 1) goToStep(tour.index + 1);
    else closeTour(true);
  }, [closeTour, goToStep, tour]);

  useEffect(() => {
    if (!step) { setTarget(null); return undefined; }
    let cancelled = false;
    let attempts = 0;
    let timer;
    const seek = () => {
      if (cancelled) return;
      const element = findVisibleTourTarget(step.target);
      if (element) {
        setTarget(element);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center", inline: "nearest" });
        return;
      }
      attempts += 1;
      if (attempts >= TARGET_MAX_ATTEMPTS) { advancePastMissingTarget(); return; }
      timer = window.setTimeout(seek, TARGET_RETRY_MS);
    };
    setTarget(null);
    setLayout(null);
    seek();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [advancePastMissingTarget, step]);

  const updateLayout = useCallback(() => {
    if (!target || !bubbleRef.current) return;
    const targetRect = target.getBoundingClientRect();
    if (targetRect.width <= 0 || targetRect.height <= 0) return;
    const bubbleRect = bubbleRef.current.getBoundingClientRect();
    const position = calculateTourPlacement(targetRect, { width: bubbleRect.width, height: bubbleRect.height }, { width: window.innerWidth, height: window.innerHeight });
    setLayout({ targetRect, ...position });
  }, [target]);

  useLayoutEffect(() => {
    if (!target) return undefined;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => { secondFrame = window.requestAnimationFrame(updateLayout); });
    const onViewportChange = () => window.requestAnimationFrame(updateLayout);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [target, updateLayout]);

  useEffect(() => {
    if (!tour) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeTour(false);
        return;
      }
      if (event.key !== "Tab" || !bubbleRef.current) return;
      const focusable = [...bubbleRef.current.querySelectorAll("button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")];
      if (focusable.length === 0) {
        event.preventDefault();
        bubbleRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeTour, tour]);

  useEffect(() => { if (layout) bubbleRef.current?.focus({ preventScroll: true }); }, [layout, tour?.index]);

  if (!tour || !step || !target) return null;
  const isFirst = tour.index === 0;
  const isLast = tour.index === tour.steps.length - 1;
  const body = step.target === "xp" ? (user ? step.authBody : step.guestBody) : step.body;

  return <div className="onboarding-layer" aria-live="polite">
    <div className="onboarding-dimmer" aria-hidden="true" />
    {layout && <div className="onboarding-highlight" aria-hidden="true" style={{ top: layout.targetRect.top - 6, left: layout.targetRect.left - 6, width: layout.targetRect.width + 12, height: layout.targetRect.height + 12 }} />}
    <section
      ref={bubbleRef}
      className={`onboarding-bubble onboarding-placement-${layout?.placement || "bottom"}`}
      style={layout ? { top: layout.top, left: layout.left } : { visibility: "hidden" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
      tabIndex={-1}
    >
      <button type="button" className="onboarding-close" onClick={() => closeTour(false)} aria-label="Tanıtımı kapat">×</button>
      <small className="onboarding-progress">{tour.index + 1} / {tour.steps.length}</small>
      <h2 id="onboarding-title">{step.title}</h2>
      <p id="onboarding-description">{body}</p>
      <div className="onboarding-actions">
        {!isFirst && <button type="button" className="onboarding-secondary" onClick={() => goToStep(tour.index - 1)}>Geri</button>}
        <button type="button" className="onboarding-skip" onClick={() => closeTour(false)}>Geç</button>
        <button type="button" className="onboarding-primary" onClick={() => isLast ? closeTour(true) : goToStep(tour.index + 1)}>
          {isLast ? (tour.id === "welcome" ? "Keşfetmeye Başla" : "Tamam") : "İleri"}
        </button>
      </div>
      <span className="onboarding-arrow" aria-hidden="true" />
    </section>
  </div>;
}
