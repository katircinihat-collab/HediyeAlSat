import assert from "node:assert/strict";
import test from "node:test";
import { getAccountDisplayName, isPasswordAccount, validatePasswordChange } from "../src/utils/settings.js";

test("account name follows the existing private profile precedence", () => {
  assert.equal(getAccountDisplayName({ profile: { ad: "Profil Adı" }, userDocument: { displayName: "User Adı" }, authUser: { displayName: "Auth Adı" } }), "Profil Adı");
  assert.equal(getAccountDisplayName({ userDocument: { displayName: "User Adı" }, authUser: { displayName: "Auth Adı" } }), "User Adı");
  assert.equal(getAccountDisplayName({ authUser: { displayName: "Auth Adı" } }), "Auth Adı");
});

test("password change validation blocks incomplete, weak and mismatched submissions", () => {
  assert.match(validatePasswordChange({ currentPassword: "", newPassword: "abcdef", confirmation: "abcdef" }), /tüm şifre/);
  assert.match(validatePasswordChange({ currentPassword: "eski123", newPassword: "123", confirmation: "123" }), /en az 6/);
  assert.match(validatePasswordChange({ currentPassword: "eski123", newPassword: "yeni123", confirmation: "yeni456" }), /eşleşmiyor/);
  assert.match(validatePasswordChange({ currentPassword: "aynisi1", newPassword: "aynisi1", confirmation: "aynisi1" }), /farklı/);
  assert.equal(validatePasswordChange({ currentPassword: "eski123", newPassword: "yeni123", confirmation: "yeni123" }), "");
});

test("password form is shown only for Firebase password accounts", () => {
  assert.equal(isPasswordAccount({ providerData: [{ providerId: "password" }] }), true);
  assert.equal(isPasswordAccount({ providerData: [{ providerId: "google.com" }] }), false);
  assert.equal(isPasswordAccount(null), false);
});
