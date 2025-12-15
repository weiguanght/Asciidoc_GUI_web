import { Node, mergeAttributes } from '@tiptap/core';

/**
 * TableCaption 扩展
 * 支持在表格中添加标题（对应 AsciiDoc 的 .标题 语法）
 */
export const TableCaption = Node.create({
    name: 'tableCaption',

    // 允许的内容：行内内容
    content: 'inline*',

    // 表格标题是块级元素
    group: 'block',

    // 定义父节点
    tableRole: 'caption',

    // 可选属性
    addAttributes() {
        return {
            class: {
                default: null,
            },
        };
    },

    // 解析 HTML
    parseHTML() {
        return [
            {
                tag: 'caption',
            },
            // 也解析 Asciidoctor 生成的表格标题结构
            {
                tag: 'div.title',
                getAttrs: (node) => {
                    const element = node as HTMLElement;
                    // 检查是否是表格标题
                    if (element.closest('table') || element.nextElementSibling?.tagName === 'TABLE') {
                        return {};
                    }
                    return false;
                },
            },
        ];
    },

    // 渲染 HTML
    renderHTML({ HTMLAttributes }) {
        return ['caption', mergeAttributes(HTMLAttributes, { class: 'table-caption' }), 0];
    },
});

export default TableCaption;
