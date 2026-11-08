// Vercel serverless function: receives the pilot form and emails it to you with Resend.
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  required  re_... key from resend.com/api-keys
//   MAIL_TO         optional  where requests go (default es.shaxzod@gmail.com)
//   MAIL_FROM       optional  sender on a domain you verified in Resend, e.g. "Tartib <pilot@yourdomain.uz>"
//                             Without it, Resend's test sender is used, which only delivers to your own Resend account email.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const clean = (v, max = 1000) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  const b = typeof req.body === "string" ? safeJson(req.body) : req.body || {};

  // Bots fill the hidden "website" field; pretend success and send nothing.
  if (b.website) return res.status(200).json({ ok: true });

  const name = clean(b.name, 120);
  const company = clean(b.company, 160);
  const contact = clean(b.contact, 120);
  if (!name || !company || !contact) {
    return res.status(400).json({ ok: false, error: "name, company and contact are required" });
  }

  const problem = String(b.problem ?? "").trim().slice(0, 2000);
  const text = [
    "New Tartib pilot request",
    "",
    `Name: ${name}`,
    `Company: ${company}`,
    `Business: ${clean(b.business, 80)}`,
    `People on the floor: ${clean(b.staff, 40)}`,
    `Phone or Telegram: ${contact}`,
    `Page language: ${clean(b.language, 5)}`,
    "",
    "What goes wrong most often:",
    problem || "Not given",
  ].join("\n");

  const { data, error } = await resend.emails.send({
    from: process.env.MAIL_FROM || "Tartib <onboarding@resend.dev>",
    to: [process.env.MAIL_TO || "es.shaxzod@gmail.com"],
    subject: `Tartib pilot: ${company}`,
    text,
  });

  if (error) {
    console.error("Resend error:", error);
    return res.status(502).json({ ok: false, error: "Email could not be sent" });
  }
  return res.status(200).json({ ok: true, id: data?.id });
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
