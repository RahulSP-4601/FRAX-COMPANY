import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";
import { updateWaitlistByEmail } from "@/lib/waitlist";
import { sendTrialInviteEmail } from "@/lib/email";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  let body: any;

  try {
    const session = await getSession();

    if (!session || (session.role !== "FOUNDER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse JSON with error handling
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const { email, name } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = randomBytes(32).toString("hex");

    // Create trial invite (valid for 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const supabase = createAdminClient();

    const { data: trialInvite, error: createError } = await supabase
      .from("TrialInvite")
      .insert({
        employeeId: session.employeeId,
        token,
        email: email.toLowerCase(),
        name: name || null,
        expiresAt: expiresAt.toISOString(),
        status: "PENDING",
      })
      .select()
      .single();

    if (createError || !trialInvite) {
      console.error("Failed to create trial invite:", createError);
      return NextResponse.json(
        { error: "Failed to create trial invite" },
        { status: 500 }
      );
    }

    // Update waitlist if exists
    const waitlistUpdated = await updateWaitlistByEmail(supabase, email, {
        status: "TRIAL_SENT",
        trialToken: token,
        trialSentAt: new Date().toISOString(),
        invitedByEmployeeId: session.employeeId,
      });

    if (!waitlistUpdated) {
      console.error("Waitlist status update failed after creating trial invite");
    }

    const trialLink = `${process.env.NEXT_PUBLIC_FRAX_URL || "http://localhost:3000"}/trial/${token}`;

    await sendTrialInviteEmail({
      to: email.toLowerCase(),
      name: name || email,
      trialLink,
    });

    return NextResponse.json({
      success: true,
      trial: {
        id: trialInvite.id,
        token: trialInvite.token,
        trialLink,
      },
    });
  } catch (error) {
    console.error("Send trial error:", error);
    return NextResponse.json(
      { error: "Failed to send trial" },
      { status: 500 }
    );
  }
}
