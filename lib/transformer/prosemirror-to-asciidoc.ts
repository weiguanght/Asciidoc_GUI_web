/**
 * ProseMirror 到 AsciiDoc 序列化器 (带 Source Map)
 * 
 * 关键功能：
 * 1. 将 Tiptap/ProseMirror JSON 转换为 AsciiDoc 文本
 * 2. 在序列化过程中生成 Source Map（BlockID ↔ 行号映射）
 * 3. 支持 RawBlock 兜底节点
 */

import type { SourceMap } from '../../types/lsp';

// ============================================
// 类型定义
// ============================================

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

/** 序列化结果 */
export interface SerializeResult {
    /** AsciiDoc 文本 */
    text: string;
    /** Source Map (BlockID ↔ 行号) */
    sourceMap: SourceMap;
}

/** 序列化上下文 */
interface SerializerContext {
    listLevel: number;
    listType: 'bullet' | 'ordered' | null;
    inTable: boolean;
    inBlockquote: boolean;
    inAdmonition: boolean;
}

// ============================================
// ProseMirrorToAsciidoc 序列化器
// ============================================

export class ProseMirrorToAsciidoc {
    private output: string[] = [];
    private context: SerializerContext;

    // Source Map 数据 - 使用 BlockID
    private blockIdToLine = new Map<string, number>();
    private lineToBlockId = new Map<number, string>();
    // 兼容旧版
    private lineToPos = new Map<number, number>();
    private posToLine = new Map<number, number>();
    private currentPos = 0;

    constructor() {
        this.context = this.createDefaultContext();
    }

    private createDefaultContext(): SerializerContext {
        return {
            listLevel: 0,
            listType: null,
            inTable: false,
            inBlockquote: false,
            inAdmonition: false,
        };
    }

    /**
     * 主入口：序列化文档并生成 Source Map
     */
    public serialize(doc: TiptapDocument): SerializeResult {
        this.output = [];
        this.context = this.createDefaultContext();
        this.blockIdToLine.clear();
        this.lineToBlockId.clear();
        this.lineToPos.clear();
        this.posToLine.clear();
        this.currentPos = 0;

        if (doc.content) {
            for (const node of doc.content) {
                this.visitNode(node);
            }
        }

        const text = this.output.join('\n').trim();

        return {
            text,
            sourceMap: {
                blockIdToLine: new Map(this.blockIdToLine),
                lineToBlockId: new Map(this.lineToBlockId),
                lineToPos: new Map(this.lineToPos),
                posToLine: new Map(this.posToLine),
            },
        };
    }

    /**
     * 记录当前行与 BlockID/位置的映射
     */
    private recordMapping(nodePos: number, blockId?: string): void {
        const lineNumber = this.output.length + 1;

        // BlockID 映射（优先）
        if (blockId) {
            this.blockIdToLine.set(blockId, lineNumber);
            this.lineToBlockId.set(lineNumber, blockId);
        }

        // 兼容旧版位置映射
        this.lineToPos.set(lineNumber, nodePos);
        this.posToLine.set(nodePos, lineNumber);
    }

    /**
     * 添加输出行并记录映射
     */
    private pushLine(line: string, nodePos?: number, blockId?: string): void {
        if (nodePos !== undefined) {
            this.recordMapping(nodePos, blockId);
        }
        this.output.push(line);
    }

    /**
     * 分发节点到对应的 visit 方法
     */
    private visitNode(node: TiptapNode, nodePos?: number): void {
        const pos = nodePos ?? this.currentPos;
        const blockId = node.attrs?.id as string | undefined;

        switch (node.type) {
            case 'paragraph':
                this.visitParagraph(node, pos);
                break;
            case 'heading':
                this.visitHeading(node, pos);
                break;
            case 'bulletList':
                this.visitBulletList(node, pos);
                break;
            case 'orderedList':
                this.visitOrderedList(node, pos);
                break;
            case 'listItem':
                this.visitListItem(node, pos);
                break;
            case 'codeBlock':
                this.visitCodeBlock(node, pos);
                break;
            case 'blockquote':
                this.visitBlockquote(node, pos);
                break;
            case 'horizontalRule':
                this.visitHorizontalRule(node, pos);
                break;
            case 'image':
                this.visitImage(node, pos);
                break;
            case 'table':
                this.visitTable(node, pos);
                break;
            case 'admonition':
                this.visitAdmonition(node, pos);
                break;
            case 'include':
                this.visitInclude(node, pos);
                break;
            case 'rawBlock':
                this.visitRawBlock(node, pos);
                break;
            default:
                this.visitUnknown(node, pos);
        }

        // 更新位置（简化计算，实际应根据节点大小）
        this.currentPos += this.estimateNodeSize(node);
    }

    private estimateNodeSize(node: TiptapNode): number {
        let size = 1; // 节点本身
        if (node.text) size += node.text.length;
        if (node.content) {
            for (const child of node.content) {
                size += this.estimateNodeSize(child);
            }
        }
        return size;
    }

    // ----------------------------------------
    // 节点访问方法
    // ----------------------------------------

    private visitParagraph(node: TiptapNode, pos: number): void {
        const blockId = node.attrs?.id as string | undefined;
        const text = this.processInlineContent(node.content);
        if (text.trim()) {
            this.pushLine(text, pos, blockId);
            this.pushLine('');
        }
    }

    private visitHeading(node: TiptapNode, pos: number): void {
        const blockId = node.attrs?.id as string | undefined;
        const level = node.attrs?.level || 1;
        const prefix = '='.repeat(level + 1);
        const text = this.processInlineContent(node.content);
        this.pushLine(`${prefix} ${text}`, pos, blockId);
        this.pushLine('');
    }

    private visitBulletList(node: TiptapNode, pos: number): void {
        const prevListType = this.context.listType;
        this.context.listType = 'bullet';
        this.context.listLevel++;

        if (node.content) {
            let childPos = pos + 1;
            for (const item of node.content) {
                this.visitNode(item, childPos);
                childPos += this.estimateNodeSize(item);
            }
        }

        this.context.listLevel--;
        this.context.listType = prevListType;

        if (this.context.listLevel === 0) {
            this.pushLine('');
        }
    }

    private visitOrderedList(node: TiptapNode, pos: number): void {
        const prevListType = this.context.listType;
        this.context.listType = 'ordered';
        this.context.listLevel++;

        if (node.content) {
            let childPos = pos + 1;
            for (const item of node.content) {
                this.visitNode(item, childPos);
                childPos += this.estimateNodeSize(item);
            }
        }

        this.context.listLevel--;
        this.context.listType = prevListType;

        if (this.context.listLevel === 0) {
            this.pushLine('');
        }
    }

    private visitListItem(node: TiptapNode, pos: number): void {
        const marker = this.context.listType === 'ordered'
            ? '.'.repeat(this.context.listLevel)
            : '*'.repeat(this.context.listLevel);

        if (node.content) {
            const firstChild = node.content[0];
            if (firstChild?.type === 'paragraph') {
                const text = this.processInlineContent(firstChild.content);
                this.pushLine(`${marker} ${text}`, pos);

                for (let i = 1; i < node.content.length; i++) {
                    const child = node.content[i];
                    if (child.type === 'bulletList' || child.type === 'orderedList') {
                        this.visitNode(child);
                    }
                }
            } else {
                for (const child of node.content) {
                    this.visitNode(child);
                }
            }
        }
    }

    private visitCodeBlock(node: TiptapNode, pos: number): void {
        const language = node.attrs?.language || '';
        const code = node.content?.map(n => n.text || '').join('') || '';

        if (language) {
            this.pushLine(`[source,${language}]`, pos);
        }
        this.pushLine('----');
        this.pushLine(code);
        this.pushLine('----');
        this.pushLine('');
    }

    private visitBlockquote(node: TiptapNode, pos: number): void {
        this.context.inBlockquote = true;
        this.pushLine('[quote]', pos);
        this.pushLine('____');

        if (node.content) {
            for (const child of node.content) {
                this.visitNode(child);
            }
        }

        if (this.output[this.output.length - 1] === '') {
            this.output.pop();
        }

        this.pushLine('____');
        this.pushLine('');
        this.context.inBlockquote = false;
    }

    private visitHorizontalRule(node: TiptapNode, pos: number): void {
        this.pushLine("'''", pos);
        this.pushLine('');
    }

    private visitImage(node: TiptapNode, pos: number): void {
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        const title = node.attrs?.title || '';

        if (title) {
            this.pushLine(`.${title}`, pos);
        }
        this.pushLine(`image::${src}[${alt}]`);
        this.pushLine('');
    }

    private visitTable(node: TiptapNode, pos: number): void {
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

        const cols = rows[0]?.length || 1;

        if (hasHeader) {
            this.pushLine(`[%header,cols="${cols}"]`, pos);
        } else {
            this.pushLine(`[cols="${cols}"]`, pos);
        }
        this.pushLine('|===');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (i === 1 && hasHeader) {
                this.pushLine('');
            }
            this.pushLine(row.map(cell => `| ${cell}`).join(' '));
        }

        this.pushLine('|===');
        this.pushLine('');
        this.context.inTable = false;
    }

    private visitAdmonition(node: TiptapNode, pos: number): void {
        const type = (node.attrs?.type || 'NOTE').toUpperCase();
        this.context.inAdmonition = true;

        this.pushLine(`[${type}]`, pos);
        this.pushLine('====');

        if (node.content) {
            for (const child of node.content) {
                this.visitNode(child);
            }
        }

        if (this.output[this.output.length - 1] === '') {
            this.output.pop();
        }

        this.pushLine('====');
        this.pushLine('');
        this.context.inAdmonition = false;
    }

    private visitInclude(node: TiptapNode, pos: number): void {
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
        this.pushLine(`include::${path}[${attrStr}]`, pos);
        this.pushLine('');
    }

    /**
     * RawBlock 兜底节点 - 原样输出源码
     */
    private visitRawBlock(node: TiptapNode, pos: number): void {
        const source = node.attrs?.source || '';
        if (source) {
            // 原样输出保存的 AsciiDoc 源码
            const lines = source.split('\n');
            for (let i = 0; i < lines.length; i++) {
                this.pushLine(lines[i], i === 0 ? pos : undefined);
            }
            this.pushLine('');
        }
    }

    private visitUnknown(node: TiptapNode, pos: number): void {
        console.warn(`[Serializer] Unknown node type: ${node.type}`);

        if (node.content) {
            for (const child of node.content) {
                this.visitNode(child);
            }
        } else if (node.text) {
            this.pushLine(node.text, pos);
        }
    }

    // ----------------------------------------
    // 内联内容处理
    // ----------------------------------------

    private processInlineContent(content?: TiptapNode[]): string {
        if (!content) return '';

        return content.map(node => {
            if (node.type === 'text') {
                return this.processText(node);
            } else if (node.type === 'hardBreak') {
                return ' +\n';
            } else if (node.type === 'image') {
                const src = node.attrs?.src || '';
                const alt = node.attrs?.alt || '';
                return `image:${src}[${alt}]`;
            }
            return '';
        }).join('');
    }

    private processText(node: TiptapNode): string {
        if (!node.text) return '';
        let text = node.text;

        if (node.marks && node.marks.length > 0) {
            text = this.applyMarks(text, node.marks);
        }

        return text;
    }

    private applyMarks(text: string, marks: TiptapMark[]): string {
        const sortedMarks = this.sortMarks(marks);
        for (const mark of sortedMarks) {
            text = this.applyMark(text, mark);
        }
        return text;
    }

    private sortMarks(marks: TiptapMark[]): TiptapMark[] {
        const priority: Record<string, number> = {
            link: 1,
            bold: 2,
            italic: 3,
            code: 4,
            underline: 5,
            strike: 6,
            highlight: 7,
        };

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
                return `${href}[${text}]`;
            case 'highlight':
                const color = mark.attrs?.color || 'yellow';
                return `[.highlight-${color}]#${text}#`;
            default:
                return text;
        }
    }
}

// ============================================
// 导出
// ============================================

/**
 * 便捷函数：转换并获取 Source Map
 */
export function serializeWithSourceMap(doc: TiptapDocument): SerializeResult {
    const serializer = new ProseMirrorToAsciidoc();
    return serializer.serialize(doc);
}

/**
 * 便捷函数：仅转换文本（向后兼容）
 */
export function tiptapToAsciidoc(doc: TiptapDocument): string {
    const serializer = new ProseMirrorToAsciidoc();
    return serializer.serialize(doc).text;
}

export default ProseMirrorToAsciidoc;
