/**
 * Tiptap Admonition Node Extension
 * 支持 AsciiDoc 告示块（NOTE, TIP, WARNING, CAUTION, IMPORTANT）
 * 增强功能：支持 Emoji Picker 和动态背景色 (Notion 风格 Callout)
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { AlertCircle, Info, Lightbulb, AlertTriangle, ShieldAlert, Flame, Smile, X, Palette } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useEditorStore } from '../store/useEditorStore';

// 告示块类型
export type AdmonitionType = 'NOTE' | 'TIP' | 'WARNING' | 'CAUTION' | 'IMPORTANT' | 'CALLOUT';

// 类型配置
const admonitionConfig: Record<string, {
    icon: React.FC<{ size?: number; className?: string }>;
    defaultColor: string; // Notion background color key
    title: string;
}> = {
    NOTE: {
        icon: Info,
        defaultColor: 'blue',
        title: 'Note',
    },
    TIP: {
        icon: Lightbulb,
        defaultColor: 'green',
        title: 'Tip',
    },
    WARNING: {
        icon: AlertTriangle,
        defaultColor: 'yellow',
        title: 'Warning',
    },
    CAUTION: {
        icon: Flame,
        defaultColor: 'orange',
        title: 'Caution',
    },
    IMPORTANT: {
        icon: ShieldAlert,
        defaultColor: 'red',
        title: 'Important',
    },
    CALLOUT: {
        icon: Smile,
        defaultColor: 'gray',
        title: 'Callout',
    },
};

// Notion 风格颜色配置 (背景色 map)
const backgroundColors: Record<string, string> = {
    default: 'transparent',
    gray: '#F1F1EF',
    brown: '#F4EEEE',
    orange: '#FBECDD',
    yellow: '#FBF3DB',
    green: '#EDF3EC',
    blue: '#E7F3F8',
    purple: '#F6F3F9',
    pink: '#FAF1F5',
    red: '#FDEBEC',
};

// Dark mode background colors
const darkBackgroundColors: Record<string, string> = {
    default: 'transparent',
    gray: '#252525',
    brown: '#292524',
    orange: '#3f2c20',
    yellow: '#3f351e',
    green: '#1c2b22',
    blue: '#192b36',
    purple: '#2b2236',
    pink: '#302228',
    red: '#362222',
};

// Admonition 组件
const AdmonitionComponent: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
    const { darkMode } = useEditorStore();
    const type = (node.attrs.type || 'NOTE') as AdmonitionType;
    const config = admonitionConfig[type] || admonitionConfig.NOTE;

    // attributes
    const emoji = node.attrs.emoji;
    const colorKey = node.attrs.color || config.defaultColor;

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const emojiButtonRef = useRef<HTMLDivElement>(null);
    const colorButtonRef = useRef<HTMLDivElement>(null);

    // 计算实际背景色
    const bgColor = darkMode ? darkBackgroundColors[colorKey] : backgroundColors[colorKey];

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiButtonRef.current && !emojiButtonRef.current.contains(event.target as globalThis.Node)) {
                setShowEmojiPicker(false);
            }
            if (colorButtonRef.current && !colorButtonRef.current.contains(event.target as globalThis.Node)) {
                setShowColorPicker(false);
            }
        };

        if (showEmojiPicker || showColorPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker, showColorPicker]);

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        updateAttributes({ emoji: emojiData.emoji });
        setShowEmojiPicker(false);
    };

    const handleTypeChange = (newType: AdmonitionType) => {
        updateAttributes({ type: newType, emoji: null, color: admonitionConfig[newType].defaultColor });
    };

    const handleColorChange = (key: string) => {
        updateAttributes({ color: key });
        setShowColorPicker(false);
    };

    const IconComponent = config.icon;

    return (
        <NodeViewWrapper className="admonition-wrapper my-4 relative group">
            <div
                className={`flex rounded-lg p-4 transition-colors duration-200 border border-transparent`}
                style={{ backgroundColor: bgColor }}
            >
                {/* 图标/Emoji 区域 */}
                <div
                    ref={emojiButtonRef}
                    className="flex-shrink-0 mr-4 mt-0.5 cursor-pointer select-none relative"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                    <div className="hover:bg-black/5 dark:hover:bg-white/10 rounded p-1 transition-colors">
                        {emoji ? (
                            <span className="text-xl leading-none">{emoji}</span>
                        ) : (
                            <IconComponent size={24} className={darkMode ? 'text-slate-200' : 'text-gray-700'} />
                        )}
                    </div>

                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <div className="absolute top-full left-0 mt-2 z-50 shadow-xl rounded-lg overflow-hidden">
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                theme={darkMode ? Theme.DARK : Theme.LIGHT}
                                width={320}
                                height={400}
                                lazyLoadEmojis={true}
                            />
                        </div>
                    )}
                </div>

                {/* 内容区域 */}
                <div className="flex-1 min-w-0 relative">
                    {/* 顶部工具栏 (Hover 显示) */}
                    <div className="absolute -top-3 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 rounded px-1 py-0.5 z-10">
                        {/* 颜色修改 */}
                        <div ref={colorButtonRef} className="relative">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                title="Change Color"
                            >
                                <Palette size={14} />
                            </button>

                            {/* 颜色选择器 */}
                            {showColorPicker && (
                                <div className="absolute top-full right-0 mt-1 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50 w-40 grid grid-cols-5 gap-1">
                                    {Object.entries(backgroundColors).map(([key, value]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleColorChange(key)}
                                            className="w-6 h-6 rounded-full border border-gray-100 dark:border-slate-700 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: darkMode ? darkBackgroundColors[key] : value }}
                                            title={key}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 类型切换 (原有功能简化) */}
                        <select
                            value={type}
                            onChange={(e) => handleTypeChange(e.target.value as AdmonitionType)}
                            className="text-xs bg-transparent border-none text-gray-500 cursor-pointer focus:ring-0 py-0"
                        >
                            {Object.keys(admonitionConfig).map(t => (
                                <option key={t} value={t}>{admonitionConfig[t].title}</option>
                            ))}
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
            emoji: {
                default: null,
                parseHTML: element => element.getAttribute('data-emoji'),
                renderHTML: attributes => {
                    if (!attributes.emoji) return {};
                    return { 'data-emoji': attributes.emoji };
                },
            },
            color: {
                default: null, // null means use default color for type
                parseHTML: element => element.getAttribute('data-color'),
                renderHTML: attributes => {
                    if (!attributes.color) return {};
                    return { 'data-color': attributes.color };
                },
            }
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
                    if (classList.contains('callout')) return { type: 'CALLOUT' };
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
