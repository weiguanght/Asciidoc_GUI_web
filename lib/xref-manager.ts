/**
 * 交叉引用管理器
 * 支持 AsciiDoc 锚点 (anchors) 和交叉引用 (xrefs) 的自动补全和跳转
 */

// 锚点类型
export interface Anchor {
    id: string;
    title: string;
    type: 'section' | 'block' | 'inline' | 'bibliography';
    line: number;
}

// 交叉引用匹配结果
export interface XrefMatch {
    target: string;
    label?: string;
    start: number;
    end: number;
    line: number;
}

/**
 * 从 AsciiDoc 内容中提取所有锚点
 */
export const extractAnchors = (content: string): Anchor[] => {
    const anchors: Anchor[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. 章节标题自动生成的 ID
        // = Title       -> _title
        // == Section   -> _section
        const headingMatch = line.match(/^(=+)\s+(.+)$/);
        if (headingMatch) {
            const title = headingMatch[2].trim();
            // 移除内联格式标记
            const cleanTitle = title.replace(/\*|_|`|#|\[.*?\]/g, '');
            // 生成 ID（AsciiDoc 默认规则：小写、空格转下划线）
            const id = cleanTitle.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');

            anchors.push({
                id: `_${id}`,
                title,
                type: 'section',
                line: i + 1,
            });
        }

        // 2. 显式锚点 [[anchor-id]]
        const explicitAnchorMatch = line.match(/^\[\[([^\]]+)\]\]$/);
        if (explicitAnchorMatch) {
            const id = explicitAnchorMatch[1];
            // 下一行可能是标题
            const nextLine = lines[i + 1] || '';
            const titleMatch = nextLine.match(/^=+\s+(.+)$/);

            anchors.push({
                id,
                title: titleMatch ? titleMatch[1] : id,
                type: 'block',
                line: i + 1,
            });
        }

        // 3. 内联锚点 [[[anchor-id]]]
        const inlineAnchors = line.matchAll(/\[\[\[([^\]]+)\]\]\]/g);
        for (const match of inlineAnchors) {
            anchors.push({
                id: match[1],
                title: match[1],
                type: 'inline',
                line: i + 1,
            });
        }

        // 4. 带 ID 的块属性 [#my-id]
        const blockIdMatch = line.match(/^\[#([^\]]+)\]/);
        if (blockIdMatch) {
            const id = blockIdMatch[1];
            const nextLine = lines[i + 1] || '';
            const titleMatch = nextLine.match(/^=+\s+(.+)$/);

            anchors.push({
                id,
                title: titleMatch ? titleMatch[1] : id,
                type: 'block',
                line: i + 1,
            });
        }

        // 5. 参考书目条目 [[[ref-id]]]
        const bibliographyMatch = line.match(/^\[\[\[([^\]]+)\]\]\]/);
        if (bibliographyMatch) {
            anchors.push({
                id: bibliographyMatch[1],
                title: bibliographyMatch[1],
                type: 'bibliography',
                line: i + 1,
            });
        }
    }

    return anchors;
};

/**
 * 从 AsciiDoc 内容中提取所有交叉引用
 */
export const extractXrefs = (content: string): XrefMatch[] => {
    const xrefs: XrefMatch[] = [];
    const lines = content.split('\n');

    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. 宏语法 xref:target[label]
        const xrefMacroMatches = line.matchAll(/xref:([^\[]+)\[([^\]]*)\]/g);
        for (const match of xrefMacroMatches) {
            xrefs.push({
                target: match[1],
                label: match[2] || undefined,
                start: charOffset + (match.index || 0),
                end: charOffset + (match.index || 0) + match[0].length,
                line: i + 1,
            });
        }

        // 2. 简写语法 <<target>> 或 <<target,label>>
        const shortXrefMatches = line.matchAll(/<<([^,>]+)(?:,([^>]+))?>>_?/g);
        for (const match of shortXrefMatches) {
            xrefs.push({
                target: match[1],
                label: match[2] || undefined,
                start: charOffset + (match.index || 0),
                end: charOffset + (match.index || 0) + match[0].length,
                line: i + 1,
            });
        }

        charOffset += line.length + 1; // +1 for newline
    }

    return xrefs;
};

/**
 * 验证交叉引用（检查目标是否存在）
 */
export const validateXrefs = (
    content: string
): { valid: XrefMatch[]; invalid: XrefMatch[] } => {
    const anchors = extractAnchors(content);
    const xrefs = extractXrefs(content);

    const anchorIds = new Set(anchors.map(a => a.id));

    const valid: XrefMatch[] = [];
    const invalid: XrefMatch[] = [];

    for (const xref of xrefs) {
        // 处理文件引用 (如 other-doc.adoc#section)
        const target = xref.target.includes('#')
            ? xref.target.split('#')[1]
            : xref.target;

        if (anchorIds.has(target) || anchorIds.has(`_${target}`)) {
            valid.push(xref);
        } else {
            invalid.push(xref);
        }
    }

    return { valid, invalid };
};

/**
 * 获取自动补全建议
 */
export const getXrefSuggestions = (
    content: string,
    query: string = ''
): Anchor[] => {
    const anchors = extractAnchors(content);

    if (!query) {
        return anchors;
    }

    const lowerQuery = query.toLowerCase();

    return anchors.filter(anchor =>
        anchor.id.toLowerCase().includes(lowerQuery) ||
        anchor.title.toLowerCase().includes(lowerQuery)
    );
};

/**
 * 跳转到锚点位置
 */
export const getAnchorLine = (content: string, anchorId: string): number | null => {
    const anchors = extractAnchors(content);
    const anchor = anchors.find(a =>
        a.id === anchorId ||
        a.id === `_${anchorId}` ||
        a.id === anchorId.replace(/^_/, '')
    );

    return anchor ? anchor.line : null;
};

/**
 * 生成 xref 字符串
 */
export const generateXref = (anchor: Anchor, useLabel: boolean = true): string => {
    if (useLabel && anchor.title !== anchor.id) {
        return `<<${anchor.id},${anchor.title}>>`;
    }
    return `<<${anchor.id}>>`;
};

/**
 * 构建文档大纲（基于锚点）
 */
export const buildOutline = (content: string): Anchor[] => {
    return extractAnchors(content).filter(a => a.type === 'section');
};

export default {
    extractAnchors,
    extractXrefs,
    validateXrefs,
    getXrefSuggestions,
    getAnchorLine,
    generateXref,
    buildOutline,
};
