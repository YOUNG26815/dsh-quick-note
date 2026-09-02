// dsh-quick-note —— Server 半端（Host 进程插件）
// 你和 AI 共用的速记本：Agent 工具 note_save/note_search/note_list/note_delete，
// Web 面板手动增删查。存储在 ~/.dsh/dsh-quick-note/notes.json。零依赖。

import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const name = 'dsh-quick-note'
export const inject = ['webServer', 'tools']

const STORE_DIR = path.join(os.homedir(), '.dsh', 'dsh-quick-note')
const STORE_FILE = path.join(STORE_DIR, 'notes.json')

function loadStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'))
  } catch {
    return { notes: [] }
  }
}
function saveStore(store) {
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true })
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8')
  } catch { /* 磁盘失败保底内存态 */ }
}

function matchNote(note, query) {
  if (!query) return true
  const q = String(query).toLowerCase()
  return note.content.toLowerCase().includes(q) ||
    (note.tags || []).some((t) => t.toLowerCase().includes(q))
}

export function apply(ctx) {
  const webServer = ctx.webServer
  let store = loadStore()
  const persist = () => saveStore(store)

  function registerRoute(rpcName, handler) {
    if (!webServer) return
    webServer.register({
      kind: 'exact',
      path: '/qnote/api/' + rpcName,
      handler: async (req, res) => {
        let body = ''
        try { for await (const chunk of req) body += chunk } catch { /* ignore */ }
        let result
        try { result = await handler(body ? JSON.parse(body) : {}) } catch (e) {
          result = { error: String((e && e.message) || e).slice(0, 500) }
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(result))
      },
    })
  }

  function addNote(content, tags, source) {
    const text = String(content || '').trim()
    if (!text) return null
    const note = {
      id: crypto.randomUUID(),
      content: text.slice(0, 5000),
      tags: Array.isArray(tags) ? tags.map(String).slice(0, 8) : [],
      createdTs: Date.now(),
      source: source || 'ui',
    }
    store.notes.push(note)
    persist()
    return note
  }

  // ===== RPC =====
  registerRoute('list', async (args) => {
    const q = args && args.query
    const notes = store.notes.filter((n) => matchNote(n, q)).sort((a, b) => b.createdTs - a.createdTs)
    return { notes: notes.slice(0, 200), total: notes.length }
  })
  registerRoute('add', async (args) => {
    const note = addNote(args && args.content, args && args.tags, 'ui')
    return note ? { ok: true, note } : { error: '内容不能为空' }
  })
  registerRoute('delete', async (args) => {
    const before = store.notes.length
    store.notes = store.notes.filter((n) => n.id !== (args && args.id))
    const ok = store.notes.length < before
    if (ok) persist()
    return { ok }
  })

  // ===== Agent 工具 =====
  const tools = ctx.tools
  if (tools && typeof tools.register === 'function') {
    const stringOutput = {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    }
    const fmt = (ts) => {
      const d = new Date(ts)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    tools.register({
      name: 'note_save',
      description:
        'Save a quick note to the user\'s shared notebook (visible in the Web UI note panel). ' +
        'Use when the user says "帮我把这个记下来/记个笔记/别忘了我喜欢…" or when you learned a durable user preference worth keeping. ' +
        'Keep content concise and self-contained; optionally add lowercase tags.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Note body, concise and self-contained' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional short tags, e.g. ["preference","work"]' },
        },
        required: ['content'],
        additionalProperties: false,
      },
      output: stringOutput,
      async execute(args) {
        const note = addNote(args.content, args.tags, 'agent')
        if (!note) return '保存失败：内容不能为空'
        return `📝 已保存笔记 #${note.id.slice(0, 8)}（${fmt(note.createdTs)}）${note.tags && note.tags.length ? ' · 标签: ' + note.tags.join(', ') : ''}\n${note.content.slice(0, 200)}`
      },
    })

    tools.register({
      name: 'note_search',
      description: 'Search the shared notebook by keyword (matches content and tags). Zero side effects.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Keyword; empty lists the newest notes' } },
        additionalProperties: false,
      },
      output: stringOutput,
      async execute(args) {
        const q = args && args.query
        const notes = store.notes.filter((n) => matchNote(n, q)).sort((a, b) => b.createdTs - a.createdTs)
        if (!notes.length) return q ? `没有找到包含「${q}」的笔记。` : '速记本还是空的。'
        return notes.slice(0, 30).map((n, i) =>
          `${i + 1}. [${n.id.slice(0, 8)}] ${fmt(n.createdTs)}${n.tags && n.tags.length ? ' · #' + n.tags.join(' #') : ''}\n   ${n.content.slice(0, 300)}${n.content.length > 300 ? '…' : ''}`
        ).join('\n')
      },
    })

    tools.register({
      name: 'note_delete',
      description: 'Delete one note by its short id (first 8 chars shown in note_search output).',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Note short id, e.g. "a1b2c3d4"' } },
        required: ['id'],
        additionalProperties: false,
      },
      output: stringOutput,
      async execute(args) {
        const id = String(args.id || '').toLowerCase()
        const target = store.notes.find((n) => n.id.startsWith(id))
        if (!target) return '删除失败：找不到该笔记，请先用 note_search 确认 id。'
        store.notes = store.notes.filter((n) => n.id !== target.id)
        persist()
        return '🗑 已删除笔记：' + target.content.slice(0, 80)
      },
    })
  }
}
