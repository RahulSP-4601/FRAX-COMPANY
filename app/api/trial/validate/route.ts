import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: NextRequest) {
  let body: any;

  try {
    // Parse JSON with error handling
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { valid: false, error: "Invalid request format" },
        { status: 400 }
      );
    }

    const { token, secret } = body;

    // Verify shared secret
    const expectedSecret =
      process.env.FRAX_COMPANY_API_SECRET || process.env.INTERNAL_API_SECRET;

    if (!secret || typeof secret !== 'string' || secret !== expectedSecret) {
      return NextResponse.json(
        { valid: false, error: "Invalid secret" },
        { status: 401 }
      );
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find trial invite
    const { data: trialInvite, error: fetchError } = await supabase
      .from("TrialInvite")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !trialInvite) {
      return NextResponse.json(
        { valid: false, error: "Invalid token" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(trialInvite.expiresAt)) {
      await supabase
        .from("TrialInvite")
        .update({ status: "EXPIRED" })
        .eq("id", trialInvite.id);

      return NextResponse.json(
        { valid: false, error: "Token expired" },
        { status: 410 }
      );
    }

    // Check if already claimed
    if (trialInvite.status === "CLAIMED") {
      return NextResponse.json(
        { valid: false, error: "Token already used" },
        { status: 410 }
      );
    }

    // Valid token
    return NextResponse.json({
      valid: true,
      email: trialInvite.email,
      name: trialInvite.name || null,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
