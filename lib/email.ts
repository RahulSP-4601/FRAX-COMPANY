import "server-only";
import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  return new Resend(apiKey);
}

function getFromEmail() {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("Missing RESEND_FROM_EMAIL environment variable");
  }

  return fromEmail;
}

export async function sendSalesMemberActivationEmail({
  to,
  name,
  activationLink,
}: {
  to: string;
  name: string;
  activationLink: string;
}) {
  const resend = getResendClient();

  await resend.emails.send({
    from: getFromEmail(),
    to,
    subject: "Activate your FRAX sales team account",
    text: [
      `Hi ${name},`,
      "",
      "Your FRAX sales team account has been created.",
      "Use the link below to set your password and activate your account:",
      activationLink,
      "",
      "This link expires in 7 days.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${name},</p>
        <p>Your FRAX sales team account has been created.</p>
        <p>Use the link below to set your password and activate your account:</p>
        <p>
          <a
            href="${activationLink}"
            style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px;"
          >
            Activate Account
          </a>
        </p>
        <p>If the button does not work, paste this URL into your browser:</p>
        <p>${activationLink}</p>
        <p>This link expires in 7 days.</p>
      </div>
    `,
  });
}

export async function sendTrialInviteEmail({
  to,
  name,
  trialLink,
}: {
  to: string;
  name: string;
  trialLink: string;
}) {
  const resend = getResendClient();

  await resend.emails.send({
    from: getFromEmail(),
    to,
    subject: "Free 1 Month Access — Set Up Your FRAX Account",
    text: [
      `Hi ${name},`,
      "",
      "Your FRAX free trial is ready.",
      "Use the link below to create your account on FRAX and start your 1 month free access:",
      trialLink,
      "",
      "This link is valid for 30 days.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${name},</p>
        <p>Your FRAX free trial is ready.</p>
        <p>Use the link below to create your account on the FRAX website and start your <strong>1 month free access</strong>:</p>
        <p>
          <a
            href="${trialLink}"
            style="display: inline-block; padding: 12px 20px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px;"
          >
            Start Free Trial
          </a>
        </p>
        <p>If the button does not work, paste this URL into your browser:</p>
        <p>${trialLink}</p>
        <p>This link is valid for 30 days.</p>
      </div>
    `,
  });
}
