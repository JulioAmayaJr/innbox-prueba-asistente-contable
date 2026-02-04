import "dotenv/config";
import nodemailer from "nodemailer";

const required = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Falta variable de entorno: ${k}`);
  return v;
};

const transporter = nodemailer.createTransport({
  host: required("SMTP_HOST"),
  port: Number(required("SMTP_PORT") || 587),
  secure: false,
  auth: {
    user: required("SMTP_USER"),
    pass: required("SMTP_PASS")
  }
});

const info = await transporter.sendMail({
  from: process.env.MAIL_FROM || process.env.SMTP_USER,
  to: required("MAIL_TO"),
  subject: "✅ Email de prueba - SMTP Gmail",
  text: "Si recibiste esto, el SMTP ya quedó."
});

console.log("OK:", info.messageId);
