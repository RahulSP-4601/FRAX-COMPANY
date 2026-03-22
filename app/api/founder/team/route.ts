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
    // This endpoint intentionally bypasses Supabase RLS because employee auth in this
    // app is handled by our signed session cookie, not Supabase Auth, and the founder
    // dashboard must read Employee + TrialInvite records even when table policies are
    // not mapped to a Supabase user. Keep the explicit session role check above as the
    // authorization boundary unless the data model is expanded for multi-tenant scoping.

    // Get all sales team members
    const { data: members, error: membersError } = await supabase
      .from("Employee")
      .select("id, name, email, isApproved, createdAt")
      .eq("role", "SALES_MEMBER")
      .order("createdAt", { ascending: false });

    if (membersError) {
      console.error("Team fetch error:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch team" },
        { status: 500 }
      );
    }

    // Get trial counts for each member
    const membersWithCount = await Promise.all(
      (members || []).map(async (member) => {
        const { count } = await supabase
          .from("TrialInvite")
          .select("id", { count: "exact", head: true })
          .eq("employeeId", member.id);

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          isApproved: member.isApproved,
          createdAt: member.createdAt,
          trialsCount: count || 0,
        };
      })
    );

    return NextResponse.json({ members: membersWithCount });
  } catch (error) {
    console.error("Team fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}
