import "server-only";
const WAITLIST_TABLE = "Waitlist" as const;
const TRIAL_INVITE_TABLE = "TrialInvite" as const;

export interface NormalizedWaitlistEntry {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: "PENDING" | "TRIAL_SENT" | "CONVERTED" | "DECLINED";
  statusLabel: string;
  trialDaysLeft: number | null;
  trialToken: string | null;
  trialSentAt: string | null;
  createdAt: string | null;
}

function normalizeWaitlistEntry(entry: any): NormalizedWaitlistEntry {
  const rawStatus = entry.status || "PENDING";
  const normalizedStatus =
    rawStatus === "APPROVED"
      ? "TRIAL_SENT"
      : rawStatus === "REJECTED"
        ? "DECLINED"
        : rawStatus;

  return {
    id: entry.id,
    companyName:
      entry.companyName ||
      entry.company_name ||
      entry.company ||
      entry.name ||
      "Unknown Company",
    email: entry.email,
    phone: entry.phone || entry.phoneNumber || entry.phone_number || null,
    source: entry.source || entry.howDidYouHear || entry.how_did_you_hear || null,
    status: normalizedStatus,
    statusLabel:
      normalizedStatus === "TRIAL_SENT" ? "Trial Sent" :
      normalizedStatus === "CONVERTED" ? "Converted" :
      normalizedStatus === "DECLINED" ? "Declined" :
      "Pending",
    trialDaysLeft: null,
    trialToken: entry.trialToken || entry.trial_token || null,
    trialSentAt: entry.trialSentAt || entry.trial_sent_at || null,
    createdAt: entry.createdAt || entry.created_at || null,
  };
}

function normalizeInviteStatus(status: string | null | undefined) {
  if (status === "CLAIMED") {
    return "CONVERTED";
  }

  if (status === "PENDING" || status === "EXPIRED") {
    return "TRIAL_SENT";
  }

  return null;
}

export async function fetchWaitlistEntries(supabase: any) {
  const [{ data, error }, { data: trialInvites, error: trialInviteError }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
    supabase
      .from(WAITLIST_TABLE)
      .select("*"),
    supabase
      .from(TRIAL_INVITE_TABLE)
      .select("*"),
    supabase
      .from("Subscription")
      .select("*"),
  ]);

  if (error) {
    console.error(`Waitlist fetch error from ${WAITLIST_TABLE}:`, error);
    return [];
  }

  if (trialInviteError) {
    console.error(`Trial invite fetch error from ${TRIAL_INVITE_TABLE}:`, trialInviteError);
  }

  if (subscriptionError) {
    console.error("Subscription fetch error from Subscription:", subscriptionError);
  }

  const latestInviteByEmail = new Map<string, any>();
  const latestSubscriptionByUserId = new Map<string, any>();

  for (const subscription of subscriptions || []) {
    const userId = typeof subscription.userId === "string" ? subscription.userId : null;
    if (!userId) continue;

    const existingSubscription = latestSubscriptionByUserId.get(userId);
    const subscriptionTime = new Date(
      subscription.currentPeriodEnd ||
      subscription.updatedAt ||
      subscription.updated_at ||
      subscription.createdAt ||
      subscription.created_at ||
      0
    ).getTime();
    const existingTime = existingSubscription
      ? new Date(
          existingSubscription.currentPeriodEnd ||
          existingSubscription.updatedAt ||
          existingSubscription.updated_at ||
          existingSubscription.createdAt ||
          existingSubscription.created_at ||
          0
        ).getTime()
      : -1;

    if (!existingSubscription || subscriptionTime >= existingTime) {
      latestSubscriptionByUserId.set(userId, subscription);
    }
  }

  for (const invite of trialInvites || []) {
    const email = typeof invite.email === "string" ? invite.email.toLowerCase() : null;
    if (!email) continue;

    const existingInvite = latestInviteByEmail.get(email);
    const inviteTime = new Date(
      invite.claimedAt ||
      invite.claimed_at ||
      invite.createdAt ||
      invite.created_at ||
      0
    ).getTime();
    const existingTime = existingInvite
      ? new Date(
          existingInvite.claimedAt ||
          existingInvite.claimed_at ||
          existingInvite.createdAt ||
          existingInvite.created_at ||
          0
        ).getTime()
      : -1;

    if (!existingInvite || inviteTime >= existingTime) {
      latestInviteByEmail.set(email, invite);
    }
  }

  const normalizedEntries = (data || []).map((entry: any) => {
    const normalizedEntry = normalizeWaitlistEntry(entry);
    const invite = latestInviteByEmail.get(normalizedEntry.email.toLowerCase());
    const inviteStatus = normalizeInviteStatus(invite?.status);
    const subscription = invite?.claimedBy
      ? latestSubscriptionByUserId.get(invite.claimedBy)
      : null;

    if (subscription?.status === "ACTIVE") {
      return {
        ...normalizedEntry,
        status: "CONVERTED",
        statusLabel: "Converted",
        trialDaysLeft: null,
        trialSentAt:
          invite?.claimedAt ||
          invite?.claimed_at ||
          invite?.createdAt ||
          invite?.created_at ||
          normalizedEntry.trialSentAt,
      };
    }

    if (subscription?.status === "TRIAL") {
      const trialEnd = subscription.currentPeriodEnd || subscription.current_period_end;
      const msLeft = trialEnd ? new Date(trialEnd).getTime() - Date.now() : 0;
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

      return {
        ...normalizedEntry,
        status: "TRIAL_SENT",
        statusLabel: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
        trialDaysLeft: daysLeft,
        trialSentAt:
          invite?.claimedAt ||
          invite?.claimed_at ||
          invite?.createdAt ||
          invite?.created_at ||
          normalizedEntry.trialSentAt,
      };
    }

    if (inviteStatus) {
      return {
        ...normalizedEntry,
        status: inviteStatus,
        statusLabel: inviteStatus === "CONVERTED" ? "Converted" : "Trial Sent",
        trialDaysLeft: null,
        trialSentAt:
          invite.claimedAt ||
          invite.claimed_at ||
          invite.createdAt ||
          invite.created_at ||
          normalizedEntry.trialSentAt,
      };
    }

    return normalizedEntry;
  });

  normalizedEntries.sort((a: NormalizedWaitlistEntry, b: NormalizedWaitlistEntry) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return normalizedEntries;
}

export async function updateWaitlistByEmail(
  supabase: any,
  email: string,
  values: {
    status: string;
  }
) {
  const statusValue =
    values.status === "DECLINED" ? "REJECTED" :
    values.status === "TRIAL_SENT" || values.status === "CONVERTED" ? "APPROVED" :
    values.status;

  const { error } = await supabase
    .from(WAITLIST_TABLE)
    .update({ status: statusValue })
    .eq("email", email.toLowerCase());

  if (error) {
    console.error(`Waitlist update by email failed on ${WAITLIST_TABLE}:`, error);
    return false;
  }

  return true;
}

export async function updateWaitlistByTrialToken(
  supabase: any,
  trialToken: string,
  values: {
    status: string;
  }
) {
  const { data: trialInvite, error } = await supabase
    .from(TRIAL_INVITE_TABLE)
    .select("email")
    .eq("token", trialToken)
    .single();

  if (error || !trialInvite?.email) {
    console.error(`Trial invite lookup failed on ${TRIAL_INVITE_TABLE}:`, error);
    return false;
  }

  return updateWaitlistByEmail(supabase, trialInvite.email, values);
}
