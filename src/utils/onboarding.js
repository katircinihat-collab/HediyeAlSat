export const ONBOARDING_STORAGE_KEYS = Object.freeze({
  welcome: "hediyealsat:onboarding:welcome_intro_v1",
  a4: "hediyealsat:onboarding:a4_intro_v1"
});

export const WELCOME_TOUR_STEPS = Object.freeze([
  { target: "create-listing", title: "📦 Ürününü Sat", body: "Satmak istediğin ürünü birkaç adımda ilana ekleyebilirsin." },
  { target: "open-store", title: "🏪 Mağazanı Aç", body: "Ücretsiz mağazanı oluştur, ürünlerini tek yerde sergile." },
  { target: "gift-battle", title: "⚔️ Kararsızsan Kapıştır", body: "İki ürünü kapıştır, topluluğun oyları karar vermene yardım etsin." },
  {
    target: "xp",
    prepare: "page-top",
    title: "⭐ XP Kazan, Seviye Atla",
    guestBody: "Üye olduğunda +25 XP ile başla. Katıldıkça XP kazan ve seviyeni yükselt.",
    authBody: "Etkinliklere katıldıkça XP kazanabilir ve seviyeni yükseltebilirsin."
  }
]);

export const A4_INTRO_STEP = Object.freeze({
  target: "a4",
  title: "🎨 Kendi Tasarımını Oluştur",
  body: "A4 tasarımını hazırla, topluluğa sun ve tasarımları keşfet."
});

export function safeReadOnboarding(storage, key) {
  try { return storage?.getItem(key) === "done"; } catch { return false; }
}

export function safeWriteOnboarding(storage, key) {
  try { storage?.setItem(key, "done"); return true; } catch { return false; }
}

export function findVisibleTourTarget(name, root = document) {
  const candidates = root.querySelectorAll(`[data-tour="${name}"]`);
  return [...candidates].find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }) || null;
}

export function calculateTourPlacement(targetRect, bubbleSize, viewport, margin = 12, gap = 14) {
  const maxLeft = Math.max(margin, viewport.width - bubbleSize.width - margin);
  const maxTop = Math.max(margin, viewport.height - bubbleSize.height - margin);
  const centeredLeft = targetRect.left + (targetRect.width - bubbleSize.width) / 2;
  const centeredTop = targetRect.top + (targetRect.height - bubbleSize.height) / 2;
  const fitsBelow = targetRect.bottom + gap + bubbleSize.height <= viewport.height - margin;
  const fitsAbove = targetRect.top - gap - bubbleSize.height >= margin;
  const fitsRight = targetRect.right + gap + bubbleSize.width <= viewport.width - margin;
  const fitsLeft = targetRect.left - gap - bubbleSize.width >= margin;
  let placement = "bottom";
  let top = targetRect.bottom + gap;
  let left = centeredLeft;
  if (fitsBelow) {
    placement = "bottom";
  } else if (fitsAbove) {
    placement = "top";
    top = targetRect.top - bubbleSize.height - gap;
  } else if (fitsRight) {
    placement = "right";
    top = centeredTop;
    left = targetRect.right + gap;
  } else if (fitsLeft) {
    placement = "left";
    top = centeredTop;
    left = targetRect.left - bubbleSize.width - gap;
  } else {
    top = Math.min(maxTop, Math.max(margin, targetRect.bottom + gap));
  }
  return { placement, top: Math.min(maxTop, Math.max(margin, top)), left: Math.min(maxLeft, Math.max(margin, left)) };
}
