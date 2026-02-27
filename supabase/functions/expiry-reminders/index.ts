import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const APP_URL = "https://colgatemarket.com"
const FROM = "Colgate Marketplace <noreply@colgatemarket.com>"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async () => {
  try {
    const now = new Date()
    const cutoffOld = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const cutoffNew = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000).toISOString()

    // Listings created 27–30 days ago that are still active and approved
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id, title, seller_id, created_at")
      .eq("status", "active")
      .eq("approval_status", "approved")
      .gte("created_at", cutoffOld)
      .lte("created_at", cutoffNew)

    if (error) {
      console.error("[expiry-reminders] fetch error:", error)
      return new Response("error", { status: 500 })
    }

    let sent = 0

    for (const listing of listings ?? []) {
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("notification_settings")
        .eq("id", listing.seller_id)
        .single()

      if (sellerProfile?.notification_settings?.listing_expiring === false) continue

      const { data: { user } } = await supabase.auth.admin.getUserById(listing.seller_id)
      if (!user?.email) continue

      const createdAt = new Date(listing.created_at)
      const archiveDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      const daysLeft = Math.ceil((archiveDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

      await sendEmail(
        user.email,
        `Your listing "${listing.title}" expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        template(`
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#09090b;">Listing expiring soon</p>
          <p style="margin:0 0 24px;font-size:15px;color:#71717a;line-height:1.6;">
            Your listing <strong style="color:#09090b;">${listing.title}</strong> will be
            automatically archived in <strong style="color:#09090b;">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6;">
            If the item hasn't sold yet, you can relist it after archiving. Visit your listing
            to update details or mark it as sold.
          </p>
          ${ctaButton("View listing", `${APP_URL}/listings/${listing.id}`)}
        `)
      ).catch(e => console.error(`[expiry-reminders] email failed for ${listing.id}:`, e))

      sent++
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (e) {
    console.error("[expiry-reminders]", e)
    return new Response("error", { status: 500 })
  }
})

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

function ctaButton(label: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border-radius:8px;background-color:#5e0c12;">
          <a href="${url}"
             style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${label} →
          </a>
        </td>
      </tr>
    </table>`
}

function template(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td style="background-color:#5e0c12;border-radius:12px 12px 0 0;padding:28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><img src="https://colgatemarket.com/logo.png" alt="" width="40" height="40" style="display:block;border-radius:8px;"/></td>
              <td style="padding-left:12px;">
                <p style="margin:0;font-size:18px;font-weight:700;color:#fff;">Colgate Marketplace</p>
                <p style="margin:2px 0 0;font-size:12px;color:#f1c5c8;">The Colgate University student marketplace</p>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">© 2026 Colgate Marketplace · Not affiliated with Colgate University</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
