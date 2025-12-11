import axios from "axios";

const MAIL_ENDPOINT = "https://mail.flexitaim.com/api/mail/send";
const FROM_NAME = "Flexitaim Notifier";
const FROM_EMAIL = "info@flexitaim.com";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
};

class EmailService {
  async sendPasswordInviteEmail(to: string, name: string, link: string): Promise<void> {
    const safeName = name?.trim() || "allí";

    await this.sendMail({
      to,
      subject: "Configura tu contraseña",
      html: `<h1>Hola ${safeName}!</h1><p>Un administrador creó una cuenta para vos. Hacé clic en el siguiente enlace para configurar tu contraseña:</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  async sendPasswordRecoveryEmail(to: string, name: string, link: string): Promise<void> {
    const safeName = name?.trim() || "allí";

    await this.sendMail({
      to,
      subject: "Recuperá tu contraseña",
      html: `<p>Hola ${safeName},</p><p>Para resetear tu contraseña hacé clic en el siguiente enlace:</p><p><a href="${link}" target="_blank" rel="noopener">${link}</a></p>`,
    });
  }

  private async sendMail(payload: MailPayload) {
    await axios.post(
      MAIL_ENDPOINT,
      {
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        fromName: FROM_NAME,
        fromEmail: FROM_EMAIL,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10_000,
      }
    );
  }
}

export const emailService = new EmailService();
