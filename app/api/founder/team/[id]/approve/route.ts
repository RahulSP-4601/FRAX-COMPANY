import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || (session.role !== "FOUNDER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const supabase = createAdminClient();

    // This portal is currently single-tenant: there is no org/company scoping field
    // on Employee or in the session, so we can only authorize by role here.
    // We still verify the target record before updating so founders/admins cannot
    // approve arbitrary employee types by ID.
    const { data: member, error: fetchError } = await supabase
      .from("Employee")
      .select("id, role")
      .eq("id", id)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (member.role !== "SALES") {
      return NextResponse.json(
        { error: "Only sales members can be approved" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("Employee")
      .update({ isApproved: true })
      .eq("id", id);

    if (error) {
      console.error("Approve member error:", error);
      return NextResponse.json(
        { error: "Failed to approve member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve member error:", error);
    return NextResponse.json(
      { error: "Failed to approve member" },
      { status: 500 }
    );
  }
}
