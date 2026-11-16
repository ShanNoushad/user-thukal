import { NextResponse } from "next/server";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

export async function POST(req) {
  try {
    const {
      email,
      name,
      bookingId,
      productName,
      variantLabel,
      quantity,
      unitPrice,
      subtotal,
      address,
      paymentMethod,
    } = await req.json();

    if (!email || !bookingId) {
      return NextResponse.json(
        { error: "email and bookingId are required" },
        { status: 400 }
      );
    }

    const addressLine = address
      ? [
          address.house,
          address.street,
          address.landmark,
          address.city,
          address.district,
          address.state,
          address.pinCode,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    const row = (label, value) =>
      value
        ? `<tr><td style="padding:6px 0"><b>${label}</b></td><td style="padding:6px 0">${esc(value)}</td></tr>`
        : "";

    // Logo: read public/logo.png and attach it inline.
    let attachments = [];
    try {
      const logoFile = fs.readFileSync(
        path.join(process.cwd(), "public", "logo.png")
      );
      attachments = [
        { filename: "logo.png", content: logoFile, contentId: "thukal-logo" },
      ];
    } catch (e) {
      console.error("Logo not found:", e.message);
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Thukal <onboarding@resend.dev>",
      replyTo: process.env.REPLY_TO_EMAIL || undefined,
      to: [email],
      subject: `Booking confirmed (#${bookingId})`,
      attachments,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          ${
            attachments.length
              ? `<img src="cid:thukal-logo" alt="Thukal" width="140" style="display:block;margin:0 auto 16px;height:auto;border:0">`
              : ""
          }
          <h2>Hi ${esc(name || "there")}, your booking is confirmed ✅</h2>
          <table style="width:100%;border-collapse:collapse">
            ${row("Booking ID", bookingId)}
            ${row("Product", productName)}
            ${row("Variant", variantLabel)}
            ${row("Quantity", quantity)}
            ${row("Unit price", unitPrice != null ? `₹${Number(unitPrice).toFixed(2)}` : "")}
            ${row("Subtotal", subtotal != null ? `₹${Number(subtotal).toFixed(2)}` : "")}
            ${row("Payment", paymentMethod)}
            ${row("Deliver to", addressLine)}
          </table>
          <p>Delivery charges, if applicable, will be confirmed before dispatch, and we will let you know the final payable amount.</p>
          <p>Reply to this email if you need any changes.</p>
        </div>`,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}