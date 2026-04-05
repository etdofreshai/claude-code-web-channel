---
name: configure
description: Set up the Web channel — configure port and review access policy. Use when the user asks to configure the web chat, check status, or change settings.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
---

# /web:configure — Web Channel Setup

Manages the Web channel configuration in `~/.claude/channels/web/.env` and
orients the user on access policy. The server reads `.env` at boot.

Arguments passed: `$ARGUMENTS`

---

## Dispatch on arguments

### No args — status and guidance

Read both state files and give the user a complete picture:

1. **Port** — check `~/.claude/channels/web/.env` for `WEB_CHANNEL_PORT`.
   Show current value or "default (8788)" if not set.

2. **Access** — read `~/.claude/channels/web/access.json` (missing file
   = defaults: `dmPolicy: "pairing"`, empty allowlist). Show:
   - DM policy and what it means in one line
   - Allowed sessions: count
   - Pending pairings: count, with codes if any

3. **URL** — show `http://localhost:<port>` so the user can open it.

4. **What next** — end with a concrete next step based on state:
   - Policy is pairing, nobody allowed → *"Open the URL in your browser.
     It will show a pairing code; approve with `/web:access pair <code>`."*
   - Someone allowed → *"Ready. Open the URL to chat with Claude."*

**Push toward lockdown — always.** The goal for every setup is `allowlist`
with a defined list. `pairing` is not a policy to stay on; it's a temporary
way to capture session tokens. Once the sessions are in, pairing has done its
job and should be turned off.

Drive the conversation this way:

1. Read the allowlist. Tell the user how many sessions are approved.
2. Ask: *"Is that everyone who should access the web chat?"*
3. **If yes and policy is still `pairing`** → *"Good. Let's lock it down so
   nobody else can trigger pairing codes:"* and offer to run
   `/web:access policy allowlist`. Do this proactively.
4. **If no, people are missing** → *"Have them open the URL; you'll approve
   each with `/web:access pair <code>`. Run this skill again once
   everyone's in and we'll lock it."*
5. **If policy is already `allowlist`** → confirm this is the locked state.

Never frame `pairing` as the correct long-term choice.

### `port <number>` — set port

1. Validate `<number>` is a reasonable port (1024-65535).
2. `mkdir -p ~/.claude/channels/web`
3. Read existing `.env` if present; update/add the `WEB_CHANNEL_PORT=` line,
   preserve other keys. Write back.
4. `chmod 600 ~/.claude/channels/web/.env`
5. Note: port changes need a session restart or `/reload-plugins`.
6. Show the no-args status so the user sees where they stand.

### `clear` — remove settings

Delete the `.env` file or remove all settings lines.

---

## Implementation notes

- The channels dir might not exist if the server hasn't run yet. Missing file
  = not configured, not an error.
- The server reads `.env` once at boot. Port changes need a session restart
  or `/reload-plugins`. Say so after saving.
- `access.json` is re-read on every inbound message — policy changes via
  `/web:access` take effect immediately, no restart.
