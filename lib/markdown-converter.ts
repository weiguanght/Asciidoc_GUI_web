/**
 * Markdown 转换工具
 * 使用 HTML 作为中间格式实现 Markdown 导入导出
 */

import { marked } from 'marked';
import TurndownService from 'turndown';

// 配置 marked
marked.setOptions({
    gfm: true,        // GitHub Flavored Markdown
    breaks: true,     // 换行转为 <br>
});

// 配置 Turndown
const turndownService = new TurndownService({
    headingStyle: 'atx',           // # 风格标题
    hr: '---',                      // 水平线
    bulletListMarker: '-',          // 无序列表标记
    codeBlockStyle: 'fenced',       // 围栏代码块
    fence: '```',                   // 代码块围栏
    emDelimiter: '*',               // 斜体
    strongDelimiter: '**',          // 粗体
    linkStyle: 'inlined',           // 内联链接
});

// 添加自定义规则：处理 AsciiDoc Admonition 块
// 转换为 GitHub Flavored Markdown 的 Alerts 语法
turndownService.addRule('admonition', {
    filter: (node) => {
        return node.nodeName === 'DIV' &&
            (node.classList?.contains('admonitionblock') ||
                node.classList?.contains('admonition'));
    },
    replacement: (content, node) => {
        const element = node as HTMLElement;

        // 尝试获取 admonition 类型
        let type = 'NOTE';
        if (element.classList.contains('note') || element.dataset.type === 'note') {
            type = 'NOTE';
        } else if (element.classList.contains('tip') || element.dataset.type === 'tip') {
            type = 'TIP';
        } else if (element.classList.contains('warning') || element.dataset.type === 'warning') {
            type = 'WARNING';
        } else if (element.classList.contains('caution') || element.dataset.type === 'caution') {
            type = 'CAUTION';
        } else if (element.classList.contains('important') || element.dataset.type === 'important') {
            type = 'IMPORTANT';
        }

        // 清理内容
        const cleanContent = content.trim().replace(/\n{3,}/g, '\n\n');

        // 使用 GitHub Alerts 语法
        return `\n> [!${type}]\n> ${cleanContent.replace(/\n/g, '\n> ')}\n\n`;
    }
});

// 添加自定义规则：处理表格标题
turndownService.addRule('tableCaption', {
    filter: (node) => {
        return node.nodeName === 'CAPTION';
    },
    replacement: (content) => {
        return `**${content.trim()}**\n\n`;
    }
});

// 添加自定义规则：处理代码块语言
turndownService.addRule('codeBlockWithLang', {
    filter: ['pre'],
    replacement: (content, node) => {
        const element = node as HTMLElement;
        const codeElement = element.querySelector('code');

        // 尝试获取语言
        let language = '';
        if (codeElement) {
            const langClass = Array.from(codeElement.classList)
                .find(cls => cls.startsWith('language-') || cls.startsWith('lang-'));
            if (langClass) {
                language = langClass.replace(/^(language-|lang-)/, '');
            }
            // 也检查 data-lang 属性
            if (!language && codeElement.dataset.lang) {
                language = codeElement.dataset.lang;
            }
        }

        const code = codeElement?.textContent || content;
        return `\n\`\`\`${language}\n${code.trim()}\n\`\`\`\n\n`;
    }
});

/**
 * 将 Markdown 转换为 HTML
 * 用于导入 Markdown 文件
 * @param markdown Markdown 源码
 * @returns HTML 字符串
 */
export const markdownToHtml = (markdown: string): string => {
    return marked(markdown) as string;
};

/**
 * 将 HTML 转换为 Markdown
 * 用于导出 Markdown 文件
 * @param html HTML 字符串
 * @returns Markdown 源码
 */
export const htmlToMarkdown = (html: string): string => {
    return turndownService.turndown(html);
};

/**
 * 导入 Markdown 文件
 * 返回 HTML，可直接用于 Tiptap setContent
 * @param markdownContent Markdown 文件内容
 * @returns HTML 字符串
 */
export const importMarkdown = (markdownContent: string): string => {
    // 预处理：处理 GitHub Alerts 语法
    let processed = markdownContent;

    // 将 GitHub Alerts 转换为临时 HTML 标记
    const alertRegex = /> \[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\n((?:> .*\n?)*)/gi;
    processed = processed.replace(alertRegex, (match, type, content) => {
        const cleanContent = content.replace(/^> ?/gm, '').trim();
        return `<div class="admonition ${type.toLowerCase()}" data-type="${type.toLowerCase()}">${cleanContent}</div>\n\n`;
    });

    return markdownToHtml(processed);
};

/**
 * 导出为 Markdown 文件
 * @param html 编辑器的 HTML 内容
 * @param filename 文件名
 */
export const exportMarkdown = (html: string, filename: string = 'document.md'): void => {
    const markdown = htmlToMarkdown(html);

    // 创建 Blob 并下载
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};

/**
 * 读取 Markdown 文件
 * @param file 文件对象
 * @returns Promise<{ content: string; html: string; name: string }>
 */
export const readMarkdownFile = async (file: File): Promise<{
    content: string;
    html: string;
    name: string;
}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            const html = importMarkdown(content);
            resolve({
                content,
                html,
                name: file.name.replace(/\.md$/, '.adoc'),
            });
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
};

/**
 * 从 Tiptap Editor 导出 Markdown
 * @param editor Tiptap Editor 实例
 * @param filename 文件名
 */
export const exportEditorToMarkdown = (editor: any, filename?: string): void => {
    const html = editor.getHTML();
    const name = filename || 'document.md';
    exportMarkdown(html, name);
};

export default {
    markdownToHtml,
    htmlToMarkdown,
    importMarkdown,
    exportMarkdown,
    readMarkdownFile,
    exportEditorToMarkdown,
};
