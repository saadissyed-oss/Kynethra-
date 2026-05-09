import { kynethra } from "../../../packages/kynethra-sdk/src/index";

// Mock fetch
global.fetch = jest.fn();

describe("Kynethra SDK", () => {
  beforeEach(() => {
    kynethra.init({
      apiKey: "test-key",
      apiUrl: "http://localhost:3000",
    });
    jest.clearAllMocks();
  });

  test("ALLOW — executes the tool function", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        decision: "ALLOW",
        reason: "Passed all guardrails",
        latency_ms: 100,
      }),
    });

    const toolFn = jest.fn().mockResolvedValueOnce({ success: true });
    const result = await kynethra.wrap(toolFn, {
      payload: "SELECT * FROM users",
      action_type: "database",
    });

    expect(toolFn).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  test("HOLD — returns hold response without executing tool", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        decision: "HOLD",
        reason: "Held by Large Payment",
        latency_ms: 200,
      }),
    });

    const toolFn = jest.fn();
    const result = await kynethra.wrap(toolFn, {
      payload: "wire transfer $12,000",
      action_type: "payment",
    });

    expect(toolFn).not.toHaveBeenCalled();
    expect((result as any).decision).toBe("HOLD");
  });

  test("BLOCK — throws an error without executing tool", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        decision: "BLOCK",
        reason: "Blocked by DDL Guard",
        latency_ms: 50,
      }),
    });

    const toolFn = jest.fn();

    await expect(
      kynethra.wrap(toolFn, {
        payload: "DROP TABLE users",
        action_type: "database",
      })
    ).rejects.toThrow("Action blocked by Kynethra");

    expect(toolFn).not.toHaveBeenCalled();
  });
});