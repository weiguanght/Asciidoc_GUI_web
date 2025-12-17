/**
 * RawBlock - 兜底节点扩展
 * 
 * 用于保存无法被 ProseMirror Schema 完全表示的 AsciiDoc 语法
 * 如：复杂表格、条件编译、自定义块等
 * 
 * 处理逻辑：
 * - Parser 遇到未知 AST 节点时，将源码原样存入 RawBlock
 * - Serializer 将 RawBlock 的源码原样写回
 * - 确保 Round-Trip 数据不丢失
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface RawBlockOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        rawBlock: {
            /**
             * 插入 RawBlock 节点
             */
            setRawBlock: (attrs: { source: string; context?: string }) => ReturnType;
        };
    }
}

export const RawBlock = Node.create<RawBlockOptions>({
    name: 'rawBlock',

    group: 'block',

    content: 'text*',

    defining: true,

    isolating: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            /**
             * 原始 AsciiDoc 源码
             * 序列化时原样输出
             */
            source: {
                default: '',
            },
            /**
             * 原始节点的 context 类型
             * 用于调试和识别
             */
            context: {
                default: '',
            },
            /**
             * 原始行号（用于定位）
             */
            lineno: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-raw-block]',
            },
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        const source = node.attrs.source || '';
        const context = node.attrs.context || 'unknown';

        return [
            'div',
            mergeAttributes(
                this.options.HTMLAttributes,
                HTMLAttributes,
                {
                    'data-raw-block': '',
                    'data-context': context,
                    'class': 'raw-block',
                }
            ),
            [
                'pre',
                { class: 'raw-block-source' },
                source,
            ],
        ];
    },

    addCommands() {
        return {
            setRawBlock:
                (attrs) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs,
                        });
                    },
        };
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('div');
            dom.classList.add('raw-block');
            dom.setAttribute('data-raw-block', '');
            dom.setAttribute('data-context', node.attrs.context || 'unknown');

            const label = document.createElement('div');
            label.classList.add('raw-block-label');
            label.textContent = `[Raw: ${node.attrs.context || 'unknown'}]`;
            dom.appendChild(label);

            const pre = document.createElement('pre');
            pre.classList.add('raw-block-source');
            pre.textContent = node.attrs.source || '';
            dom.appendChild(pre);

            return {
                dom,
                contentDOM: null, // 不可编辑内容
            };
        };
    },
});

export default RawBlock;
