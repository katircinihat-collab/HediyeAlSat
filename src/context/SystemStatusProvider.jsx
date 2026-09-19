import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_SYSTEM_STATUS, normalizeSystemStatus, SystemStatusContext } from "./systemStatus";

export default function SystemStatusProvider({ children }) {
  const [state, setState] = useState({ status: DEFAULT_SYSTEM_STATUS, loading: true, error: false });

  useEffect(() => {
    let active = true;
    const failOpenTimer = window.setTimeout(() => {
      if (active) setState((current) => current.loading ? { status: DEFAULT_SYSTEM_STATUS, loading: false, error: true } : current);
    }, 1500);

    const unsubscribe = onSnapshot(doc(db, "systemSettings", "public"), (snapshot) => {
      if (!active) return;
      window.clearTimeout(failOpenTimer);
      setState({ status: snapshot.exists() ? normalizeSystemStatus(snapshot.data()) : DEFAULT_SYSTEM_STATUS, loading: false, error: false });
    }, () => {
      if (!active) return;
      window.clearTimeout(failOpenTimer);
      setState({ status: DEFAULT_SYSTEM_STATUS, loading: false, error: true });
    });

    return () => {
      active = false;
      window.clearTimeout(failOpenTimer);
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <SystemStatusContext.Provider value={value}>{children}</SystemStatusContext.Provider>;
}
