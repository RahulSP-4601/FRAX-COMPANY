import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  let body: any;

  try {
    // Parse JSON with error handling
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid request format" },
        { status: 400 }
      );
    }

    const { token, userId, secret } = body;

    // Verify shared secret
    if (!secret || typeof secret !== 'string' || secret !== process.env.FRAX_COMPANY_API_SECRET) {
      return NextResponse.json(
        { success: false, error: "Invalid secret" },
        { status: 401 }
      );
    }

    if (!token || typeof token !== 'string' || !userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: "Token and userId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find trial invite
    const { data: trialInvite, error: fetchError } = await supabase
      .from("TrialInvite")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !trialInvite) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 404 }
      );
    }

    // Update trial invite
    const { error: updateError } = await supabase
      .from("TrialInvite")
      .update({
        status: "CLAIMED",
        claimedAt: new Date().toISOString(),
        claimedBy: userId,
      })
      .eq("id", trialInvite.id);

    if (updateError) {
      console.error("Failed to update trial invite:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to claim token" },
        { status: 500 }
      );
    }

    // Update waitlist if exists
    const { error: waitlistError } = await supabase
      .from("WaitlistEntry")
      .update({ status: "CONVERTED" })
      .eq("trialToken", token);

    if (waitlistError) {
      console.error("Failed to update waitlist:", waitlistError);
      // Don't fail the request if waitlist update fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Token claim error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
