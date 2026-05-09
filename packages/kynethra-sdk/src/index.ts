export type Decision = "ALLOW" | "HOLD" | "BLOCK";

export interface GovernResponse {
  decision: Decision;
  reason: string;
  latency_ms: number;
}

export interface KynethraConfig {
  apiKey: string;
  apiUrl?: string;
}

let config: KynethraConfig = {
  apiKey: "",
  apiUrl: "http://localhost:3000",
};

export const kynethra = {
  init(cfg: KynethraConfig) {
    config = { ...config, ...cfg };
  },

  async wrap<T extends (...args: any[]) => Promise<any>>(
    toolFn: T,
    meta: { payload: string; action_type: string }
  ): Promise<ReturnType<T> | GovernResponse> {
    const response = await fetch(`${config.apiUrl}/api/govern`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kynethra-Key": config.apiKey,
      },
      body: JSON.stringify({
        payload: meta.payload,
        action_type: meta.action_type,
      }),
    });

    const result: GovernResponse = await response.json();

    if (result.decision === "BLOCK") {
      throw new Error(`Action blocked by Kynethra: ${result.reason}`);
    }

    if (result.decision === "HOLD") {
      return result;
    }

    // ALLOW — execute the original function
    return toolFn();
  },
};