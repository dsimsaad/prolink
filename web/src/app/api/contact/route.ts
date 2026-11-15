import { NextRequest, NextResponse } from "next/server";
import nodemailer, { TransportOptions } from "nodemailer";

const DEFAULT_SUPPORT_INBOX = "prolnk.support@gmail.com";
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_QUERIES_PER_WINDOW = 3;
const MIN_FILL_TIME_MS = 2000; // 2 seconds minimum interaction before submission

// Global memory store for IP-based rate limiting
const ipRateLimits = new Map<string, number[]>();

// In-memory inquiry log
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

// Strip CR, LF, and control characters to prevent header injection
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n\x00-\x1F\x7F]+/g, " ").trim();
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
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { fullName, email, topic, message, hp_field, form_rendered_at } = body;

    // Spam defense 1: Honeypot field (bots fill invisible inputs; humans don't)
    if (hp_field) {
      console.warn("Spam rejected: honeypot field filled");
      return NextResponse.json({ success: true, message: "Inquiry processed." });
    }

    // Spam defense 2: Minimum fill time check (bots submit instantaneously)
    if (form_rendered_at && typeof form_rendered_at === "number") {
      const elapsed = Date.now() - form_rendered_at;
      if (elapsed < MIN_FILL_TIME_MS) {
        console.warn("Spam rejected: form filled faster than humanly possible");
        return NextResponse.json({ success: true, message: "Inquiry processed." });
      }
    }

    // Spam defense 3: Length limits and validation
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2 || fullName.length > 100) {
      return NextResponse.json(
        { error: "Please provide a valid full name (2 to 100 characters)." },
        { status: 400 }
      );
    }

    if (
      !email ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length < 5 || message.length > 5000) {
      return NextResponse.json(
        { error: "Message must be between 5 and 5,000 characters long." },
        { status: 400 }
      );
    }

    const cleanName = sanitizeHeader(fullName);
    const cleanEmail = sanitizeHeader(email);
    const cleanTopic = sanitizeHeader(topic || "General Inquiry");
    const cleanMessage = message.trim();

    const timestampIso = new Date().toISOString();

    // STEP 1: Persist the message in storage first (never lose an inquiry)
    const inquiryRecord: StoredInquiry = {
      id: `inq_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      topic: cleanTopic,
      message: cleanMessage,
      timestamp: timestampIso,
      ip,
      sentViaSmtp: false,
    };
    globalInquiries.push(inquiryRecord);

    // STEP 2: Send email notification via SMTP configured strictly from environment variables
    const supportInbox = process.env.SUPPORT_INBOX || DEFAULT_SUPPORT_INBOX;
    const smtpHost = process.env.SUPPORT_SMTP_HOST;
    const smtpPort = process.env.SUPPORT_SMTP_PORT ? Number(process.env.SUPPORT_SMTP_PORT) : undefined;
    const smtpUser = process.env.SUPPORT_SMTP_USER;
    const smtpPass = process.env.SUPPORT_SMTP_PASSWORD;

    let sentViaSmtp = false;

    if (smtpHost && smtpPort) {
      const isLoopback = smtpHost === "127.0.0.1" || smtpHost === "localhost";
      const hasAuth = Boolean(smtpUser && smtpPass);

      if (!hasAuth && !isLoopback) {
        // Any non-loopback host without credentials must fail with a logged error
        console.error("Configuration error: Remote SMTP host requires authentication credentials.");
      } else {
        try {
          const transportOptions: TransportOptions = {
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            requireTLS: hasAuth && smtpPort === 587,
            ignoreTLS: !hasAuth && isLoopback,
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 10_000,
            ...(hasAuth
              ? {
                  auth: {
                    user: smtpUser,
                    pass: smtpPass,
                  },
                }
              : {}),
          } as TransportOptions;

          const transporter = nodemailer.createTransport(transportOptions);

          const mailSubject = sanitizeHeader(`[ProLink Contact] ${cleanTopic} - from ${cleanName}`);
          const plainTextBody = [
            `New ProLink Contact Form Inquiry`,
            `---------------------------------`,
            `Sender: ${cleanName}`,
            `Email: ${cleanEmail}`,
            `Topic: ${cleanTopic}`,
            `Timestamp: ${timestampIso}`,
            ``,
            `Message:`,
            cleanMessage,
          ].join("\n");

          await transporter.sendMail({
            from: `"ProLink Support Desk" <${supportInbox}>`,
            to: supportInbox,
            replyTo: cleanEmail,
            subject: mailSubject,
            text: plainTextBody,
          });

          sentViaSmtp = true;
          inquiryRecord.sentViaSmtp = true;
        } catch (smtpErr) {
          // Log only error classification/type; never leak message body or credentials
          console.warn("SMTP dispatch failed:", smtpErr instanceof Error ? smtpErr.name : "Unknown error");
        }
      }
    }

    // Record rate limit for this IP
    recordQuery(ip);

    const emailSubject = sanitizeHeader(`[ProLink Inquiry] ${cleanTopic} - ${cleanName}`);
    const emailBody = `Name: ${cleanName}\nEmail: ${cleanEmail}\nTopic: ${cleanTopic}\n\nMessage:\n${cleanMessage}`;
    const mailtoUrl = `mailto:${supportInbox}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${supportInbox}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    return NextResponse.json({
      success: true,
      message: `Your message has been received by our support team.`,
      sentTo: supportInbox,
      sentViaSmtp,
      mailtoUrl,
      gmailComposeUrl,
    });
  } catch (error) {
    console.error("Error in contact API route:", error instanceof Error ? error.name : "InternalError");
    return NextResponse.json(
      { error: "Internal server error while processing message." },
      { status: 500 }
    );
  }
}
