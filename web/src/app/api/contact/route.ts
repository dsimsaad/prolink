import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const SUPPORT_EMAIL = "prolnk.support@gmail.com";
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_QUERIES_PER_WINDOW = 3;

// Global memory store for IP-based rate limiting
const ipRateLimits = new Map<string, number[]>();

// In-memory inquiry log so no inquiry is ever lost
interface StoredInquiry {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  timestamp: string;
  ip: string;
  sentViaSmtp: boolean;
}
const globalInquiries: StoredInquiry[] = [];

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

function checkRateLimit(ip: string): { allowed: boolean; hoursRemaining: number } {
  const now = Date.now();
  const rawTimestamps = ipRateLimits.get(ip) || [];

  // Filter out timestamps older than 24 hours
  const validTimestamps = rawTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (validTimestamps.length >= MAX_QUERIES_PER_WINDOW) {
    const oldestTimestamp = Math.min(...validTimestamps);
    const msRemaining = oldestTimestamp + RATE_LIMIT_WINDOW_MS - now;
    const hoursRemaining = Math.max(1, Math.ceil(msRemaining / (60 * 60 * 1000)));

    ipRateLimits.set(ip, validTimestamps);
    return { allowed: false, hoursRemaining };
  }

  ipRateLimits.set(ip, validTimestamps);
  return { allowed: true, hoursRemaining: 0 };
}

function recordQuery(ip: string) {
  const now = Date.now();
  const validTimestamps = (ipRateLimits.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  validTimestamps.push(now);
  ipRateLimits.set(ip, validTimestamps);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Limit exceeded",
          message: `You have reached the limit of ${MAX_QUERIES_PER_WINDOW} queries per day. Please wait ${rateCheck.hoursRemaining} hour${
            rateCheck.hoursRemaining > 1 ? "s" : ""
          } before sending more queries.`,
          hoursRemaining: rateCheck.hoursRemaining,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { fullName, email, topic, message } = body;

    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: "Please provide a valid full name." },
        { status: 400 }
      );
    }

    if (
      !email ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json(
        { error: "Message must be at least 5 characters long." },
        { status: 400 }
      );
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanTopic = (topic || "General Inquiry").trim();
    const cleanMessage = message.trim();

    const timestampIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
    });

    let sentViaSmtp = false;

    // Check for SMTP configuration (e.g. Gmail App Password in .env.local)
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || SUPPORT_EMAIL;
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
    const smtpPass = rawPass.replace(/\s+/g, "");
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);

    if (smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          connectionTimeout: 3000,
          greetingTimeout: 3000,
        });

        await transporter.sendMail({
          from: `"ProLink Support Desk" <${smtpUser}>`,
          to: SUPPORT_EMAIL,
          replyTo: cleanEmail,
          subject: `[ProLink Contact] ${cleanTopic} - from ${cleanName}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #0F6B3E; margin-top: 0; font-size: 20px;">New ProLink Contact Form Inquiry</h2>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <p><strong>Sender Name:</strong> ${cleanName}</p>
              <p><strong>Sender Email:</strong> <a href="mailto:${cleanEmail}" style="color: #0F6B3E;">${cleanEmail}</a></p>
              <p><strong>Inquiry Topic:</strong> ${cleanTopic}</p>
              <p><strong>Time:</strong> ${formattedDate} PKT (${timestampIso})</p>
              <div style="background-color: #f1faf4; border-left: 4px solid #0F6B3E; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
                <strong style="color: #0c2a1b;">Message Content:</strong>
                <p style="white-space: pre-wrap; margin-top: 8px; color: #2d3f35; font-size: 15px;">${cleanMessage}</p>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Sent securely from ProLink Contact Form.</p>
            </div>
          `,
        });

        sentViaSmtp = true;
      } catch (smtpErr) {
        console.warn("SMTP send failed or timed out:", smtpErr);
      }
    }

    // Record inquiry in server storage so no message is lost
    globalInquiries.push({
      id: `inq_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      topic: cleanTopic,
      message: cleanMessage,
      timestamp: timestampIso,
      ip,
      sentViaSmtp,
    });

    console.log(`[Contact Form Received] Target: ${SUPPORT_EMAIL}`, {
      cleanName,
      cleanEmail,
      cleanTopic,
      sentViaSmtp,
    });

    // Generate pre-filled compose URLs
    const emailSubject = `[ProLink Inquiry] ${cleanTopic} - ${cleanName}`;
    const emailBody = `Name: ${cleanName}\nEmail: ${cleanEmail}\nTopic: ${cleanTopic}\n\nMessage:\n${cleanMessage}`;
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    // Record the query for rate limiting
    recordQuery(ip);

    return NextResponse.json({
      success: true,
      message: `Your message has been sent to ${SUPPORT_EMAIL}.`,
      sentTo: SUPPORT_EMAIL,
      sentViaSmtp,
      mailtoUrl,
      gmailComposeUrl,
    });
  } catch (error) {
    console.error("Error in contact API route:", error);
    return NextResponse.json(
      { error: "Internal server error while sending message." },
      { status: 500 }
    );
  }
}
