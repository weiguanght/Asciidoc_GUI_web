# AsciiDoc WYSIWYG Editor

![React](https://img.shields.io/badge/React-20232a)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC)
![Vite](https://img.shields.io/badge/Vite-646CFF)
![Zustand](https://img.shields.io/badge/Zustand-443E38)
![Asciidoctor](https://img.shields.io/badge/Asciidoctor-E40046)
![CodeMirror](https://img.shields.io/badge/CodeMirror-D32F2F)
![Tiptap](https://img.shields.io/badge/Tiptap-000000)
![Vitest](https://img.shields.io/badge/Vitest-729B1B)

这是一个基于 Web 的现代化 AsciiDoc 编辑器，旨在提供流畅的写作体验和强大的实时预览功能。该项目采用 React 19 和 Vite 构建，集成了 Asciidoctor.js 核心，支持双向同步滚动、图表渲染、数学公式以及本地文件系统访问。

## ✨ 主要特性

* **实时预览与渲染**：
    * 基于 `Asciidoctor.js` 实现标准的 AsciiDoc 语法解析。
    * **双向同步滚动**：支持源码视图与预览视图之间的精确行级同步（基于 AST 行号映射）。
    * **高级图表支持**：内置 `Mermaid` 渲染引擎，支持流程图、时序图等。
    * **数学公式支持**：集成 `KaTeX`，支持渲染 LaTeX 数学公式（STEM blocks）。
    * **语法高亮**：使用 `highlight.js` 对代码块进行美化。

* **现代化编辑体验**：
    * **双模式编辑**：
        * **源码模式**：基于 `CodeMirror 6` 的高性能代码编辑器，支持 AsciiDoc 语法高亮和自动补全。
        * **所见即所得 (WYSIWYG)**：集成了 `Tiptap` 编辑器，提供富文本编辑能力。
    * **多视图切换**：支持仅编辑、仅预览或分屏对比模式。

* **文件系统与管理**：
    * **本地文件系统访问**：利用 File System Access API 直接读取和保存本地磁盘上的 `.adoc` 文件，无需上传下载。
    * **虚拟文件管理**：内置基于 `Zustand` 的状态管理，支持多文件标签页、文件夹结构、文件重命名和移动。
    * **浏览器存储持久化**：使用 IndexedDB/LocalStorage 自动保存工作区状态。

* **其他功能**：
    * 深色模式 (Dark Mode) 支持。
    * 图片管理器。
    * 导出功能（HTML, PDF, ZIP）。

## 🛠 技术栈

* **核心框架**：[React 19](https://react.dev/), [Vite](https://vitejs.dev/)
* **语言**：TypeScript
* **状态管理**：[Zustand](https://github.com/pmndrs/zustand)
* **编辑器内核**：
    * [@codemirror/*](https://codemirror.net/) (源码编辑)
    * [@tiptap/*](https://tiptap.dev/) (富文本编辑)
* **渲染引擎**：
    * [Asciidoctor.js](https://asciidoctor.org/docs/asciidoctor.js/)
    * [Mermaid](https://mermaid.js.org/)
    * [KaTeX](https://katex.org/)
    * [Highlight.js](https://highlightjs.org/)
* **UI 组件与样式**：Lucide React (图标)
* **测试**：Vitest, React Testing Library

## 📂 项目结构

```text
Asciidoc WYSIWYG Editor 可视化编辑器
├── App.tsx                                   # [核心] 应用主入口，负责全局布局、Toast通知、快捷键监听及 Provider 包裹
├── components                                # [UI组件层] 视图与交互组件
│   ├── AttributesPanel.tsx                   # AsciiDoc 文档属性设置面板 (如 :toc:, :sectnums:)
│   ├── Autocomplete.tsx                      # 编辑器自动补全组件 (IntelliSense)
│   ├── BlockMenu.tsx                         # 块级元素操作菜单 (悬浮/上下文菜单)
│   ├── BlockWrapper.tsx                      # Tiptap 节点的 React 包装器，用于自定义渲染
│   ├── ContextMenu.tsx                       # 右键上下文菜单实现
│   ├── ErrorBoundary.tsx                     # React 错误边界，防止编辑器崩溃导致白屏
│   ├── ImageManager.tsx                      # 图片资源管理器，处理上传、插入及 IndexedDB 存储
│   ├── MobileHeader.tsx                      # 移动端适配的顶部导航栏
│   ├── OutlineNavigator.tsx                  # 文档大纲导航 (TOC)
│   ├── SearchReplaceDialog.tsx               # 搜索与替换对话框
│   ├── Sidebar.tsx                           # 左侧文件资源管理器/侧边栏
│   ├── SourceEditor.tsx                      # [核心] 源码模式编辑器 (基于 CodeMirror 6)
│   ├── TableEditor.tsx                       # 表格可视化编辑工具
│   ├── TiptapEditor.tsx                      # [核心] 所见即所得编辑器 (基于 Tiptap)，集成实时预览逻辑
│   ├── Toolbar.tsx                           # 顶部富文本工具栏
│   └── ui                                    # 通用基础 UI 组件库
│       └── Button.tsx
├── extensions                                # [Tiptap扩展] 定制 ProseMirror 节点以支持 AsciiDoc 语法
│   ├── BlockNodeView.tsx                     # 通用块级节点视图
│   ├── LintingExtension.ts                   # 语法检查扩展 (与 Linter 交互)
│   ├── RawBlock.ts                           # 原始块节点 (用于存储无法解析的 AsciiDoc 片段)
│   ├── TableCaption.ts                       # 表格标题扩展
│   ├── UniqueId.ts                           # 唯一 ID 生成扩展 (用于同步滚动定位)
│   ├── admonition-node.tsx                   # 警告/提示块 (Admonition) 的 React 渲染节点
│   ├── include-node.tsx                      # Include 指令的可视化节点
│   └── slash-commands.tsx                    # 斜杠命令 (如 Notion 的 "/" 菜单)
├── hooks                                     # [React Hooks] 自定义逻辑复用
│   ├── useAsyncRender.ts                     # 异步渲染钩子，优化大型文档性能
│   └── useTransientUpdates.ts                # 处理高频更新 (如滚动同步) 的性能优化 Hook
├── index.css                                 # 全局样式，Tailwind CSS 入口
├── index.html                                # HTML 模板
├── index.tsx                                 # 应用挂载点
├── lib                                       # [核心逻辑库] 业务逻辑与工具函数
│   ├── LanguageClient.ts                     # 语言服务器客户端 (LSP) 模拟层
│   ├── asciidoc.ts                           # AsciiDoc 基础处理逻辑
│   ├── asciidoctor-renderer.ts               # [核心] Asciidoctor.js 渲染引擎封装 (含 Mermaid/KaTeX 支持)
│   ├── ast-error-collector.ts                # AST 错误收集器 (用于 Lint)
│   ├── ast-visitor.ts                        # AST 遍历器模式实现
│   ├── codemirror-editor.ts                  # CodeMirror 编辑器配置与扩展
│   ├── file-system-access.ts                 # File System Access API 封装 (本地文件读写)
│   ├── html-sanitizer.ts                     # HTML 净化工具 (DOMPurify)，防止 XSS
│   ├── image-service.ts                      # 图片处理服务
│   ├── include-preprocessor.ts               # Include 指令预处理器 (解析文件引用)
│   ├── indexed-db-storage.ts                 # [存储] IndexedDB 封装 (使用 idb-keyval)，实现大文件持久化
│   ├── intellisense.ts                       # 智能感知与补全逻辑
│   ├── kroki-renderer.ts                     # Kroki 图表服务集成 (支持多种图表 DSL)
│   ├── lazy-loader.ts                        # 资源懒加载工具
│   ├── log-collector.ts                      # 日志收集
│   ├── markdown-converter.ts                 # Markdown 转 AsciiDoc 转换器
│   ├── paste-converter.ts                    # 粘贴处理器 (智能识别 HTML/Markdown 并转换)
│   ├── pdf-export.ts                         # PDF 导出功能 (浏览器端生成)
│   ├── strict-schema.ts                      # 数据校验 Schema 定义
│   ├── sync-utils.ts                         # [核心] 双向滚动同步算法 (Editor <-> Preview)
│   ├── theme-system.ts                       # 主题切换逻辑 (Dark/Light Mode)
│   ├── transformer                           # [转换引擎]
│   │   └── prosemirror-to-asciidoc.ts        # [关键] 将 Tiptap JSON 状态序列化为 AsciiDoc 源码 (含 SourceMap)
│   ├── validator                             # 数据校验器
│   │   └── save-validator.ts                 # 保存前的数据完整性校验
│   ├── worker-manager.ts                     # Web Worker 管理器 (负责与 Worker 通信)
│   ├── xref-manager.ts                       # 交叉引用 (Cross Reference) 管理
│   └── zip-export.ts                         # 项目打包导出为 ZIP
├── metadata.json                             # 项目元数据
├── package.json                              # 依赖管理 (React 19, Vite, Tiptap, Asciidoctor)
├── store                                     # [状态管理]
│   └── useEditorStore.ts                     # [核心] Zustand Store，管理文件树、编辑器状态及持久化
├── tests                                     # 单元测试
│   ├── ast-visitor.test.ts                   # AST 访问器测试
│   └── setup.ts                              # Vitest 测试环境配置
├── tsconfig.json                             # TypeScript 编译配置
├── types                                     # 类型定义
│   └── lsp.ts                                # LSP 协议相关类型 (Diagnostic, Position 等)
├── types.ts                                  # 全局通用类型定义 (FileItem, ViewMode 等)
├── vite.config.ts                            # Vite 构建配置 (含路径别名、插件配置)
├── vitest.config.ts                          # Vitest 测试配置
└── workers                                   # [Web Workers] 后台线程脚本
    └── asciidoctor.worker.ts                 # [性能] 独立线程运行 Asciidoctor 编译与 Lint 检查

```

## 🚀 快速开始

### 环境要求

* Node.js (建议 v18+)
* npm 或 yarn/pnpm

### 安装依赖

```bash
npm install

```

### 开发模式运行

启动本地开发服务器：

```bash
npm run dev

```

访问 `http://localhost:3000` 即可查看。

### 构建生产版本

```bash
npm run build

```

### 运行测试

```bash
npm test          # 运行测试
npm run test:cov  # 查看覆盖率

```

## 📜 脚本说明

`package.json` 中定义的脚本如下：

* `dev`: 启动 Vite 开发服务器。
* `build`: 执行 Vite 构建。
* `preview`: 预览构建后的生产版本。
* `test`: 使用 Vitest 运行单元测试。
* `test:watch`: 监听模式运行测试。
* `deploy`: 将构建产物部署到 GitHub Pages。

## 🧩 核心模块详解

### 渲染器 (`lib/asciidoctor-renderer.ts`)

该模块封装了 `Asciidoctor` 实例，负责将 AsciiDoc 文本转换为 HTML。它自定义了处理流程以支持：

1. **Mermaid**：拦截代码块，生成占位符并在客户端异步渲染。
2. **KaTeX**：解析 `stem` 块和内联公式。
3. **Source Map**：生成 `data-line` 属性，建立源码行号与 DOM 节点的映射，用于同步滚动。

### 文件系统 (`lib/file-system-access.ts`)

封装了浏览器原生的 `FileSystemFileHandle` 接口。

* `showOpenFilePicker`: 打开文件选择器。
* `showSaveFilePicker`: 另存为。
* 提供回退机制（Fallback），在不支持 Native API 的浏览器中使用传统的 `<input type="file">` 和 Blob 下载。

### 状态管理 (`store/useEditorStore.ts`)

管理全局编辑器状态，包括：

* 文件树结构（Files, Folders）。
* 当前激活文件与视图模式。
* UI 状态（侧边栏、对话框可见性）。
* 同步滚动位置信息 (`highlightLine`, `syncToLine`)。