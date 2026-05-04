import { evaluateGuardrails } from "../guardrails";

describe("Guardrail Engine", () => {
  // GR-01 DDL Guard
  test("GR-01 BLOCK: DROP TABLE statement", () => {
    const result = evaluateGuardrails("DROP TABLE users", "db");
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("BLOCK");
    expect(result.ruleId).toBe("GR-01");
  });

  test("GR-01 PASS: regular SELECT statement", () => {
    const result = evaluateGuardrails("SELECT * FROM users", "db");
    expect(result.triggered).toBe(false);
  });

  // GR-02 Bulk Delete
  test("GR-02 HOLD: DELETE FROM statement", () => {
    const result = evaluateGuardrails("DELETE FROM orders WHERE id = 1", "db");
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("HOLD");
    expect(result.ruleId).toBe("GR-02");
  });

  test("GR-02 PASS: INSERT statement", () => {
    const result = evaluateGuardrails("INSERT INTO orders VALUES (1)", "db");
    expect(result.triggered).toBe(false);
  });

  // GR-03 PII Export
  test("GR-03 BLOCK: include_pii in API call", () => {
    const result = evaluateGuardrails("include_pii=true&format=csv", "api");
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("BLOCK");
    expect(result.ruleId).toBe("GR-03");
  });

  test("GR-03 PASS: normal API call", () => {
    const result = evaluateGuardrails("format=csv&limit=100", "api");
    expect(result.triggered).toBe(false);
  });

  // GR-04 Credential Leak
  test("GR-04 BLOCK: api_key in payload", () => {
    const result = evaluateGuardrails("api_key=sk-abc123", "*");
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("BLOCK");
    expect(result.ruleId).toBe("GR-04");
  });

  test("GR-04 PASS: normal text payload", () => {
    const result = evaluateGuardrails("send invoice to customer", "*");
    expect(result.triggered).toBe(false);
  });

  // GR-05 Large Payment
  test("GR-05 HOLD: payment over $500", () => {
    const result = evaluateGuardrails("wire transfer $12,000 to vendor", "payment");
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("HOLD");
    expect(result.ruleId).toBe("GR-05");
  });

  test("GR-05 PASS: small payment", () => {
    const result = evaluateGuardrails("charge $49 to card", "payment");
    expect(result.triggered).toBe(false);
  });

  // GR-06 Mass Email
  test("GR-06 HOLD: bulk email to 500 users", () => {
    const result = evaluateGuardrails("send promo to 500 users", "email");
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("HOLD");
    expect(result.ruleId).toBe("GR-06");
  });

  test("GR-06 PASS: single email", () => {
    const result = evaluateGuardrails("send welcome email to john@example.com", "email");
    expect(result.triggered).toBe(false);
  });

  // GR-07 Privilege Escalation
  test("GR-07 HOLD: sudo in payload", () => {
    const result = evaluateGuardrails("run sudo apt-get update", "*");
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("HOLD");
    expect(result.ruleId).toBe("GR-07");
  });

  test("GR-07 PASS: normal command", () => {
    const result = evaluateGuardrails("list all files in directory", "*");
    expect(result.triggered).toBe(false);
  });

  // GR-08 External Write
  test("GR-08 HOLD: POST to external endpoint", () => {
    const result = evaluateGuardrails("POST /webhook/data", "api");
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("HOLD");
    expect(result.ruleId).toBe("GR-08");
  });

  test("GR-08 PASS: GET request", () => {
    const result = evaluateGuardrails("GET /api/status", "api");
    expect(result.triggered).toBe(false);
  });
});