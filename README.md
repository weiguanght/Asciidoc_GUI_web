# AsciiDoc WYSIWYG Editor

![React](https://img.shields.io/badge/React-20232a?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)
![Asciidoctor](https://img.shields.io/badge/Asciidoctor-E40046?style=for-the-badge&logo=asciidoctor&logoColor=white)
![CodeMirror](https://img.shields.io/badge/CodeMirror-D32F2F?style=for-the-badge&logo=codemirror&logoColor=white)
![Tiptap](https://img.shields.io/badge/Tiptap-000000?style=for-the-badge&logo=tiptap&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-729B1B?style=for-the-badge&logo=vitest&logoColor=white)

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
src/
├── components/         # UI 组件 (Sidebar, Toolbar, Editor 等)
├── extensions/         # 编辑器扩展 (Tiptap/Codemirror 插件)
├── hooks/              # 自定义 React Hooks
├── lib/                # 核心逻辑库
│   ├── asciidoctor-renderer.ts  # AsciiDoc 渲染与插件集成
│   ├── file-system-access.ts    # 本地文件 IO 处理
│   ├── ast-visitor.ts           # AST 遍历工具
│   └── ...
├── store/              # Zustand 状态管理 (useEditorStore.ts)
├── types/              # TypeScript 类型定义
├── workers/            # Web Workers (用于后台编译)
├── App.tsx             # 应用入口组件
└── main.tsx            # 渲染入口

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