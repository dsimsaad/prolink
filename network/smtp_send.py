import getpass, os, smtplib, ssl
from email.message import EmailMessage
import typer

# Build an RFC 5322 email and send it over SMTP, upgrading with STARTTLS when requested.
def send_mail(sender: str = os.getenv("SMTP_FROM", "me@prolink.test"), to: str = "alice@prolink.test",
              subject: str = "Hello", body: str = "Hello from ProLink", host: str = os.getenv("SMTP_HOST", "127.0.0.1"),
              port: int = int(os.getenv("SMTP_PORT", "2525")), starttls: bool = False,
              cafile: str | None = None, user: str | None = os.getenv("SMTP_USER"), trace: bool = False) -> None:
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = sender, to, subject
    msg.set_content(body)
    with smtplib.SMTP(host, port, timeout=10) as smtp:
        smtp.set_debuglevel(1 if trace else 0)
        if starttls:
            smtp.starttls(context=ssl.create_default_context(cafile=cafile))
        if user:
            smtp.login(user, os.getenv("SMTP_PASSWORD") or getpass.getpass())
        smtp.send_message(msg)

if __name__ == "__main__":
    typer.run(send_mail)
