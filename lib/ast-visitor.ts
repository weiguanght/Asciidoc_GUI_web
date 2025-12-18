/**
 * AST Visitor - Tiptap JSON 到 AsciiDoc 的 Visitor 模式转换器
 * 
 * 设计原则：
 * 1. 每种节点类型有独立的 visit 方法
 * 2. Marks 边界合并处理
 * 3. 严格的类型检查
 * 4. 支持嵌套结构
 */

// Tiptap 节点类型定义
export interface TiptapMark {
    type: string;
    attrs?: Record<string, any>;
}

export interface TiptapNode {
    type: string;
    content?: TiptapNode[];
    text?: string;
    marks?: TiptapMark[];
    attrs?: Record<string, any>;
}

export interface TiptapDocument {
    type: 'doc';
    content: TiptapNode[];
}

// 转换上下文
interface VisitorContext {
    depth: number;          // 当前嵌套深度
    listLevel: number;      // 列表嵌套级别
    listType: 'bullet' | 'ordered' | null;
    inTable: boolean;       // 是否在表格内
    inBlockquote: boolean;  // 是否在引用块内
    inAdmonition: boolean;  // 是否在告示块内
}

/**
 * TiptapJSONVisitor - Visitor 模式 AST 转换器
 */
// Notion 颜色映射
export const NOTION_COLOR_MAP: Record<string, string> = {
    // Text Colors
    '#9B9A97': 'gray',
    '#64473A': 'brown',
    '#D9730D': 'orange',
    '#CB912F': 'yellow',
    '#448361': 'green',
    '#337EA9': 'blue',
    '#9065B0': 'purple',
    '#C14C8A': 'pink',
    '#D44C47': 'red',
    // Background Colors
    '#EBECED': 'gray',
    '#E9E5E3': 'brown',
    '#FAEBDD': 'orange',
    '#FBF3DB': 'yellow',
    '#DDEDEA': 'green',
    '#DDEBF1': 'blue',
    '#EAE4F2': 'purple',
    '#F4DFEB': 'pink',
    '#FBE4E4': 'red',
};

export class TiptapJSONVisitor {
    private output: string[] = [];
    private context: VisitorContext;

    constructor() {
        this.context = this.createDefaultContext();
    }

    private createDefaultContext(): VisitorContext {
        return {
            depth: 0,
            listLevel: 0,
            listType: null,
            inTable: false,
            inBlockquote: false,
            inAdmonition: false,
        };
    }

    /**
     * 主入口：转换 Tiptap 文档
     */
    public convert(doc: TiptapDocument): string {
        this.output = [];
        this.context = this.createDefaultContext();

        if (doc.content) {
            for (const node of doc.content) {
                this.visit(node);
            }
        }

        return this.output.join('\n').trim();
    }

    /**
     * 分发节点到对应的 visit 方法
     */
    private visit(node: TiptapNode): void {
        const methodName = `visit${this.capitalize(node.type)}` as keyof this;

        if (typeof this[methodName] === 'function') {
            (this[methodName] as (node: TiptapNode) => void)(node);
        } else {
            this.visitUnknown(node);
        }
    }

    /**
     * 访问文本节点（处理 Marks）
     */
    private visitText(node: TiptapNode): string {
        if (!node.text) return '';

        let text = node.text;

        if (node.marks && node.marks.length > 0) {
            text = this.applyMarks(text, node.marks);
        }

        return text;
    }

    /**
     * 应用 Marks（加粗、斜体等）
     * 处理边界合并问题
     */
    private applyMarks(text: string, marks: TiptapMark[]): string {
        // 按优先级排序：先处理外层，再处理内层
        const sortedMarks = this.sortMarks(marks);

        for (const mark of sortedMarks) {
            text = this.applyMark(text, mark);
        }

        return text;
    }

    private sortMarks(marks: TiptapMark[]): TiptapMark[] {
        // 优先级：数字越小越外层（最后应用）
        const priority: Record<string, number> = {
            link: 1,      // 最外层
            bold: 2,
            italic: 3,
            code: 4,
            underline: 5,
            strike: 6,
            highlight: 7, // 最内层
            textStyle: 8, // 文本样式（颜色）
        };

        // 降序排序：优先级低的先应用（成为内层），优先级高的后应用（成为外层）
        return [...marks].sort((a, b) => {
            return (priority[b.type] || 0) - (priority[a.type] || 0);
        });
    }

    private applyMark(text: string, mark: TiptapMark): string {
        switch (mark.type) {
            case 'bold':
                return `*${text}*`;
            case 'italic':
                return `_${text}_`;
            case 'code':
                return `\`${text}\``;
            case 'underline':
                return `[.underline]#${text}#`;
            case 'strike':
                return `[.line-through]#${text}#`;
            case 'link':
                const href = mark.attrs?.href || '';
                // 内部锚点
                if (href.startsWith('#')) {
                    return `<<${href.substring(1)},${text}>>`;
                }
                // 跨文件引用
                if (href.endsWith('.adoc')) {
                    return `xref:${href}[${text}]`;
                }
                return `${href}[${text}]`;
            case 'highlight': {
                const color = mark.attrs?.color;
                if (color && color.startsWith('#')) {
                    const colorName = NOTION_COLOR_MAP[color.toUpperCase()] || 'yellow';
                    return `[.${colorName}-background]#${text}#`;
                }
                return `[.highlight-${color || 'yellow'}]#${text}#`;
            }
            case 'textStyle': {
                const color = mark.attrs?.color;
                if (color && color.startsWith('#')) {
                    const colorName = NOTION_COLOR_MAP[color.toUpperCase()] || 'black';
                    return `[.${colorName}]#${text}#`;
                }
                return text;
            }
            default:
                return text;
        }
    }

    /**
     * 访问段落
     */
    private visitParagraph(node: TiptapNode): void {
        const text = this.processInlineContent(node.content);

        if (text.trim()) {
            this.output.push(text);
            this.output.push('');
        }
    }

    /**
     * 访问标题
     */
    private visitHeading(node: TiptapNode): void {
        const id = node.attrs?.id;
        // 如果有 Block ID，生成锚点
        if (id) {
            this.output.push(`[#${id}]`);
        }

        const level = node.attrs?.level || 1;
        const prefix = '='.repeat(level + 1); // AsciiDoc 标题从 == 开始
        const text = this.processInlineContent(node.content);

        this.output.push(`${prefix} ${text}`);
        this.output.push('');
    }

    /**
     * 访问无序列表
     */
    private visitBulletList(node: TiptapNode): void {
        const prevListType = this.context.listType;
        this.context.listType = 'bullet';
        this.context.listLevel++;

        if (node.content) {
            for (const item of node.content) {
                this.visit(item);
            }
        }

        this.context.listLevel--;
        this.context.listType = prevListType;

        if (this.context.listLevel === 0) {
            this.output.push('');
        }
    }

    /**
     * 访问有序列表
     */
    private visitOrderedList(node: TiptapNode): void {
        const prevListType = this.context.listType;
        this.context.listType = 'ordered';
        this.context.listLevel++;

        if (node.content) {
            for (const item of node.content) {
                this.visit(item);
            }
        }

        this.context.listLevel--;
        this.context.listType = prevListType;

        if (this.context.listLevel === 0) {
            this.output.push('');
        }
    }

    /**
     * 访问列表项
     */
    private visitListItem(node: TiptapNode): void {
        const marker = this.context.listType === 'ordered'
            ? '.'.repeat(this.context.listLevel)
            : '*'.repeat(this.context.listLevel);

        if (node.content) {
            const firstChild = node.content[0];

            if (firstChild?.type === 'paragraph') {
                const text = this.processInlineContent(firstChild.content);
                this.output.push(`${marker} ${text}`);

                // 处理列表项中的后续内容（嵌套列表等）
                for (let i = 1; i < node.content.length; i++) {
                    const child = node.content[i];
                    if (child.type === 'bulletList' || child.type === 'orderedList') {
                        this.visit(child);
                    }
                }
            } else {
                // 非段落开头的列表项
                for (const child of node.content) {
                    this.visit(child);
                }
            }
        }
    }

    /**
     * 访问代码块
     */
    private visitCodeBlock(node: TiptapNode): void {
        const language = node.attrs?.language || '';
        const code = node.content?.map(n => n.text || '').join('') || '';

        if (language) {
            this.output.push(`[source,${language}]`);
        }
        this.output.push('----');
        this.output.push(code);
        this.output.push('----');
        this.output.push('');
    }

    /**
     * 访问引用块
     */
    private visitBlockquote(node: TiptapNode): void {
        this.context.inBlockquote = true;

        this.output.push('[quote]');
        this.output.push('____');

        if (node.content) {
            for (const child of node.content) {
                this.visit(child);
            }
        }

        // 移除最后的空行
        if (this.output[this.output.length - 1] === '') {
            this.output.pop();
        }

        this.output.push('____');
        this.output.push('');

        this.context.inBlockquote = false;
    }

    /**
     * 访问水平分隔线
     */
    private visitHorizontalRule(node: TiptapNode): void {
        this.output.push("'''");
        this.output.push('');
    }

    /**
     * 访问图片
     */
    private visitImage(node: TiptapNode): void {
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        const title = node.attrs?.title || '';

        if (title) {
            this.output.push(`.${title}`);
        }
        this.output.push(`image::${src}[${alt}]`);
        this.output.push('');
    }

    /**
     * 访问表格
     */
    private visitTable(node: TiptapNode): void {
        this.context.inTable = true;

        const rows: string[][] = [];
        let hasHeader = false;

        if (node.content) {
            for (const row of node.content) {
                if (row.type === 'tableRow') {
                    const cells: string[] = [];
                    let isHeaderRow = false;

                    if (row.content) {
                        for (const cell of row.content) {
                            if (cell.type === 'tableHeader') {
                                isHeaderRow = true;
                            }
                            const cellText = this.processInlineContent(
                                cell.content?.[0]?.content || cell.content
                            );

                            // 处理合并单元格
                            const colspan = cell.attrs?.colspan || 1;
                            const rowspan = cell.attrs?.rowspan || 1;

                            let prefix = '';
                            if (colspan > 1) prefix += `${colspan}+`;
                            if (rowspan > 1) prefix += `.${rowspan}+`;

                            cells.push(prefix + cellText);
                        }
                    }

                    if (isHeaderRow) hasHeader = true;
                    rows.push(cells);
                }
            }
        }

        // 生成 AsciiDoc 表格
        const cols = rows[0]?.length || 1;

        if (hasHeader) {
            this.output.push(`[%header,cols="${cols}"]`);
        } else {
            this.output.push(`[cols="${cols}"]`);
        }
        this.output.push('|===');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (i === 1 && hasHeader) {
                // 头部行后空一行
                this.output.push('');
            }
            this.output.push(row.map(cell => `| ${cell}`).join(' '));
        }

        this.output.push('|===');
        this.output.push('');

        this.context.inTable = false;
    }

    /**
     * 访问告示块（Admonition）
     */
    private visitAdmonition(node: TiptapNode): void {
        let type = (node.attrs?.type || 'NOTE').toUpperCase();
        let attrs = '';

        if (type === 'CALLOUT') {
            type = 'NOTE';
            attrs = ', role="callout"';
        }

        this.context.inAdmonition = true;

        this.output.push(`[${type}${attrs}]`);
        this.output.push('====');

        if (node.content) {
            for (const child of node.content) {
                this.visit(child);
            }
        }

        // 移除最后的空行
        if (this.output[this.output.length - 1] === '') {
            this.output.pop();
        }

        this.output.push('====');
        this.output.push('');

        this.context.inAdmonition = false;
    }

    /**
     * 访问 Include 指令
     */
    private visitInclude(node: TiptapNode): void {
        const path = node.attrs?.path || '';
        const attrs: string[] = [];

        if (node.attrs?.leveloffset) {
            attrs.push(`leveloffset=${node.attrs.leveloffset}`);
        }
        if (node.attrs?.lines) {
            attrs.push(`lines=${node.attrs.lines}`);
        }
        if (node.attrs?.tag) {
            attrs.push(`tag=${node.attrs.tag}`);
        }

        const attrStr = attrs.length > 0 ? attrs.join(',') : '';
        this.output.push(`include::${path}[${attrStr}]`);
        this.output.push('');
    }

    /**
     * 访问折叠列表 (Toggle List)
     */
    private visitDetails(node: TiptapNode): void {
        let summary = 'Details';
        let contentNode: TiptapNode | undefined;

        if (node.content) {
            for (const child of node.content) {
                if (child.type === 'detailsSummary') {
                    summary = this.processInlineContent(child.content);
                } else if (child.type === 'detailsContent') {
                    contentNode = child;
                }
            }
        }

        this.output.push('[%collapsible]');
        this.output.push(`.${summary}`);
        this.output.push('====');

        if (contentNode && contentNode.content) {
            for (const child of contentNode.content) {
                this.visit(child);
            }
        }

        // 移除最后的空行
        if (this.output.length > 0 && this.output[this.output.length - 1] === '') {
            this.output.pop();
        }

        this.output.push('====');
        this.output.push('');
    }

    /**
     * 访问任务列表 (Task List)
     */
    private visitTaskList(node: TiptapNode): void {
        const prevListType = this.context.listType;
        this.context.listType = 'bullet';
        this.context.listLevel++;

        if (node.content) {
            for (const item of node.content) {
                if (item.type === 'taskItem') {
                    this.visitTaskItem(item);
                }
            }
        }

        this.context.listLevel--;
        this.context.listType = prevListType;

        if (this.context.listLevel === 0) {
            this.output.push('');
        }
    }

    /**
     * 访问任务项
     */
    private visitTaskItem(node: TiptapNode): void {
        const marker = '*'.repeat(this.context.listLevel);
        const checked = node.attrs?.checked ? '[x]' : '[ ]';

        // 任务项通常包含一个段落，但也可能直接包含文本（取决于 schema，这里假设是 block content）
        if (node.content) {
            const firstChild = node.content[0];
            if (firstChild?.type === 'paragraph') {
                const text = this.processInlineContent(firstChild.content);
                this.output.push(`${marker} ${checked} ${text}`);

                // 处理嵌套内容
                for (let i = 1; i < node.content.length; i++) {
                    this.visit(node.content[i]);
                }
            } else {
                this.output.push(`${marker} ${checked}`);
                for (const child of node.content) {
                    this.visit(child);
                }
            }
        } else {
            this.output.push(`${marker} ${checked}`);
        }
    }

    /**
     * 访问块级数学公式
     */
    private visitMathBlock(node: TiptapNode): void {
        this.output.push('[latexmath]');
        this.output.push('++++');
        this.output.push(node.attrs?.latex || '');
        this.output.push('++++');
        this.output.push('');
    }

    /**
     * 访问视频
     */
    private visitVideo(node: TiptapNode): void {
        const src = node.attrs?.src || '';
        const title = node.attrs?.title || '';
        const width = node.attrs?.width || '';
        const height = node.attrs?.height || '';

        if (title) {
            this.output.push(`.${title}`);
        }

        let attrs = '';
        if (width || height) {
            const widthAttr = width ? `width=${width}` : '';
            const heightAttr = height ? `height=${height}` : '';
            attrs = [widthAttr, heightAttr].filter(Boolean).join(',');
        }

        this.output.push(`video::${src}[${attrs}]`);
        this.output.push('');
    }

    /**
     * 访问音频
     */
    private visitAudio(node: TiptapNode): void {
        const src = node.attrs?.src || '';
        const title = node.attrs?.title || '';

        if (title) {
            this.output.push(`.${title}`);
        }

        this.output.push(`audio::${src}[]`);
        this.output.push('');
    }

    /**
     * 访问文件块
     * 转换为 link 并带上 role="file-attachment" 和 metadata
     */
    private visitFileBlock(node: TiptapNode): void {
        const src = node.attrs?.src || '';
        const title = node.attrs?.title || src.split('/').pop() || 'File';
        const size = node.attrs?.size || '';

        // 使用 pass-through HTML 以保留完整结构 (如 icon) 及 attributes
        // 或者使用 link 宏带 role
        // 这里为了 Round-trip (保留 size 等)，建议使用 HTML passthrough
        // 类似 Web Bookmark

        this.output.push('++++');
        let html = `<div class="file-attachment" data-src="${src}"`;
        if (title) html += ` data-title="${title}"`;
        if (size) html += ` data-size="${size}"`;
        html += '></div>';

        this.output.push(html);
        this.output.push('++++');
        this.output.push('');
    }

    /**
     * 访问 Web Bookmark
     */
    private visitWebBookmark(node: TiptapNode): void {
        const url = node.attrs?.url || '';
        const title = node.attrs?.title || '';
        const desc = node.attrs?.description || '';
        const image = node.attrs?.image || '';

        // 使用 HTML Passthrough 以保持完整数据结构
        this.output.push('++++');
        // 构建包含数据的 div
        let html = `<div data-web-bookmark="" data-url="${url}"`;
        if (title) html += ` data-title="${title}"`;
        if (desc) html += ` data-description="${desc}"`;
        if (image) html += ` data-image="${image}"`;
        html += '></div>';

        this.output.push(html);
        this.output.push('++++');
        this.output.push('');
    }

    /**
     * 访问硬换行
     */
    private visitHardBreak(node: TiptapNode): string {
        return ' +\n';
    }

    /**
     * 访问未知节点类型
     */
    private visitUnknown(node: TiptapNode): void {
        console.warn(`[AST Visitor] Unknown node type: ${node.type}`);

        // 尝试处理内容
        if (node.content) {
            for (const child of node.content) {
                this.visit(child);
            }
        } else if (node.text) {
            this.output.push(node.text);
        }
    }

    /**
     * 处理行内内容（文本、Marks）
     */
    private processInlineContent(content?: TiptapNode[]): string {
        if (!content) return '';

        return content.map(node => {
            if (node.type === 'text') {
                return this.visitText(node);
            } else if (node.type === 'hardBreak') {
                return ' +\n';
            } else if (node.type === 'image') {
                const src = node.attrs?.src || '';
                const alt = node.attrs?.alt || '';
                return `image:${src}[${alt}]`;
            } else if (node.type === 'mathInline') {
                return `latexmath:[${node.attrs?.latex || ''}]`;
            }
            return '';
        }).join('');
    }

    /**
     * 首字母大写
     */
    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

/**
 * 便捷函数：转换 Tiptap JSON 到 AsciiDoc
 */
export const tiptapToAsciidoc = (doc: TiptapDocument): string => {
    const visitor = new TiptapJSONVisitor();
    return visitor.convert(doc);
};

export default TiptapJSONVisitor;
