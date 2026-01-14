import nodemailer from "nodemailer";

import logger from "@/lib/logger";
import { getSiteBaseUrl } from "@/lib/urls";
import { ROUTES } from "@/lib/routes";

const DEFAULT_RESEND_SENDER = "SERP Apps <noreply@apps.serp.co>";

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

type VerificationEmailPurpose = "account_access" | "email_change";

interface VerificationEmailInput {
  email: string;
  code: string;
  token: string;
  expiresAt: Date;
  offerId?: string | null;
  customerName?: string | null;
  purpose?: VerificationEmailPurpose;
  verificationPath?: string | null;
}

export type SendVerificationEmailResult =
  | { ok: true }
  | { ok: false; error: string };

function getSiteUrl(): string | null {
  return getSiteBaseUrl();
}

function buildVerificationUrl(token: string, path?: string | null): string | null {
  const baseUrl = getSiteUrl();

  if (!baseUrl) {
    return null;
  }

  const resolvedPath = path === null ? null : path ?? ROUTES.accountVerify;
  if (!resolvedPath) {
    return null;
  }

  const url = new URL(resolvedPath, baseUrl);
  url.searchParams.set("token", token);

  return url.toString();
}

function buildEmailHtml(input: VerificationEmailInput): string {
  const purpose = input.purpose ?? "account_access";
  const verificationUrl = buildVerificationUrl(input.token, input.verificationPath);
  const expires = input.expiresAt.toLocaleString("en-US", { timeZone: "UTC", hour12: true });

  const offerNote = purpose === "account_access" && input.offerId
    ? `<p style="margin: 0 0 16px; color: #4f46e5; font-size: 15px;">Recent purchase: <strong>${input.offerId}</strong></p>`
    : "";

  const greeting = input.customerName
    ? `Hi ${input.customerName},`
    : "Hi there,";

  const headline =
    purpose === "email_change"
      ? "Confirm your email change"
      : "Verify your email to access your downloads";
  const introCopy =
    purpose === "email_change"
      ? "We received a request to update the email on your SERP account. Use the code below to confirm this new email address."
      : "Thanks for your purchase! To access your account dashboard and permissions, confirm your email using the code below.";

  return `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 24px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(15, 23, 42, 0.1);">
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827; font-weight: 700;">${headline}</h1>
        <p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.6;">
          ${introCopy}
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
  const purpose = input.purpose ?? "account_access";
  const verificationUrl = buildVerificationUrl(input.token, input.verificationPath);
  const offerLine = purpose === "account_access" && input.offerId ? `Recent purchase: ${input.offerId}\n\n` : "";
  const headline =
    purpose === "email_change"
      ? "Confirm your email change"
      : "Verify your email to access your downloads";
  const introCopy =
    purpose === "email_change"
      ? "We received a request to update the email on your SERP account. Use the code below to confirm this new email address."
      : "Thanks for your purchase! To access your account dashboard and permissions, confirm your email using the code below.";
  const lines = [
    headline,
    "",
    `${offerLine}${introCopy}`,
    "",
    `Your verification code is ${input.code}.`,
    "",
    verificationUrl ? `Verify in one click: ${verificationUrl}` : "",
    "",
    "If you didn’t request this email, you can ignore it.",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function sendVerificationEmail(input: VerificationEmailInput): Promise<SendVerificationEmailResult> {
  const purpose = input.purpose ?? "account_access";
  const subject =
    purpose === "email_change"
      ? "Confirm your email change"
      : input.offerId
        ? `Confirm your email to access ${input.offerId}`
        : "Verify your email to access your downloads";

  const html = buildEmailHtml(input);
  const text = buildEmailText(input);

  const smtpConfig = getSmtpConfig();
  const resendConfig = getResendConfig();
  const deliveryErrorMessage = "We couldn't send the verification email. Please try again or contact support.";

  if (!smtpConfig.config && !resendConfig.config) {
    const missing = smtpConfig.missing.join(", ");
    logger.error("account_email.delivery_not_configured", {
      email: input.email,
      offerId: input.offerId,
      subject,
      missing,
      resendMissing: resendConfig.missing.join(", "),
    });
    return { ok: false, error: deliveryErrorMessage };
  }

  if (smtpConfig.config) {
    try {
      const transporter = await getTransporter(smtpConfig.config);

      await transporter.sendMail({
        from: smtpConfig.config.sender,
        to: input.email,
        subject,
        html,
        text,
        replyTo: smtpConfig.config.replyTo,
      });

      logger.info("account_email.sent", {
        email: input.email,
        offerId: input.offerId,
        provider: "smtp",
        host: smtpConfig.config.host,
        port: smtpConfig.config.port,
      });
      return { ok: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.error("account_email.delivery_failed", {
        email: input.email,
        offerId: input.offerId,
        provider: "smtp",
        error: reason,
      });

      if (resendConfig.config) {
        logger.warn("account_email.smtp_failed_fallback", {
          email: input.email,
          offerId: input.offerId,
        });
        const resendResult = await sendWithResend({
          config: resendConfig.config,
          input,
          subject,
          html,
          text,
        });
        if (resendResult.ok) {
          return { ok: true };
        }
      }

      return { ok: false, error: deliveryErrorMessage };
    }
  }

  if (resendConfig.config) {
    const resendResult = await sendWithResend({
      config: resendConfig.config,
      input,
      subject,
      html,
      text,
    });
    if (resendResult.ok) {
      return { ok: true };
    }
  }

  return { ok: false, error: deliveryErrorMessage };
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

function getSmtpConfig(): { config: SmtpConfig | null; missing: string[] } {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const sender = process.env.ACCOUNT_EMAIL_SENDER;

  const missing = [
    host ? null : "SMTP_HOST",
    portRaw ? null : "SMTP_PORT",
    user ? null : "SMTP_USER",
    pass ? null : "SMTP_PASS",
    sender ? null : "ACCOUNT_EMAIL_SENDER",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return { config: null, missing };
  }

  const port = Number(portRaw);

  if (!Number.isFinite(port) || port <= 0) {
    logger.error("account_email.invalid_port", { port: portRaw });
    return { config: null, missing: ["SMTP_PORT"] };
  }

  const replyTo = process.env.ACCOUNT_EMAIL_REPLY_TO;
  const secureEnv = process.env.SMTP_SECURE?.toLowerCase();
  const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;

  const resolvedHost = host as string;
  const resolvedUser = user as string;
  const resolvedPass = pass as string;
  const resolvedSender = sender as string;

  return {
    config: {
      host: resolvedHost,
      port,
      secure,
      user: resolvedUser,
      pass: resolvedPass,
      sender: resolvedSender,
      replyTo: replyTo && replyTo.length > 0 ? replyTo : undefined,
    },
    missing,
  };
}

type ResendConfig = {
  apiKey: string;
  sender: string;
  replyTo?: string;
  senderIsDefault: boolean;
};

function getResendConfig(): { config: ResendConfig | null; missing: string[] } {
  const apiKey = process.env.RESEND_API_KEY;
  const senderRaw = process.env.ACCOUNT_EMAIL_SENDER;
  const sender = senderRaw?.trim() || DEFAULT_RESEND_SENDER;
  const senderIsDefault = !senderRaw || senderRaw.trim().length === 0;

  const missing = [
    apiKey ? null : "RESEND_API_KEY",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return { config: null, missing };
  }

  const replyTo = process.env.ACCOUNT_EMAIL_REPLY_TO;
  return {
    config: {
      apiKey: String(apiKey).trim(),
      sender: String(sender).trim(),
      replyTo: replyTo && replyTo.length > 0 ? replyTo : undefined,
      senderIsDefault,
    },
    missing,
  };
}

async function sendWithResend({
  config,
  input,
  subject,
  html,
  text,
}: {
  config: ResendConfig;
  input: VerificationEmailInput;
  subject: string;
  html: string;
  text: string;
}): Promise<SendVerificationEmailResult> {
  try {
    if (config.senderIsDefault) {
      logger.info("account_email.resend_default_sender", {
        email: input.email,
        offerId: input.offerId,
        sender: config.sender,
      });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(config.apiKey);

    await resend.emails.send({
      from: config.sender,
      to: input.email,
      subject,
      html,
      text,
      replyTo: config.replyTo,
    });

    logger.info("account_email.sent", {
      email: input.email,
      offerId: input.offerId,
      provider: "resend",
    });

    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error("account_email.delivery_failed", {
      email: input.email,
      offerId: input.offerId,
      provider: "resend",
      error: reason,
    });
    return { ok: false, error: reason };
  }
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
