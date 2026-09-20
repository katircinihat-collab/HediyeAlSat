import { createContext } from "react";

export const DEFAULT_SYSTEM_STATUS = Object.freeze({
  announcement: { enabled: false, message: "", type: "info", dismissible: true, version: "" },
  maintenance: {
    enabled: false,
    title: "Kısa Bir Bakımdayız",
    message: "Sana daha iyi bir HediyeAlSat deneyimi hazırlıyoruz. Kısa süre sonra tekrar buradayız."
  }
});

export function normalizeSystemStatus(value = {}) {
  const announcement = value.announcement || {};
  const maintenance = value.maintenance || {};
  const updatedAt = value.updatedAt;
  const version = typeof announcement.version === "string" && announcement.version.trim()
    ? announcement.version.trim()
    : typeof updatedAt?.toMillis === "function"
      ? String(updatedAt.toMillis())
      : updatedAt?.seconds !== undefined
        ? `${updatedAt.seconds}:${updatedAt.nanoseconds || 0}`
        : "";
  return {
    announcement: {
      enabled: announcement.enabled === true,
      message: typeof announcement.message === "string" ? announcement.message.trim() : "",
      type: ["info", "warning", "maintenance", "payment", "order"].includes(announcement.type) ? announcement.type : "info",
      dismissible: announcement.dismissible !== false,
      version
    },
    maintenance: {
      enabled: maintenance.enabled === true,
      title: typeof maintenance.title === "string" && maintenance.title.trim() ? maintenance.title.trim() : DEFAULT_SYSTEM_STATUS.maintenance.title,
      message: typeof maintenance.message === "string" && maintenance.message.trim() ? maintenance.message.trim() : DEFAULT_SYSTEM_STATUS.maintenance.message
    }
  };
}

export const SystemStatusContext = createContext({ status: DEFAULT_SYSTEM_STATUS, loading: true, error: false });
