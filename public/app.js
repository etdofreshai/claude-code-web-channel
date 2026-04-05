/**
 * Claude Web Chat — client-side application.
 * Plain JS, no framework. Connects via WebSocket to the MCP server.
 */

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  paired: false,
  messages: new Map(), // id -> { el, data }
  ws: null,
  reconnectDelay: 1000,
  uid: 0,
  pendingPermission: null,
}

// ─── DOM refs ────────────────────────────────────────────────────────────────

const $pairingScreen = document.getElementById('pairing-screen')
const $deniedScreen = document.getElementById('denied-screen')
const $chatScreen = document.getElementById('chat-screen')
const $pairingCode = document.getElementById('pairing-code')
const $copyCode = document.getElementById('copy-code')
const $status = document.getElementById('status')
const $messagesInner = document.getElementById('messages-inner')
const $messagesContainer = document.getElementById('messages')
const $textInput = document.getElementById('text-input')
const $sendBtn = document.getElementById('send-btn')
const $attachBtn = document.getElementById('attach-btn')
const $fileInput = document.getElementById('file-input')
const $fileChip = document.getElementById('file-chip')
const $permModal = document.getElementById('permission-modal')
const $permTool = document.getElementById('perm-tool')
const $permDesc = document.getElementById('perm-desc')
const $permInput = document.getElementById('perm-input')
const $permAllow = document.getElementById('perm-allow')
const $permDeny = document.getElementById('perm-deny')

// ─── Initialize ──────────────────────────────────────────────────────────────

async function init() {
  try {
    const res = await fetch('/api/session')
    const data = await res.json()

    if (data.status === 'paired') {
      showChat()
      connectWs()
    } else if (data.status === 'pairing') {
      showPairing(data.code)
      connectWs()
    } else {
      showDenied()
    }
  } catch (err) {
    console.error('Session init failed:', err)
    showDenied()
  }
}

// ─── Screen management ───────────────────────────────────────────────────────

function showPairing(code) {
  $pairingScreen.classList.remove('hidden')
  $deniedScreen.classList.add('hidden')
  $chatScreen.classList.add('hidden')
  $pairingCode.textContent = code
}

function showDenied() {
  $deniedScreen.classList.remove('hidden')
  $pairingScreen.classList.add('hidden')
  $chatScreen.classList.add('hidden')
}

function showChat() {
  state.paired = true
  $chatScreen.classList.remove('hidden')
  $pairingScreen.classList.add('hidden')
  $deniedScreen.classList.add('hidden')
  $textInput.focus()
}

// ─── WebSocket ───────────────────────────────────────────────────────────────

function connectWs() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${protocol}//${location.host}/ws`)
  state.ws = ws

  ws.onopen = () => {
    state.reconnectDelay = 1000
    if (state.paired) setStatus('connected')
  }

  ws.onclose = () => {
    setStatus('disconnected')
    state.ws = null
    // Auto-reconnect with backoff
    setTimeout(() => {
      setStatus('reconnecting')
      connectWs()
    }, state.reconnectDelay)
    state.reconnectDelay = Math.min(state.reconnectDelay * 2, 30000)
  }

  ws.onerror = () => {} // onclose fires after

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      handleWsMessage(msg)
    } catch {}
  }
}

function handleWsMessage(msg) {
  switch (msg.type) {
    case 'paired':
      showChat()
      setStatus('connected')
      break

    case 'pairing':
      showPairing(msg.code)
      break

    case 'history':
      // Clear existing messages and load history
      $messagesInner.innerHTML = ''
      state.messages.clear()
      for (const m of msg.messages) {
        renderMessage(m)
      }
      scrollToBottom(true)
      break

    case 'msg':
      // Don't duplicate messages we already have (optimistic send)
      if (state.messages.has(msg.id)) return
      renderMessage(msg)
      scrollToBottom()
      break

    case 'edit': {
      const entry = state.messages.get(msg.id)
      if (entry) {
        entry.data.text = msg.text
        const body = entry.el.querySelector('.bubble-text')
        if (body) {
          if (entry.data.from === 'assistant' && typeof marked !== 'undefined') {
            body.innerHTML = marked.parse(msg.text)
          } else {
            body.textContent = msg.text
          }
          // Add edited indicator
          if (!entry.el.querySelector('.edited')) {
            const edited = document.createElement('span')
            edited.className = 'edited'
            edited.textContent = ' (edited)'
            body.appendChild(edited)
          }
        }
      }
      break
    }

    case 'react': {
      const entry = state.messages.get(msg.id)
      if (entry) {
        entry.data.reaction = msg.emoji
        let badge = entry.el.querySelector('.reaction')
        if (!badge) {
          badge = document.createElement('span')
          badge.className = 'reaction'
          entry.el.querySelector('.bubble').appendChild(badge)
        }
        badge.textContent = msg.emoji
      }
      break
    }

    case 'permission_request':
      showPermissionModal(msg)
      break

    case 'error':
      console.error('Server error:', msg.text)
      break
  }
}

function setStatus(s) {
  $status.textContent = s
  $status.className = `status ${s}`
}

// ─── Message rendering ───────────────────────────────────────────────────────

function renderMessage(m) {
  const div = document.createElement('div')
  div.className = `message ${m.from}`
  div.dataset.id = m.id

  // Reply quote
  if (m.replyTo) {
    const replyEntry = state.messages.get(m.replyTo)
    if (replyEntry) {
      const quote = document.createElement('div')
      quote.className = 'reply-quote'
      quote.textContent = replyEntry.data.text.slice(0, 80)
      div.appendChild(quote)
    }
  }

  // Bubble
  const bubble = document.createElement('div')
  bubble.className = 'bubble'

  const textSpan = document.createElement('span')
  textSpan.className = 'bubble-text'
  if (m.from === 'assistant' && typeof marked !== 'undefined') {
    textSpan.innerHTML = marked.parse(m.text || '')
  } else {
    textSpan.textContent = m.text || ''
  }
  bubble.appendChild(textSpan)

  // File attachment
  if (m.file && m.file.url) {
    const fileDiv = document.createElement('div')
    fileDiv.className = 'file-attachment'
    const ext = (m.file.name || '').split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      const img = document.createElement('img')
      img.src = m.file.url
      img.alt = m.file.name
      img.loading = 'lazy'
      img.onclick = () => window.open(m.file.url, '_blank')
      fileDiv.appendChild(img)
    } else {
      const a = document.createElement('a')
      a.href = m.file.url
      a.download = m.file.name
      a.textContent = `📄 ${m.file.name}`
      fileDiv.appendChild(a)
    }
    bubble.appendChild(fileDiv)
  }

  // Reaction
  if (m.reaction) {
    const reaction = document.createElement('span')
    reaction.className = 'reaction'
    reaction.textContent = m.reaction
    bubble.appendChild(reaction)
  }

  div.appendChild(bubble)

  // Meta (timestamp)
  const meta = document.createElement('div')
  meta.className = 'meta'
  const time = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  meta.textContent = time
  div.appendChild(meta)

  $messagesInner.appendChild(div)
  state.messages.set(m.id, { el: div, data: m })
}

// ─── Auto-scroll ─────────────────────────────────────────────────────────────

function isNearBottom() {
  const el = $messagesContainer
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 80
}

function scrollToBottom(force = false) {
  if (force || isNearBottom()) {
    requestAnimationFrame(() => {
      $messagesContainer.scrollTop = $messagesContainer.scrollHeight
    })
  }
}

// ─── Compose ─────────────────────────────────────────────────────────────────

let selectedFile = null

$attachBtn.addEventListener('click', () => $fileInput.click())

$fileInput.addEventListener('change', () => {
  const f = $fileInput.files[0]
  if (f) {
    selectedFile = f
    $fileChip.classList.remove('hidden')
    $fileChip.innerHTML = `📄 ${f.name} <span class="remove" title="Remove">&times;</span>`
    $fileChip.querySelector('.remove').onclick = clearFile
  }
})

function clearFile() {
  selectedFile = null
  $fileInput.value = ''
  $fileChip.classList.add('hidden')
  $fileChip.innerHTML = ''
}

function sendMessage() {
  const text = $textInput.value.trim()
  if (!text && !selectedFile) return

  const id = `u${Date.now()}-${++state.uid}`

  if (selectedFile) {
    // Upload with file
    const file = selectedFile
    const fileUrl = URL.createObjectURL(file)

    // Render optimistically
    renderMessage({
      id, from: 'user', text,
      ts: Date.now(),
      file: { url: fileUrl, name: file.name },
    })
    scrollToBottom(true)

    const fd = new FormData()
    fd.set('id', id)
    fd.set('text', text)
    fd.set('file', file)
    fetch('/upload', { method: 'POST', body: fd })

    clearFile()
  } else {
    // Text only — render optimistically and send via WS
    renderMessage({ id, from: 'user', text, ts: Date.now() })
    scrollToBottom(true)

    if (state.ws && state.ws.readyState === 1) {
      state.ws.send(JSON.stringify({ type: 'msg', id, text }))
    }
  }

  $textInput.value = ''
  autoResize()
  $textInput.focus()
}

$sendBtn.addEventListener('click', sendMessage)

$textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

// Auto-resize textarea
function autoResize() {
  $textInput.style.height = 'auto'
  $textInput.style.height = Math.min($textInput.scrollHeight, 120) + 'px'
}
$textInput.addEventListener('input', autoResize)

// ─── Copy pairing code ──────────────────────────────────────────────────────

$copyCode.addEventListener('click', () => {
  const code = $pairingCode.textContent
  navigator.clipboard.writeText(`/web:access pair ${code}`).then(() => {
    $copyCode.textContent = '✅'
    setTimeout(() => { $copyCode.textContent = '📋' }, 2000)
  })
})

// ─── Permission modal ────────────────────────────────────────────────────────

function showPermissionModal(msg) {
  state.pendingPermission = msg.request_id
  $permTool.textContent = msg.tool_name
  $permDesc.textContent = msg.description
  $permInput.textContent = msg.input_preview
  $permModal.classList.remove('hidden')
}

function closePermissionModal(behavior) {
  if (state.pendingPermission && state.ws && state.ws.readyState === 1) {
    state.ws.send(JSON.stringify({
      type: 'permission_reply',
      request_id: state.pendingPermission,
      behavior,
    }))
  }
  state.pendingPermission = null
  $permModal.classList.add('hidden')
}

$permAllow.addEventListener('click', () => closePermissionModal('allow'))
$permDeny.addEventListener('click', () => closePermissionModal('deny'))

// Close modal on backdrop click
$permModal.addEventListener('click', (e) => {
  if (e.target === $permModal) closePermissionModal('deny')
})

// ─── Start ───────────────────────────────────────────────────────────────────

init()
