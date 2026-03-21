import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";

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

    const { name, email, password } = body;

    if (!name || typeof name !== 'string' || !email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from("Employee")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create sales member (pre-approved by default since founder is adding them)
    const { data: member, error: createError } = await supabase
      .from("Employee")
      .insert({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "SALES_MEMBER",
        isApproved: true, // Auto-approve when founder adds them
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
