---
name: email
description: Read, search, and send email via the email-api sidecar.
metadata:
  { "openclaw": { "emoji": "📧", "always": true } }
---

# Email

Base URL: `http://email-api:3001`

## Search emails

```
curl -s 'http://email-api:3001/search?q=meeting&from=alice@example.com&since=2026-03-01&limit=10'
```

Query params: `q` (text search), `from`, `to`, `since` (YYYY-MM-DD), `before` (YYYY-MM-DD), `folder` (default INBOX), `limit` (default 20, max 100).

Returns: `[{uid, from, to, subject, date, flags}]`

## Read an email

```
curl -s 'http://email-api:3001/email/12345'
```

Optional query param: `folder` (default INBOX).

Returns: `{uid, from, to, cc, subject, date, body, attachments: [{filename, size, contentType}]}`

## Send an email

```
curl -s -X POST http://email-api:3001/send -H 'Content-Type: application/json' -d '{"to":"bob@example.com","subject":"Hello","body":"Hi Bob"}'
```

Body fields: `to` (required), `subject` (required), `body` (required), `cc`, `bcc`, `html`.

## Reply to an email

```
curl -s -X POST http://email-api:3001/reply -H 'Content-Type: application/json' -d '{"uid":12345,"body":"Thanks!","replyAll":false}'
```

Body fields: `uid` (required), `body` (required), `folder` (default INBOX), `replyAll` (default false).

## Mark as read

```
curl -s -X POST http://email-api:3001/mark-read -H 'Content-Type: application/json' -d '{"uid":12345}'
```

Single UID or batch: `{"uids": [12345, 12346, 12347]}`. Optional `folder` (default INBOX).

Mark emails as read after handling them to keep the inbox tidy.

## Check for new mail

```
curl -s http://email-api:3001/new
```

Returns `{newCount, unseen, messages?}`. First call sets the baseline. Subsequent calls return only messages arrived since the last check. Use this for polling — no LLM tokens burned on empty checks.

Optional query param: `folder` (default INBOX).

## List folders

```
curl -s http://email-api:3001/folders
```

Returns: `[{name, path, messages, unseen}]`

## Notes

- Use `curl -s` for all requests. Parse JSON with `jq` when needed.
- UIDs are folder-specific. Always use the same folder for search and read.
