import test from "node:test";
import assert from "node:assert/strict";
import { buildUserDocument, firebaseAuthErrorMessage, validateRegistration } from "../src/utils/auth.js";

test("users payload güvenli alanları taşır ve uid içermez", () => {
  const payload = buildUserDocument({ name: "  Hüseyin Kullanıcı  ", email: "huseyin@example.com", createdAt: "timestamp" });
  assert.deepEqual(payload, { ad: "Hüseyin Kullanıcı", displayName: "Hüseyin Kullanıcı", email: "huseyin@example.com", createdAt: "timestamp" });
  assert.equal("uid" in payload, false);
});

test("şifre tekrarı uyuşmazsa kayıt doğrulaması durur", () => {
  assert.equal(validateRegistration({ name: "Hüseyin", email: "h@example.com", password: "abcdef", passwordAgain: "abcdeg" }), "Şifreler birbiriyle eşleşmiyor.");
});

test("altı karakterden kısa şifre reddedilir", () => {
  assert.equal(validateRegistration({ name: "Hüseyin", email: "h@example.com", password: "12345", passwordAgain: "12345" }), "Şifreniz en az 6 karakter olmalıdır.");
});

test("Firebase auth hataları teknik detay sızdırmadan Türkçeleştirilir", () => {
  assert.equal(firebaseAuthErrorMessage({ code: "auth/email-already-in-use" }), "Bu e-posta adresi zaten kayıtlı.");
  assert.equal(firebaseAuthErrorMessage({ code: "auth/weak-password" }), "Şifreniz çok kısa veya zayıf.");
  assert.equal(firebaseAuthErrorMessage({ code: "auth/invalid-credential" }), "E-posta veya şifre hatalı.");
  assert.equal(firebaseAuthErrorMessage({ code: "auth/internal-error", message: "secret" }), "İşlem tamamlanamadı. Lütfen tekrar deneyin.");
});
