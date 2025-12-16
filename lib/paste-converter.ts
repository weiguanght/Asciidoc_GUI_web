/**
 * 粘贴内容转换器
 * 将 Markdown 和 HTML 转换为 AsciiDoc 格式
 */

/**
 * 将 Markdown 转换为 AsciiDoc
 */
export const markdownToAdoc = (markdown: string): string => {
    let adoc = markdown;

    // 标题转换: # -> =
    adoc = adoc.replace(/^######\s+(.+)$/gm, '====== $1');
    adoc = adoc.replace(/^#####\s+(.+)$/gm, '===== $1');
    adoc = adoc.replace(/^####\s+(.+)$/gm, '==== $1');
    adoc = adoc.replace(/^###\s+(.+)$/gm, '=== $1');
    adoc = adoc.replace(/^##\s+(.+)$/gm, '== $1');
    adoc = adoc.replace(/^#\s+(.+)$/gm, '= $1');

    // 粗体: **text** 或 __text__ -> *text*
    adoc = adoc.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    adoc = adoc.replace(/__([^_]+)__/g, '*$1*');

    // 斜体: *text* 或 _text_ -> _text_
    // 注意顺序，要在粗体之后处理
    adoc = adoc.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '_$1_');

    // 行内代码: `code` -> `code` (保持不变)
    // 代码块: ```lang -> [source,lang]
    adoc = adoc.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const langAttr = lang ? `[source,${lang}]` : '[source]';
        return `${langAttr}\n----\n${code.trim()}\n----`;
    });

    // 链接: [text](url) -> link:url[text]
    adoc = adoc.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 'link:$2[$1]');

    // 图片: ![alt](url) -> image::url[alt]
    adoc = adoc.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 'image::$2[$1]');

    // 无序列表: - 或 * -> *
    adoc = adoc.replace(/^[\-\*]\s+/gm, '* ');

    // 有序列表: 1. -> .
    adoc = adoc.replace(/^\d+\.\s+/gm, '. ');

    // 引用: > -> 使用 [quote] 块或直接转换
    // 简单处理：多行引用合并
    adoc = adoc.replace(/^>\s*(.*)$/gm, '____\n$1\n____');
    // 清理连续的引用块标记
    adoc = adoc.replace(/____\n____/g, '');

    // 水平线: --- 或 *** -> '''
    adoc = adoc.replace(/^(---|\*\*\*|___)$/gm, "'''");

    // 删除线: ~~text~~ -> [line-through]#text#
    adoc = adoc.replace(/~~([^~]+)~~/g, '[line-through]#$1#');

    // 表格转换 (简化版)
    adoc = convertMarkdownTable(adoc);

    return adoc;
};

/**
 * 转换 Markdown 表格为 AsciiDoc 表格
 */
const convertMarkdownTable = (content: string): string => {
    // 匹配 Markdown 表格
    const tablePattern = /(\|[^\n]+\|)\n(\|[\-:|\s]+\|)\n((?:\|[^\n]+\|\n?)+)/g;

    return content.replace(tablePattern, (match, header, separator, body) => {
        // 解析表头
        const headers = header.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim());

        // 解析表体
        const rows = body.trim().split('\n').map((row: string) =>
            row.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim())
        );

        // 生成 AsciiDoc 表格
        let adocTable = '[cols="' + headers.map(() => '1').join(',') + '", options="header"]\n';
        adocTable += '|===\n';

        // 表头
        headers.forEach((h: string) => {
            adocTable += `| ${h}\n`;
        });
        adocTable += '\n';

        // 表体
        rows.forEach((row: string[]) => {
            row.forEach((cell: string) => {
                adocTable += `| ${cell}\n`;
            });
            adocTable += '\n';
        });

        adocTable += '|===';

        return adocTable;
    });
};

/**
 * 将 HTML 转换为 AsciiDoc
 */
export const htmlToAdoc = (html: string): string => {
    // 创建一个临时 DOM 元素
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return convertNodeToAdoc(doc.body);
};

/**
 * 递归转换 DOM 节点为 AsciiDoc
 */
const convertNodeToAdoc = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map(convertNodeToAdoc).join('');

    switch (tagName) {
        // 标题
        case 'h1': return `= ${children}\n\n`;
        case 'h2': return `== ${children}\n\n`;
        case 'h3': return `=== ${children}\n\n`;
        case 'h4': return `==== ${children}\n\n`;
        case 'h5': return `===== ${children}\n\n`;
        case 'h6': return `====== ${children}\n\n`;

        // 段落
        case 'p': return `${children}\n\n`;
        case 'br': return '\n';

        // 格式化
        case 'strong':
        case 'b': return `*${children}*`;
        case 'em':
        case 'i': return `_${children}_`;
        case 'code': return `\`${children}\``;
        case 'u': return `[underline]#${children}#`;
        case 's':
        case 'strike':
        case 'del': return `[line-through]#${children}#`;
        case 'mark': return `[yellow-background]#${children}#`;

        // 链接和图片
        case 'a': {
            const href = element.getAttribute('href') || '';
            return `link:${href}[${children}]`;
        }
        case 'img': {
            const src = element.getAttribute('src') || '';
            const alt = element.getAttribute('alt') || '';
            return `image::${src}[${alt}]`;
        }

        // 列表
        case 'ul': return children;
        case 'ol': return children;
        case 'li': {
            const parent = element.parentElement;
            const prefix = parent?.tagName.toLowerCase() === 'ol' ? '. ' : '* ';
            return `${prefix}${children.trim()}\n`;
        }

        // 引用
        case 'blockquote': return `[quote]\n____\n${children.trim()}\n____\n\n`;

        // 代码块
        case 'pre': {
            const codeElement = element.querySelector('code');
            const code = codeElement ? codeElement.textContent : children;
            const lang = codeElement?.className.match(/language-(\w+)/)?.[1] || '';
            return `[source${lang ? ',' + lang : ''}]\n----\n${code?.trim()}\n----\n\n`;
        }

        // 表格
        case 'table': return convertHtmlTable(element);
        case 'thead':
        case 'tbody':
        case 'tfoot':
        case 'tr':
        case 'th':
        case 'td': return children;

        // 水平线
        case 'hr': return "'''\n\n";

        // 容器元素
        case 'div':
        case 'span':
        case 'article':
        case 'section':
        case 'main':
        case 'header':
        case 'footer':
        case 'nav':
            return children;

        default:
            return children;
    }
};

/**
 * 转换 HTML 表格为 AsciiDoc
 */
const convertHtmlTable = (table: Element): string => {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return '';

    // 检测列数
    const firstRow = rows[0];
    const firstRowCells = firstRow.querySelectorAll('th, td');
    const colCount = firstRowCells.length;

    // 检测是否有表头
    const hasHeader = firstRow.querySelector('th') !== null;

    let adocTable = `[cols="${Array(colCount).fill('1').join(',')}"${hasHeader ? ', options="header"' : ''}]\n`;
    adocTable += '|===\n';

    rows.forEach((row) => {
        const cells = row.querySelectorAll('th, td');
        // 将所有单元格放在同一行，用 | 分隔
        const rowContent = Array.from(cells).map(cell => {
            const content = cell.textContent?.trim() || '';
            return `| ${content}`;
        }).join(' ');
        adocTable += rowContent + '\n\n';
    });

    adocTable += '|===\n\n';
    return adocTable;
};

/**
 * 检测内容类型并转换为 AsciiDoc
 */
export const convertToAdoc = (content: string, type: 'markdown' | 'html' | 'auto' = 'auto'): string => {
    if (type === 'markdown') {
        return markdownToAdoc(content);
    }

    if (type === 'html') {
        return htmlToAdoc(content);
    }

    // 自动检测
    if (content.trim().startsWith('<') && content.includes('>')) {
        // 可能是 HTML
        return htmlToAdoc(content);
    }

    // 检查是否包含 Markdown 特征
    const hasMarkdownFeatures =
        /^#{1,6}\s/m.test(content) ||      // 标题
        /\*\*[^*]+\*\*/.test(content) ||    // 粗体
        /\[([^\]]+)\]\(([^)]+)\)/.test(content) || // 链接
        /```/.test(content);                // 代码块

    if (hasMarkdownFeatures) {
        return markdownToAdoc(content);
    }

    // 默认返回原内容
    return content;
};
