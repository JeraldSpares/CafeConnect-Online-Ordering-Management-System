import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress =
  process.env.EMAIL_FROM || "CafeConnect <onboarding@resend.dev>";
const adminAddress = process.env.ADMIN_EMAIL || "";
const enabled = !!apiKey;
const resend = enabled ? new Resend(apiKey) : null;

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

type OrderItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type OrderEmailContext = {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  orderType: "dine_in" | "takeaway";
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  trackUrl?: string;
};

async function send(opts: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log(
      `[email skipped: no RESEND_API_KEY] to=${opts.to} subject="${opts.subject}"`,
    );
    return { skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[email error]", error);
      return { error };
    }
    return { id: data?.id };
  } catch (e) {
    console.error("[email throw]", e);
    return { error: e };
  }
}

function wrap(content: string, preview = "") {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Hebrew's Cafe</title>
</head>
<body style="margin:0; padding:0; background:#f7f2e9; font-family: 'Helvetica Neue', Arial, sans-serif; color:#1e1611;">
  <span style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden;">${preview}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f2e9; padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; border-radius:16px; box-shadow:0 8px 24px -12px rgba(30,22,17,.18); overflow:hidden;">
        <tr>
          <td style="background:#1e3932; padding:28px 32px; text-align:center; color:#fff;">
            <div style="display:inline-grid; place-items:center; width:48px; height:48px; background:#c79862; border-radius:50%; margin-bottom:10px;">
              <span style="font-size:22px;">☕</span>
            </div>
            <p style="margin:0; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#c79862;">CafeConnect</p>
            <h1 style="margin:4px 0 0; font-family:Georgia, serif; font-size:22px; font-weight:700;">Hebrew's Cafe</h1>
          </td>
        </tr>
        <tr><td style="padding:28px 32px;">${content}</td></tr>
        <tr>
          <td style="padding:18px 32px; background:#fbf3e7; text-align:center; color:#5b4f44; font-size:12px;">
            Thank you for choosing Hebrew's Cafe ☕<br/>
            <span style="opacity:.6;">Sent by CafeConnect</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function itemsTable(items: OrderItem[]) {
  const rows = items
    .map(
      (it) => `
    <tr>
      <td style="padding:6px 0; border-bottom:1px dashed #e7dccb;">${it.quantity}× ${it.item_name}</td>
      <td style="padding:6px 0; border-bottom:1px dashed #e7dccb; text-align:right;">${peso.format(Number(it.line_total))}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px; color:#1e1611;">
    ${rows}
  </table>`;
}

function totalsBlock(ctx: OrderEmailContext) {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px; margin-top:16px;">
    <tr>
      <td style="color:#5b4f44;">Subtotal</td>
      <td style="text-align:right;">${peso.format(Number(ctx.subtotal))}</td>
    </tr>
    ${
      Number(ctx.discount) > 0
        ? `<tr><td style="color:#5b4f44;">Discount</td><td style="text-align:right;">− ${peso.format(Number(ctx.discount))}</td></tr>`
        : ""
    }
    <tr>
      <td style="padding-top:8px; border-top:1px solid #e7dccb; font-weight:700; color:#1e3932;">Total</td>
      <td style="padding-top:8px; border-top:1px solid #e7dccb; text-align:right; font-weight:700; color:#1e3932; font-size:18px;">${peso.format(Number(ctx.total))}</td>
    </tr>
  </table>`;
}

// ---------- Customer: order placed ----------
export async function sendOrderPlacedToCustomer(ctx: OrderEmailContext) {
  if (!ctx.customerEmail) return { skipped: true, reason: "no email" };

  const content = `
  <p style="margin:0 0 4px; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#c79862;">Order Confirmation</p>
  <h2 style="margin:0; font-family:Georgia, serif; font-size:24px; color:#1e3932;">We got your order, ${escapeHtml(ctx.customerName)}!</h2>
  <p style="margin:8px 0 16px; color:#5b4f44; font-size:14px;">Show this order number when you arrive:</p>

  <div style="background:#eef3f0; border-radius:12px; padding:16px; text-align:center; margin-bottom:20px;">
    <p style="margin:0; font-family:monospace; letter-spacing:.15em; font-size:22px; color:#1e3932; font-weight:700;">${ctx.orderNumber}</p>
    <p style="margin:6px 0 0; font-size:12px; color:#5b4f44;">${ctx.orderType === "dine_in" ? "🪑 Dine-in" : "🛍️ Takeaway"}</p>
  </div>

  ${itemsTable(ctx.items)}
  ${totalsBlock(ctx)}

  ${
    ctx.notes
      ? `<p style="margin-top:14px; background:#fbf3e7; border-left:3px solid #c79862; padding:10px 12px; font-size:13px; color:#5b4f44;">📝 ${escapeHtml(ctx.notes)}</p>`
      : ""
  }

  ${
    ctx.trackUrl
      ? `<p style="margin-top:20px; text-align:center;"><a href="${ctx.trackUrl}" style="display:inline-block; background:#1e3932; color:#fff; text-decoration:none; padding:12px 24px; border-radius:999px; font-weight:600; font-size:14px;">Track your order →</a></p>`
      : ""
  }

  <p style="margin-top:18px; font-size:12px; color:#5b4f44;">Payment will be collected at the counter (cash, GCash, Maya, or card).</p>`;

  return send({
    to: ctx.customerEmail,
    subject: `Order ${ctx.orderNumber} confirmed · Hebrew's Cafe`,
    html: wrap(content, `Your order ${ctx.orderNumber} is confirmed.`),
  });
}

// ---------- Admin: new order arrived ----------
export async function sendNewOrderToAdmin(ctx: OrderEmailContext) {
  if (!adminAddress) return { skipped: true, reason: "no admin email" };

  const content = `
  <p style="margin:0 0 4px; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#c79862;">New Order</p>
  <h2 style="margin:0; font-family:Georgia, serif; font-size:22px; color:#1e3932;">🔔 ${ctx.orderNumber}</h2>
  <p style="margin:8px 0 16px; color:#5b4f44; font-size:14px;">
    From <strong>${escapeHtml(ctx.customerName)}</strong>${
      ctx.customerPhone ? ` · ${escapeHtml(ctx.customerPhone)}` : ""
    }${ctx.customerEmail ? ` · ${escapeHtml(ctx.customerEmail)}` : ""}<br/>
    ${ctx.orderType === "dine_in" ? "🪑 Dine-in" : "🛍️ Takeaway"}
  </p>

  ${itemsTable(ctx.items)}
  ${totalsBlock(ctx)}

  ${
    ctx.notes
      ? `<p style="margin-top:14px; background:#fbf3e7; border-left:3px solid #c79862; padding:10px 12px; font-size:13px; color:#5b4f44;">📝 ${escapeHtml(ctx.notes)}</p>`
      : ""
  }

  <p style="margin-top:18px; font-size:12px; color:#5b4f44;">Open the admin queue to mark this order as preparing.</p>`;

  return send({
    to: adminAddress,
    subject: `🔔 New order: ${ctx.orderNumber} · ${peso.format(Number(ctx.total))}`,
    html: wrap(content, `New order ${ctx.orderNumber} from ${ctx.customerName}.`),
  });
}

// ---------- Customer: order ready ----------
export async function sendOrderReadyToCustomer(ctx: {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  orderType: "dine_in" | "takeaway";
}) {
  if (!ctx.customerEmail) return { skipped: true, reason: "no email" };
  const content = `
  <p style="margin:0 0 4px; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#c79862;">Order Ready</p>
  <h2 style="margin:0; font-family:Georgia, serif; font-size:24px; color:#1e3932;">🔔 Your cup is ready, ${escapeHtml(ctx.customerName)}!</h2>
  <p style="margin:10px 0 0; font-size:14px; color:#5b4f44;">
    Order <strong style="font-family:monospace; color:#1e3932;">${ctx.orderNumber}</strong> is ready for ${ctx.orderType === "dine_in" ? "your table" : "pickup"}.
  </p>
  <p style="margin-top:18px; color:#5b4f44; font-size:13px;">See you in a sec ☕</p>`;
  return send({
    to: ctx.customerEmail,
    subject: `Your order ${ctx.orderNumber} is ready ☕`,
    html: wrap(content, `Your order ${ctx.orderNumber} is ready for pickup.`),
  });
}

// ---------- Customer: order completed ----------
export async function sendOrderCompletedToCustomer(ctx: {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  total: number;
}) {
  if (!ctx.customerEmail) return { skipped: true, reason: "no email" };
  const content = `
  <p style="margin:0 0 4px; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#c79862;">Thank you</p>
  <h2 style="margin:0; font-family:Georgia, serif; font-size:24px; color:#1e3932;">See you again, ${escapeHtml(ctx.customerName)} ☕</h2>
  <p style="margin:10px 0 0; font-size:14px; color:#5b4f44;">
    Order <strong style="font-family:monospace; color:#1e3932;">${ctx.orderNumber}</strong> · ${peso.format(Number(ctx.total))}
  </p>
  <p style="margin-top:14px; color:#5b4f44; font-size:13px;">We hope you enjoyed your cup. Want to share feedback? Just reply to this email.</p>`;
  return send({
    to: ctx.customerEmail,
    subject: `Thanks for your order at Hebrew's Cafe`,
    html: wrap(content, `Order ${ctx.orderNumber} completed.`),
  });
}

export function emailEnabled() {
  return enabled;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
