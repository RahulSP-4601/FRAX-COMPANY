import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

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

    const supabase = await createClient();

    // Approve the sales member
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
