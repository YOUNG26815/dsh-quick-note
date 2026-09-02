// dsh-quick-note —— Client 半端（ModuleLoader 静态 bundle）
// 输入框右侧便签图标 → 速记面板：快速输入、搜索、删除。
window.__ModuleLoader__.load({
  id: 'dsh-quick-note',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    var React = require('react');

    async function api(name, args) {
      const res = await fetch('/qnote/api/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args || {}),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return await res.json()
    }

    function insertStyles(css) {
      try {
        const style = document.createElement('style')
        style.textContent = css
        document.head.appendChild(style)
        return () => { try { style.remove() } catch (e) { /* ignore */ } }
      } catch (e) { return function () {} }
    }

    const css = `
.qn-ibtn{width:28px;height:28px;border-radius:8px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0;}
.qn-ibtn:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);}
.qn-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:24px;}
.qn-panel{width:560px;max-width:94vw;max-height:86vh;display:flex;flex-direction:column;border-radius:14px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);box-shadow:0 18px 60px rgba(0,0,0,.35);padding:18px 20px;font-size:13px;}
.qn-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.qn-title{font-size:15px;font-weight:700;}
.qn-close{border:none;background:transparent;cursor:pointer;font-size:16px;color:inherit;opacity:.6;padding:4px 8px;border-radius:6px;}
.qn-close:hover{opacity:1;background:rgba(128,128,128,.15);}
.qn-new{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;}
.qn-new textarea{width:100%;min-height:64px;resize:vertical;border-radius:10px;border:1px solid rgba(128,128,128,.3);background:transparent;color:inherit;padding:8px 10px;font-size:13px;font-family:inherit;box-sizing:border-box;}
.qn-new .row{display:flex;gap:8px;}
.qn-new input{flex:1;border-radius:8px;border:1px solid rgba(128,128,128,.3);background:transparent;color:inherit;padding:6px 10px;font-size:12px;}
.qn-add{border:none;border-radius:8px;background:#4d6bfe;color:#fff;padding:6px 16px;cursor:pointer;font-size:13px;align-self:flex-end;}
.qn-add:hover{filter:brightness(1.1);}
.qn-search{display:flex;gap:8px;margin-bottom:10px;}
.qn-search input{flex:1;border-radius:999px;border:1px solid rgba(128,128,128,.3);background:transparent;color:inherit;padding:6px 14px;font-size:13px;}
.qn-list{overflow:auto;flex:1;min-height:120px;}
.qn-note{border:1px solid rgba(128,128,128,.15);border-radius:10px;padding:10px 12px;margin-bottom:8px;}
.qn-note .meta{display:flex;justify-content:space-between;opacity:.55;font-size:11px;margin-bottom:4px;}
.qn-note .body{white-space:pre-wrap;word-break:break-word;line-height:1.5;}
.qn-note .tags{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;}
.qn-note .tag{font-size:11px;padding:1px 8px;border-radius:999px;background:rgba(77,107,254,.12);color:#4d6bfe;}
.qn-note .del{border:none;background:transparent;cursor:pointer;opacity:.5;color:inherit;font-size:12px;padding:0 4px;}
.qn-note .del:hover{opacity:1;color:#ef4444;}
.qn-empty{opacity:.5;text-align:center;padding:30px 0;}
.qn-count{opacity:.5;font-size:11px;text-align:right;margin-top:6px;}
`

    function fmt(ts) {
      const d = new Date(ts), pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    function Panel({ onClose }) {
      const [notes, setNotes] = React.useState(null)
      const [query, setQuery] = React.useState('')
      const [draft, setDraft] = React.useState('')
      const [tags, setTags] = React.useState('')
      const [err, setErr] = React.useState('')

      async function refresh(q) {
        try {
          const d = await api('list', q ? { query: q } : {})
          setNotes(d.notes || [])
          setErr('')
        } catch (e) { setErr(String(e.message || e)) }
      }
      React.useEffect(() => { refresh('') }, [])

      async function add() {
        if (!draft.trim()) return
        const tagList = tags.split(/[\s,，#]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
        const d = await api('add', { content: draft.trim(), tags: tagList })
        if (d.error) { setErr(d.error); return }
        setDraft(''); setTags('')
        refresh(query)
      }
      async function del(id) { await api('delete', { id }); refresh(query) }

      return React.createElement('div', { className: 'qn-overlay', onClick: onClose },
        React.createElement('div', { className: 'qn-panel', onClick: (e) => e.stopPropagation() },
          React.createElement('div', { className: 'qn-head' },
            React.createElement('div', { className: 'qn-title' }, '📝 灵感速记'),
            React.createElement('button', { className: 'qn-close', onClick: onClose }, '✕'),
          ),
          React.createElement('div', { className: 'qn-new' },
            React.createElement('textarea', { placeholder: '记点什么…（想法 / 待办 / 偏好 / 灵感）', value: draft, onChange: (e) => setDraft(e.target.value) }),
            React.createElement('div', { className: 'row' },
              React.createElement('input', { placeholder: '标签（空格分隔，可选）', value: tags, onChange: (e) => setTags(e.target.value) }),
              React.createElement('button', { className: 'qn-add', onClick: add }, '保存'),
            ),
          ),
          React.createElement('div', { className: 'qn-search' },
            React.createElement('input', { placeholder: '🔍 搜索笔记内容或标签…', value: query, onChange: (e) => { setQuery(e.target.value); refresh(e.target.value) } }),
          ),
          err ? React.createElement('div', { style: { color: '#ef4444', fontSize: 12 } }, err) : null,
          React.createElement('div', { className: 'qn-list' },
            notes === null ? React.createElement('div', { className: 'qn-empty' }, '加载中…')
              : notes.length ? notes.map((n) => React.createElement('div', { key: n.id, className: 'qn-note' },
                React.createElement('div', { className: 'meta' },
                  React.createElement('span', null, fmt(n.createdTs) + (n.source === 'agent' ? ' · AI 记录' : '')),
                  React.createElement('button', { className: 'del', onClick: () => del(n.id), title: '删除' }, '删除'),
                ),
                React.createElement('div', { className: 'body' }, n.content),
                n.tags && n.tags.length ? React.createElement('div', { className: 'tags' },
                  n.tags.map((t, i) => React.createElement('span', { key: i, className: 'tag' }, '#' + t)),
                ) : null,
              ))
                : React.createElement('div', { className: 'qn-empty' },
                  query ? '没有匹配的笔记' : '还没有笔记。对 AI 说「帮我把这个记下来」试试'),
          ),
          notes ? React.createElement('div', { className: 'qn-count' }, (query ? '匹配 ' : '共 ') + notes.length + ' 条') : null,
        ))
    }

    function App() {
      const [open, setOpen] = React.useState(false)
      return React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'qn-ibtn', onClick: () => setOpen(true), title: '灵感速记' },
          React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('path', { d: 'M12 20h9' }),
            React.createElement('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' }),
          )),
        open ? React.createElement(Panel, { onClose: () => setOpen(false) }) : null,
      )
    }

    const inject = ['timer']

    function apply(ctx) {
      insertStyles(css)
      const slots = ctx.get('slots')
      if (slots === undefined) return
      slots.inject('conversation.input.right', () => slots.register(
        { name: 'conversation.input.right', id: 'qnote-btn', order: 100, label: '灵感速记' },
        () => React.createElement(App),
      ))
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
