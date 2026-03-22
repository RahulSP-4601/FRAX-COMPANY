import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";

export async function DELETE(
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

    // Delete the sales member
    const { error } = await supabase
      .from("Employee")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete member error:", error);
      return NextResponse.json(
        { error: "Failed to delete member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete member error:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}
