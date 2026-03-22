import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || (session.role !== "FOUNDER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    const { data: entries, error } = await supabase
      .from("WaitlistEntry")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Waitlist fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch waitlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entries: entries || [] });
  } catch (error) {
    console.error("Waitlist fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist" },
      { status: 500 }
    );
  }
}
