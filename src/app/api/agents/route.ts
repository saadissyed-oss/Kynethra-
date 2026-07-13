import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await req.json();
    const { name, framework, permissions } = body;

    if (!name || !framework || !permissions) {
      return NextResponse.json(
        { error: "name, framework, and permissions are required" },
        { status: 400 }
      );
    }

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
      message: "Save this key - it will not be shown again",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
