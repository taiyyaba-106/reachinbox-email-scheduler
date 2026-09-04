import nodemailer from 'nodemailer';
import { config } from '../config/env';

export interface SendEmailOptions {
  recipient: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

let cachedTransporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  let user = config.ethereal.user;
  let pass = config.ethereal.password;
  let host = config.ethereal.host;
  let port = config.ethereal.port;

  // Auto-generate test account if environment variables are empty
  if (!user || !pass) {
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
    host = testAccount.smtp.host;
    port = testAccount.smtp.port;
    console.log(`[Ethereal SMTP] Created dynamic test account: ${user}`);
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const transporter = await getTransporter();

  const mailOptions = {
    from: '"ReachInbox Email Scheduler" <no-reply@reachinbox.com>',
    to: options.recipient,
    subject: options.subject,
    text: options.body,
    html: `<p>${options.body.replace(/\n/g, '<br>')}</p>`,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || false,
  };
}
