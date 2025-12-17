/**
 * Tiptap Admonition Node Extension
 * 支持 AsciiDoc 告示块（NOTE, TIP, WARNING, CAUTION, IMPORTANT）
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { AlertCircle, Info, Lightbulb, AlertTriangle, ShieldAlert, Flame } from 'lucide-react';

// 告示块类型
export type AdmonitionType = 'NOTE' | 'TIP' | 'WARNING' | 'CAUTION' | 'IMPORTANT';

// 类型配置
const admonitionConfig: Record<AdmonitionType, {
    icon: React.FC<{ size?: number; className?: string }>;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    title: string;
}> = {
    NOTE: {
        icon: Info,
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-400 dark:border-blue-600',
        iconColor: 'text-blue-500',
        title: 'Note',
    },
    TIP: {
        icon: Lightbulb,
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-400 dark:border-green-600',
        iconColor: 'text-green-500',
        title: 'Tip',
    },
    WARNING: {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
        borderColor: 'border-yellow-400 dark:border-yellow-600',
        iconColor: 'text-yellow-500',
        title: 'Warning',
    },
    CAUTION: {
        icon: Flame,
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        borderColor: 'border-orange-400 dark:border-orange-600',
        iconColor: 'text-orange-500',
        title: 'Caution',
    },
    IMPORTANT: {
        icon: ShieldAlert,
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-400 dark:border-red-600',
        iconColor: 'text-red-500',
        title: 'Important',
    },
};

// Admonition 组件 - 使用 NodeViewProps
const AdmonitionComponent: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
    const type = (node.attrs.type || 'NOTE') as AdmonitionType;
    const config = admonitionConfig[type] || admonitionConfig.NOTE;
    const IconComponent = config.icon;

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateAttributes({ type: e.target.value as AdmonitionType });
    };

    return (
        <NodeViewWrapper className="admonition-wrapper my-4" >
            <div className={
                `
        flex rounded-lg border-l-4 p-4
        ${config.bgColor} ${config.borderColor}
        transition-all duration-200
      `}>
                {/* 图标区域 */}
                < div className={`flex-shrink-0 mr-3 ${config.iconColor}`
                }>
                    <IconComponent size={24} />
                </div>

                {/* 内容区域 */}
                <div className="flex-1 min-w-0" >
                    {/* 标题行 */}
                    < div className="flex items-center gap-2 mb-2" >
                        <select
                            value={type}
                            onChange={handleTypeChange}
                            className={`
                text-sm font-semibold uppercase tracking-wide
                bg-transparent border-none cursor-pointer
                ${config.iconColor}
                focus:outline-none focus:ring-0
              `}
                            contentEditable={false}
                        >
                            {
                                Object.keys(admonitionConfig).map((t) => (
                                    <option key={t} value={t} >
                                        {admonitionConfig[t as AdmonitionType].title}
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    {/* 可编辑内容 */}
                    <NodeViewContent className="prose prose-sm dark:prose-invert max-w-none" />
                </div>
            </div>
        </NodeViewWrapper>
    );
};

// Tiptap Node 定义
export const AdmonitionNode = Node.create({
    name: 'admonition',

    group: 'block',

    content: 'block+',

    defining: true,

    addAttributes() {
        return {
            type: {
                default: 'NOTE',
                parseHTML: element => element.getAttribute('data-type') || 'NOTE',
                renderHTML: attributes => ({
                    'data-type': attributes.type,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-admonition]',
            },
            // 解析 AsciiDoc 渲染的 admonitionblock
            {
                tag: 'div.admonitionblock',
                getAttrs: element => {
                    if (typeof element === 'string') return false;
                    const classList = element.classList;
                    if (classList.contains('note')) return { type: 'NOTE' };
                    if (classList.contains('tip')) return { type: 'TIP' };
                    if (classList.contains('warning')) return { type: 'WARNING' };
                    if (classList.contains('caution')) return { type: 'CAUTION' };
                    if (classList.contains('important')) return { type: 'IMPORTANT' };
                    return { type: 'NOTE' };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-admonition': true }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AdmonitionComponent);
    },

    addCommands() {
        return {
            setAdmonition: (type: AdmonitionType = 'NOTE') => ({ commands }: { commands: any }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: { type },
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'Enter content here...' }],
                        },
                    ],
                });
            },
            toggleAdmonition: (type: AdmonitionType = 'NOTE') => ({ commands, state }: { commands: any; state: any }) => {
                const { selection } = state;
                const node = state.doc.nodeAt(selection.from);

                if (node?.type.name === this.name) {
                    // 如果已经是 admonition，转换为普通段落
                    return commands.lift(this.name);
                }

                return commands.wrapIn(this.name, { type });
            },
        } as any;
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-n': () => (this.editor.commands as any).setAdmonition('NOTE'),
            'Mod-Shift-t': () => (this.editor.commands as any).setAdmonition('TIP'),
            'Mod-Shift-w': () => (this.editor.commands as any).setAdmonition('WARNING'),
        };
    },
});

export default AdmonitionNode;
