const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "KYNETHRA_HMAC_SECRET",
];

const OPTIONAL_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "SLACK_WEBHOOK_URL",
  "TRIGGER_API_KEY",
];

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  REQUIRED_ENV_VARS.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  OPTIONAL_ENV_VARS.forEach((key) => {
    if (!process.env[key]) {
      warnings.push(key);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}`
    );
  }

  if (warnings.length > 0) {
    console.warn(
      `[Env] Optional env vars not set:\n${warnings.map((k) => `  - ${k}`).join("\n")}`
    );
  }

  console.log("[Env] All required environment variables present.");
}