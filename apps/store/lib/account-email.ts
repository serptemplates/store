import nodemailer from "nodemailer";

import logger from "@/lib/logger";

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

interface VerificationEmailInput {
  email: string;
  code: string;
  token: string;
  expiresAt: Date;
  offerId?: string | null;
  customerName?: string | null;
}

function getSiteUrl(): string | null {
  return process.env.NEXT_PUBLIC_SITE_URL ?? null;
}

function buildVerificationUrl(token: string): string | null {
  const baseUrl = getSiteUrl();

  if (!baseUrl) {
    return null;
  }

  const url = new URL("/account/verify", baseUrl);
  url.searchParams.set("token", token);

  return url.toString();
}

function buildEmailHtml(input: VerificationEmailInput): string {
  const verificationUrl = buildVerificationUrl(input.token);
  const expires = input.expiresAt.toLocaleString("en-US", { timeZone: "UTC", hour12: true });

  const offerNote = input.offerId
    ? `<p style="margin: 0 0 16px; color: #4f46e5; font-size: 15px;">Recent purchase: <strong>${input.offerId}</strong></p>`
    : "";

  const greeting = input.customerName
    ? `Hi ${input.customerName},`
    : "Hi there,";

  return `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 24px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(15, 23, 42, 0.1);">
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827; font-weight: 700;">Verify your email to access your downloads</h1>
        <p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.6;">
          Thanks for your purchase! To access your account dashboard and license keys, confirm your email using the code below.
        </p>
        ${offerNote}
        <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1.6px;">Your verification code</p>
          <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${input.code}</p>
        </div>
        ${verificationUrl ? `<p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.6;">You can also click the button below to verify automatically:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #22d3ee); color: #ffffff; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);">Verify email address</a>
        </p>` : ""}
        <p style="margin: 0 0 12px; color: #64748b; font-size: 14px;">This code expires at <strong>${expires} UTC</strong>.</p>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">If you didn’t request this email, feel free to ignore it.</p>
      </div>
      <p style="text-align: center; margin: 16px 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} serp.co • Secure digital downloads</p>
    </div>
  `;
}

function buildEmailText(input: VerificationEmailInput): string {
  const verificationUrl = buildVerificationUrl(input.token);
  const offerLine = input.offerId ? `Recent purchase: ${input.offerId}\n\n` : "";
  const lines = [
    "Verify your email to access your downloads",
    "",
    `${offerLine}Your verification code is ${input.code}.`,
    "",
    verificationUrl ? `Verify in one click: ${verificationUrl}` : "",
    "",
    "If you didn’t request this email, you can ignore it.",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function sendVerificationEmail(input: VerificationEmailInput): Promise<boolean> {
  const subject = input.offerId
    ? `Confirm your email to access ${input.offerId}`
    : "Verify your email to access your downloads";

  const html = buildEmailHtml(input);
  const text = buildEmailText(input);

  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    logger.info("account_email.smtp_not_configured", {
      email: input.email,
      offerId: input.offerId,
      subject,
    });
    return false;
  }

  try {
    const transporter = await getTransporter(smtpConfig);

    await transporter.sendMail({
      from: smtpConfig.sender,
      to: input.email,
      subject,
      html,
      text,
      replyTo: smtpConfig.replyTo,
    });

    logger.info("account_email.sent", {
      email: input.email,
      offerId: input.offerId,
      provider: "smtp",
      host: smtpConfig.host,
      port: smtpConfig.port,
    });

    return true;
  } catch (error) {
    logger.error("account_email.delivery_failed", {
      email: input.email,
      offerId: input.offerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  sender: string;
  replyTo?: string;
};

let cachedTransporter: MailTransporter | null = null;
let cachedConfigSignature: string | null = null;

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const sender = process.env.ACCOUNT_EMAIL_SENDER;

  if (!host || !portRaw || !user || !pass || !sender) {
    return null;
  }

  const port = Number(portRaw);

  if (!Number.isFinite(port) || port <= 0) {
    logger.error("account_email.invalid_port", { port: portRaw });
    return null;
  }

  const replyTo = process.env.ACCOUNT_EMAIL_REPLY_TO;
  const secureEnv = process.env.SMTP_SECURE?.toLowerCase();
  const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;

  return {
    host,
    port,
    secure,
    user,
    pass,
    sender,
    replyTo: replyTo && replyTo.length > 0 ? replyTo : undefined,
  };
}

async function getTransporter(config: SmtpConfig): Promise<MailTransporter> {
  const signature = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
  });

  if (cachedTransporter && cachedConfigSignature === signature) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await cachedTransporter.verify();
  } catch (error) {
    cachedTransporter = null;
    cachedConfigSignature = null;
    logger.error("account_email.smtp_verify_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  cachedConfigSignature = signature;
  return cachedTransporter;
}
