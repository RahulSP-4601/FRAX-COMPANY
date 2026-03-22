import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyEmployeeActivationToken } from "@/lib/auth/employee-activation";
import { createAdminClient } from "@/utils/supabase/admin";

const SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  let body: any;

  try {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request format" },
        { status: 400 }
      );
    }

    const { token, password } = body;

    if (!token || typeof token !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    let activationPayload;

    try {
      activationPayload = await verifyEmployeeActivationToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: "Activation link is invalid or expired" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: employee, error: employeeError } = await supabase
      .from("Employee")
      .select("id, email, role, isApproved")
      .eq("id", activationPayload.employeeId)
      .maybeSingle();

    if (employeeError || !employee || employee.email !== activationPayload.email) {
      return NextResponse.json(
        { success: false, error: "Activation link is invalid or expired" },
        { status: 400 }
      );
    }

    if (employee.role !== "SALES_MEMBER" && employee.role !== "SALES") {
      return NextResponse.json(
        { success: false, error: "Activation link is invalid" },
        { status: 400 }
      );
    }

    if (employee.isApproved) {
      return NextResponse.json(
        { success: false, error: "This account has already been activated" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { error: updateError } = await supabase
      .from("Employee")
      .update({
        passwordHash,
        isApproved: true,
      })
      .eq("id", employee.id);

    if (updateError) {
      console.error("Employee activation error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to activate account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Employee activation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to activate account" },
      { status: 500 }
    );
  }
}
