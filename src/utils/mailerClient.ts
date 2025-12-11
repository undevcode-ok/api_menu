import axios from "axios";

const MAILER_BASE = process.env.MAILER_BASE || "http://localhost:3010";

export type MailPayload = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export async function sendMail(payload: MailPayload) {
  const url = `${MAILER_BASE}/api/mail/send`;
  const res = await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 10_000
  });
  return res.data;
}