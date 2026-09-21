import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import useSystemStatus from "../hooks/useSystemStatus";
import OnboardingProvider from "../context/OnboardingProvider";
import OnboardingTour from "./OnboardingTour";
import "../styles/components/system-status.css";

const ICONS = { info: "ℹ️", warning: "⚠️", maintenance: "🛠️", payment: "💳", order: "📦" };

function SystemAnnouncement({ announcement }) {
  const fingerprint = useMemo(
    () => `${announcement.version || "legacy"}:${announcement.type}:${announcement.message}`,
    [announcement.message, announcement.type, announcement.version]
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!announcement.dismissible) {
      setDismissed(false);
      return;
    }
    try {
      setDismissed(window.sessionStorage.getItem("hediyealsat-dismissed-announcement") === fingerprint);
    } catch {
      setDismissed(false);
    }
  }, [announcement.dismissible, fingerprint]);

  if (!announcement.enabled || !announcement.message || dismissed) return null;

  function dismiss() {
    try { window.sessionStorage.setItem("hediyealsat-dismissed-announcement", fingerprint); } catch { /* fail silently */ }
    setDismissed(true);
  }

  return <aside className={`system-announcement system-announcement-${announcement.type}`} role="status" aria-live="polite">
    <span aria-hidden="true">{ICONS[announcement.type] || ICONS.info}</span>
    <p>{announcement.message}</p>
    {announcement.dismissible && <button type="button" onClick={dismiss} aria-label="Sistem duyurusunu kapat">×</button>}
  </aside>;
}

function MaintenanceScreen({ maintenance }) {
  return <main className="maintenance-screen" role="main">
    <section className="maintenance-card" aria-labelledby="maintenance-title">
      <div className="maintenance-brand"><span aria-hidden="true">🎁</span><strong>Hediye<span>AlSat</span></strong></div>
      <div className="maintenance-icon" aria-hidden="true">🛠️</div>
      <h1 id="maintenance-title">{maintenance.title}</h1>
      <p>{maintenance.message}</p>
      <small>Anlayışın için teşekkür ederiz. 💛</small>
    </section>
  </main>;
}

export default function SystemStatusLayer({ children }) {
  const { pathname } = useLocation();
  const { status, loading } = useSystemStatus();
  const managementRoute = pathname === "/login" || pathname.startsWith("/admin");

  if (!managementRoute && loading) {
    return <main className="system-status-loading" role="status" aria-live="polite">HediyeAlSat hazırlanıyor...</main>;
  }
  if (!managementRoute && status.maintenance.enabled) {
    return <MaintenanceScreen maintenance={status.maintenance} />;
  }
  return <OnboardingProvider>
    <SystemAnnouncement announcement={status.announcement} />
    {children}
    <OnboardingTour />
  </OnboardingProvider>;
}
