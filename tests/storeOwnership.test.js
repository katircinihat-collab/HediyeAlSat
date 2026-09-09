import test from "node:test";
import assert from "node:assert/strict";
import { selectOwnedStoreId } from "../src/utils/storeOwnership.js";

test("canonical sahipUid sorgusundaki mağazayı öncelikli seçer", () => {
  assert.equal(selectOwnedStoreId({ uidDocs: [{ id: "uid-store" }], emailDocs: [{ id: "legacy-store" }] }), "uid-store");
});

test("legacy email mağazasını geriye uyumlu olarak seçer", () => {
  assert.equal(selectOwnedStoreId({ emailDocs: [{ id: "legacy-store" }] }), "legacy-store");
});

test("email document-id kullanan legacy mağazayı tanır", () => {
  assert.equal(selectOwnedStoreId({ legacyDoc: { id: "mail-store", exists: () => true } }), "mail-store");
});

test("mağaza kaydı yoksa null döner", () => {
  assert.equal(selectOwnedStoreId(), null);
});
