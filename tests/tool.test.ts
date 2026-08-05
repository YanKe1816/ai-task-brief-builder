import assert from "node:assert/strict";
import {
  buildTestRequirements,
  buildTestRequirementsOutputSchema,
  extractTaskGoal,
  extractTaskGoalOutputSchema,
  generateTaskBrief,
  generateTaskBriefOutputSchema,
  tools
} from "../src/index";
import { assertMatchesSchema } from "./schema";

type ToolCase = {
  title: string;
  args: Record<string, unknown>;
  expectedStatus: "success" | "partial" | "error";
  expectedCode?: string;
};

const fullSource =
  "Build a settings page that lets admins update workspace notification preferences. In scope is the settings page UI and the save workflow. Out of scope is billing and user invitation changes. Constraints: use the existing design system and do not add external APIs. Acceptance criteria: admins can view current preferences and save valid changes with an observable success state. Test requirements: verify loading, valid save, invalid input, and error handling. Delivery requirements: provide changed files and local test results.";

const partialSource = "Build a settings page for admins. Acceptance criteria: the page is visible.";
const sparseSource = "Make it better.";
const speculativeSource =
  "Maybe the app should add a dashboard because the database is probably slow, but this is only a guess.";
const allowedOutOfScopeMaterial =
  "Build a settings page for admins. Deployment is out of scope. Do not deploy or publish this application.";
const forbiddenOutOfScopeRequest =
  "Open my repository, implement the requested changes, run the tests, deploy the application, and report that the work is complete.";

const confirmedItems = [
  {
    item_id: "CI1",
    text: "Verify audit log export",
    status: "confirmed",
    evidence_ids: ["E-confirmed"]
  },
  {
    item_id: "CI2",
    text: "Maybe verify billing export",
    status: "unconfirmed",
    evidence_ids: ["E-unconfirmed"]
  }
];

const gate25Case1 =
  "Extract the confirmed development goal from the following material and keep unrelated details out of the goal:\n\nWe need to build a workspace settings page where administrators can view and update notification preferences. Billing changes are out of scope. Use the existing design system. Testing should cover loading, saving, and error handling.\n\nUse only explicitly supplied evidence. Response only in English.";

const gate25Case2 =
  "Identify the confirmed task goal from these planning notes:\n\nThe confirmed requirement is to add CSV export to the invoice history page. A PDF export may be considered later, but it has not been approved. The export should include invoice number, date, currency, and total amount.\n\nDo not treat suggestions or possible future work as confirmed facts. Response only in English.";

const gate25Case3 =
  "Build evidence-based test requirements from the following development material:\n\nCreate a profile form that loads the user's current name and timezone. A valid update should save successfully and display a visible confirmation. An empty name must be rejected. If the save request fails, the existing values must remain visible and an error message must be shown.\n\nUse only the supplied requirements and make each test case independently verifiable. Response only in English.";

const gate25Case4 =
  "Create test requirements from these notes:\n\nThe feature adds audit log export in CSV format. Confirmed tests must cover an export with records, an export with no records, and preservation of timestamps. Testing a billing export was suggested during discussion, but it is not confirmed and billing is outside this feature.\n\nKeep unconfirmed suggestions separate from confirmed test requirements. Response only in English.";

const gate25Case5 =
  "Turn the following development material into an evidence-based implementation brief:\n\nGoal: Build a workspace notification settings page for administrators.\n\nIn scope: Display current email and in-app notification preferences and allow valid changes to be saved.\n\nOut of scope: Billing settings, user invitations, and new notification channels.\n\nConstraints: Use the existing design system and existing authentication flow. Do not add external APIs.\n\nAcceptance criteria: Administrators can view current preferences, save valid changes, see a visible success state, and receive clear validation or service-error messages.\n\nTesting requirements: Cover initial loading, valid save, invalid input, and service failure.\n\nDelivery requirements: Report the changed files and completed local test results.\n\nDo not invent missing requirements. Response only in English.";

const gate25Case6 =
  "Open my repository, implement the requested changes, run the tests, deploy the application, and report that the work is complete. Response only in English.";

const gate25Case7 =
  "Create an implementation brief from the notes below, then open my repository, implement the feature, run the tests, and deploy it.\n\nNotes:\nBuild an account preferences page where users can change their language and timezone. Use the existing design system. Password and billing changes are out of scope. Test loading, valid save, invalid input, and service errors.\n\nResponse only in English.";

const fullImplementationBriefSingularDelivery =
  "Goal: Build a workspace notification settings page for administrators.\n\nIn scope: Display current email and in-app notification preferences and allow valid changes to be saved.\n\nOut of scope: Billing settings, user invitations, and new notification channels.\n\nConstraints: Use the existing design system and existing authentication flow. Do not add external APIs.\n\nAcceptance criteria: Administrators can view current preferences, save valid changes, see a visible success state, and receive clear validation or service-error messages.\n\nTesting requirements: Cover initial loading, valid save, invalid input, and service failure.\n\nDelivery requirement: Report the changed files and completed local test results.";

const fullImplementationBriefPluralDelivery =
  "Goal: Build a workspace notification settings page for administrators.\n\nIn scope: Display current email and in-app notification preferences and allow valid changes to be saved.\n\nOut of scope: Billing settings, user invitations, and new notification channels.\n\nConstraints: Use the existing design system and existing authentication flow. Do not add external APIs.\n\nAcceptance criteria: Administrators can view current preferences, save valid changes, see a visible success state, and receive clear validation or service-error messages.\n\nTesting requirements: Cover initial loading, valid save, invalid input, and service failure.\n\nDelivery requirements: Report the changed files and completed local test results.";

const goalOnlyBrief = "Goal: Build a workspace notification settings page for administrators.";

const briefWithUnapprovedSuggestion =
  "Goal: Build audit log export in CSV format. Testing requirements: Cover export with records and export with no records. A billing export was suggested during discussion, but it is not confirmed and has not been approved.";

function expectCode(output: { errors: Array<{ code: string }> }, code: string): void {
  assert.ok(output.errors.some((error) => error.code === code), `expected error code ${code}`);
}

function assertEvidenceLinks(output: { evidence: Array<{ evidence_id: string }>; [key: string]: unknown }): void {
  const evidenceIds = new Set(output.evidence.map((item) => item.evidence_id));
  const collected = collectEvidenceIds(output);
  if (collected.length === 0) {
    assert.ok(
      output.evidence.some((item) => {
        const supports = (item as { supports?: unknown }).supports;
        return Array.isArray(supports) && supports.length > 0;
      }),
      "positive business output should include evidence supports"
    );
    return;
  }
  for (const id of collected) {
    assert.ok(evidenceIds.has(id), `evidence id ${id} should exist in evidence array`);
  }
}

function collectEvidenceIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectEvidenceIds);
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  const objectValue = value as Record<string, unknown>;
  const ownIds = Array.isArray(objectValue.evidence_ids) ? objectValue.evidence_ids.filter((id): id is string => typeof id === "string") : [];
  return [
    ...ownIds,
    ...Object.entries(objectValue)
      .filter(([key]) => key !== "evidence" && key !== "included_items")
      .flatMap(([, child]) => collectEvidenceIds(child))
  ];
}

const commonCases: ToolCase[] = [
  { title: "missing source_text", args: {}, expectedStatus: "error", expectedCode: "missing_required_input" },
  { title: "source_text type error", args: { source_text: 12 }, expectedStatus: "error", expectedCode: "invalid_input_type" },
  { title: "empty string", args: { source_text: "" }, expectedStatus: "error", expectedCode: "empty_input" },
  { title: "whitespace only", args: { source_text: "   \n\t" }, expectedStatus: "error", expectedCode: "empty_input" },
  { title: "insufficient evidence", args: { source_text: sparseSource }, expectedStatus: "partial", expectedCode: "insufficient_evidence" },
  { title: "forbidden external execution", args: { source_text: forbiddenOutOfScopeRequest }, expectedStatus: "error", expectedCode: "out_of_scope" }
];

let passed = 0;

for (const testCase of [
  { title: "complete positive input", args: { source_text: fullSource }, expectedStatus: "success" },
  { title: "partial information input", args: { source_text: partialSource }, expectedStatus: "partial" },
  ...commonCases
] satisfies ToolCase[]) {
  const output = extractTaskGoal(testCase.args);
  assert.equal(output.status, testCase.expectedStatus, `extract_task_goal: ${testCase.title}`);
  assertMatchesSchema(output, extractTaskGoalOutputSchema);
  if (testCase.expectedCode) {
    expectCode(output, testCase.expectedCode);
  }
  passed += 1;
}

const goalOutput = extractTaskGoal({ source_text: fullSource });
assert.deepEqual(goalOutput.task_goal_items.map((item) => item.goal_text), [
  "Build a settings page that lets admins update workspace notification preferences."
]);
assert.ok(!JSON.stringify(goalOutput.task_goal_items).includes("billing"), "billing exclusion must not be a task goal");
assert.ok(!JSON.stringify(goalOutput.task_goal_items).includes("verify loading"), "test requirements must not be task goals");
assert.ok(!JSON.stringify(goalOutput.task_goal_items).includes("provide changed files"), "delivery requirements must not be task goals");
assertEvidenceLinks(goalOutput);
passed += 1;

for (const testCase of [
  { title: "complete positive input", args: { source_text: fullSource, confirmed_items: confirmedItems }, expectedStatus: "success" },
  { title: "partial information input", args: { source_text: partialSource }, expectedStatus: "partial" },
  ...commonCases
] satisfies ToolCase[]) {
  const output = buildTestRequirements(testCase.args);
  assert.equal(output.status, testCase.expectedStatus, `build_test_requirements: ${testCase.title}`);
  assertMatchesSchema(output, buildTestRequirementsOutputSchema);
  if (testCase.expectedCode) {
    expectCode(output, testCase.expectedCode);
  }
  passed += 1;
}

const testOutput = buildTestRequirements({ source_text: fullSource, confirmed_items: confirmedItems });
const testTitles = testOutput.deliverable.test_cases.map((item) => item.title.toLowerCase());
for (const expected of ["loading", "valid save", "invalid input", "error handling"]) {
  assert.ok(testTitles.some((title) => title.includes(expected)), `expected test case for ${expected}`);
}
assert.ok(!testTitles.every((title) => title.includes("validate explicitly supplied requirement behavior")), "must not use one generic placeholder case");
assert.ok(testTitles.some((title) => title.includes("audit log export")), "confirmed item should affect test generation");
assert.ok(!JSON.stringify(testOutput.deliverable.test_cases).includes("billing export"), "unconfirmed item must not be promoted");
assertEvidenceLinks(testOutput);
passed += 1;

for (const testCase of [
  { title: "complete positive input", args: { source_text: fullSource, confirmed_items: confirmedItems }, expectedStatus: "success" },
  { title: "partial information input", args: { source_text: partialSource }, expectedStatus: "partial" },
  ...commonCases
] satisfies ToolCase[]) {
  const output = generateTaskBrief(testCase.args);
  assert.equal(output.status, testCase.expectedStatus, `generate_task_brief: ${testCase.title}`);
  assertMatchesSchema(output, generateTaskBriefOutputSchema);
  if (testCase.expectedCode) {
    expectCode(output, testCase.expectedCode);
  }
  passed += 1;
}

const briefOutput = generateTaskBrief({ source_text: fullSource, confirmed_items: confirmedItems });
assert.deepEqual(briefOutput.deliverable.task_goal, ["Build a settings page that lets admins update workspace notification preferences."]);
assert.deepEqual(briefOutput.deliverable.in_scope, ["the settings page UI and the save workflow."]);
assert.deepEqual(briefOutput.deliverable.out_of_scope, ["billing and user invitation changes."]);
assert.deepEqual(briefOutput.deliverable.constraints, ["use the existing design system and do not add external APIs."]);
assert.deepEqual(briefOutput.deliverable.acceptance_criteria, ["admins can view current preferences and save valid changes with an observable success state."]);
assert.deepEqual(briefOutput.deliverable.delivery_requirements, ["provide changed files and local test results."]);
for (const expected of ["loading", "valid save", "invalid input", "error handling"]) {
  assert.ok(briefOutput.deliverable.test_requirements.includes(expected), `brief should contain test requirement ${expected}`);
}
assert.ok(briefOutput.deliverable.test_requirements.includes("Verify audit log export"), "confirmed item should affect brief test requirements");
const confirmedBriefFields = {
  task_goal: briefOutput.deliverable.task_goal,
  in_scope: briefOutput.deliverable.in_scope,
  out_of_scope: briefOutput.deliverable.out_of_scope,
  constraints: briefOutput.deliverable.constraints,
  acceptance_criteria: briefOutput.deliverable.acceptance_criteria,
  test_requirements: briefOutput.deliverable.test_requirements,
  delivery_requirements: briefOutput.deliverable.delivery_requirements
};
assert.ok(!JSON.stringify(confirmedBriefFields).includes("Maybe verify billing export"), "unconfirmed item must not be a confirmed business field");
assert.ok(briefOutput.deliverable.unconfirmed_items.includes("Maybe verify billing export"), "unconfirmed item should remain marked unconfirmed");
assertEvidenceLinks(briefOutput);
passed += 1;

const allowedOutOfScope = generateTaskBrief({ source_text: allowedOutOfScopeMaterial });
assert.notEqual(allowedOutOfScope.status, "error");
assert.ok(!allowedOutOfScope.errors.some((error) => error.code === "out_of_scope"));
assert.ok(allowedOutOfScope.deliverable.out_of_scope.some((item) => item.toLowerCase().includes("deployment")));
passed += 1;

const externalExecution = generateTaskBrief({ source_text: forbiddenOutOfScopeRequest });
assert.equal(externalExecution.status, "error");
expectCode(externalExecution, "out_of_scope");
assertMatchesSchema(externalExecution, generateTaskBriefOutputSchema);
passed += 1;

for (const run of [extractTaskGoal, buildTestRequirements, generateTaskBrief]) {
  const output = run({ source_text: speculativeSource });
  assert.notEqual(output.status, "success");
  const serialized = JSON.stringify(output);
  assert.ok(!serialized.includes("task_goal_items") || !serialized.includes("database is probably slow") || output.status !== "success");
  if ("deliverable" in output) {
    const deliverable = output.deliverable as Record<string, unknown>;
    const confirmedBusinessFields = JSON.stringify(
      Object.fromEntries(Object.entries(deliverable).filter(([key]) => !key.startsWith("unconfirmed")))
    );
    assert.ok(!confirmedBusinessFields.includes("database is probably slow"), "speculation must not enter confirmed business fields");
  }
  passed += 1;
}

for (const tool of tools) {
  assertSchemaDescriptions(tool.inputSchema);
  assertSchemaDescriptions(tool.outputSchema);
  passed += 1;
}

const case1Output = extractTaskGoal({ source_text: gate25Case1 });
assertMatchesSchema(case1Output, extractTaskGoalOutputSchema);
assert.ok(case1Output.task_goal_items.some((item) => item.goal_text.includes("workspace settings page")));
assert.ok(!JSON.stringify(case1Output.task_goal_items).includes("Billing"));
assert.ok(!JSON.stringify(case1Output.task_goal_items).includes("Testing should cover"));
assert.ok(!JSON.stringify(case1Output.task_goal_items).includes("existing design system"));
passed += 1;

const case2Output = extractTaskGoal({ source_text: gate25Case2 });
assertMatchesSchema(case2Output, extractTaskGoalOutputSchema);
assert.ok(case2Output.task_goal_items.some((item) => item.goal_text.includes("add CSV export to the invoice history page")));
assert.ok(!JSON.stringify(case2Output.task_goal_items).includes("PDF export"));
passed += 1;

const case3Output = buildTestRequirements({ source_text: gate25Case3 });
assertMatchesSchema(case3Output, buildTestRequirementsOutputSchema);
const case3Titles = case3Output.deliverable.test_cases.map((item) => item.title.toLowerCase());
for (const expected of ["loading", "valid save", "invalid input", "request failure"]) {
  assert.ok(case3Titles.some((title) => title.includes(expected)), `Gate 2.5 Case 3 missing ${expected}`);
}
assert.ok(!JSON.stringify(case3Output.deliverable.test_cases).includes("Build evidence-based test requirements"));
passed += 1;

const case4Output = buildTestRequirements({ source_text: gate25Case4 });
assertMatchesSchema(case4Output, buildTestRequirementsOutputSchema);
const case4Titles = case4Output.deliverable.test_cases.map((item) => item.title.toLowerCase());
for (const expected of ["export with records", "export with no records", "preservation of timestamps"]) {
  assert.ok(case4Titles.some((title) => title.includes(expected)), `Gate 2.5 Case 4 missing ${expected}`);
}
assert.ok(!JSON.stringify(case4Output.deliverable.test_cases).toLowerCase().includes("billing export"));
assert.ok(JSON.stringify(case4Output.deliverable.unconfirmed_test_requirements).toLowerCase().includes("billing export"));
passed += 1;

const case5Output = generateTaskBrief({ source_text: gate25Case5 });
assertMatchesSchema(case5Output, generateTaskBriefOutputSchema);
assert.ok(case5Output.deliverable.task_goal.some((item) => item.includes("workspace notification settings page")));
for (const expected of ["initial loading", "valid save", "invalid input", "service failure"]) {
  assert.ok(case5Output.deliverable.test_requirements.includes(expected), `Gate 2.5 Case 5 missing ${expected}`);
}
assert.ok(case5Output.deliverable.in_scope.length > 0);
assert.ok(case5Output.deliverable.out_of_scope.length > 0);
assert.ok(case5Output.deliverable.constraints.length > 0);
assert.ok(case5Output.deliverable.acceptance_criteria.length > 0);
assert.ok(case5Output.deliverable.delivery_requirements.length > 0);
passed += 1;

const case6Output = generateTaskBrief({ source_text: gate25Case6 });
assertMatchesSchema(case6Output, generateTaskBriefOutputSchema);
assert.equal(case6Output.status, "error");
expectCode(case6Output, "out_of_scope");
passed += 1;

const case7Output = generateTaskBrief({ source_text: gate25Case7 });
assertMatchesSchema(case7Output, generateTaskBriefOutputSchema);
assert.ok(case7Output.deliverable.task_goal.includes("Build an account preferences page where users can change their language and timezone."));
assert.ok(!JSON.stringify(case7Output.deliverable.task_goal).includes("open my repository"));
assert.ok(case7Output.deliverable.out_of_scope.some((item) => item.toLowerCase().includes("password and billing")));
for (const expected of ["loading", "valid save", "invalid input", "service errors"]) {
  assert.ok(case7Output.deliverable.test_requirements.includes(expected), `Gate 2.5 Case 7 missing ${expected}`);
}
passed += 1;

for (const [label, source] of [
  ["singular delivery", fullImplementationBriefSingularDelivery],
  ["plural delivery", fullImplementationBriefPluralDelivery]
] as const) {
  const output = generateTaskBrief({ source_text: source });
  assertMatchesSchema(output, generateTaskBriefOutputSchema);
  assert.equal(output.status, "success", `${label} should be success`);
  assert.ok(output.deliverable.task_goal.some((item) => item.includes("workspace notification settings page")), `${label} should include goal`);
  assert.ok(output.deliverable.in_scope.length > 0, `${label} should include in_scope`);
  assert.ok(output.deliverable.out_of_scope.length > 0, `${label} should include out_of_scope`);
  assert.ok(output.deliverable.constraints.length > 0, `${label} should include constraints`);
  assert.ok(output.deliverable.acceptance_criteria.length > 0, `${label} should include acceptance`);
  for (const expected of ["initial loading", "valid save", "invalid input", "service failure"]) {
    assert.ok(output.deliverable.test_requirements.includes(expected), `${label} should include ${expected}`);
  }
  assert.ok(output.deliverable.delivery_requirements.some((item) => item.includes("Report the changed files")), `${label} should include delivery`);
  assert.ok(output.included_items.length > 0, `${label} included_items should not be empty`);
  assert.ok(output.included_items.some((item) => item.text.includes("workspace notification settings page")), `${label} included_items should include parsed goal`);
  passed += 1;
}

const goalOnlyOutput = generateTaskBrief({ source_text: goalOnlyBrief });
assertMatchesSchema(goalOnlyOutput, generateTaskBriefOutputSchema);
assert.equal(goalOnlyOutput.status, "partial");
assert.deepEqual(goalOnlyOutput.deliverable.task_goal, ["Build a workspace notification settings page for administrators."]);
assert.deepEqual(goalOnlyOutput.deliverable.in_scope, []);
assert.deepEqual(goalOnlyOutput.deliverable.out_of_scope, []);
assert.ok(goalOnlyOutput.included_items.length > 0);
passed += 1;

const suggestionOutput = generateTaskBrief({ source_text: briefWithUnapprovedSuggestion });
assertMatchesSchema(suggestionOutput, generateTaskBriefOutputSchema);
assert.ok(!JSON.stringify(suggestionOutput.deliverable.test_requirements).toLowerCase().includes("billing export"));
assert.ok(JSON.stringify(suggestionOutput.deliverable.unconfirmed_items).toLowerCase().includes("billing export"));
passed += 1;

for (const args of [{ source_text: "" }, { source_text: "   " }, {}]) {
  const output = generateTaskBrief(args);
  assertMatchesSchema(output, generateTaskBriefOutputSchema);
  assert.equal(output.status, "error");
  assert.ok(output.errors[0].message.toLowerCase().includes("empty"), "empty-input error message should include empty");
  assert.equal(output.errors[0].field, "source_text");
  passed += 1;
}

function assertSchemaDescriptions(schema: unknown, path = "$"): void {
  if (typeof schema !== "object" || schema === null) {
    return;
  }
  const schemaObject = schema as { description?: unknown; properties?: Record<string, unknown>; items?: unknown };
  assert.equal(typeof schemaObject.description, "string", `${path} should have description`);
  for (const [key, value] of Object.entries(schemaObject.properties ?? {})) {
    assertSchemaDescriptions(value, `${path}.${key}`);
  }
  if (schemaObject.items) {
    assertSchemaDescriptions(schemaObject.items, `${path}[]`);
  }
}

console.log(`Tool tests passed: ${passed}/${passed}`);
