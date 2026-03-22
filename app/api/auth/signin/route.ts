import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/utils/supabase/admin";
import { createSession } from "@/lib/auth/session";

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

    const { email, password } = body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS policies during authentication
    const supabase = createAdminClient();

    console.log("🔍 Login Debug:");
    console.log("  Email:", email.toLowerCase());
    console.log("  Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("  Has service key:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // First, try to get all employees to see if query works
    const { data: allEmployees, error: allError } = await supabase
      .from("Employee")
      .select("email, role");

    console.log("  All employees query:");
    console.log("    - Count:", allEmployees?.length || 0);
    console.log("    - Employees:", allEmployees?.map(e => e.email).join(", ") || "none");
    console.log("    - Error:", allError?.message || "none");

    // Find specific employee
    const { data: employee, error: fetchError } = await supabase
      .from("Employee")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    console.log("  Specific employee query:");
    console.log("    - Found:", !!employee);
    console.log("    - Role:", employee?.role);
    console.log("    - Error:", fetchError?.message || "none");
    console.log("    - Error code:", fetchError?.code || "none");

    if (fetchError || !employee) {
      console.log("❌ Employee not found!");
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (employee.role === "SALES" && !employee.isApproved) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is not active yet. Use the activation link sent to your email to set your password.",
        },
        { status: 403 }
      );
    }

    // Verify password
    console.log("  Testing password...");
    const isValid = employee.passwordHash
      ? await bcrypt.compare(password, employee.passwordHash)
      : false;
    console.log("  Password valid:", isValid);
    console.log("  Hash in DB:", employee.passwordHash?.substring(0, 20) + "...");

    if (!isValid) {
      console.log("❌ Password mismatch!");
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("✅ Login successful!");

    // Create session
    await createSession({
      employeeId: employee.id,
      role: employee.role,
      email: employee.email,
      isApproved: employee.isApproved,
    });

    // Determine redirect based on role and approval status
    let redirect = "/dashboard";
    // Support both ADMIN and FOUNDER roles for founder access
    if (employee.role === "FOUNDER" || employee.role === "ADMIN") {
      redirect = "/founder/dashboard";
    } else if (employee.role === "SALES") {
      redirect = employee.isApproved
        ? "/sales/dashboard"
        : "/sales/pending-approval";
    }

    return NextResponse.json({
      success: true,
      user: {
        id: employee.id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        isApproved: employee.isApproved,
      },
      redirect,
    });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
