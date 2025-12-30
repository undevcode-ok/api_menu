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
  private buildBaseTemplate(safeName: string, bodyText: string, link: string) {
    return `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            text-align: center;
            background-color: #ffffff;
            padding: 40px 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .logo-box {
            width: 80px;
            height: 80px;
            background-color: #FF6B35;
            margin: 0 auto 20px;
            padding: 15px;
            border-radius: 12px;
          }
          .logo-box img {
            width: 100%;
            height: 100%;
          }
          h1 {
            color: #333333;
            font-size: 24px;
          }
          p {
            color: #666666;
            font-size: 14px;
            line-height: 1.5;
          }
          a {
            color: #FF6B35;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-box">
            <img src="https://undevcode-menus.s3.sa-east-1.amazonaws.com/defaults/menu/Logo_menu_fondo_transparente.png" alt="Logo" />
          </div>
          <h1>Hola ${safeName}!</h1>
          <p>${bodyText}</p>
          <p><a href="${link}" target="_blank" rel="noopener">${link}</a></p>
        </div>
      </body>
    </html>
    `;
  }

  async sendPasswordInviteEmail(to: string, name: string, link: string): Promise<void> {
    const safeName = name?.trim() || "allí";
    const html = this.buildBaseTemplate(
      safeName,
      "Un administrador creó una cuenta para vos. Hacé clic en el siguiente enlace para configurar tu contraseña:",
      link
    );

    await this.sendMail({
      to,
      subject: "Configura tu contraseña",
      html,
    });
  }

  async sendPasswordRecoveryEmail(to: string, name: string, link: string): Promise<void> {
    const safeName = name?.trim() || "allí";
    const html = this.buildBaseTemplate(
      safeName,
      "Para resetear tu contraseña hacé clic en el siguiente enlace:",
      link
    );

    await this.sendMail({
      to,
      subject: "Recuperá tu contraseña",
      html,
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
