/**
 * CodeMirror 6 编辑器配置
 * 包含 AsciiDoc 语法高亮和基础编辑器扩展
 */

import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, LanguageSupport, StreamLanguage } from '@codemirror/language';
import { tags, Tag } from '@lezer/highlight';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';

// 动态导入语言支持
const languageLoaders: Record<string, () => Promise<LanguageSupport>> = {
    javascript: () => import('@codemirror/lang-javascript').then(m => m.javascript()),
    typescript: () => import('@codemirror/lang-javascript').then(m => m.javascript({ typescript: true })),
    python: () => import('@codemirror/lang-python').then(m => m.python()),
    java: () => import('@codemirror/lang-java').then(m => m.java()),
    cpp: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
    c: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
    html: () => import('@codemirror/lang-html').then(m => m.html()),
    css: () => import('@codemirror/lang-css').then(m => m.css()),
    json: () => import('@codemirror/lang-json').then(m => m.json()),
    markdown: () => import('@codemirror/lang-markdown').then(m => m.markdown()),
    xml: () => import('@codemirror/lang-xml').then(m => m.xml()),
    sql: () => import('@codemirror/lang-sql').then(m => m.sql()),
    rust: () => import('@codemirror/lang-rust').then(m => m.rust()),
    go: () => import('@codemirror/lang-go').then(m => m.go()),
};

/**
 * AsciiDoc 语法定义（StreamLanguage 模式）
 */
const asciidocLanguage = StreamLanguage.define({
    name: 'asciidoc',
    startState: () => ({
        inCodeBlock: false,
        codeBlockLang: '',
        inTable: false,
        inBlockQuote: false,
        inStemBlock: false,
        inAdmonition: false,
    }),

    token(stream, state) {
        // 代码块开始/结束
        if (stream.match(/^----+$/)) {
            state.inCodeBlock = !state.inCodeBlock;
            return 'meta';
        }

        // 代码块内容
        if (state.inCodeBlock) {
            stream.skipToEnd();
            return 'string';
        }

        // 表格分隔符
        if (stream.match(/^\|===+$/)) {
            state.inTable = !state.inTable;
            return 'meta';
        }

        // STEM 块
        if (stream.match(/^\[stem\]$/)) {
            state.inStemBlock = true;
            return 'keyword';
        }

        if (stream.match(/^\+\+\+\+$/)) {
            state.inStemBlock = !state.inStemBlock;
            return 'meta';
        }

        // 行首匹配
        if (stream.sol()) {
            // 标题 (= 标题)
            if (stream.match(/^=+\s/)) {
                stream.skipToEnd();
                return 'heading';
            }

            // 告示块标记
            if (stream.match(/^\[(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]$/i)) {
                return 'keyword';
            }

            // 代码块语言标记
            if (stream.match(/^\[source,?\s*\w*\]$/)) {
                return 'keyword';
            }

            // 属性定义
            if (stream.match(/^:\w+:.*$/)) {
                return 'meta';
            }

            // 文档头部属性
            if (stream.match(/^:!\w+:$/)) {
                return 'meta';
            }

            // 无序列表
            if (stream.match(/^\*+\s/)) {
                return 'keyword';
            }

            // 有序列表
            if (stream.match(/^\.+\s/)) {
                return 'keyword';
            }

            // 分隔线
            if (stream.match(/^'''$/)) {
                return 'meta';
            }

            // 引用块
            if (stream.match(/^____$/)) {
                state.inBlockQuote = !state.inBlockQuote;
                return 'meta';
            }

            // 图片
            if (stream.match(/^image::/)) {
                stream.skipToEnd();
                return 'link';
            }

            // Include 指令
            if (stream.match(/^include::/)) {
                stream.skipToEnd();
                return 'link';
            }

            // 表格单元格
            if (stream.match(/^\|/)) {
                return 'meta';
            }

            // 注释
            if (stream.match(/^\/\/.*/)) {
                return 'comment';
            }
        }

        // 内联标记
        // 粗体
        if (stream.match(/\*[^*]+\*/)) {
            return 'strong';
        }

        // 斜体
        if (stream.match(/_[^_]+_/)) {
            return 'emphasis';
        }

        // 行内代码
        if (stream.match(/`[^`]+`/)) {
            return 'string';
        }

        // 链接
        if (stream.match(/link:[^\[]+\[[^\]]*\]/)) {
            return 'link';
        }

        // 锚点
        if (stream.match(/<<[^>]+>>/)) {
            return 'link';
        }

        // 属性引用
        if (stream.match(/\{[^}]+\}/)) {
            return 'variableName';
        }

        // 颜色标记
        if (stream.match(/\[\w+(-background)?\]#[^#]+#/)) {
            return 'atom';
        }

        // STEM 内联公式
        if (stream.match(/stem:\[[^\]]+\]/)) {
            return 'number';
        }

        stream.next();
        return null;
    },
});

/**
 * 亮色主题语法高亮
 */
const lightHighlightStyle = HighlightStyle.define([
    { tag: tags.heading, color: '#1a1a1a', fontWeight: 'bold' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.link, color: '#0066cc', textDecoration: 'underline' },
    { tag: tags.string, color: '#22863a' },
    { tag: tags.keyword, color: '#d73a49' },
    { tag: tags.comment, color: '#6a737d', fontStyle: 'italic' },
    { tag: tags.meta, color: '#6f42c1' },
    { tag: tags.variableName, color: '#e36209' },
    { tag: tags.atom, color: '#005cc5' },
    { tag: tags.number, color: '#005cc5' },
]);

/**
 * 暗色主题语法高亮
 */
const darkHighlightStyle = HighlightStyle.define([
    { tag: tags.heading, color: '#e1e4e8', fontWeight: 'bold' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.link, color: '#79b8ff', textDecoration: 'underline' },
    { tag: tags.string, color: '#85e89d' },
    { tag: tags.keyword, color: '#f97583' },
    { tag: tags.comment, color: '#6a737d', fontStyle: 'italic' },
    { tag: tags.meta, color: '#b392f0' },
    { tag: tags.variableName, color: '#ffab70' },
    { tag: tags.atom, color: '#79b8ff' },
    { tag: tags.number, color: '#79b8ff' },
]);

/**
 * 亮色编辑器主题
 */
const lightTheme = EditorView.theme({
    '&': {
        backgroundColor: '#ffffff',
        color: '#24292e',
    },
    '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        caretColor: '#24292e',
    },
    '.cm-cursor': {
        borderLeftColor: '#24292e',
    },
    '.cm-activeLine': {
        backgroundColor: '#f6f8fa',
    },
    '.cm-activeLineGutter': {
        backgroundColor: '#f6f8fa',
    },
    '.cm-gutters': {
        backgroundColor: '#fafbfc',
        color: '#6a737d',
        border: 'none',
        borderRight: '1px solid #e1e4e8',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 16px',
        minWidth: '40px',
    },
    '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
    },
    '.cm-selectionBackground': {
        backgroundColor: '#0366d625 !important',
    },
    '&.cm-focused .cm-selectionBackground': {
        backgroundColor: '#0366d640 !important',
    },
    '.cm-matchingBracket': {
        backgroundColor: '#34d05833',
        outline: '1px solid #34d058',
    },
    '.cm-searchMatch': {
        backgroundColor: '#fff8c5',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: '#ffdf5d',
    },
    // 高亮行样式
    '.cm-highlight-line': {
        backgroundColor: '#fff8c5 !important',
    },
}, { dark: false });

/**
 * 暗色编辑器主题
 */
const darkTheme = EditorView.theme({
    '&': {
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
    },
    '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        caretColor: '#c9d1d9',
    },
    '.cm-cursor': {
        borderLeftColor: '#c9d1d9',
    },
    '.cm-activeLine': {
        backgroundColor: '#161b22',
    },
    '.cm-activeLineGutter': {
        backgroundColor: '#161b22',
    },
    '.cm-gutters': {
        backgroundColor: '#0d1117',
        color: '#484f58',
        border: 'none',
        borderRight: '1px solid #30363d',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 16px',
        minWidth: '40px',
    },
    '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
    },
    '.cm-selectionBackground': {
        backgroundColor: '#388bfd33 !important',
    },
    '&.cm-focused .cm-selectionBackground': {
        backgroundColor: '#388bfd66 !important',
    },
    '.cm-matchingBracket': {
        backgroundColor: '#3fb95033',
        outline: '1px solid #3fb950',
    },
    '.cm-searchMatch': {
        backgroundColor: '#bb800926',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: '#bb800966',
    },
    // 高亮行样式
    '.cm-highlight-line': {
        backgroundColor: '#bb800940 !important',
    },
}, { dark: true });

/**
 * 创建基础编辑器扩展
 */
export const createBaseExtensions = (isDark: boolean): Extension[] => [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightSelectionMatches(),
    keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab,
    ]),
    // 主题
    isDark ? darkTheme : lightTheme,
    syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle),
];

/**
 * 创建 AsciiDoc 语言扩展
 */
export const createAsciidocExtension = (): Extension => {
    return new LanguageSupport(asciidocLanguage);
};

/**
 * 创建编辑器状态
 */
export const createEditorState = (
    doc: string,
    isDark: boolean,
    onChange?: (content: string) => void,
    onCursorActivity?: (line: number) => void
): EditorState => {
    const extensions: Extension[] = [
        ...createBaseExtensions(isDark),
        createAsciidocExtension(),
    ];

    if (onChange) {
        extensions.push(
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onChange(update.state.doc.toString());
                }
            })
        );
    }

    if (onCursorActivity) {
        extensions.push(
            EditorView.updateListener.of((update) => {
                if (update.selectionSet) {
                    const pos = update.state.selection.main.head;
                    const line = update.state.doc.lineAt(pos).number;
                    onCursorActivity(line);
                }
            })
        );
    }

    return EditorState.create({
        doc,
        extensions,
    });
};

/**
 * 高亮指定行
 */
export const highlightLine = (view: EditorView, lineNumber: number): void => {
    // 移除旧的高亮
    const existingHighlights = view.dom.querySelectorAll('.cm-highlight-line');
    existingHighlights.forEach(el => el.classList.remove('cm-highlight-line'));

    // 添加新的高亮
    if (lineNumber >= 1 && lineNumber <= view.state.doc.lines) {
        const line = view.state.doc.line(lineNumber);
        const lineBlock = view.lineBlockAt(line.from);
        const lineElement = view.dom.querySelector(
            `.cm-line:nth-child(${lineNumber})`
        );

        // 使用 DOM 查找对应行
        const contentDom = view.contentDOM;
        const children = Array.from(contentDom.children);
        if (children[lineNumber - 1]) {
            children[lineNumber - 1].classList.add('cm-highlight-line');
        }
    }
};

/**
 * 滚动到指定行
 */
export const scrollToLine = (view: EditorView, lineNumber: number): void => {
    if (lineNumber >= 1 && lineNumber <= view.state.doc.lines) {
        const line = view.state.doc.line(lineNumber);
        view.dispatch({
            effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
        });
    }
};

/**
 * 获取当前光标所在行号
 */
export const getCurrentLine = (view: EditorView): number => {
    const pos = view.state.selection.main.head;
    return view.state.doc.lineAt(pos).number;
};

/**
 * 设置光标位置到指定行
 */
export const setCursorToLine = (view: EditorView, lineNumber: number): void => {
    if (lineNumber >= 1 && lineNumber <= view.state.doc.lines) {
        const line = view.state.doc.line(lineNumber);
        view.dispatch({
            selection: { anchor: line.from },
            scrollIntoView: true,
        });
    }
};

/**
 * 更新编辑器内容（保持光标位置）
 */
export const updateContent = (view: EditorView, content: string): void => {
    const currentContent = view.state.doc.toString();
    if (currentContent !== content) {
        const cursorPos = view.state.selection.main.head;
        view.dispatch({
            changes: { from: 0, to: currentContent.length, insert: content },
            selection: { anchor: Math.min(cursorPos, content.length) },
        });
    }
};

/**
 * 加载代码块语言支持
 */
export const loadLanguageSupport = async (lang: string): Promise<LanguageSupport | null> => {
    const loader = languageLoaders[lang.toLowerCase()];
    if (loader) {
        try {
            return await loader();
        } catch (e) {
            console.warn(`Failed to load language support for ${lang}:`, e);
        }
    }
    return null;
};

export { EditorView, EditorState };
