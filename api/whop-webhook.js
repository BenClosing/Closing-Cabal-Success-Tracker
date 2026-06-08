// api/whop-webhook.js — Vercel serverless function
// Whop calls this when a membership becomes valid (new purchase) or invalid (cancel/lapse).
// Valid  -> add/activate the email in approved_members (lets them create an account)
// Invalid-> deactivate the email (locks them out)

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // NOTE: For production you'd verify the Whop signature here using
  // process.env.WHOP_WEBHOOK_SECRET. Since this data isn't sensitive we keep it simple,
  // but adding verification later is recommended.

  try {
    const event = req.body || {};
    const action = event.action || event.type || "";
    const data = event.data || {};
    const email = data?.user?.email;
    const whopUserId = data?.user?.id || null;

    if (!email) return res.status(200).json({ ok: true, note: "no email in payload" });
    const lower = String(email).toLowerCase();

    if (action.includes("valid") || action.includes("activated")) {
      await supabase.from("approved_members").upsert({
        email: lower,
        whop_user_id: whopUserId,
        active: true,
        updated_at: new Date().toISOString(),
      });
    } else if (action.includes("invalid") || action.includes("deactivat") || action.includes("cancel")) {
      await supabase
        .from("approved_members")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("email", lower);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("whop-webhook error", e);
    // Always 200 so Whop doesn't keep retrying on our internal errors.
    return res.status(200).json({ ok: false });
  }
}
