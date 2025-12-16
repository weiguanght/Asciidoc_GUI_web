/**
 * Asciidoctor.js 渲染器
 * 使用 asciidoctor.js 实现完整的 AsciiDoc 语法支持
 * 支持 Mermaid 图表和 KaTeX 数学公式
 */

import Asciidoctor from 'asciidoctor';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import katex from 'katex';
import { processIncludes, hasIncludes } from './include-preprocessor';
import { FileItem } from '../types';

// 创建 Asciidoctor 实例
const asciidoctor = Asciidoctor();

// 初始化 Mermaid
let mermaidInitialized = false;
const initMermaid = () => {
    if (!mermaidInitialized) {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
        });
        mermaidInitialized = true;
    }
};

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

// 渲染 KaTeX 公式
const renderKatex = (formula: string, displayMode: boolean = false): string => {
    try {
        return katex.renderToString(formula, {
            displayMode,
            throwOnError: false,
            output: 'html',
        });
    } catch (e) {
        console.warn('KaTeX error:', e);
        return `<span class="katex-error">${formula}</span>`;
    }
};

// Mermaid 图表计数器（用于生成唯一 ID）
let mermaidCounter = 0;

/**
 * 将 AsciiDoc 源码转换为 HTML
 * @param adoc AsciiDoc 源码
 * @param files 可选的文件列表（用于处理 include 指令）
 * @param currentFileName 可选的当前文件名（用于检测循环引用）
 * @returns 渲染后的 HTML
 */
export const adocToHtml = (adoc: string, files?: FileItem[], currentFileName?: string): string => {
    try {
        initMermaid();
        mermaidCounter = 0;

        // 预处理 Include 指令
        let processedAdoc = adoc;
        if (files && hasIncludes(adoc)) {
            processedAdoc = processIncludes(adoc, files, currentFileName || '');
        }

        // Asciidoctor 转换选项
        const options = {
            safe: 'safe',
            doctype: 'book',
            attributes: {
                'showtitle': true,
                'icons': 'font',
                'source-highlighter': 'highlight.js',
                'sectanchors': true,
                'sectlinks': true,
                'experimental': true,
                'idprefix': '',
                'idseparator': '-',
                'stem': 'latexmath', // 启用 STEM 支持
            },
        };

        // 转换 AsciiDoc 到 HTML
        let html = asciidoctor.convert(processedAdoc, options) as string;

        // 处理 Mermaid 代码块
        html = html.replace(
            /<pre class="highlight"><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
            (match, code) => {
                const decodedCode = code
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"');

                mermaidCounter++;
                const mermaidId = `mermaid-${mermaidCounter}-${Date.now()}`;

                // 返回一个占位 div，将在客户端渲染
                return `<div class="mermaid-container" data-mermaid-id="${mermaidId}">
                    <pre class="mermaid">${decodedCode}</pre>
                </div>`;
            }
        );

        // 处理内联 STEM 公式: stem:[...]
        html = html.replace(
            /stem:\[([^\]]+)\]/g,
            (match, formula) => {
                const decodedFormula = formula
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&');
                return `<span class="math-inline">${renderKatex(decodedFormula, false)}</span>`;
            }
        );

        // 处理 STEM 块 (latexmath 块)
        html = html.replace(
            /<div class="stemblock">\s*<div class="content">\s*\\?\[([^\]]*)\]\s*([\s\S]*?)\s*<\/div>\s*<\/div>/g,
            (match, type, formula) => {
                const decodedFormula = formula
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .trim();
                return `<div class="math-block">${renderKatex(decodedFormula, true)}</div>`;
            }
        );

        // 备用：处理简单的 [stem] 块
        html = html.replace(
            /<div class="stemblock">\s*<div class="content">\s*([\s\S]*?)\s*<\/div>\s*<\/div>/g,
            (match, formula) => {
                const decodedFormula = formula
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/^\\\[/, '')
                    .replace(/\\\]$/, '')
                    .trim();
                if (decodedFormula) {
                    return `<div class="math-block">${renderKatex(decodedFormula, true)}</div>`;
                }
                return match;
            }
        );

        // 手动应用代码高亮 (非 Mermaid 的代码块)
        html = html.replace(
            /<pre class="highlight"><code(?: class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g,
            (match, lang, code) => {
                // 跳过已处理的 Mermaid
                if (lang === 'mermaid') return match;

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
        const lineMap = buildSourceLineMap(processedAdoc);

        // 给每个块级元素添加 data-line 属性用于同步定位
        html = addDataLineAttributes(html, lineMap);

        return html;
    } catch (error) {
        console.error('Asciidoctor conversion error:', error);
        return `<div class="error">渲染错误: ${error}</div>`;
    }
};

/**
 * 在 DOM 中渲染 Mermaid 图表（需要在组件挂载后调用）
 */
export const renderMermaidDiagrams = async (): Promise<void> => {
    initMermaid();
    try {
        await mermaid.run({
            querySelector: '.mermaid',
        });
    } catch (e) {
        console.warn('Mermaid render error:', e);
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
    let tableStartLine = 0;
    let inTable = false;
    let tableRowIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 检测表格开始/结束
        if (line.startsWith('|===')) {
            if (!inTable) {
                inTable = true;
                tableStartLine = i + 1;
                tableRowIndex = 0;
            } else {
                inTable = false;
            }
            continue;
        }

        // 表格行映射
        if (inTable && line.startsWith('|')) {
            tableRowIndex++;
            const key = `table-row:${tableStartLine}:${tableRowIndex}`;
            lineMap.set(key, i + 1);
            // 同时存储表格单元格内容
            const cells = line.split('|').filter(c => c.trim());
            cells.forEach((cell, cellIndex) => {
                const cellContent = cell.trim().substring(0, 30);
                if (cellContent) {
                    const cellKey = `cell:${cellContent}`;
                    if (!lineMap.has(cellKey)) {
                        lineMap.set(cellKey, i + 1);
                    }
                }
            });
            continue;
        }

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

        // 图片映射
        const imageMatch = line.match(/^image::([^\[]+)/);
        if (imageMatch) {
            const imagePath = imageMatch[1].trim();
            const key = `image:${imagePath}`;
            if (!lineMap.has(key)) {
                lineMap.set(key, i + 1);
            }
            continue;
        }

        // 告示块映射 ([NOTE], [TIP], [WARNING], [CAUTION], [IMPORTANT])
        const admonitionMatch = line.match(/^\[(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]/i);
        if (admonitionMatch) {
            const type = admonitionMatch[1].toUpperCase();
            // 获取下一行内容作为标识
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                const key = `admonition:${type}:${nextLine.substring(0, 30)}`;
                if (!lineMap.has(key)) {
                    lineMap.set(key, i + 1);
                }
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

    // 处理段落 (p) - 改进匹配逻辑以支持包含 HTML 标签的内容
    html = html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
        if (attrs.includes('data-line')) return match;
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

    // 处理图片 (img)
    html = html.replace(/<img([^>]*?)src="([^"]+)"([^>]*)>/gi, (match, before, src, after) => {
        // 从路径中提取文件名
        const filename = src.split('/').pop()?.split('?')[0] || src;
        const key = `image:${filename}`;
        const line = lineMap.get(key);
        if (line) {
            return `<img${before}src="${src}"${after} data-line="${line}">`;
        }
        // 尝试直接匹配完整路径
        const fullKey = `image:${src}`;
        const fullLine = lineMap.get(fullKey);
        if (fullLine) {
            return `<img${before}src="${src}"${after} data-line="${fullLine}">`;
        }
        return match;
    });

    // 处理告示块 (admonitionblock)
    html = html.replace(/<div class="admonitionblock ([^"]+)"([^>]*)>([\s\S]*?)<\/div>/gi, (match, type, attrs, content) => {
        if (attrs.includes('data-line')) return match;
        // 提取内容文本
        const textMatch = content.match(/<div class="content">\s*([\s\S]*?)\s*<\/div>/i);
        if (textMatch) {
            const textContent = textMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 30);
            const key = `admonition:${type.toUpperCase()}:${textContent}`;
            const line = lineMap.get(key);
            if (line) {
                return `<div class="admonitionblock ${type}"${attrs} data-line="${line}">${content}</div>`;
            }
        }
        return match;
    });

    // 处理表格单元格 (td, th) - 基于单元格内容匹配
    html = html.replace(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, content) => {
        if (attrs.includes('data-line')) return match;
        const textContent = content.replace(/<[^>]+>/g, '').trim().substring(0, 30);
        if (textContent) {
            const key = `cell:${textContent}`;
            const line = lineMap.get(key);
            if (line) {
                return `<${tag}${attrs} data-line="${line}">${content}</${tag}>`;
            }
        }
        return match;
    });

    // 为未匹配的块级元素添加默认 data-line (使用位置索引)
    let blockIndex = 0;
    html = html.replace(/<(pre|table|ul|ol|blockquote|section)([^>]*)>/gi, (match, tag, attrs) => {
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
