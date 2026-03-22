import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";
import { createEmployeeActivationToken } from "@/lib/auth/employee-activation";
import { sendSalesMemberActivationEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const SALT_ROUNDS = 12;

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

    const { name, email } = body;

    if (!name || typeof name !== "string" || !email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const normalizedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    // Check if email already exists
    const { data: existing } = await supabase
      .from("Employee")
      .select("id, name, email, role, isApproved")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      if ((existing.role === "SALES_MEMBER" || existing.role === "SALES") && !existing.isApproved) {
        const token = await createEmployeeActivationToken({
          employeeId: existing.id,
          email: existing.email,
        });
        const activationLink = `${baseUrl}/activate?token=${encodeURIComponent(token)}`;

        await sendSalesMemberActivationEmail({
          to: existing.email,
          name: existing.name || normalizedName,
          activationLink,
        });

        return NextResponse.json({
          success: true,
          resent: true,
          member: {
            id: existing.id,
            name: existing.name,
            email: existing.email,
          },
        });
      }

      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const temporaryPassword = randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

    // Create a pending sales member. They set their own password via activation email.
    const { data: member, error: createError } = await supabase
      .from("Employee")
      .insert({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: "SALES_MEMBER",
        isApproved: false,
      })
      .select()
      .single();

    if (createError || !member) {
      console.error("Add member error:", createError);
      return NextResponse.json(
        { error: "Failed to add member" },
        { status: 500 }
      );
    }

    const token = await createEmployeeActivationToken({
      employeeId: member.id,
      email: member.email,
    });
    const activationLink = `${baseUrl}/activate?token=${encodeURIComponent(token)}`;

    try {
      await sendSalesMemberActivationEmail({
        to: member.email,
        name: member.name,
        activationLink,
      });
    } catch (emailError) {
      console.error("Add member email error:", emailError);
      await supabase.from("Employee").delete().eq("id", member.id);

      return NextResponse.json(
        { error: "Failed to send activation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
      },
    });
  } catch (error) {
    console.error("Add member error:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}
