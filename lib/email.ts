import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; contentBase64: string; contentType?: string }[];
}) {
  const from = process.env.EMAIL_FROM!;
  const replyTo = process.env.EMAIL_REPLY_TO || from;

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.contentBase64, "base64"),
      contentType: a.contentType || "application/octet-stream",
    })),
  });
}
