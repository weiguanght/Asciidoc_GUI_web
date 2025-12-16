/**
 * Tiptap Schema 约束定义
 * 限制节点嵌套以确保生成的 AsciiDoc 有效
 */

import { Node, Mark } from '@tiptap/core';

/**
 * 严格模式 Heading 扩展
 * 限制：Heading 只能包含 inline 内容（text, marks），不能嵌套 Image 等块级元素
 */
export const StrictHeading = Node.create({
    name: 'heading',

    addOptions() {
        return {
            levels: [1, 2, 3, 4, 5, 6],
            HTMLAttributes: {},
        };
    },

    // 关键：限制 content 只能是 inline*
    content: 'inline*',

    group: 'block',

    defining: true,

    addAttributes() {
        return {
            level: {
                default: 1,
                rendered: false,
            },
        };
    },

    parseHTML() {
        return this.options.levels.map((level: number) => ({
            tag: `h${level}`,
            attrs: { level },
        }));
    },

    renderHTML({ node, HTMLAttributes }) {
        const level = node.attrs.level;
        return [`h${level}`, HTMLAttributes, 0];
    },
});

/**
 * 严格模式 Image 扩展
 * 限制：Image 只能作为 block 元素存在，不能嵌套在 Heading 中
 */
export const StrictImage = Node.create({
    name: 'image',

    // 关键：不属于 inline 组，只属于 block 组
    group: 'block',

    atom: true,

    draggable: true,

    addAttributes() {
        return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
            width: { default: null },
            height: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'img[src]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['img', HTMLAttributes];
    },
});

/**
 * 严格模式 Table 扩展配置
 * 限制：Table 内部不能嵌套三级以上标题
 */
export const strictTableCellContent = 'block+';

/**
 * Schema 验证器
 * 检查 Tiptap 文档是否符合严格 Schema
 */
export interface SchemaViolation {
    path: string;
    nodeType: string;
    parentType: string;
    message: string;
}

export const validateSchema = (doc: any): SchemaViolation[] => {
    const violations: SchemaViolation[] = [];

    const validate = (node: any, path: string = 'doc', parentType: string = 'doc') => {
        if (!node) return;

        // 规则 1: Heading 不能包含 Image
        if (parentType === 'heading' && node.type === 'image') {
            violations.push({
                path,
                nodeType: 'image',
                parentType: 'heading',
                message: 'Image cannot be nested inside Heading',
            });
        }

        // 规则 2: Table 内部不能有 Heading (level <= 2)
        if (parentType.includes('table') && node.type === 'heading') {
            const level = node.attrs?.level || 1;
            if (level <= 2) {
                violations.push({
                    path,
                    nodeType: 'heading',
                    parentType,
                    message: `Heading level ${level} cannot be inside Table`,
                });
            }
        }

        // 规则 3: Admonition 不能嵌套 Admonition
        if (parentType === 'admonition' && node.type === 'admonition') {
            violations.push({
                path,
                nodeType: 'admonition',
                parentType: 'admonition',
                message: 'Admonition cannot be nested inside another Admonition',
            });
        }

        // 规则 4: CodeBlock 不能包含格式化内容（只能是纯文本）
        if (parentType === 'codeBlock' && node.marks && node.marks.length > 0) {
            violations.push({
                path,
                nodeType: 'text',
                parentType: 'codeBlock',
                message: 'Text inside CodeBlock cannot have marks',
            });
        }

        // 递归检查子节点
        if (node.content && Array.isArray(node.content)) {
            node.content.forEach((child: any, index: number) => {
                validate(child, `${path}.content[${index}]`, node.type);
            });
        }
    };

    validate(doc);
    return violations;
};

/**
 * 修复 Schema 违规
 * 尝试自动修复常见的 Schema 问题
 */
export const fixSchemaViolations = (doc: any): any => {
    const fix = (node: any, parentType: string = 'doc'): any => {
        if (!node) return node;

        // 修复 1: 从 Heading 中移除 Image
        if (parentType === 'heading' && node.type === 'image') {
            return { type: 'text', text: `[Image: ${node.attrs?.alt || 'image'}]` };
        }

        // 修复 2: 从 CodeBlock 中移除 Marks
        if (parentType === 'codeBlock' && node.marks) {
            return { ...node, marks: undefined };
        }

        // 递归处理子节点
        if (node.content && Array.isArray(node.content)) {
            return {
                ...node,
                content: node.content
                    .map((child: any) => fix(child, node.type))
                    .filter(Boolean),
            };
        }

        return node;
    };

    return fix(doc);
};

export default {
    StrictHeading,
    StrictImage,
    validateSchema,
    fixSchemaViolations,
};
