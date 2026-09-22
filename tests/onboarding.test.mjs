import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  A4_INTRO_STEP,
  calculateTourPlacement,
  ONBOARDING_STORAGE_KEYS,
  safeReadOnboarding,
  safeWriteOnboarding,
  WELCOME_TOUR_STEPS
} from "../src/utils/onboarding.js";

const read = (file) => fs.readFileSync(file, "utf8");

test("welcome turu yalnız istenen dört gerçek özelliği içerir", () => {
  assert.deepEqual(WELCOME_TOUR_STEPS.map((step) => step.target), ["create-listing", "open-store", "gift-battle", "xp"]);
  assert.equal(WELCOME_TOUR_STEPS.some((step) => /kura|a4/i.test(step.target)), false);
  assert.match(WELCOME_TOUR_STEPS[3].guestBody, /\+25 XP/);
  assert.doesNotMatch(WELCOME_TOUR_STEPS[3].authBody, /üye ol/i);
  assert.equal(WELCOME_TOUR_STEPS[3].prepare, "page-top");
});

test("A4 tanıtımı welcome turundan bağımsız ve sürümlüdür", () => {
  assert.equal(A4_INTRO_STEP.target, "a4");
  assert.notEqual(ONBOARDING_STORAGE_KEYS.welcome, ONBOARDING_STORAGE_KEYS.a4);
  assert.match(ONBOARDING_STORAGE_KEYS.welcome, /welcome_intro_v1/);
  assert.match(ONBOARDING_STORAGE_KEYS.a4, /a4_intro_v1/);
});

test("tamamlama ve geçme durumu güvenli storage ile hatırlanabilir", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  assert.equal(safeReadOnboarding(storage, ONBOARDING_STORAGE_KEYS.welcome), false);
  assert.equal(safeWriteOnboarding(storage, ONBOARDING_STORAGE_KEYS.welcome), true);
  assert.equal(safeReadOnboarding(storage, ONBOARDING_STORAGE_KEYS.welcome), true);
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(safeReadOnboarding(broken, ONBOARDING_STORAGE_KEYS.welcome), false);
  assert.equal(safeWriteOnboarding(broken, ONBOARDING_STORAGE_KEYS.welcome), false);
});

test("mobil konumlandırma balonu viewport içinde tutar", () => {
  const result = calculateTourPlacement(
    { top: 700, bottom: 744, left: 300, right: 356, width: 56, height: 44 },
    { width: 336, height: 230 },
    { width: 360, height: 760 }
  );
  assert.ok(result.left >= 12);
  assert.ok(result.left + 336 <= 348);
  assert.ok(result.top >= 12);
  assert.ok(result.top + 230 <= 748);
});

test("provider otomatik tekrar, manuel replay ve route duplicate davranışını yönetir", () => {
  const provider = read("src/context/OnboardingProvider.jsx");
  const footer = read("src/components/Footer.jsx");
  assert.match(provider, /safeReadOnboarding\(window\.localStorage/);
  assert.match(provider, /attemptedRef\.current\.has/);
  assert.match(provider, /!current\.manual/);
  assert.match(provider, /pathname === "\/a4-tasarimlar"/);
  assert.match(footer, /to="\/hediyealsati-tani"/);
  assert.match(read("src/pages/MeetHediyeAlSat.jsx"), /startWelcomeTour\(true\)/);
  assert.match(footer, /HediyeAlSat’ı Tanı/);
});

test("manuel replay eski adım durumunu taşımadan her zaman 1/4 başlatır", () => {
  const provider = read("src/context/OnboardingProvider.jsx");
  assert.match(provider, /runIdRef\.current \+= 1/);
  assert.match(provider, /index: 0, manual, runId: runIdRef\.current/);
});

test("3/4 sonrası navbar hazırlanır ve guest/auth XP hedefi çözülür", () => {
  const tour = read("src/components/OnboardingTour.jsx");
  const navbar = read("src/components/Navbar.jsx");
  assert.match(tour, /step\.prepare === "page-top"/);
  assert.match(tour, /window\.scrollTo\(\{ top: 0/);
  assert.match(tour, /tour\?\.runId/);
  assert.ok((navbar.match(/data-tour="xp"/g) || []).length >= 3);
});

test("target eksikliği sınırlı retry ile fail-open olur", () => {
  const tour = read("src/components/OnboardingTour.jsx");
  assert.match(tour, /TARGET_MAX_ATTEMPTS = 25/);
  assert.match(tour, /advancePastMissingTarget/);
  assert.match(tour, /window\.clearTimeout/);
  assert.doesNotMatch(tour, /while\s*\(/);
});

test("targetlar metin yerine stabil data attribute kullanır", () => {
  assert.match(read("src/components/Navbar.jsx"), /data-tour="create-listing"/);
  assert.match(read("src/components/Footer.jsx"), /to="\/ilan-ver" data-tour="create-listing"/);
  assert.match(read("src/components/Footer.jsx"), /data-tour="open-store"/);
  assert.match(read("src/components/GiftBattle.jsx"), /data-tour="gift-battle"/);
  assert.match(read("src/components/Navbar.jsx"), /data-tour="xp"/);
  assert.match(read("src/pages/SpecialListingsPage.jsx"), /data-tour="a4"/);
});

test("erişilebilir dialog, ESC, scroll, resize ve reduced-motion desteklenir", () => {
  const tour = read("src/components/OnboardingTour.jsx");
  const css = read("src/styles/components/onboarding-tour.css");
  assert.match(tour, /role="dialog"/);
  assert.match(tour, /aria-modal="true"/);
  assert.match(tour, /event\.key === "Escape"/);
  assert.match(tour, /event\.key !== "Tab"/);
  assert.match(tour, /scrollIntoView/);
  assert.match(tour, /addEventListener\("resize"/);
  assert.match(tour, /removeEventListener\("resize"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /z-index:\s*10020/);
});

test("bakım modu onboarding providerından önce fail-closed gate uygular, duyuru korunur", () => {
  const layer = read("src/components/SystemStatusLayer.jsx");
  const maintenanceIndex = layer.indexOf("status.maintenance.enabled");
  const providerIndex = layer.indexOf("<OnboardingProvider>");
  assert.ok(maintenanceIndex > -1 && providerIndex > maintenanceIndex);
  assert.match(layer, /<SystemAnnouncement announcement=\{status\.announcement\}/);
  assert.match(layer, /<OnboardingTour \/>/);
});

test("onboarding production özelliğidir ve dev preview veya sahte veri içermez", () => {
  const files = [
    read("src/components/OnboardingTour.jsx"),
    read("src/context/OnboardingProvider.jsx"),
    read("src/utils/onboarding.js")
  ].join("\n");
  assert.doesNotMatch(files, /import\.meta\.env\.DEV|localhost|127\.0\.0\.1/);
  assert.doesNotMatch(files, /Ahmet K\.|Ayşe T\.|Mehmet D\.|fake user|debug preview/i);
});
