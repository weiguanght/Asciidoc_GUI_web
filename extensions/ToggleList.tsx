/**
 * ToggleList - 折叠列表扩展
 * 
 * 实现 Notion 风格的可折叠内容块
 * 使用 HTML5 <details> 和 <summary> 元素
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronRight } from 'lucide-react';

// ============================================
// Details Node (容器)
// ============================================

export const Details = Node.create({
    name: 'details',

    group: 'block',

    content: 'detailsSummary detailsContent',

    defining: true,

    addAttributes() {
        return {
            open: {
                default: false,
                parseHTML: element => element.hasAttribute('open'),
                renderHTML: attributes => {
                    if (!attributes.open) {
                        return {};
                    }
                    return { open: 'open' };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'details',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['details', mergeAttributes(HTMLAttributes), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(DetailsComponent);
    },
});

// ============================================
// Details Summary Node (标题部分)
// ============================================

export const DetailsSummary = Node.create({
    name: 'detailsSummary',

    group: 'block',

    content: 'inline*',

    defining: true,

    parseHTML() {
        return [
            {
                tag: 'summary',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['summary', mergeAttributes(HTMLAttributes), 0];
    },
});

// ============================================
// Details Content Node (内容部分)
// ============================================

export const DetailsContent = Node.create({
    name: 'detailsContent',

    group: 'block',

    content: 'block+',

    defining: true,

    parseHTML() {
        return [
            {
                tag: 'div[data-details-content]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-details-content': '' }), 0];
    },
});

// ============================================
// Details Component (React NodeView)
// ============================================

const DetailsComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
    const [isOpen, setIsOpen] = useState(node.attrs.open);

    const handleToggle = () => {
        const newOpen = !isOpen;
        setIsOpen(newOpen);
        updateAttributes({ open: newOpen });
    };

    return (
        <NodeViewWrapper className="toggle-list-wrapper my-2">
            <div className={`toggle-list ${isOpen ? 'toggle-list-open' : ''}`}>
                {/* 折叠按钮 + 标题 */}
                <div
                    className="toggle-list-header flex items-start gap-1 cursor-pointer group"
                    onClick={handleToggle}
                >
                    <button
                        type="button"
                        className={`toggle-list-button flex-shrink-0 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-transform ${isOpen ? 'rotate-90' : ''
                            }`}
                        contentEditable={false}
                    >
                        <ChevronRight size={16} className="text-gray-400" />
                    </button>

                    <div className="toggle-list-summary flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <NodeViewContent className="toggle-content-summary" />
                    </div>
                </div>

                {/* 内容区域 */}
                {isOpen && (
                    <div className="toggle-list-content pl-6 mt-1">
                        <NodeViewContent className="toggle-content-body" />
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

// ============================================
// 命令扩展
// ============================================

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        details: {
            /**
             * 插入折叠块
             */
            setDetails: () => ReturnType;
            /**
             * 切换折叠块
             */
            toggleDetails: () => ReturnType;
        };
    }
}

// 为 Details 添加命令
export const DetailsWithCommands = Details.extend({
    addCommands() {
        return {
            setDetails: () => ({ commands }) => {
                return commands.insertContent({
                    type: 'details',
                    attrs: { open: true },
                    content: [
                        {
                            type: 'detailsSummary',
                            content: [{ type: 'text', text: 'Toggle heading' }],
                        },
                        {
                            type: 'detailsContent',
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [{ type: 'text', text: 'Toggle content...' }],
                                },
                            ],
                        },
                    ],
                });
            },
            toggleDetails: () => ({ commands, state }) => {
                const { selection } = state;
                const node = state.doc.nodeAt(selection.from);

                if (node?.type.name === 'details') {
                    // 如果已经是 details，展开它
                    return commands.updateAttributes('details', { open: !node.attrs.open });
                }

                return commands.insertContent({
                    type: 'details',
                    attrs: { open: true },
                    content: [
                        {
                            type: 'detailsSummary',
                            content: [{ type: 'text', text: 'Toggle heading' }],
                        },
                        {
                            type: 'detailsContent',
                            content: [
                                {
                                    type: 'paragraph',
                                },
                            ],
                        },
                    ],
                });
            },
        } as any;
    },
});

export default DetailsWithCommands;
