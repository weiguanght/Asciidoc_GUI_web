/**
 * Asciidoctor.js 渲染器
 * 使用 asciidoctor.js 实现完整的 AsciiDoc 语法支持
 */

import Asciidoctor from 'asciidoctor';
import hljs from 'highlight.js';

// 创建 Asciidoctor 实例
const asciidoctor = Asciidoctor();

// 注册 highlight.js 语法高亮
const highlightCode = (code: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
        try {
            return hljs.highlight(code, { language: lang }).value;
        } catch (e) {
            console.warn('Highlight.js error:', e);
        }
    }
    return hljs.highlightAuto(code).value;
};

/**
 * 将 AsciiDoc 源码转换为 HTML
 * @param adoc AsciiDoc 源码
 * @returns 渲染后的 HTML
 */
export const adocToHtml = (adoc: string): string => {
    try {
        // Asciidoctor 转换选项
        const options = {
            safe: 'safe',
            attributes: {
                'showtitle': true,
                'icons': 'font',
                'source-highlighter': 'highlight.js',
                'sectanchors': true,
                'sectlinks': true,
                'experimental': true,
                'idprefix': '',
                'idseparator': '-',
            },
        };

        // 转换 AsciiDoc 到 HTML
        let html = asciidoctor.convert(adoc, options) as string;

        // 手动应用代码高亮 (因为在浏览器环境中需要手动处理)
        html = html.replace(
            /<pre class="highlight"><code(?: class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g,
            (match, lang, code) => {
                // 解码 HTML 实体
                const decodedCode = code
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"');

                const highlighted = highlightCode(decodedCode, lang || '');
                const langClass = lang ? ` class="language-${lang}"` : '';
                return `<pre class="highlight hljs"><code${langClass}>${highlighted}</code></pre>`;
            }
        );

        // 给每个块级元素添加 data-line 属性用于同步定位
        let lineNumber = 0;
        html = html.replace(/<(h[1-6]|p|pre|table|ul|ol|blockquote|div|section)([^>]*)>/gi,
            (match, tag, attrs) => {
                lineNumber++;
                return `<${tag}${attrs} data-line="${lineNumber}">`;
            }
        );

        return html;
    } catch (error) {
        console.error('Asciidoctor conversion error:', error);
        return `<div class="error">渲染错误: ${error}</div>`;
    }
};

/**
 * 获取 AsciiDoc 源码中某行对应的内容类型
 * @param adoc AsciiDoc 源码
 * @param lineNumber 行号 (1-indexed)
 * @returns 内容类型和关联信息
 */
export const getLineInfo = (adoc: string, lineNumber: number): {
    type: string;
    content: string;
} => {
    const lines = adoc.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) {
        return { type: 'unknown', content: '' };
    }

    const line = lines[lineNumber - 1];

    // 判断行类型
    if (line.startsWith('= ')) return { type: 'h1', content: line.slice(2) };
    if (line.startsWith('== ')) return { type: 'h2', content: line.slice(3) };
    if (line.startsWith('=== ')) return { type: 'h3', content: line.slice(4) };
    if (line.startsWith('==== ')) return { type: 'h4', content: line.slice(5) };
    if (line.startsWith('* ')) return { type: 'list-item', content: line.slice(2) };
    if (line.startsWith('. ')) return { type: 'ordered-item', content: line.slice(2) };
    if (line.startsWith('----')) return { type: 'code-delimiter', content: '' };
    if (line.startsWith('|===')) return { type: 'table-delimiter', content: '' };
    if (line.startsWith('|')) return { type: 'table-cell', content: line };
    if (line.startsWith('image::')) return { type: 'image', content: line };
    if (line.startsWith('[')) return { type: 'attribute', content: line };
    if (line.startsWith('//')) return { type: 'comment', content: line };
    if (line.trim() === '') return { type: 'blank', content: '' };

    return { type: 'paragraph', content: line };
};

/**
 * 查找源码中某个位置对应的渲染 HTML 中的元素
 * @param adoc AsciiDoc 源码
 * @param cursorPosition 光标位置
 * @returns 对应的行号
 */
export const findLineFromCursor = (adoc: string, cursorPosition: number): number => {
    const textBeforeCursor = adoc.substring(0, cursorPosition);
    return textBeforeCursor.split('\n').length;
};

// 导出 Asciidoctor 实例供高级用法
export { asciidoctor };
