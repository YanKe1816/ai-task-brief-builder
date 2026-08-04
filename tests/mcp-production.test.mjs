import assert from "node:assert/strict";

const baseUrl = process.env.PRODUCTION_BASE_URL;
const expectedChallenge = process.env.OPENAI_APPS_CHALLENGE ?? "test";

if (!baseUrl) {
  throw new Error("PRODUCTION_BASE_URL is required for production MCP regression.");
}

const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
const sourceText =
  "Goal: Build a workspace notification settings page for administrators. In scope: Display current email and in-app notification preferences and allow valid changes to be saved. Out of scope: Billing settings and user invitations. Constraints: Use the existing design system. Acceptance criteria: Administrators can view current preferences and save valid changes. Testing requirements: Cover initial loading, valid save, invalid input, and service failure. Delivery requirements: Report changed files and local test results.";

async function getText(path) {
  const response = await fetch(`${normalizedBaseUrl}${path}`);
  assert.equal(response.status, 200, `${path} should return 200`);
  return { response, text: await response.text() };
}

async function callMcp(body) {
  const response = await fetch(`${normalizedBaseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type")?.includes("application/json"), true);
  return response.json();
}

let passed = 0;

for (const path of ["/", "/privacy", "/terms", "/support"]) {
  const { text } = await getText(path);
  assert.ok(text.includes("AI Task Brief Builder"));
  assert.ok(text.includes('href="/">Home</a>'));
  assert.ok(text.includes('href="/privacy">Privacy</a>'));
  assert.ok(text.includes('href="/terms">Terms</a>'));
  assert.ok(text.includes('href="/support">Support</a>'));
  assert.ok(text.includes("sidcraigau@gmail.com"));
  assert.ok(!/placeholder|TODO|lorem ipsum/i.test(text));
  passed += 1;
}

const health = await fetch(`${normalizedBaseUrl}/health`);
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: "ok", name: "ai-task-brief-builder", version: "1.0.0" });
passed += 1;

const challenge = await fetch(`${normalizedBaseUrl}/.well-known/openai-apps-challenge`);
assert.equal(challenge.status, 200);
assert.equal(challenge.headers.get("content-type")?.includes("text/plain"), true);
assert.equal(await challenge.text(), expectedChallenge);
passed += 1;

const initialized = await callMcp({ jsonrpc: "2.0", id: "init", method: "initialize", params: {} });
assert.equal(initialized.result.serverInfo.name, "ai-task-brief-builder");
assert.equal(initialized.result.serverInfo.version, "1.0.0");
passed += 1;

const listed = await callMcp({ jsonrpc: "2.0", id: "tools", method: "tools/list", params: {} });
assert.deepEqual(
  listed.result.tools.map((tool) => tool.name),
  ["extract_task_goal", "build_test_requirements", "generate_task_brief"]
);
for (const tool of listed.result.tools) {
  assert.deepEqual(tool.annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: true
  });
  assert.ok(tool.inputSchema.description);
  assert.ok(tool.outputSchema.description);
}
passed += 1;

const called = await callMcp({
  jsonrpc: "2.0",
  id: "call",
  method: "tools/call",
  params: {
    name: "generate_task_brief",
    arguments: { source_text: sourceText }
  }
});
assert.equal(called.result.isError, false);
assert.equal(called.result.structuredContent.status, "success");
assert.ok(called.result.structuredContent.deliverable.task_goal.length > 0);
assert.ok(called.result.structuredContent.deliverable.test_requirements.includes("initial loading"));
passed += 1;

const errorCase = await callMcp({
  jsonrpc: "2.0",
  id: "error",
  method: "tools/call",
  params: {
    name: "generate_task_brief",
    arguments: {
      source_text:
        "Open my repository, implement the requested changes, run the tests, deploy the application, and report that the work is complete."
    }
  }
});
assert.equal(errorCase.result.isError, true);
assert.equal(errorCase.result.structuredContent.errors[0].code, "out_of_scope");
passed += 1;

console.log(`Production MCP regression passed: ${passed}/${passed} (${normalizedBaseUrl})`);
