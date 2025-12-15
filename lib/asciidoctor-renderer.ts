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

        // 解析源码行号映射
        const lineMap = buildSourceLineMap(adoc);

        // 给每个块级元素添加 data-line 属性用于同步定位
        html = addDataLineAttributes(html, lineMap);

        return html;
    } catch (error) {
        console.error('Asciidoctor conversion error:', error);
        return `<div class="error">渲染错误: ${error}</div>`;
    }
};

/**
 * 构建源码内容到行号的映射
 * @param adoc AsciiDoc 源码
 * @returns 内容到行号的映射
 */
const buildSourceLineMap = (adoc: string): Map<string, number> => {
    const lines = adoc.split('\n');
    const lineMap = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 提取标题内容
        const headingMatch = line.match(/^(=+)\s+(.+)$/);
        if (headingMatch) {
            const content = headingMatch[2].trim();
            if (!lineMap.has(content)) {
                lineMap.set(content, i + 1);
            }
            continue;
        }

        // 提取列表项内容
        const listMatch = line.match(/^[\*\.\-]\s+(.+)$/);
        if (listMatch) {
            const content = listMatch[1].trim();
            // 对列表项使用带前缀的 key 以避免冲突
            const key = `li:${content}`;
            if (!lineMap.has(key)) {
                lineMap.set(key, i + 1);
            }
            continue;
        }

        // 存储普通段落内容（取前50个字符作为 key）
        if (line.length > 0 && !line.startsWith('[') && !line.startsWith('|') && !line.startsWith('----')) {
            const key = line.substring(0, Math.min(50, line.length));
            if (!lineMap.has(key)) {
                lineMap.set(key, i + 1);
            }
        }
    }

    return lineMap;
};

/**
 * 给 HTML 元素添加 data-line 属性
 * @param html 渲染后的 HTML
 * @param lineMap 内容到行号的映射
 * @returns 添加了 data-line 属性的 HTML
 */
const addDataLineAttributes = (html: string, lineMap: Map<string, number>): string => {
    // 处理标题 (h1-h6)
    html = html.replace(/<(h[1-6])([^>]*)>([^<]+)<\/\1>/gi, (match, tag, attrs, content) => {
        const textContent = content.replace(/<[^>]+>/g, '').trim();
        const line = lineMap.get(textContent);
        if (line) {
            return `<${tag}${attrs} data-line="${line}">${content}</${tag}>`;
        }
        return match;
    });

    // 处理段落 (p)
    html = html.replace(/<p([^>]*)>([^<]+)<\/p>/gi, (match, attrs, content) => {
        const textContent = content.replace(/<[^>]+>/g, '').trim();
        const key = textContent.substring(0, Math.min(50, textContent.length));
        const line = lineMap.get(key);
        if (line) {
            return `<p${attrs} data-line="${line}">${content}</p>`;
        }
        return match;
    });

    // 处理列表项 (li)
    html = html.replace(/<li([^>]*)>(?:<p>)?([^<]+)(?:<\/p>)?<\/li>/gi, (match, attrs, content) => {
        const textContent = content.replace(/<[^>]+>/g, '').trim();
        const key = `li:${textContent}`;
        const line = lineMap.get(key);
        if (line) {
            if (match.includes('<p>')) {
                return `<li${attrs} data-line="${line}"><p>${content}</p></li>`;
            }
            return `<li${attrs} data-line="${line}">${content}</li>`;
        }
        return match;
    });

    // 为未匹配的块级元素添加默认 data-line (使用位置索引)
    let blockIndex = 0;
    html = html.replace(/<(pre|table|ul|ol|blockquote|div|section)([^>]*)>/gi, (match, tag, attrs) => {
        if (!attrs.includes('data-line')) {
            blockIndex++;
            return `<${tag}${attrs} data-line="block-${blockIndex}">`;
        }
        return match;
    });

    return html;
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
