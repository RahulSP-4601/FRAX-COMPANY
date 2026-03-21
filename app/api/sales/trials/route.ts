import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "SALES_MEMBER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get trials sent by this sales member
    const { data: trials, error } = await supabase
      .from("TrialInvite")
      .select("id, email, name, status, createdAt, expiresAt, claimedAt")
      .eq("employeeId", session.employeeId)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Sales trials fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch trials" },
        { status: 500 }
      );
    }

    return NextResponse.json({ trials: trials || [] });
  } catch (error) {
    console.error("Sales trials fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trials" },
      { status: 500 }
    );
  }
}
