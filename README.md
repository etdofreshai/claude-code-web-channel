# Web

Browser-based chat channel for Claude Code. Opens a localhost web UI where you can message Claude from any browser — like having Telegram or Discord, but self-hosted with no external service.

## Prerequisites

- [Bun](https://bun.sh) runtime
- Claude Code v2.1.80+
- Claude.ai Pro or Max subscription

## Quick Setup

### 1. Install the plugin

```
/plugin install web@claude-plugins-official
/reload-plugins
```

### 2. Launch with the channel flag

```bash
claude --channels plugin:web
```

### 3. Open the chat

Navigate to **http://localhost:8788** in your browser.

### 4. Pair your browser

The browser will show a 6-character pairing code. Approve it in your terminal:

```
/web:access pair <code>
```

### 5. Lock it down

Once all browsers are paired, switch to allowlist mode:

```
/web:access policy allowlist
```

## Configuration

Optionally change the port (default 8788):

```
/web:configure port 9090
```

Check status anytime:

```
/web:configure
```

## Tools

| Tool | Description |
|------|-------------|
| `reply` | Send a message to the web chat. Supports `reply_to` for quote-replies and `files` for attachments. |
| `react` | Add an emoji reaction to a message. |
| `edit_message` | Edit a previously sent message (useful for progress updates). |
| `fetch_messages` | Retrieve recent message history (up to 100 messages). |

## File Uploads

Click the 📎 button in the chat to upload files. Uploaded files are saved to `~/.claude/channels/web/inbox/` and Claude can read them.

Attachments sent by Claude (via the `files` parameter in `reply`) are served from `~/.claude/channels/web/outbox/`.

## Message Persistence

Messages are persisted in `~/.claude/channels/web/messages.json` (up to 500 messages). History is loaded when reconnecting.

## Access Control

See [ACCESS.md](ACCESS.md) for full details on pairing, allowlists, and policies.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_CHANNEL_PORT` | `8788` | HTTP server port |
| `WEB_STATE_DIR` | `~/.claude/channels/web` | State directory |
| `WEB_ACCESS_MODE` | (dynamic) | Set to `static` to pin config at boot |
