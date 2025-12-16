/**
 * AsciiDoc 智能补全
 * 提供 AsciiDoc 语法的自动补全建议
 */

export interface CompletionItem {
    label: string;
    insertText: string;
    detail: string;
    kind: 'snippet' | 'keyword' | 'attribute' | 'macro';
}

// AsciiDoc 代码块语言
const CODE_LANGUAGES = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'shell',
    'bash', 'sql', 'html', 'css', 'json', 'yaml', 'xml', 'markdown',
    'mermaid', 'plantuml'
];

// 基础补全项
const BASE_COMPLETIONS: CompletionItem[] = [
    // 标题
    { label: '= Title', insertText: '= ', detail: 'Level 1 heading', kind: 'snippet' },
    { label: '== Section', insertText: '== ', detail: 'Level 2 heading', kind: 'snippet' },
    { label: '=== Subsection', insertText: '=== ', detail: 'Level 3 heading', kind: 'snippet' },
    { label: '==== Sub-subsection', insertText: '==== ', detail: 'Level 4 heading', kind: 'snippet' },

    // 格式化
    { label: '*bold*', insertText: '*${1:text}*', detail: 'Bold text', kind: 'snippet' },
    { label: '_italic_', insertText: '_${1:text}_', detail: 'Italic text', kind: 'snippet' },
    { label: '`code`', insertText: '`${1:code}`', detail: 'Inline code', kind: 'snippet' },
    { label: '[underline]', insertText: '[underline]#${1:text}#', detail: 'Underline text', kind: 'snippet' },
    { label: '[line-through]', insertText: '[line-through]#${1:text}#', detail: 'Strikethrough text', kind: 'snippet' },

    // 链接和图片
    { label: 'link:', insertText: 'link:${1:url}[${2:text}]', detail: 'Hyperlink', kind: 'macro' },
    { label: 'image::', insertText: 'image::${1:path}[${2:alt}]', detail: 'Block image', kind: 'macro' },
    { label: 'image:', insertText: 'image:${1:path}[${2:alt}]', detail: 'Inline image', kind: 'macro' },

    // 列表
    { label: '* item', insertText: '* ${1:item}', detail: 'Unordered list item', kind: 'snippet' },
    { label: '. item', insertText: '. ${1:item}', detail: 'Ordered list item', kind: 'snippet' },
    { label: '- [ ] task', insertText: '- [ ] ${1:task}', detail: 'Task list item', kind: 'snippet' },
    { label: 'term:: def', insertText: '${1:term}:: ${2:definition}', detail: 'Definition list', kind: 'snippet' },

    // 代码块
    { label: '[source]', insertText: '[source,${1:language}]\n----\n${2:code}\n----', detail: 'Source code block', kind: 'snippet' },
    { label: '----', insertText: '----\n${1:content}\n----', detail: 'Listing block', kind: 'snippet' },
    { label: '....', insertText: '....\n${1:content}\n....', detail: 'Literal block', kind: 'snippet' },

    // 引用和告示
    { label: '[quote]', insertText: '[quote, ${1:author}]\n____\n${2:quote}\n____', detail: 'Quote block', kind: 'snippet' },
    { label: '[NOTE]', insertText: '[NOTE]\n====\n${1:note}\n====', detail: 'Note admonition', kind: 'snippet' },
    { label: '[TIP]', insertText: '[TIP]\n====\n${1:tip}\n====', detail: 'Tip admonition', kind: 'snippet' },
    { label: '[WARNING]', insertText: '[WARNING]\n====\n${1:warning}\n====', detail: 'Warning admonition', kind: 'snippet' },
    { label: '[CAUTION]', insertText: '[CAUTION]\n====\n${1:caution}\n====', detail: 'Caution admonition', kind: 'snippet' },
    { label: '[IMPORTANT]', insertText: '[IMPORTANT]\n====\n${1:important}\n====', detail: 'Important admonition', kind: 'snippet' },

    // 表格
    { label: '|===', insertText: '[cols="1,1"]\n|===\n| ${1:Header 1} | ${2:Header 2}\n\n| ${3:Cell 1} | ${4:Cell 2}\n|===', detail: 'Table', kind: 'snippet' },

    // 包含
    { label: 'include::', insertText: 'include::${1:file.adoc}[]', detail: 'Include directive', kind: 'macro' },

    // 属性
    { label: ':attribute:', insertText: ':${1:name}: ${2:value}', detail: 'Document attribute', kind: 'attribute' },
    { label: ':toc:', insertText: ':toc:\n:toc-title: Contents', detail: 'Table of contents', kind: 'attribute' },
    { label: ':icons:', insertText: ':icons: font', detail: 'Enable font icons', kind: 'attribute' },
    { label: ':source-highlighter:', insertText: ':source-highlighter: highlight.js', detail: 'Source highlighter', kind: 'attribute' },

    // 数学公式
    { label: 'stem:[]', insertText: 'stem:[${1:formula}]', detail: 'Inline math', kind: 'macro' },
    { label: '[stem]', insertText: '[stem]\n++++\n${1:formula}\n++++', detail: 'Math block', kind: 'snippet' },

    // 其他
    { label: "'''", insertText: "'''", detail: 'Horizontal rule', kind: 'snippet' },
    { label: '<<<', insertText: '<<<', detail: 'Page break', kind: 'snippet' },
    { label: '// comment', insertText: '// ${1:comment}', detail: 'Comment', kind: 'snippet' },
    { label: 'kbd:[]', insertText: 'kbd:[${1:key}]', detail: 'Keyboard shortcut', kind: 'macro' },
    { label: 'btn:[]', insertText: 'btn:[${1:label}]', detail: 'Button', kind: 'macro' },
    { label: 'menu:[]', insertText: 'menu:${1:Menu}[${2:Item}]', detail: 'Menu selection', kind: 'macro' },
];

/**
 * 获取补全建议
 * @param text 当前行文本
 * @param cursorPosition 光标在行内的位置
 * @returns 补全建议列表
 */
export const getCompletions = (text: string, cursorPosition: number): CompletionItem[] => {
    const textBeforeCursor = text.substring(0, cursorPosition);

    // 检查是否在代码块语言位置 [source,
    const sourceMatch = textBeforeCursor.match(/\[source,(\w*)$/);
    if (sourceMatch) {
        const prefix = sourceMatch[1].toLowerCase();
        return CODE_LANGUAGES
            .filter(lang => lang.startsWith(prefix))
            .map(lang => ({
                label: lang,
                insertText: lang + ']',
                detail: `${lang} source code`,
                kind: 'keyword' as const
            }));
    }

    // 获取当前输入的前缀
    const prefixMatch = textBeforeCursor.match(/[\w:=\[\*_`\-\.]+$/);
    const prefix = prefixMatch ? prefixMatch[0].toLowerCase() : '';

    if (!prefix) {
        // 空行时显示常用补全
        return BASE_COMPLETIONS.filter(item =>
            ['= Title', '== Section', '* item', '. item', '[source]'].includes(item.label)
        );
    }

    // 过滤匹配的补全项
    return BASE_COMPLETIONS.filter(item =>
        item.label.toLowerCase().includes(prefix) ||
        item.insertText.toLowerCase().includes(prefix)
    );
};

/**
 * 应用补全项，处理占位符
 * @param insertText 补全文本
 * @returns 插入文本和光标偏移
 */
export const applyCompletion = (insertText: string): { text: string; cursorOffset: number } => {
    // 移除占位符语法 ${n:text} 并记录第一个占位符位置
    let cursorOffset = insertText.length;
    let firstPlaceholder = true;

    const text = insertText.replace(/\$\{(\d+):([^}]*)\}/g, (match, num, placeholder) => {
        if (firstPlaceholder) {
            cursorOffset = insertText.indexOf(match);
            firstPlaceholder = false;
            return placeholder;
        }
        return placeholder;
    });

    return { text, cursorOffset };
};

/**
 * 检查是否应该显示补全菜单
 * @param text 当前行文本
 * @param cursorPosition 光标位置
 * @returns 是否显示
 */
export const shouldShowCompletions = (text: string, cursorPosition: number): boolean => {
    const textBeforeCursor = text.substring(0, cursorPosition);

    // 在以下情况显示补全：
    // 1. 行首
    // 2. 输入了触发字符
    // 3. 在 [source, 后

    if (cursorPosition === 0) return false;

    const lastChar = textBeforeCursor.slice(-1);
    const triggerChars = [':', '[', '=', '*', '_', '.', '-'];

    if (triggerChars.includes(lastChar)) return true;
    if (/\[source,\w*$/.test(textBeforeCursor)) return true;
    if (/^\s*$/.test(text) && cursorPosition > 0) return true;

    return false;
};
