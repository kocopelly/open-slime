import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ImapFlow } from "imapflow";
import { createTransport } from "nodemailer";
import { simpleParser } from "mailparser";

const app = new Hono();

// Track highest seen UID per folder for /new endpoint
const lastSeenUid = new Map<string, number>();

const imapConfig = {
  host: process.env.IMAP_HOST ?? "localhost",
  port: Number(process.env.IMAP_PORT ?? 1143),
  secure: process.env.IMAP_SECURE === "true",
  auth: {
    user: process.env.IMAP_USER ?? "",
    pass: process.env.IMAP_PASS ?? "",
  },
  tls: { rejectUnauthorized: false },
  // STARTTLS: connect plaintext then upgrade
  ...(process.env.IMAP_STARTTLS === "true" ? { secure: false } : {}),
};

const smtpTransport = createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false, // STARTTLS: start plaintext, upgrade via STARTTLS
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
  tls: { rejectUnauthorized: false },
});

async function withImap<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow(imapConfig);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout();
  }
}

// Health check
app.get("/health", async (c) => {
  try {
    await withImap(async () => {});
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 503);
  }
});

// Check for new mail since last check (no LLM tokens burned)
app.get("/new", async (c) => {
  const folder = c.req.query("folder") ?? "INBOX";

  const result = await withImap(async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const status = client.mailbox;
      const exists = status?.exists ?? 0;

      // Find the actual highest UID by fetching the last message
      let highestUid = 0;
      if (exists > 0) {
        for await (const msg of client.fetch(
          `${exists}:${exists}`,
          { uid: true },
        )) {
          highestUid = msg.uid;
        }
      }

      const previous = lastSeenUid.get(folder) ?? highestUid;

      // First call: set baseline, report unseen count only
      if (!lastSeenUid.has(folder)) {
        lastSeenUid.set(folder, highestUid);
        return { newCount: 0, unseen: status?.unseen ?? 0, baseline: true };
      }

      // No new UIDs
      if (highestUid <= previous) {
        return { newCount: 0, unseen: status?.unseen ?? 0 };
      }

      // Fetch summaries of new messages (UIDs after the last seen)
      const newMessages: any[] = [];
      for await (const msg of client.fetch(
        `${previous + 1}:*`,
        { uid: true, envelope: true, flags: true },
        { uid: true }
      )) {
        newMessages.push({
          uid: msg.uid,
          from: msg.envelope.from?.[0]
            ? `${msg.envelope.from[0].name ?? ""} <${msg.envelope.from[0].address}>`
            : null,
          subject: msg.envelope.subject,
          date: msg.envelope.date,
        });
      }

      lastSeenUid.set(folder, highestUid);
      return {
        newCount: newMessages.length,
        unseen: status?.unseen ?? 0,
        messages: newMessages,
      };
    } finally {
      lock.release();
    }
  });

  return c.json(result);
});

// List folders
app.get("/folders", async (c) => {
  const folders = await withImap(async (client) => {
    const list = await client.list();
    return list.map((f) => ({
      name: f.name,
      path: f.path,
      messages: f.status?.messages,
      unseen: f.status?.unseen,
    }));
  });
  return c.json(folders);
});

// Search emails
app.get("/search", async (c) => {
  const folder = c.req.query("folder") ?? "INBOX";
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const q = c.req.query("q");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const since = c.req.query("since");
  const before = c.req.query("before");

  const results = await withImap(async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const query: Record<string, any> = {};
      if (q) query.body = q;
      if (from) query.from = from;
      if (to) query.to = to;
      if (since) query.since = new Date(since);
      if (before) query.before = new Date(before);
      if (Object.keys(query).length === 0) query.all = true;

      const messages: any[] = [];
      for await (const msg of client.fetch(query, {
        uid: true,
        envelope: true,
        flags: true,
      })) {
        messages.push({
          uid: msg.uid,
          from: msg.envelope.from?.[0]
            ? `${msg.envelope.from[0].name ?? ""} <${msg.envelope.from[0].address}>`
            : null,
          to: msg.envelope.to?.map(
            (a: any) => `${a.name ?? ""} <${a.address}>`
          ),
          subject: msg.envelope.subject,
          date: msg.envelope.date,
          flags: [...msg.flags],
        });
      }
      // Return newest first, then apply limit
      messages.sort((a, b) => b.uid - a.uid);
      return messages.slice(0, limit);
    } finally {
      lock.release();
    }
  });
  return c.json(results);
});

// Read single email
app.get("/email/:uid", async (c) => {
  const uid = Number(c.req.param("uid"));
  const folder = c.req.query("folder") ?? "INBOX";

  const email = await withImap(async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.fetchOne(
        String(uid),
        { uid: true, source: true, envelope: true },
        { uid: true }
      );

      const parsed = await simpleParser(msg.source);
      return {
        uid: msg.uid,
        from: parsed.from?.text,
        to: parsed.to?.text,
        cc: parsed.cc?.text ?? null,
        subject: parsed.subject,
        date: parsed.date,
        body: parsed.text ?? parsed.html ?? "",
        attachments: parsed.attachments.map((a) => ({
          filename: a.filename,
          size: a.size,
          contentType: a.contentType,
        })),
      };
    } finally {
      lock.release();
    }
  });
  return c.json(email);
});

// Mark email(s) as read
app.post("/mark-read", async (c) => {
  const { uid, uids, folder = "INBOX" } = await c.req.json();
  const uidList: number[] = uids ?? (uid ? [uid] : []);
  if (uidList.length === 0) {
    return c.json({ error: "uid or uids required" }, 400);
  }

  await withImap(async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageFlagsAdd(
        uidList.map(String),
        ["\\Seen"],
        { uid: true }
      );
    } finally {
      lock.release();
    }
  });

  return c.json({ ok: true, marked: uidList.length });
});

// Send email
app.post("/send", async (c) => {
  const { to, subject, body, cc, bcc, html } = await c.req.json();
  if (!to || !subject || !body) {
    return c.json({ error: "to, subject, and body are required" }, 400);
  }

  const info = await smtpTransport.sendMail({
    from: process.env.IMAP_USER,
    to,
    cc,
    bcc,
    subject,
    text: body,
    html: html ?? undefined,
  });

  return c.json({ messageId: info.messageId });
});

// Reply to email
app.post("/reply", async (c) => {
  const { uid, folder = "INBOX", body, replyAll = false } = await c.req.json();
  if (!uid || !body) {
    return c.json({ error: "uid and body are required" }, 400);
  }

  const original = await withImap(async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.fetchOne(
        String(uid),
        { uid: true, source: true, envelope: true },
        { uid: true }
      );
      return await simpleParser(msg.source);
    } finally {
      lock.release();
    }
  });

  const replyTo = original.replyTo?.text ?? original.from?.text;
  const ccList = replyAll ? original.cc?.text : undefined;

  const info = await smtpTransport.sendMail({
    from: process.env.IMAP_USER,
    to: replyTo,
    cc: ccList,
    subject: original.subject?.startsWith("Re:")
      ? original.subject
      : `Re: ${original.subject}`,
    text: body,
    inReplyTo: original.messageId,
    references: original.messageId,
  });

  return c.json({ messageId: info.messageId });
});

const port = Number(process.env.EMAIL_API_PORT ?? 3001);
console.log(`email-api listening on :${port}`);
serve({ fetch: app.fetch, port });
