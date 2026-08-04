import assert from "node:assert/strict";

type JsonSchema = {
  type?: string;
  enum?: readonly string[];
  required?: readonly string[];
  additionalProperties?: boolean;
  properties?: Readonly<Record<string, JsonSchema>>;
  items?: JsonSchema;
};

export function assertMatchesSchema(value: unknown, schema: JsonSchema, path = "$"): void {
  if (schema.enum !== undefined) {
    assert.equal(typeof value, "string", `${path} must be a string enum value`);
    assert.ok(schema.enum.includes(value as string), `${path} must be one of ${schema.enum.join(", ")}`);
  }

  if (schema.type === "string") {
    assert.equal(typeof value, "string", `${path} must be string`);
    return;
  }

  if (schema.type === "array") {
    assert.ok(Array.isArray(value), `${path} must be array`);
    assert.ok(schema.items, `${path} schema must define array items`);
    for (const [index, item] of value.entries()) {
      assertMatchesSchema(item, schema.items, `${path}[${index}]`);
    }
    return;
  }

  if (schema.type === "object") {
    assert.equal(typeof value, "object", `${path} must be object`);
    assert.notEqual(value, null, `${path} must not be null`);
    assert.ok(!Array.isArray(value), `${path} must not be array`);
    const objectValue = value as Record<string, unknown>;
    for (const requiredKey of schema.required ?? []) {
      assert.ok(Object.hasOwn(objectValue, requiredKey), `${path}.${requiredKey} is required`);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(objectValue)) {
        assert.ok(allowed.has(key), `${path}.${key} is not allowed by schema`);
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(objectValue, key)) {
        assertMatchesSchema(objectValue[key], childSchema, `${path}.${key}`);
      }
    }
  }
}
