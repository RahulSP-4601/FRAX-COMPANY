import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || (session.role !== "FOUNDER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get all trial invites with employee info (using LEFT JOIN)
    const { data: trials, error } = await supabase
      .from("TrialInvite")
      .select(`
        id,
        email,
        name,
        status,
        createdAt,
        expiresAt,
        claimedAt,
        employee:Employee!TrialInvite_employeeId_fkey(
          name,
          email
        )
      `)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Trials fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch trials" },
        { status: 500 }
      );
    }

    return NextResponse.json({ trials: trials || [] });
  } catch (error) {
    console.error("Trials fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trials" },
      { status: 500 }
    );
  }
}
