import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../config/api";
import {
  IMPRESSION_DWELL_MS,
  IMPRESSION_VISIBILITY_RATIO,
  impressionSessionKey
} from "../utils/impressions";

export default function useListingImpression(listingId, initialCount = 0) {
  const elementRef = useRef(null);
  const timerRef = useRef(null);
  const [count, setCount] = useState(Math.max(0, Number(initialCount) || 0));

  useEffect(() => {
    setCount(Math.max(0, Number(initialCount) || 0));
  }, [initialCount, listingId]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !listingId || typeof IntersectionObserver === "undefined") return undefined;
    const key = impressionSessionKey(listingId);

    let alreadyRecorded = false;
    try { alreadyRecorded = sessionStorage.getItem(key) !== null; } catch { /* storage unavailable */ }
    if (alreadyRecorded) return undefined;

    const clearTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < IMPRESSION_VISIBILITY_RATIO) {
        clearTimer();
        return;
      }
      if (timerRef.current) return;

      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        try {
          if (sessionStorage.getItem(key) !== null) return;
          sessionStorage.setItem(key, "pending");
          observer.disconnect();
          const response = await fetch(apiUrl(`/api/listings/${encodeURIComponent(listingId)}/impression`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}"
          });
          if (!response.ok) throw new Error("IMPRESSION_FAILED");
          const data = await response.json();
          sessionStorage.setItem(key, "recorded");
          setCount(Math.max(0, Number(data.impressionCount) || 0));
        } catch {
          try { sessionStorage.removeItem(key); } catch { /* storage unavailable */ }
        }
      }, IMPRESSION_DWELL_MS);
    }, { threshold: [IMPRESSION_VISIBILITY_RATIO] });

    observer.observe(element);
    return () => { clearTimer(); observer.disconnect(); };
  }, [listingId]);

  return { impressionRef: elementRef, impressionCount: count };
}
