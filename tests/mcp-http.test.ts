import assert from "node:assert/strict";
import worker, { outputSchemaForTool, tools } from "../src/index";
import { assertMatchesSchema } from "./schema";

const baseUrl = "https://ai-task-brief-builder.local";
const sourceText =
  "Build a settings page that lets admins update workspace notification preferences. In scope is the settings page UI and the save workflow. Out of scope is billing changes. Constraints: use the existing design system and do not add external APIs. Acceptance criteria: admins can view current preferences and save valid changes. Test requirements: verify loading, valid save, invalid input, and error handling. Delivery requirements: provide changed files and local test results.";

async function fetchWorker(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`${baseUrl}${path}`, init), { OPENAI_APPS_CHALLENGE: "test" });
}

async function callMcp(body: unknown): Promise<Record<string, unknown>> {
  const response = await fetchWorker("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
  assert.equal(response.headers.get("content-type")?.includes("application/json"), true);
  return (await response.json()) as Record<string, unknown>;
}

let passed = 0;

const home = await fetchWorker("/");
assert.equal(home.status, 200);
const homeText = await home.text();
assert.ok(homeText.includes("AI Task Brief Builder"));
assert.ok(homeText.includes("POST /mcp"));
assert.ok(homeText.includes("sidcraigau@gmail.com"));
assert.ok(!/placeholder|TODO|lorem ipsum/i.test(homeText));
passed += 1;

for (const path of ["/privacy", "/terms", "/support"]) {
  const page = await fetchWorker(path);
  assert.equal(page.status, 200);
  const text = await page.text();
  assert.ok(text.includes("AI Task Brief Builder"));
  assert.ok(text.includes('href="/">Home</a>'));
  assert.ok(text.includes('href="/privacy">Privacy</a>'));
  assert.ok(text.includes('href="/terms">Terms</a>'));
  assert.ok(text.includes('href="/support">Support</a>'));
  assert.ok(text.includes("sidcraigau@gmail.com"));
  assert.ok(!/placeholder|TODO|lorem ipsum/i.test(text));
  if (path === "/support") {
    assert.ok(text.includes('<a href="mailto:sidcraigau@gmail.com">sidcraigau@gmail.com</a>'));
  }
  passed += 1;
}

const health = await fetchWorker("/health");
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: "ok", name: "ai-task-brief-builder", version: "1.0.0" });
passed += 1;

const challenge = await fetchWorker("/.well-known/openai-apps-challenge");
assert.equal(challenge.status, 200);
assert.equal(challenge.headers.get("content-type")?.includes("text/plain"), true);
assert.equal(await challenge.text(), "test");
passed += 1;

const initialized = await callMcp({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
assert.equal(initialized.jsonrpc, "2.0");
assert.equal(initialized.id, 1);
assert.deepEqual((initialized.result as Record<string, unknown>).serverInfo, { name: "ai-task-brief-builder", version: "1.0.0" });
passed += 1;

const listed = await callMcp({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
const listedTools = (listed.result as { tools: typeof tools }).tools;
assert.equal(listedTools.length, 3);
assert.deepEqual(
  listedTools.map((tool) => tool.name),
  ["extract_task_goal", "build_test_requirements", "generate_task_brief"]
);
for (const tool of listedTools) {
  assert.deepEqual(tool.annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: true
  });
  assert.ok(tool.inputSchema);
  assert.ok(tool.outputSchema);
}
passed += 1;

for (const toolName of ["extract_task_goal", "build_test_requirements", "generate_task_brief"] as const) {
  const called = await callMcp({
    jsonrpc: "2.0",
    id: toolName,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: { source_text: sourceText }
    }
  });
  const result = called.result as { structuredContent: unknown; isError: boolean };
  assert.equal(result.isError, false);
  assertMatchesSchema(result.structuredContent, outputSchemaForTool(toolName));
  passed += 1;
}

const unknownTool = await callMcp({
  jsonrpc: "2.0",
  id: 7,
  method: "tools/call",
  params: {
    name: "extract_scope_constraints",
    arguments: { source_text: sourceText }
  }
});
assert.equal((unknownTool.error as Record<string, unknown>).message, "Unknown tool");
passed += 1;

const malformed = await callMcp("{ this is not json");
assert.equal(malformed.jsonrpc, "2.0");
assert.equal((malformed.error as Record<string, unknown>).code, -32700);
passed += 1;

console.log(`MCP HTTP tests passed: ${passed}/${passed}`);
