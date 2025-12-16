/**
 * HTML 安全清洗工具
 * 使用 DOMPurify 防止 XSS 攻击
 */

import DOMPurify from 'dompurify';

// DOMPurify 配置
const DOMPURIFY_CONFIG = {
    // 允许的标签
    ALLOWED_TAGS: [
        // 文档结构
        'div', 'span', 'p', 'br', 'hr',
        // 标题
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        // 列表
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        // 表格
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
        // 文本格式
        'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins', 'sub', 'sup',
        'code', 'pre', 'kbd', 'samp', 'var', 'mark',
        // 链接和图片
        'a', 'img',
        // 引用
        'blockquote', 'cite', 'q',
        // 语义元素
        'article', 'section', 'aside', 'header', 'footer', 'nav', 'main',
        'figure', 'figcaption', 'details', 'summary',
        // AsciiDoc 特有
        'admonition', 'paragraph', 'listing', 'literal', 'sidebar', 'example', 'open',
    ],

    // 允许的属性
    ALLOWED_ATTR: [
        'id', 'class', 'style', 'title', 'lang', 'dir',
        'href', 'target', 'rel',
        'src', 'alt', 'width', 'height', 'loading',
        'data-line', 'data-source-lines', 'data-id', 'data-role', 'data-type',
        'colspan', 'rowspan', 'scope', 'headers',
        'open', 'start', 'reversed', 'type',
    ],

    // 允许 data-* 属性（用于同步）
    ALLOW_DATA_ATTR: true,

    // 禁止危险协议
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,

    // 添加目标属性到链接
    ADD_ATTR: ['target'],

    // 返回纯字符串
    RETURN_TRUSTED_TYPE: false,
};

/**
 * 清洗 HTML 内容，移除潜在的 XSS 攻击代码
 * @param dirty 可能包含恶意代码的 HTML
 * @returns 安全的 HTML
 */
export const sanitizeHtml = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG) as string;
};

/**
 * 清洗并返回可用于 dangerouslySetInnerHTML 的对象
 * @param dirty 可能包含恶意代码的 HTML
 * @returns 安全的 __html 对象
 */
export const createSafeHtml = (dirty: string): { __html: string } => {
    return { __html: sanitizeHtml(dirty) };
};

/**
 * 检查 HTML 是否被修改（用于检测潜在攻击）
 * @param original 原始 HTML
 * @returns 是否被清洗修改
 */
export const wasHtmlModified = (original: string): boolean => {
    const sanitized = sanitizeHtml(original);
    return sanitized !== original;
};

/**
 * 获取被移除的危险内容（用于日志/调试）
 */
export const getDangerousContent = (html: string): string[] => {
    const dangerous: string[] = [];

    // 检测 script 标签
    const scriptMatch = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
    if (scriptMatch) {
        dangerous.push(...scriptMatch);
    }

    // 检测 on* 事件处理器
    const eventMatch = html.match(/\son\w+\s*=\s*["'][^"']*["']/gi);
    if (eventMatch) {
        dangerous.push(...eventMatch);
    }

    // 检测 javascript: 链接
    const jsLinkMatch = html.match(/href\s*=\s*["']javascript:[^"']*["']/gi);
    if (jsLinkMatch) {
        dangerous.push(...jsLinkMatch);
    }

    return dangerous;
};

// 设置 DOMPurify 钩子用于日志记录
if (typeof window !== 'undefined') {
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
        if (data.tagName === 'script') {
            console.warn('[DOMPurify] Removed dangerous <script> element');
        }
    });

    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
        if (data.attrName.startsWith('on')) {
            console.warn(`[DOMPurify] Removed dangerous attribute: ${data.attrName}`);
        }
    });
}

export default {
    sanitizeHtml,
    createSafeHtml,
    wasHtmlModified,
    getDangerousContent,
};
