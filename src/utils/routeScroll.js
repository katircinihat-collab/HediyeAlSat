export function getRouteScrollAction({ navigationType, hash, savedPosition }) {
  if (hash) return { type: "anchor", hash };
  if (navigationType === "POP") {
    return savedPosition ? { type: "restore", position: savedPosition } : { type: "preserve" };
  }
  return { type: "top", position: { left: 0, top: 0 } };
}
