/**
 * Mathematics Extension - 数学公式扩展
 * 
 * 使用 KaTeX 渲染数学公式
 * 支持行内公式 ($...$) 和块级公式 ($$...$$)
 */

import { Node, mergeAttributes, Extension, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';

// ============================================
// 行内公式节点
// ============================================

export const MathInline = Node.create({
    name: 'mathInline',

    group: 'inline',

    inline: true,

    atom: true,

    addAttributes() {
        return {
            latex: {
                default: '',
                parseHTML: element => element.getAttribute('data-latex') || element.textContent || '',
                renderHTML: attributes => ({
                    'data-latex': attributes.latex,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-math-inline]',
            },
            {
                tag: 'span.math-inline',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-math-inline': '' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MathInlineComponent);
    },

    addInputRules() {
        return [
            // $latex$ 触发行内公式
            new InputRule({
                find: /\$([^$]+)\$$/,
                handler: ({ state, range, match }) => {
                    const latex = match[1];
                    const { tr } = state;
                    const node = this.type.create({ latex });
                    tr.replaceWith(range.from, range.to, node);
                },
            }),
        ];
    },
});

// ============================================
// 块级公式节点
// ============================================

export const MathBlock = Node.create({
    name: 'mathBlock',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            latex: {
                default: '',
                parseHTML: element => element.getAttribute('data-latex') || element.textContent || '',
                renderHTML: attributes => ({
                    'data-latex': attributes.latex,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-math-block]',
            },
            {
                tag: 'div.math-block',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-math-block': '' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MathBlockComponent);
    },

    addInputRules() {
        return [
            // $$latex$$ 触发块级公式
            new InputRule({
                find: /\$\$([^$]+)\$\$$/,
                handler: ({ state, range, match }) => {
                    const latex = match[1];
                    const { tr } = state;
                    const node = this.type.create({ latex });
                    tr.replaceWith(range.from, range.to, node);
                },
            }),
        ];
    },
});

// ============================================
// 行内公式组件
// ============================================

const MathInlineComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [latex, setLatex] = useState(node.attrs.latex || '');
    const inputRef = useRef<HTMLInputElement>(null);
    const renderRef = useRef<HTMLSpanElement>(null);

    // 渲染 KaTeX
    useEffect(() => {
        if (renderRef.current && !isEditing) {
            try {
                katex.render(latex || 'formula', renderRef.current, {
                    throwOnError: false,
                    displayMode: false,
                });
            } catch (e) {
                renderRef.current.textContent = latex || '∅';
            }
        }
    }, [latex, isEditing]);

    // 聚焦输入框
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        updateAttributes({ latex });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            setIsEditing(false);
            updateAttributes({ latex });
        }
    };

    return (
        <NodeViewWrapper as="span" className="math-inline-wrapper inline">
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={latex}
                    onChange={(e) => setLatex(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="math-inline-input px-1 py-0.5 text-sm bg-gray-100 dark:bg-slate-700 border border-blue-400 rounded outline-none font-mono"
                    placeholder="LaTeX..."
                />
            ) : (
                <span
                    ref={renderRef}
                    className={`math-inline-render px-1 cursor-pointer rounded ${selected ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                    onDoubleClick={handleDoubleClick}
                    title="Double-click to edit"
                />
            )}
        </NodeViewWrapper>
    );
};

// ============================================
// 块级公式组件
// ============================================

const MathBlockComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [latex, setLatex] = useState(node.attrs.latex || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const renderRef = useRef<HTMLDivElement>(null);

    // 渲染 KaTeX
    useEffect(() => {
        if (renderRef.current && !isEditing) {
            try {
                katex.render(latex || '\\text{Math Block}', renderRef.current, {
                    throwOnError: false,
                    displayMode: true,
                });
            } catch (e) {
                renderRef.current.textContent = latex || '∅';
            }
        }
    }, [latex, isEditing]);

    // 聚焦输入框
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        updateAttributes({ latex });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsEditing(false);
            updateAttributes({ latex });
        }
        // Shift+Enter 换行，Enter 保存
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            setIsEditing(false);
            updateAttributes({ latex });
        }
    };

    return (
        <NodeViewWrapper className="math-block-wrapper my-4">
            {isEditing ? (
                <div className="math-block-editor p-3 bg-gray-50 dark:bg-slate-800 border border-blue-400 rounded-lg">
                    <textarea
                        ref={textareaRef}
                        value={latex}
                        onChange={(e) => setLatex(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full min-h-[60px] p-2 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded font-mono resize-y outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Enter LaTeX formula..."
                    />
                    <div className="mt-2 text-xs text-gray-500">
                        Press Enter to save, Shift+Enter for new line, Esc to cancel
                    </div>
                </div>
            ) : (
                <div
                    ref={renderRef}
                    className={`math-block-render p-4 text-center cursor-pointer rounded-lg transition-colors ${selected
                            ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400'
                            : 'bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    onDoubleClick={handleDoubleClick}
                    title="Double-click to edit"
                />
            )}
        </NodeViewWrapper>
    );
};

// ============================================
// 命令扩展
// ============================================

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        math: {
            /**
             * 插入行内公式
             */
            setMathInline: (latex?: string) => ReturnType;
            /**
             * 插入块级公式
             */
            setMathBlock: (latex?: string) => ReturnType;
        };
    }
}

export const MathCommands = Extension.create({
    name: 'mathCommands',

    addCommands() {
        return {
            setMathInline: (latex = '') => ({ commands }) => {
                return commands.insertContent({
                    type: 'mathInline',
                    attrs: { latex },
                });
            },
            setMathBlock: (latex = '') => ({ commands }) => {
                return commands.insertContent({
                    type: 'mathBlock',
                    attrs: { latex },
                });
            },
        } as any;
    },
});

export default {
    MathInline,
    MathBlock,
    MathCommands,
};
