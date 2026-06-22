// ============================================================
// Supabase Edge Function: send-reply-email
// Emails the listing OWNER whenever someone posts a reply to
// their trade request. Triggered by a Database Webhook on
// INSERT into public.trade_replies.
//
// Deploy:
//   supabase functions deploy send-reply-email --no-verify-jwt
// Set the email key (one time):
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Must be a domain you've verified in Resend. Use onboarding@resend.dev
// only for testing — it can't deliver to arbitrary inboxes in production.
const FROM = "Gulf Trade Portal <notifications@gulftradeportal.com>";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const reply = payload.record;
    if (!reply || !reply.listing_id) {
      return new Response("No reply record", { status: 200 });
    }

    // 1. Find the listing this reply is attached to + its owner.
    const { data: listing, error: lErr } = await admin
      .from("listings")
      .select("id, title, product, user_id")
      .eq("id", reply.listing_id)
      .single();
    if (lErr || !listing) {
      console.error("Listing lookup failed:", lErr?.message);
      return new Response("Listing not found", { status: 200 });
    }

    // 2. Find the owner's email. Prefer the business email on their
    //    company profile; fall back to their login (auth) email.
    let ownerEmail: string | null = null;
    const { data: co } = await admin
      .from("companies")
      .select("email")
      .eq("user_id", listing.user_id)
      .maybeSingle();
    if (co?.email) ownerEmail = co.email;
    if (!ownerEmail) {
      const { data: u } = await admin.auth.admin.getUserById(listing.user_id);
      ownerEmail = u?.user?.email ?? null;
    }
    if (!ownerEmail) {
      console.error("No email for owner", listing.user_id);
      return new Response("No owner email", { status: 200 });
    }

    // 3. Compose + send the notification.
    const safe = (s: string) =>
      (s || "").replace(/[<>&]/g, (c) =>
        ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

    const subject = `New reply to your request: ${safe(listing.title || listing.product || "Trade request")}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h2 style="color:#0A7369;">You have a new reply on Gulf Trade Portal</h2>
        <p>Someone responded to your request
           <strong>${safe(listing.title || listing.product || "")}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#666;">Company</td><td style="padding:6px 0;"><strong>${safe(reply.company_name)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666;">Country</td><td style="padding:6px 0;">${safe(reply.country)}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Contact</td><td style="padding:6px 0;">${safe(reply.contact)}</td></tr>
        </table>
        <p style="background:#f5f3ee;border-radius:6px;padding:14px;white-space:pre-wrap;">${safe(reply.message)}</p>
        <p style="margin-top:20px;">
          <a href="https://gulftradeportal.com/portal.html"
             style="background:#0A7369;color:#fff;text-decoration:none;padding:10px 18px;border-radius:5px;font-weight:600;">
             View in your portal &rarr;</a>
        </p>
        <p style="color:#999;font-size:12px;margin-top:24px;">
          You received this because a buyer/seller replied to a request you posted on Gulf Trade Portal.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: ownerEmail, subject, html }),
    });

    if (!res.ok) {
      console.error("Resend error:", await res.text());
      return new Response("Email send failed", { status: 200 });
    }
    return new Response("Sent", { status: 200 });
  } catch (e) {
    console.error("Function error:", e);
    return new Response("Error", { status: 200 });
  }
});
