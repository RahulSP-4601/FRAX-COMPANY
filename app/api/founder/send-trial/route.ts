import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";
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

    // Create trial invite (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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
    const { error: waitlistError } = await supabase
      .from("WaitlistEntry")
      .update({
        status: "TRIAL_SENT",
        trialToken: token,
        trialSentAt: new Date().toISOString(),
        invitedByEmployeeId: session.employeeId,
      })
      .eq("email", email.toLowerCase());

    if (waitlistError) {
      console.error("Failed to update waitlist:", waitlistError);
      // Don't fail the request if waitlist update fails
    }

    // TODO: Send email with trial link
    // const trialLink = `${process.env.NEXT_PUBLIC_FRAX_URL}/trial/${token}`;
    // await sendEmail({
    //   to: email,
    //   subject: "Your FRAX Free Trial",
    //   html: `Click here to start: ${trialLink}`,
    // });

    return NextResponse.json({
      success: true,
      trial: {
        id: trialInvite.id,
        token: trialInvite.token,
        // Include trial link in response for now (will be sent via email)
        trialLink: `${process.env.NEXT_PUBLIC_FRAX_URL || "http://localhost:3000"}/trial/${token}`,
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
