# Access Control

The Web channel uses session-based access control. Each browser gets an opaque session token (stored in an httpOnly cookie), and the server decides whether to deliver messages based on its access policy.

## At a Glance

| | |
|---|---|
| **Default policy** | `pairing` — new browsers get a code to approve |
| **Sender identity** | Session token (32-char hex string in cookie) |
| **Config file** | `~/.claude/channels/web/access.json` |
| **Manage via** | `/web:access` skill in your terminal |

## DM Policies

| Policy | Behavior |
|--------|----------|
| `pairing` | Unknown sessions get a 6-char code. Approve with `/web:access pair <code>`. Max 3 pending codes, 1-hour expiry. |
| `allowlist` | Only sessions in `allowFrom` can send messages. Others are silently rejected. |
| `disabled` | All messages dropped. Emergency kill switch. |

## Session Tokens

Session tokens are generated on first visit (`randomBytes(16).toString('hex')`) and stored as httpOnly cookies. They are:

- **Opaque** — no user identity, just a random string
- **Durable** — persist for 1 year (cookie `Max-Age`)
- **Local only** — the server binds to `127.0.0.1`, so tokens can't be intercepted over the network

## Pairing Flow

1. User opens `http://localhost:8788` in their browser
2. Server generates a 6-char pairing code and shows it in the UI
3. User runs `/web:access pair <code>` in their Claude Code terminal
4. Session token is added to `allowFrom` and saved
5. Browser automatically transitions to the chat view

## Skill Commands

| Command | Description |
|---------|-------------|
| `/web:access` | Show current policy, allowlist, and pending pairings |
| `/web:access pair <code>` | Approve a pairing code |
| `/web:access deny <code>` | Reject a pairing code |
| `/web:access allow <token>` | Add a session token directly |
| `/web:access remove <token>` | Remove a session from the allowlist |
| `/web:access policy <mode>` | Set DM policy (`pairing`, `allowlist`, `disabled`) |
| `/web:access set <key> <val>` | Configure delivery options |

## Delivery Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `textChunkLimit` | number | 10000 | Max chars per message before splitting |
| `chunkMode` | `length` \| `newline` | `newline` | Split on hard limit or paragraph boundaries |
| `ackReaction` | string | (none) | Emoji to show on receipt |

## Security Notes

- The HTTP server binds to **127.0.0.1 only** — not exposed to the network
- Session cookies are **httpOnly** (not accessible to JavaScript)
- The `/web:access` skill **refuses requests from channel messages** to prevent prompt injection
- State files in `~/.claude/channels/web/` cannot be sent as attachments
- For remote access, use an SSH tunnel (`ssh -L 8788:localhost:8788 host`) or similar
