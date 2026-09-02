# dsh-quick-note · 灵感速记 📝

你和 AI **共用**的速记本：让 AI 帮你记，也让你随手记，互相都能搜到。

**English**: A shared quick-notebook for you and your DeepSeek Harness agent. The agent saves notes via tools; you browse/search/edit them in the Web panel. Notes persist in `~/.dsh/dsh-quick-note/`.

## ✨ 功能

### 🤖 Agent 工具（AI 可直接调用）

| 工具 | 说明 |
|------|------|
| `note_save` | 存笔记（支持标签），Web 面板立即可见 |
| `note_search` | 按关键词搜内容/标签 |
| `note_delete` | 按短 id 删除 |

对话示例：

> 你：**"帮我把这个记下来：周三下午 3 点给车做保养"**
> AI：*（调用 note_save）* 📝 已保存笔记 #a1b2c3d4（2026-09-03 14:22）· 标签: todo

> 你（三天后）：**"我之前记的车保养是啥时候来着？"**
> AI：*（调用 note_search query="保养"）* 找到了：周三下午 3 点给车做保养……

> 你：**"记住：我喝咖啡不加糖"**
> AI：*（调用 note_save，tags=["preference"]）* 📝 已保存……下次它会记得问你要不要来杯美式 ☕

### 🖥 Web 面板

- 输入框右侧**便签图标**打开面板
- 快速记录：内容 + 可选标签（空格分隔）
- 即时搜索（内容 + 标签）
- 每条笔记显示时间与来源（`AI 记录` / 手动）
- 一键删除

## 💾 持久化

笔记存在 `~/.dsh/dsh-quick-note/notes.json`，重启不丢，可以直接备份这个文件。

## 📦 安装

```bash
dsh plugin --profile web add github:YOUNG26815/dsh-quick-note
```

## 💡 使用场景

- 🚗 待办备忘："记一下：周五交周报"
- ☕ 个人偏好："记住我喜欢深色主题、喝美式不加糖"
- 💡 灵感捕捉："把刚才这个产品点子记下来"
- 📚 知识片段："把这段配置模板存成笔记，标签 nginx"

## 🧩 技术实现

- **零 npm 依赖**
- 服务端：cordis 插件 + `ctx.webServer` RPC（`POST /qnote/api/*`）
- 客户端：ModuleLoader 静态 bundle，挂载 `conversation.input.right` slot

## License

MIT
