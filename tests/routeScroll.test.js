import assert from "node:assert/strict";
import test from "node:test";
import { getRouteScrollAction } from "../src/utils/routeScroll.js";

test("normal route navigation starts at the top", () => {
  assert.deepEqual(getRouteScrollAction({ navigationType: "PUSH", hash: "" }), {
    type: "top",
    position: { left: 0, top: 0 }
  });
  assert.equal(getRouteScrollAction({ navigationType: "REPLACE", hash: "" }).type, "top");
});

test("back and forward navigation restores a remembered position", () => {
  const savedPosition = { left: 0, top: 640 };
  assert.deepEqual(getRouteScrollAction({ navigationType: "POP", hash: "", savedPosition }), {
    type: "restore",
    position: savedPosition
  });
});

test("initial POP without a saved position preserves browser position", () => {
  assert.deepEqual(getRouteScrollAction({ navigationType: "POP", hash: "" }), { type: "preserve" });
});

test("intentional hash navigation takes precedence over route reset", () => {
  assert.deepEqual(getRouteScrollAction({ navigationType: "PUSH", hash: "#konum" }), {
    type: "anchor",
    hash: "#konum"
  });
});
