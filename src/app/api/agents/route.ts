import { validateEnv } from "@/lib/env";
import { authenticateOperator } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

validateEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_FRAMEWORKS = ["openai", "claude", "langchain", "custom"];

export async function POST(req: NextRequest) {
  if (!authenticateOperator(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, framework, permissions } = body;

    if (!name || !framework || !permissions) {
      return NextResponse.json(
        { error: "name, framework, and permissions are required" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.length > 100) {
      return NextResponse.json({ error: "name must be a string under 100 characters" }, { status: 400 });
    }

    if (!VALID_FRAMEWORKS.includes(framework)) {
      return NextResponse.json(
        { error: `framework must be one of: ${VALID_FRAMEWORKS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
    }

    // Generate API key
    const rawKey = crypto.randomBytes(32).toString("hex");
    const hashedKey = crypto
      .createHash("sha256")
      .update(rawKey)
      .digest("hex");

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name,
        framework,
        permissions,
        api_key_hash: hashedKey,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      agent: data,
      api_key: rawKey,
      message: "Save this key — it will not be shown again",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
