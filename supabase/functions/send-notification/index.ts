import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!
const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const APP_URL = "https://colgatemarket.com"
const FROM = "Colgate Marketplace <noreply@colgatemarket.com>"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  if (req.headers.get("x-trigger-secret") !== TRIGGER_SECRET) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { type, id } = await req.json()

  try {
    if (type === "message_received") await onMessage(id)
    else if (type === "listing_approved") await onApproved(id)
    else if (type === "new_listing") await onNewListing(id)
    else if (type === "review_received") await onReview(id)
    return new Response("ok")
  } catch (e) {
    console.error(`[send-notification] ${type}:`, e)
    return new Response("error", { status: 500 })
  }
})

// ─── Handlers ───────────────────────────────────────────────────────────────

async function onMessage(messageId: string) {
  const { data: msg } = await supabase
    .from("messages")
    .select("content, type, conversation_id, sender_id")
    .eq("id", messageId)
    .single()

  // Only notify for regular text messages
  if (!msg || msg.type !== "text") return

  const { data: conv } = await supabase
    .from("conversations")
    .select("buyer_id, seller_id, listing_id")
    .eq("id", msg.conversation_id)
    .single()
  if (!conv) return

  const recipientId = msg.sender_id === conv.buyer_id ? conv.seller_id : conv.buyer_id

  const { data: recipientProfile } = await supabase
    .from("profiles")
    .select("notification_settings")
    .eq("id", recipientId)
    .single()
  if (!recipientProfile?.notification_settings?.message_received) return

  const { data: { user: recipient } } = await supabase.auth.admin.getUserById(recipientId)
  if (!recipient?.email) return

  const [{ data: sender }, { data: listing }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", msg.sender_id).single(),
    supabase.from("listings").select("title").eq("id", conv.listing_id).single(),
  ])

  const senderName = sender?.full_name || "Someone"
  const listingTitle = listing?.title || "your listing"
  const preview = msg.content?.length > 120 ? msg.content.slice(0, 120) + "…" : msg.content

  await sendEmail(
    recipient.email,
    `New message from ${senderName}`,
    template(`
      <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#09090b;">New message</p>
      <p style="margin:0 0 24px;font-size:15px;color:#71717a;line-height:1.6;">
        <strong style="color:#09090b;">${senderName}</strong> sent you a message about
        <strong style="color:#09090b;">${listingTitle}</strong>:
      </p>
      <div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${preview}"</p>
      </div>
      ${ctaButton("View conversation", `${APP_URL}/messages/${msg.conversation_id}`)}
    `)
  )
}

async function onApproved(listingId: string) {
  const { data: listing } = await supabase
    .from("listings")
    .select("title, seller_id")
    .eq("id", listingId)
    .single()
  if (!listing) return

  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("notification_settings")
    .eq("id", listing.seller_id)
    .single()
  if (!sellerProfile?.notification_settings?.listing_approved) return

  const { data: { user } } = await supabase.auth.admin.getUserById(listing.seller_id)
  if (!user?.email) return

  await sendEmail(
    user.email,
    `Your listing "${listing.title}" is live!`,
    template(`
      <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#09090b;">Your listing is live! 🎉</p>
      <p style="margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6;">
        Your listing <strong style="color:#09090b;">${listing.title}</strong> has been approved
        and is now visible on the Colgate Marketplace.
      </p>
      ${ctaButton("View listing", `${APP_URL}/listings/${listingId}`)}
    `)
  )
}

async function onNewListing(listingId: string) {
  const { data: listing } = await supabase
    .from("listings")
    .select("title, price, category, seller_id")
    .eq("id", listingId)
    .single()
  if (!listing) return

  // RPC returns emails of users who opted in, excluding the seller
  const { data: recipients } = await supabase.rpc("get_new_listing_recipients", {
    p_seller_id: listing.seller_id,
  })
  if (!recipients?.length) return

  const priceStr = listing.price != null
    ? `$${parseFloat(listing.price).toFixed(2)}`
    : "Negotiable"

  for (const { email } of recipients) {
    await sendEmail(
      email,
      `New listing: ${listing.title}`,
      template(`
        <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#09090b;">New listing posted</p>
        <p style="margin:0 0 24px;font-size:15px;color:#71717a;line-height:1.6;">
          A new item just landed on the marketplace.
        </p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
          <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#09090b;">${listing.title}</p>
          <p style="margin:0;font-size:14px;color:#6b7280;">${priceStr}</p>
        </div>
        ${ctaButton("View listing", `${APP_URL}/listings/${listingId}`)}
      `)
    ).catch(console.error) // Don't fail the whole batch for one bad email
  }
}

async function onReview(reviewId: string) {
  const { data: review } = await supabase
    .from("reviews")
    .select("rating, comment, seller_id, reviewer_id")
    .eq("id", reviewId)
    .single()
  if (!review) return

  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("notification_settings")
    .eq("id", review.seller_id)
    .single()
  if (!sellerProfile?.notification_settings?.review_received) return

  const { data: { user } } = await supabase.auth.admin.getUserById(review.seller_id)
  if (!user?.email) return

  const { data: reviewer } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", review.reviewer_id)
    .single()

  const reviewerName = reviewer?.full_name || "Someone"
  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating)

  await sendEmail(
    user.email,
    `${reviewerName} left you a ${review.rating}-star review`,
    template(`
      <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#09090b;">New review</p>
      <p style="margin:0 0 24px;font-size:15px;color:#71717a;line-height:1.6;">
        <strong style="color:#09090b;">${reviewerName}</strong> left you a review.
      </p>
      <div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0 0 8px;font-size:22px;color:#f59e0b;letter-spacing:2px;">${stars}</p>
        ${review.comment
          ? `<p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${review.comment}"</p>`
          : ""}
      </div>
      ${ctaButton("View your profile", `${APP_URL}/profile/${review.seller_id}`)}
    `)
  )
}

// ─── Email helpers ───────────────────────────────────────────────────────────

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
