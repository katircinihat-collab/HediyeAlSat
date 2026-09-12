const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const workflow = fs.readFileSync(".github/workflows/hourly-maintenance.yml", "utf8");
const middleware = fs.readFileSync("backend/middleware/maintenanceAuth.js", "utf8");

test("external scheduler bakım endpointini saatte bir POST ile çağırır", () => {
  assert.match(workflow, /cron: "17 \* \* \* \*"/);
  assert.match(workflow, /--request POST/);
  assert.match(workflow, /\/api\/internal\/maintenance/);
});

test("scheduler secret query string yerine Authorization Bearer header kullanır", () => {
  assert.match(workflow, /secrets\.MAINTENANCE_CRON_SECRET/);
  assert.match(workflow, /Authorization: Bearer \$MAINTENANCE_TOKEN/);
  assert.doesNotMatch(workflow, /\?[^\n]*(secret|token)/i);
  assert.match(middleware, /req\.headers\.authorization/);
  assert.match(middleware, /MAINTENANCE_UNAUTHORIZED/);
});

test("scheduler eşzamanlı aynı workflow çalışmasını sıraya alır", () => {
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /cancel-in-progress: false/);
});
