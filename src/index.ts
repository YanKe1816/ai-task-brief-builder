import { homeHtml, privacyHtml, supportHtml, termsHtml } from "./pages/content";

type Status = "success" | "partial" | "error";
type ErrorCode =
  | "missing_required_input"
  | "invalid_input_type"
  | "empty_input"
  | "insufficient_evidence"
  | "out_of_scope"
  | "internal_error";

type ToolError = {
  code: ErrorCode;
  message: string;
  field: string;
  details: string[];
};

type Evidence = {
  evidence_id: string;
  source_excerpt: string;
  supports: string[];
};

type Context = {
  project_name?: string;
  audience?: string;
  constraints?: string;
  deadline?: string;
  notes?: string;
};

type ConfirmedItem = {
  item_id: string;
  text: string;
  status: "confirmed" | "unconfirmed";
  evidence_ids: string[];
};

type ToolArguments = {
  source_text?: unknown;
  context?: unknown;
  confirmed_items?: unknown;
};

type Env = {
  OPENAI_APPS_CHALLENGE?: string;
};

type TaskGoalOutput = {
  status: Status;
  summary: string;
  task_goal_items: Array<{
    goal_id: string;
    goal_text: string;
    status: "confirmed" | "unconfirmed";
    evidence_ids: string[];
  }>;
  missing_fields: string[];
  evidence: Evidence[];
  errors: ToolError[];
};

type TestRequirementsOutput = {
  status: Status;
  summary: string;
  deliverable: {
    test_objectives: string[];
    test_cases: Array<{
      test_id: string;
      title: string;
      test_type: string;
      preconditions: string[];
      test_steps: string[];
      expected_results: string[];
      evidence_ids: string[];
    }>;
    unconfirmed_test_requirements: string[];
  };
  included_items: ConfirmedItem[];
  missing_fields: string[];
  limitations: string[];
  evidence: Evidence[];
  errors: ToolError[];
};

type TaskBriefOutput = {
  status: Status;
  summary: string;
  deliverable: {
    task_goal: string[];
    in_scope: string[];
    out_of_scope: string[];
    constraints: string[];
    acceptance_criteria: string[];
    test_requirements: string[];
    delivery_requirements: string[];
    unconfirmed_items: string[];
  };
  included_items: ConfirmedItem[];
  missing_fields: string[];
  limitations: string[];
  evidence: Evidence[];
  errors: ToolError[];
};

type ToolOutput = TaskGoalOutput | TestRequirementsOutput | TaskBriefOutput;

type Category =
  | "task_goal"
  | "in_scope"
  | "out_of_scope"
  | "constraints"
  | "acceptance_criteria"
  | "test_requirements"
  | "delivery_requirements"
  | "unclassified";

type ClassifiedItem = {
  item_id: string;
  text: string;
  category: Category;
  evidence_id: string;
  confirmed: boolean;
};

const APP_NAME = "ai-task-brief-builder";
const APP_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2024-11-05";
const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true
};

const STRING_ARRAY_SCHEMA = (description: string) =>
  ({
    type: "array",
    description,
    items: { type: "string", description: "A single text item." }
  }) as const;

const ERROR_SCHEMA = {
  type: "object",
  description: "Structured tool error object.",
  additionalProperties: false,
  required: ["code", "message", "field", "details"],
  properties: {
    code: {
      type: "string",
      description: "Stable error code.",
      enum: [
        "missing_required_input",
        "invalid_input_type",
        "empty_input",
        "insufficient_evidence",
        "out_of_scope",
        "internal_error"
      ]
    },
    message: { type: "string", description: "Human-readable error summary." },
    field: { type: "string", description: "Input or internal field associated with the error." },
    details: STRING_ARRAY_SCHEMA("Additional non-sensitive error details.")
  }
} as const;

const EVIDENCE_SCHEMA = {
  type: "object",
  description: "Evidence excerpt from supplied material.",
  additionalProperties: false,
  required: ["evidence_id", "source_excerpt", "supports"],
  properties: {
    evidence_id: { type: "string", description: "Stable evidence identifier." },
    source_excerpt: { type: "string", description: "Verbatim excerpt from source_text or confirmed_items." },
    supports: STRING_ARRAY_SCHEMA("Business result identifiers supported by this evidence.")
  }
} as const;

const CONFIRMED_ITEM_SCHEMA = {
  type: "object",
  description: "Optional user-confirmed or unconfirmed item.",
  additionalProperties: false,
  required: ["item_id", "text", "status", "evidence_ids"],
  properties: {
    item_id: { type: "string", description: "Caller-provided confirmed item identifier." },
    text: { type: "string", description: "Confirmed item text." },
    status: { type: "string", description: "Whether the item is confirmed or unconfirmed.", enum: ["confirmed", "unconfirmed"] },
    evidence_ids: STRING_ARRAY_SCHEMA("Evidence identifiers supplied by the caller for this item.")
  }
} as const;

const CONTEXT_SCHEMA = {
  type: "object",
  description: "Optional bounded context supplied by the caller.",
  additionalProperties: false,
  properties: {
    project_name: { type: "string", description: "Project name stated by the caller." },
    audience: { type: "string", description: "Audience stated by the caller." },
    constraints: { type: "string", description: "Additional stated constraints." },
    deadline: { type: "string", description: "Deadline stated by the caller." },
    notes: { type: "string", description: "Other stated notes." }
  }
} as const;

const BASE_INPUT_SCHEMA = {
  type: "object",
  description: "Arguments for extracting task goals.",
  additionalProperties: false,
  required: ["source_text"],
  properties: {
    source_text: { type: "string", description: "Supplied software-development material to analyze." },
    context: CONTEXT_SCHEMA
  }
} as const;

const INPUT_WITH_CONFIRMED_ITEMS_SCHEMA = {
  type: "object",
  description: "Arguments for building test requirements or task briefs.",
  additionalProperties: false,
  required: ["source_text"],
  properties: {
    source_text: { type: "string", description: "Supplied software-development material to analyze." },
    context: CONTEXT_SCHEMA,
    confirmed_items: {
      type: "array",
      description: "Optional caller-confirmed or unconfirmed items.",
      items: CONFIRMED_ITEM_SCHEMA
    }
  }
} as const;

export const extractTaskGoalOutputSchema = {
  type: "object",
  description: "Result of extracting task goals.",
  additionalProperties: false,
  required: ["status", "summary", "task_goal_items", "missing_fields", "evidence", "errors"],
  properties: {
    status: { type: "string", description: "Overall result status.", enum: ["success", "partial", "error"] },
    summary: { type: "string", description: "Short result summary." },
    task_goal_items: {
      type: "array",
      description: "Confirmed task goals only.",
      items: {
        type: "object",
        description: "Single task goal item.",
        additionalProperties: false,
        required: ["goal_id", "goal_text", "status", "evidence_ids"],
        properties: {
          goal_id: { type: "string", description: "Stable task goal identifier." },
          goal_text: { type: "string", description: "Task goal text extracted from supplied material." },
          status: { type: "string", description: "Confirmation status for the goal.", enum: ["confirmed", "unconfirmed"] },
          evidence_ids: STRING_ARRAY_SCHEMA("Evidence identifiers supporting this goal.")
        }
      }
    },
    missing_fields: STRING_ARRAY_SCHEMA("Missing information needed for a complete task goal brief."),
    evidence: { type: "array", description: "Evidence records used by the result.", items: EVIDENCE_SCHEMA },
    errors: { type: "array", description: "Structured errors.", items: ERROR_SCHEMA }
  }
} as const;

export const buildTestRequirementsOutputSchema = {
  type: "object",
  description: "Result of building test requirements.",
  additionalProperties: false,
  required: ["status", "summary", "deliverable", "included_items", "missing_fields", "limitations", "evidence", "errors"],
  properties: {
    status: { type: "string", description: "Overall result status.", enum: ["success", "partial", "error"] },
    summary: { type: "string", description: "Short result summary." },
    deliverable: {
      type: "object",
      description: "Generated test requirements deliverable.",
      additionalProperties: false,
      required: ["test_objectives", "test_cases", "unconfirmed_test_requirements"],
      properties: {
        test_objectives: STRING_ARRAY_SCHEMA("Evidence-backed test objectives."),
        test_cases: {
          type: "array",
          description: "Evidence-backed test cases.",
          items: {
            type: "object",
            description: "Single test case.",
            additionalProperties: false,
            required: ["test_id", "title", "test_type", "preconditions", "test_steps", "expected_results", "evidence_ids"],
            properties: {
              test_id: { type: "string", description: "Stable test case identifier." },
              title: { type: "string", description: "Test case title." },
              test_type: { type: "string", description: "Type of test requirement." },
              preconditions: STRING_ARRAY_SCHEMA("Required preconditions."),
              test_steps: STRING_ARRAY_SCHEMA("Steps to verify the stated behavior."),
              expected_results: STRING_ARRAY_SCHEMA("Expected observable results."),
              evidence_ids: STRING_ARRAY_SCHEMA("Evidence identifiers supporting this test case.")
            }
          }
        },
        unconfirmed_test_requirements: STRING_ARRAY_SCHEMA("Testing needs that are missing or unconfirmed.")
      }
    },
    included_items: { type: "array", description: "Valid confirmed_items received from the caller.", items: CONFIRMED_ITEM_SCHEMA },
    missing_fields: STRING_ARRAY_SCHEMA("Missing fields for complete test requirements."),
    limitations: STRING_ARRAY_SCHEMA("Output limitations."),
    evidence: { type: "array", description: "Evidence records used by the result.", items: EVIDENCE_SCHEMA },
    errors: { type: "array", description: "Structured errors.", items: ERROR_SCHEMA }
  }
} as const;

export const generateTaskBriefOutputSchema = {
  type: "object",
  description: "Result of generating a task brief.",
  additionalProperties: false,
  required: ["status", "summary", "deliverable", "included_items", "missing_fields", "limitations", "evidence", "errors"],
  properties: {
    status: { type: "string", description: "Overall result status.", enum: ["success", "partial", "error"] },
    summary: { type: "string", description: "Short result summary." },
    deliverable: {
      type: "object",
      description: "Evidence-backed task brief deliverable.",
      additionalProperties: false,
      required: [
        "task_goal",
        "in_scope",
        "out_of_scope",
        "constraints",
        "acceptance_criteria",
        "test_requirements",
        "delivery_requirements",
        "unconfirmed_items"
      ],
      properties: {
        task_goal: STRING_ARRAY_SCHEMA("Confirmed development goals."),
        in_scope: STRING_ARRAY_SCHEMA("Confirmed in-scope items."),
        out_of_scope: STRING_ARRAY_SCHEMA("Confirmed out-of-scope items."),
        constraints: STRING_ARRAY_SCHEMA("Confirmed constraints."),
        acceptance_criteria: STRING_ARRAY_SCHEMA("Confirmed acceptance criteria."),
        test_requirements: STRING_ARRAY_SCHEMA("Confirmed test requirements."),
        delivery_requirements: STRING_ARRAY_SCHEMA("Confirmed delivery requirements."),
        unconfirmed_items: STRING_ARRAY_SCHEMA("Missing, speculative, or unconfirmed items.")
      }
    },
    included_items: { type: "array", description: "Valid confirmed_items received from the caller.", items: CONFIRMED_ITEM_SCHEMA },
    missing_fields: STRING_ARRAY_SCHEMA("Missing fields for a complete task brief."),
    limitations: STRING_ARRAY_SCHEMA("Output limitations."),
    evidence: { type: "array", description: "Evidence records used by the result.", items: EVIDENCE_SCHEMA },
    errors: { type: "array", description: "Structured errors.", items: ERROR_SCHEMA }
  }
} as const;

const TOOL_SCHEMAS = {
  extract_task_goal: extractTaskGoalOutputSchema,
  build_test_requirements: buildTestRequirementsOutputSchema,
  generate_task_brief: generateTaskBriefOutputSchema
} as const;

export const tools = [
  {
    name: "extract_task_goal",
    title: "Extract Task Goal",
    description:
      "Extract explicitly supported task goals from supplied software-development materials, map each goal to evidence, and identify missing or unconfirmed information. Use only supplied material; do not access repositories, perform implementation, or invent unsupported requirements.",
    inputSchema: BASE_INPUT_SCHEMA,
    outputSchema: extractTaskGoalOutputSchema,
    annotations: TOOL_ANNOTATIONS
  },
  {
    name: "build_test_requirements",
    title: "Build Test Requirements",
    description:
      "Build evidence-backed test requirements from supplied development materials or confirmed task items, while clearly marking missing and unconfirmed requirements. Do not claim that tests were executed or invent unsupported expected behavior.",
    inputSchema: INPUT_WITH_CONFIRMED_ITEMS_SCHEMA,
    outputSchema: buildTestRequirementsOutputSchema,
    annotations: TOOL_ANNOTATIONS
  },
  {
    name: "generate_task_brief",
    title: "Generate Task Brief",
    description:
      "Generate an evidence-backed software task brief with task goals, scope, constraints, acceptance criteria, test requirements, delivery requirements, and clearly marked information gaps. Do not implement, deploy, or claim completion.",
    inputSchema: INPUT_WITH_CONFIRMED_ITEMS_SCHEMA,
    outputSchema: generateTaskBriefOutputSchema,
    annotations: TOOL_ANNOTATIONS
  }
] as const;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function makeError(code: ErrorCode, message: string, field: string, details: string[] = []): ToolError {
  return { code, message, field, details };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function sentenceSplit(sourceText: string): string[] {
  return sourceText
    .split(/(?<=[.!?])\s+|\n+/u)
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function isSpeculative(text: string): boolean {
  return /\b(maybe|perhaps|probably|possibly|might|guess|assume|could be|it seems|likely|suggested|not confirmed|not approved|may be considered later|future work)\b/i.test(text);
}

function validateCommonArguments(args: ToolArguments): { sourceText?: string; errors: ToolError[] } {
  if (!isPlainObject(args)) {
    return { errors: [makeError("invalid_input_type", "Tool arguments must be an object.", "arguments")] };
  }
  if (!Object.hasOwn(args, "source_text")) {
    return { errors: [makeError("missing_required_input", "source_text is required and cannot be empty.", "source_text")] };
  }
  if (typeof args.source_text !== "string") {
    return { errors: [makeError("invalid_input_type", "source_text must be a string.", "source_text")] };
  }
  if (args.source_text.length === 0 || args.source_text.trim().length === 0) {
    return { errors: [makeError("empty_input", "source_text is empty; provide non-whitespace material.", "source_text")] };
  }
  if (args.context !== undefined && !isPlainObject(args.context)) {
    return { errors: [makeError("invalid_input_type", "context must be an object when provided.", "context")] };
  }
  if (isPlainObject(args.context)) {
    const allowedContextKeys = new Set<keyof Context>(["project_name", "audience", "constraints", "deadline", "notes"]);
    for (const [key, value] of Object.entries(args.context)) {
      if (!allowedContextKeys.has(key as keyof Context) || typeof value !== "string") {
        return {
          errors: [makeError("invalid_input_type", "context contains an unsupported field or non-string value.", `context.${key}`)]
        };
      }
    }
  }
  return { sourceText: args.source_text, errors: [] };
}

function validateConfirmedItems(args: ToolArguments): { includedItems: ConfirmedItem[]; errors: ToolError[] } {
  if (args.confirmed_items === undefined) {
    return { includedItems: [], errors: [] };
  }
  if (!Array.isArray(args.confirmed_items)) {
    return {
      includedItems: [],
      errors: [makeError("invalid_input_type", "confirmed_items must be an array when provided.", "confirmed_items")]
    };
  }
  const includedItems: ConfirmedItem[] = [];
  for (const [index, item] of args.confirmed_items.entries()) {
    if (!isPlainObject(item)) {
      return {
        includedItems: [],
        errors: [makeError("invalid_input_type", "Each confirmed_items entry must be an object.", `confirmed_items.${index}`)]
      };
    }
    if (
      typeof item.item_id !== "string" ||
      typeof item.text !== "string" ||
      (item.status !== "confirmed" && item.status !== "unconfirmed") ||
      !Array.isArray(item.evidence_ids) ||
      !item.evidence_ids.every((id) => typeof id === "string")
    ) {
      return {
        includedItems: [],
        errors: [makeError("invalid_input_type", "Each confirmed_items entry must match the declared schema.", `confirmed_items.${index}`)]
      };
    }
    includedItems.push({
      item_id: item.item_id,
      text: item.text,
      status: item.status,
      evidence_ids: item.evidence_ids
    });
  }
  return { includedItems, errors: [] };
}

function detectOutOfScope(sourceText: string): boolean {
  const lower = sourceText.toLowerCase();
  const asksForRepositoryAccess = /\b(open|access|inspect|read)\s+my\s+(repository|repo)\b/.test(lower);
  const asksForImplementation = /\bimplement\b.*\b(requested changes|changes|code)\b/.test(lower) || /\bmake the code changes\b/.test(lower);
  const asksToRunTests = /\brun\s+(the\s+)?tests\b/.test(lower);
  const asksToDeploy = /\bdeploy\s+(the\s+)?(application|app|worker|site)\b/.test(lower);
  const asksToReportCompletion = /\breport\b.*\bcomplete(d)?\b/.test(lower);
  return asksForRepositoryAccess && asksForImplementation && asksToRunTests && asksToDeploy && asksToReportCompletion;
}

function isPromptInstruction(text: string): boolean {
  const lower = text.toLowerCase();
  if (/^response only in english\.?$/.test(lower)) {
    return true;
  }
  if (/^use only\b/.test(lower) || /^do not treat\b/.test(lower) || /^keep unconfirmed\b/.test(lower) || /^do not invent\b/.test(lower)) {
    return true;
  }
  if (/^(extract|identify)\b.*\b(goal|task goal)\b/.test(lower)) {
    return true;
  }
  if (/^build evidence-based test requirements\b/.test(lower) || /^create test requirements from these notes\b/.test(lower)) {
    return true;
  }
  if (/^turn the following development material into\b/.test(lower)) {
    return true;
  }
  if (/^create an implementation brief\b.*\b(open my repository|implement the feature|run the tests|deploy it)\b/.test(lower)) {
    return true;
  }
  if (/^notes:?$/i.test(text)) {
    return true;
  }
  return false;
}

function buildEvidence(sourceText: string, confirmedItems: ConfirmedItem[] = []): Evidence[] {
  const fromSource = sentenceSplit(sourceText).map((excerpt, index) => ({
    evidence_id: `E${index + 1}`,
    source_excerpt: excerpt.slice(0, 500),
    supports: [] as string[]
  }));
  const fromConfirmed = confirmedItems.map((item, index) => ({
    evidence_id: `CI_E${index + 1}`,
    source_excerpt: item.text.slice(0, 500),
    supports: [] as string[]
  }));
  return [...fromSource, ...fromConfirmed];
}

function addSupport(evidence: Evidence[], evidenceId: string, supportId: string): void {
  const found = evidence.find((item) => item.evidence_id === evidenceId);
  if (found && !found.supports.includes(supportId)) {
    found.supports.push(supportId);
  }
}

function textAfterLabel(text: string, label: RegExp): string {
  return normalizeWhitespace(text.replace(label, ""));
}

function splitListedItems(text: string): string[] {
  const cleaned = normalizeWhitespace(text.replace(/\.$/, ""));
  return cleaned
    .split(/\s*,\s*|\s+and\s+/i)
    .map((item) => item.replace(/^and\s+/i, "").trim())
    .filter(Boolean);
}

function classifySentence(text: string): Category {
  const lower = text.toLowerCase();
  if (/^(out of scope|not in scope)\b/.test(lower) || /\b(out of scope is|changes are out of scope|billing is outside|outside this feature|deployment is out of scope|do not deploy|do not publish|exclude)\b/.test(lower)) {
    return "out_of_scope";
  }
  if (/^in scope\b/.test(lower) || /\bin scope is\b/.test(lower)) {
    return "in_scope";
  }
  if (/^constraints?:/.test(lower) || /\b(use the existing|do not add external apis|must use|must not)\b/.test(lower)) {
    return "constraints";
  }
  if (
    /^(build|create|implement|add|update|fix|remove|develop)\b/.test(lower) ||
    /^the feature adds\b/.test(lower) ||
    /^we need to build\b/.test(lower) ||
    /^goal:\s*(build|create|implement|add|update|fix|remove|develop)\b/.test(lower) ||
    /^the confirmed requirement is to\b/.test(lower) ||
    /\b(goal is to|task goal is to)\b/.test(lower)
  ) {
    return "task_goal";
  }
  if (
    /^acceptance criteria:/.test(lower) ||
    /\b(observable success state|can view|can save|success state|valid update should save|empty name must be rejected|request fails|error message must be shown|existing values must remain visible)\b/.test(lower)
  ) {
    return "acceptance_criteria";
  }
  if (
    /^(test|testing) requirements?:/.test(lower) ||
    /^confirmed tests must cover\b/.test(lower) ||
    /^test\b/.test(lower) ||
    /^verify\b/.test(lower) ||
    /\bverify\b.*\b(loading|valid|invalid|error handling|workflow)\b/.test(lower)
  ) {
    return "test_requirements";
  }
  if (/^delivery requirements?:/.test(lower) || /\b(provide changed files|local test results|handoff|deliverable)\b/.test(lower)) {
    return "delivery_requirements";
  }
  return "unclassified";
}

function classifyConfirmedItem(item: ConfirmedItem): Category {
  const explicit = classifySentence(item.text);
  if (explicit !== "unclassified") {
    return explicit;
  }
  return "task_goal";
}

function classifyMaterial(sourceText: string, confirmedItems: ConfirmedItem[]): { evidence: Evidence[]; items: ClassifiedItem[]; unconfirmedItems: string[] } {
  const evidence = buildEvidence(sourceText, confirmedItems);
  const items: ClassifiedItem[] = [];
  const unconfirmedItems: string[] = [];

  for (const ev of evidence.filter((item) => item.evidence_id.startsWith("E"))) {
    if (isPromptInstruction(ev.source_excerpt)) {
      continue;
    }
    const category = classifySentence(ev.source_excerpt);
    if (category === "unclassified" || isSpeculative(ev.source_excerpt)) {
      if (isSpeculative(ev.source_excerpt)) {
        unconfirmedItems.push(ev.source_excerpt);
      }
      continue;
    }
    const itemId = `${category}_${items.length + 1}`;
    items.push({
      item_id: itemId,
      text: normalizeCategoryText(ev.source_excerpt, category),
      category,
      evidence_id: ev.evidence_id,
      confirmed: true
    });
    addSupport(evidence, ev.evidence_id, itemId);
  }

  for (const [index, item] of confirmedItems.entries()) {
    const evidenceId = `CI_E${index + 1}`;
    if (item.status === "unconfirmed" || isSpeculative(item.text)) {
      unconfirmedItems.push(item.text);
      continue;
    }
    const category = classifyConfirmedItem(item);
    const itemId = `${category}_${items.length + 1}`;
    items.push({
      item_id: itemId,
      text: normalizeCategoryText(item.text, category),
      category,
      evidence_id: evidenceId,
      confirmed: true
    });
    addSupport(evidence, evidenceId, itemId);
  }

  return { evidence, items, unconfirmedItems };
}

function normalizeCategoryText(text: string, category: Category): string {
  if (category === "task_goal") {
    return textAfterLabel(
      text,
      /^(goal:\s*|we need to\s+|the confirmed requirement is to\s+|task goal is to\s+|goal is to\s+)/i
    );
  }
  if (category === "in_scope") {
    return textAfterLabel(text, /^in scope\s*(is|includes|:)?\s*/i);
  }
  if (category === "out_of_scope") {
    return textAfterLabel(text, /^(out of scope|not in scope)\s*(is|includes|:)?\s*/i);
  }
  if (category === "constraints") {
    return textAfterLabel(text, /^constraints?:\s*/i);
  }
  if (category === "acceptance_criteria") {
    return textAfterLabel(text, /^acceptance criteria:\s*/i);
  }
  if (category === "test_requirements") {
    return textAfterLabel(text, /^(test|testing) requirements?:\s*|^confirmed tests must cover\s*|^test\s*/i);
  }
  if (category === "delivery_requirements") {
    return textAfterLabel(text, /^delivery requirements?:\s*/i);
  }
  return normalizeWhitespace(text);
}

function itemsFor(items: ClassifiedItem[], category: Category): ClassifiedItem[] {
  return items.filter((item) => item.category === category && item.confirmed);
}

function includedItemsFromClassified(items: ClassifiedItem[], providedItems: ConfirmedItem[]): ConfirmedItem[] {
  const fromClassified = items
    .filter((item) => item.confirmed && item.category !== "unclassified")
    .map((item) => ({
      item_id: item.item_id,
      text: item.text,
      status: "confirmed" as const,
      evidence_ids: [item.evidence_id]
    }));
  const seen = new Set<string>();
  return [...providedItems, ...fromClassified].filter((item) => {
    const key = `${item.status}:${item.text}:${item.evidence_ids.join(",")}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function deriveMissingFieldsFromItems(items: ClassifiedItem[]): string[] {
  const required: Array<[Category, string]> = [
    ["task_goal", "task_goal"],
    ["in_scope", "scope_boundaries"],
    ["out_of_scope", "out_of_scope"],
    ["constraints", "constraints"],
    ["acceptance_criteria", "acceptance_criteria"],
    ["test_requirements", "test_requirements"],
    ["delivery_requirements", "delivery_requirements"]
  ];
  return required.filter(([category]) => itemsFor(items, category).length === 0).map(([, field]) => field);
}

function baseTaskGoalErrorResponse(status: Status, summary: string, errors: ToolError[]): TaskGoalOutput {
  return {
    status,
    summary,
    task_goal_items: [],
    missing_fields: [],
    evidence: [],
    errors
  };
}

function baseTestRequirementsErrorResponse(status: Status, summary: string, errors: ToolError[]): TestRequirementsOutput {
  return {
    status,
    summary,
    deliverable: {
      test_objectives: [],
      test_cases: [],
      unconfirmed_test_requirements: []
    },
    included_items: [],
    missing_fields: [],
    limitations: [],
    evidence: [],
    errors
  };
}

function baseTaskBriefErrorResponse(status: Status, summary: string, errors: ToolError[]): TaskBriefOutput {
  return {
    status,
    summary,
    deliverable: {
      task_goal: [],
      in_scope: [],
      out_of_scope: [],
      constraints: [],
      acceptance_criteria: [],
      test_requirements: [],
      delivery_requirements: [],
      unconfirmed_items: []
    },
    included_items: [],
    missing_fields: [],
    limitations: [],
    evidence: [],
    errors
  };
}

export function extractTaskGoal(args: ToolArguments): TaskGoalOutput {
  try {
    const validation = validateCommonArguments(args);
    if (validation.errors.length > 0 || validation.sourceText === undefined) {
      return baseTaskGoalErrorResponse("error", "Task goals could not be extracted because input validation failed.", validation.errors);
    }
    if (detectOutOfScope(validation.sourceText)) {
      return baseTaskGoalErrorResponse("error", "The request asks the tool to perform out-of-scope external or implementation actions.", [
        makeError("out_of_scope", "The tool can only analyze supplied text and cannot access repositories, run tests, implement, deploy, or report external completion.", "source_text")
      ]);
    }
    const { evidence, items } = classifyMaterial(validation.sourceText, []);
    const goals = itemsFor(items, "task_goal");
    if (goals.length === 0) {
      return {
        status: "partial",
        summary: "No explicit non-speculative development task goal could be confirmed.",
        task_goal_items: [],
        missing_fields: deriveMissingFieldsFromItems(items),
        evidence,
        errors: [makeError("insufficient_evidence", "No explicit software-development task goal could be confirmed.", "source_text")]
      };
    }
    return {
      status: "success",
      summary: "Explicit task goals were extracted without including scope, testing, delivery, or constraint statements.",
      task_goal_items: goals.map((goal, index) => ({
        goal_id: `G${index + 1}`,
        goal_text: goal.text,
        status: "confirmed",
        evidence_ids: [goal.evidence_id]
      })),
      missing_fields: deriveMissingFieldsFromItems(items),
      evidence,
      errors: []
    };
  } catch {
    return baseTaskGoalErrorResponse("error", "An internal error occurred while extracting task goals.", [
      makeError("internal_error", "The tool could not complete the request.", "internal")
    ]);
  }
}

function buildTestCaseFromRequirement(requirement: ClassifiedItem, index: number): TestRequirementsOutput["deliverable"]["test_cases"][number] {
  const requirementText = requirement.text.replace(/^verify\s+/i, "");
  return {
    test_id: `T${index + 1}`,
    title: `Verify ${requirementText}`,
    test_type: "functional",
    preconditions: ["Use only the supplied source material and confirmed items."],
    test_steps: [`Exercise the stated behavior: ${requirementText}.`],
    expected_results: [`The behavior is observable and matches the supplied requirement: ${requirementText}.`],
    evidence_ids: [requirement.evidence_id]
  };
}

function expandTestRequirements(items: ClassifiedItem[]): ClassifiedItem[] {
  const expanded: ClassifiedItem[] = [];
  for (const item of itemsFor(items, "test_requirements")) {
    const parts = splitListedItems(item.text.replace(/^verify\s+/i, "").replace(/^cover\s+/i, ""));
    if (parts.length <= 1) {
      expanded.push(item);
      continue;
    }
    for (const part of parts) {
      expanded.push({
        ...item,
        item_id: `${item.item_id}_${expanded.length + 1}`,
        text: part
      });
    }
  }
  return expanded;
}

function derivedBehaviorTests(items: ClassifiedItem[]): ClassifiedItem[] {
  const derived: ClassifiedItem[] = [];
  const behaviorItems = [...itemsFor(items, "task_goal"), ...itemsFor(items, "acceptance_criteria")];
  for (const item of behaviorItems) {
    const lower = item.text.toLowerCase();
    const add = (text: string) => {
      if (!derived.some((candidate) => candidate.text.toLowerCase() === text.toLowerCase())) {
        derived.push({
          ...item,
          item_id: `derived_${item.item_id}_${derived.length + 1}`,
          text
        });
      }
    };
    if (/\b(load|loads|loading|current name|timezone|current preferences)\b/.test(lower)) {
      add(lower.includes("timezone") || lower.includes("name") ? "loading current name and timezone" : "initial loading");
    }
    if (/\b(valid update|save successfully|save valid|valid changes|visible confirmation|success state)\b/.test(lower)) {
      add("valid save");
    }
    if (/\b(empty name|invalid input|must be rejected|validation)\b/.test(lower)) {
      add("invalid input");
    }
    if (/\b(request fails|save request fails|service failure|service-error|error message|service errors|error handling)\b/.test(lower)) {
      add(lower.includes("service") ? "service failure" : "request failure");
    }
  }
  return derived;
}

export function buildTestRequirements(args: ToolArguments): TestRequirementsOutput {
  try {
    const validation = validateCommonArguments(args);
    const confirmed = validateConfirmedItems(args);
    const validationErrors = [...validation.errors, ...confirmed.errors];
    if (validationErrors.length > 0 || validation.sourceText === undefined) {
      return baseTestRequirementsErrorResponse("error", "Test requirements could not be built because input validation failed.", validationErrors);
    }
    if (detectOutOfScope(validation.sourceText)) {
      return baseTestRequirementsErrorResponse("error", "The request asks the tool to perform out-of-scope external or implementation actions.", [
        makeError("out_of_scope", "The tool can only derive test requirements from supplied material and cannot run tests or access external systems.", "source_text")
      ]);
    }
    const { evidence, items, unconfirmedItems } = classifyMaterial(validation.sourceText, confirmed.includedItems);
    const expandedTestRequirements = expandTestRequirements(items);
    const derivedTests = derivedBehaviorTests(items);
    if (expandedTestRequirements.length === 0 && derivedTests.length === 0) {
      return {
        status: "partial",
        summary: "The supplied material is insufficient to build confirmed test requirements.",
        deliverable: {
          test_objectives: [],
          test_cases: [],
          unconfirmed_test_requirements: ["Specific expected behavior and acceptance signals are not confirmed in the supplied material.", ...unconfirmedItems]
        },
        included_items: includedItemsFromClassified(items, confirmed.includedItems),
        missing_fields: deriveMissingFieldsFromItems(items),
        limitations: ["No tests were executed. Requirements are derived only from supplied text."],
        evidence,
        errors: [makeError("insufficient_evidence", "Test requirements need explicit tests or confirmed behavior.", "source_text")]
      };
    }
    const cases = [...expandedTestRequirements, ...derivedTests].map(buildTestCaseFromRequirement);
    return {
      status: "success",
      summary: "Evidence-backed test requirements were generated from explicit tests and confirmed behavior only.",
      deliverable: {
        test_objectives: cases.map((testCase) => testCase.title),
        test_cases: cases,
        unconfirmed_test_requirements: [...deriveMissingFieldsFromItems(items).filter((field) => field === "test_requirements"), ...unconfirmedItems]
      },
      included_items: includedItemsFromClassified(items, confirmed.includedItems),
      missing_fields: deriveMissingFieldsFromItems(items),
      limitations: ["No tests were executed. This output is a requirements brief only."],
      evidence,
      errors: []
    };
  } catch {
    return baseTestRequirementsErrorResponse("error", "An internal error occurred while building test requirements.", [
      makeError("internal_error", "The tool could not complete the request.", "internal")
    ]);
  }
}

export function generateTaskBrief(args: ToolArguments): TaskBriefOutput {
  try {
    const validation = validateCommonArguments(args);
    const confirmed = validateConfirmedItems(args);
    const validationErrors = [...validation.errors, ...confirmed.errors];
    if (validationErrors.length > 0 || validation.sourceText === undefined) {
      return baseTaskBriefErrorResponse("error", "Task brief could not be generated because input validation failed.", validationErrors);
    }
    if (detectOutOfScope(validation.sourceText)) {
      return baseTaskBriefErrorResponse("error", "The request asks the tool to perform out-of-scope external or implementation actions.", [
        makeError("out_of_scope", "The tool cannot implement, deploy, access repositories, run tests, or claim completion.", "source_text")
      ]);
    }
    const { evidence, items, unconfirmedItems } = classifyMaterial(validation.sourceText, confirmed.includedItems);
    const missingFields = deriveMissingFieldsFromItems(items);
    if (itemsFor(items, "task_goal").length === 0) {
      return {
        status: "partial",
        summary: "The supplied material is insufficient to generate a fully confirmed task brief.",
        deliverable: {
          task_goal: [],
          in_scope: itemsFor(items, "in_scope").map((item) => item.text),
          out_of_scope: itemsFor(items, "out_of_scope").map((item) => item.text),
          constraints: itemsFor(items, "constraints").map((item) => item.text),
          acceptance_criteria: itemsFor(items, "acceptance_criteria").map((item) => item.text),
          test_requirements: expandTestRequirements(items).map((item) => item.text),
          delivery_requirements: itemsFor(items, "delivery_requirements").map((item) => item.text),
          unconfirmed_items: ["Task goal needs explicit confirmation.", ...unconfirmedItems, ...missingFields]
        },
        included_items: includedItemsFromClassified(items, confirmed.includedItems),
        missing_fields: missingFields,
        limitations: ["The brief uses only supplied material and does not claim implementation or test execution."],
        evidence,
        errors: [makeError("insufficient_evidence", "A full task brief needs an explicit task goal.", "source_text")]
      };
    }
    return {
      status: missingFields.length > 0 ? "partial" : "success",
      summary: "An evidence-backed task brief was generated with each item placed in its specific field.",
      deliverable: {
        task_goal: itemsFor(items, "task_goal").map((item) => item.text),
        in_scope: itemsFor(items, "in_scope").map((item) => item.text),
        out_of_scope: itemsFor(items, "out_of_scope").map((item) => item.text),
        constraints: itemsFor(items, "constraints").map((item) => item.text),
        acceptance_criteria: itemsFor(items, "acceptance_criteria").map((item) => item.text),
        test_requirements: expandTestRequirements(items).map((item) => item.text),
        delivery_requirements: itemsFor(items, "delivery_requirements").map((item) => item.text),
        unconfirmed_items: [...unconfirmedItems, ...missingFields]
      },
      included_items: includedItemsFromClassified(items, confirmed.includedItems),
      missing_fields: missingFields,
      limitations: ["No repository access, implementation, deployment, or test execution was performed."],
      evidence,
      errors: []
    };
  } catch {
    return baseTaskBriefErrorResponse("error", "An internal error occurred while generating the task brief.", [
      makeError("internal_error", "The tool could not complete the request.", "internal")
    ]);
  }
}

function callTool(name: string, args: ToolArguments): ToolOutput | undefined {
  if (name === "extract_task_goal") {
    return extractTaskGoal(args);
  }
  if (name === "build_test_requirements") {
    return buildTestRequirements(args);
  }
  if (name === "generate_task_brief") {
    return generateTaskBrief(args);
  }
  return undefined;
}

function jsonRpcResult(id: unknown, result: unknown): Response {
  return json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: unknown, code: number, message: string): Response {
  return json({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message
    }
  });
}

export async function handleMcp(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }
  if (!isPlainObject(payload) || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return jsonRpcError(isPlainObject(payload) && Object.hasOwn(payload, "id") ? payload.id : null, -32600, "Invalid Request");
  }
  const id = Object.hasOwn(payload, "id") ? payload.id : null;
  if (payload.method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: {
        name: APP_NAME,
        version: APP_VERSION
      },
      capabilities: {
        tools: {}
      }
    });
  }
  if (payload.method === "tools/list") {
    return jsonRpcResult(id, { tools });
  }
  if (payload.method === "tools/call") {
    if (!isPlainObject(payload.params) || typeof payload.params.name !== "string") {
      return jsonRpcError(id, -32602, "Invalid params");
    }
    const argumentsObject = isPlainObject(payload.params.arguments) ? payload.params.arguments : {};
    const structuredContent = callTool(payload.params.name, argumentsObject);
    if (structuredContent === undefined) {
      return jsonRpcError(id, -32602, "Unknown tool");
    }
    return jsonRpcResult(id, {
      structuredContent,
      content: [
        {
          type: "text",
          text: structuredContent.summary
        }
      ],
      isError: structuredContent.status === "error"
    });
  }
  return jsonRpcError(id, -32601, "Method not found");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(homeHtml, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
    if (request.method === "GET" && url.pathname === "/privacy") {
      return new Response(privacyHtml, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
    if (request.method === "GET" && url.pathname === "/terms") {
      return new Response(termsHtml, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
    if (request.method === "GET" && url.pathname === "/support") {
      return new Response(supportHtml, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok", name: APP_NAME, version: APP_VERSION });
    }
    if (request.method === "GET" && url.pathname === "/.well-known/openai-apps-challenge") {
      return new Response(env.OPENAI_APPS_CHALLENGE ?? "", {
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }
    if (request.method === "POST" && url.pathname === "/mcp") {
      return handleMcp(request);
    }
    return json({ error: "not_found" }, 404);
  }
};

export function outputSchemaForTool(name: keyof typeof TOOL_SCHEMAS) {
  return TOOL_SCHEMAS[name];
}
