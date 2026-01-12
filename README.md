# 🔍 Rhetoric Lens - 舆论透镜

一个基于 AI 的 Chrome 扩展，实时分析 Twitter/X 推文的修辞密度和操纵指数，让隐藏的话术可视化。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 功能特性

- 🎯 **实时分析**: 自动检测并分析 Twitter 推文的修辞手法和操纵性
- 🎨 **可视化标记**: 用彩色标签直观展示风险等级（绿/黄/红）
- 💡 **详细解释**: 鼠标悬停查看 AI 分析的详细理由
- ⚡ **性能优化**: 请求队列、滚动防抖、智能缓存
- 🔧 **可配置**: 支持自定义 API 地址、模型、分析模式
- 💾 **持久化缓存**: 24 小时智能缓存，避免重复分析

---

## 📸 效果展示

推文下方会显示分析标签：

- 🟢 **R:2 M:3** - 低风险（绿色）
- 🟡 **R:6 M:7** - 中风险（黄色）
- 🔴 **R:9 M:8** - 高风险（红色）

R = Rhetoric Score (修辞密度)
M = Manipulation Score (操纵指数)

悬停标签可查看：
- 风险等级
- 分类标签（政治宣传/情绪操纵/理性讨论等）
- AI 分析理由

---

## 🚀 快速开始

### 前置要求

1. **Ollama** 已安装并运行（带模型 `xiuci-win-pro:latest`）
2. **Chrome 浏览器**（或基于 Chromium 的浏览器）
3. **CORS 配置**（见下方）

### 安装步骤

#### 1. 配置 Ollama CORS

**Windows:**
```powershell
setx OLLAMA_ORIGINS "*"
# 然后重启 Ollama
```

**Mac/Linux:**
```bash
launchctl setenv OLLAMA_ORIGINS "*"
pkill ollama && ollama serve
```

#### 2. 加载扩展

1. 打开 `chrome://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目文件夹

#### 3. 验证安装

1. 点击扩展图标
2. 确认显示 "✅ 已连接到Ollama"
3. 打开 [x.com](https://x.com) 开始使用

**详细指南**: 查看 [安装指南.md](./安装指南.md)

---

## 📁 项目结构

```
rhetoric-detector-extension/
├── manifest.json       # Chrome 扩展配置
├── content.js          # 核心逻辑（监听、提取、分析、渲染）
├── styles.css          # UI 样式（Badge、Tooltip、动画）
├── popup.html          # 配置页面 UI
├── popup.js            # 配置页面逻辑
├── CLAUDE.md           # Claude Code 开发指南
├── 安装指南.md         # 详细安装和使用文档
├── 需求和设计.md       # 原始需求文档
└── README.md           # 本文件
```

---

## 🏗️ 技术架构

### 核心流程

```
Twitter 页面 → MutationObserver → 提取文本 → 检查缓存
                                                    ↓
Badge 渲染 ← 色块生成 ← 响应解析 ← Ollama API
```

### 关键技术

- **MutationObserver**: 监听 Twitter 动态加载推文
- **请求队列**: 最多 3 个并发请求，防止过载
- **滚动防抖**: 500ms 延迟，优化性能
- **双重缓存**: 内存 + localStorage
- **Chrome Storage API**: 配置持久化

### API 接口

**请求格式:**
```json
{
  "model": "xiuci-win-pro:latest",
  "messages": [{"role": "user", "content": "推文内容"}],
  "format": "json",
  "stream": false
}
```

**响应格式:**
```json
{
  "label": "政治宣传",
  "rhetoric_score": 8,
  "manipulation_score": 9,
  "reason": "使用了强烈的情绪化语言和绝对化表述..."
}
```

---

## ⚙️ 配置选项

点击扩展图标打开配置面板：

| 选项 | 默认值 | 说明 |
|------|--------|------|
| API 地址 | `http://localhost:11434/api/chat` | Ollama API 端点 |
| 模型名称 | `xiuci-win-pro:latest` | 使用的 AI 模型 |
| 自动分析 | ✅ 开启 | 关闭则需手动点击按钮分析 |

---

## 🔧 开发指南

### 修改代码

1. 编辑文件（`content.js`, `styles.css` 等）
2. 在 `chrome://extensions/` 点击刷新按钮
3. 刷新 Twitter 页面测试

### 调试日志

打开浏览器控制台（F12），筛选 `[Rhetoric Lens]` 查看日志：

```
[Rhetoric Lens] 🚀 启动中...
[Rhetoric Lens] ✅ 已启动 | 模型: xiuci-win-pro:latest
[Rhetoric Lens] 命中缓存: xxx...
```

### 性能调优

编辑 `content.js` 中的配置：

```javascript
const CONFIG = {
  MAX_CONCURRENT: 3,      // 并发数 (1-5)
  DEBOUNCE_DELAY: 500,    // 防抖延迟 (ms)
  CACHE_EXPIRY: 24 * 60 * 60 * 1000  // 缓存过期 (ms)
};
```

---

## 🐛 常见问题

### ❌ 无法连接到 Ollama

**原因**: CORS 未配置或 Ollama 未运行

**解决**:
```bash
# 1. 确认 Ollama 运行
curl http://localhost:11434/api/tags

# 2. 设置 CORS
setx OLLAMA_ORIGINS "*"  # Windows
launchctl setenv OLLAMA_ORIGINS "*"  # Mac

# 3. 重启 Ollama
```

### ⚠️ 分析失败或很慢

**解决**:
- 关闭自动分析，改为手动点击模式
- 降低并发数 (`MAX_CONCURRENT`)
- 检查系统资源使用情况

### 🔄 缓存不生效

**检查**:
```javascript
// 控制台执行
chrome.storage.local.get(['rhetoricCache'], console.log);
```

**清理**:
- 在配置页面点击 "清除缓存"

---

## 📊 性能优化

### 当前优化

- ✅ 请求队列（最多 3 并发）
- ✅ 滚动防抖（500ms）
- ✅ 文本去重（hash 缓存）
- ✅ DOM 去重（`dataset.aiProcessed`）
- ✅ localStorage 持久化（24h 过期）

### 资源占用

- **内存**: ~5-10MB（取决于缓存大小）
- **网络**: 0（本地 API）
- **CPU**: 低（主要在 Ollama 端）

---

## 🎯 后续规划

- [ ] 支持自定义评分阈值
- [ ] 添加账号黑/白名单
- [ ] 导出分析报告（CSV/JSON）
- [ ] 统计数据可视化
- [ ] 支持更多平台（Reddit、Facebook 等）
- [ ] 云端 API 支持
- [ ] 多语言界面

---

## 📝 许可证

MIT License - 可自由使用、修改和分发

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📧 联系方式

如遇问题或建议，请查阅 [安装指南.md](./安装指南.md) 或提交 Issue。

---

**让 AI 帮你看穿网络舆论的修辞迷雾！** 🔍✨
