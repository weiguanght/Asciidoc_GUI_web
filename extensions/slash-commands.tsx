/**
 * Tiptap Slash Commands Extension
 * 输入 / 触发命令菜单，快速插入各种内容
 */

import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import {
    Heading1, Heading2, Heading3,
    List, ListOrdered,
    Code, Quote, Table2, Image,
    Minus, AlertCircle, FileText,
    CheckSquare, Info, Lightbulb, AlertTriangle, Flame, ShieldAlert, ChevronRight, Sigma, Smile, Globe,
    Video, Music
} from 'lucide-react';

// 命令项定义
export interface CommandItem {
    title: string;
    description: string;
    icon: React.FC<{ size?: number; className?: string }>;
    command: (props: { editor: any; range: any }) => void;
}

// 命令列表
export const slashCommands: CommandItem[] = [
    {
        title: 'Heading 1',
        description: 'Large section heading',
        icon: Heading1,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
    },
    {
        title: 'Heading 2',
        description: 'Medium section heading',
        icon: Heading2,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
    },
    {
        title: 'Heading 3',
        description: 'Small section heading',
        icon: Heading3,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
        },
    },
    {
        title: 'Bullet List',
        description: 'Create a simple bullet list',
        icon: List,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Numbered List',
        description: 'Create a numbered list',
        icon: ListOrdered,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: 'To-do List',
        description: 'Track tasks with a to-do list',
        icon: CheckSquare,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: 'Toggle List',
        description: 'Create a collapsible content block',
        icon: ChevronRight,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setDetails().run();
        },
    },
    {
        title: 'Math Block',
        description: 'Insert a math formula (LaTeX)',
        icon: Sigma,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setMathBlock().run();
        },
    },
    {
        title: 'Code Block',
        description: 'Capture a code snippet',
        icon: Code,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
    },
    {
        title: 'Quote',
        description: 'Capture a quote',
        icon: Quote,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
    },
    {
        title: 'Table',
        description: 'Insert a table',
        icon: Table2,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range)
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
        },
    },
    {
        title: 'Image',
        description: 'Insert an image',
        icon: Image,
        command: ({ editor, range }) => {
            const url = window.prompt('Enter image URL:');
            if (url) {
                editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
            }
        },
    },
    {
        title: 'Video',
        description: 'Embed a video from URL or YouTube',
        icon: Video,
        command: ({ editor, range }) => {
            const url = window.prompt('Enter Video URL (YouTube or .mp4):');
            if (url) {
                editor.chain().focus().deleteRange(range).insertContent({
                    type: 'video',
                    attrs: { src: url }
                }).run();
            }
        },
    },
    {
        title: 'Audio',
        description: 'Embed an audio file',
        icon: Music,
        command: ({ editor, range }) => {
            const url = window.prompt('Enter Audio URL:');
            if (url) {
                editor.chain().focus().deleteRange(range).insertContent({
                    type: 'audio',
                    attrs: { src: url }
                }).run();
            }
        },
    },
    {
        title: 'File',
        description: 'Upload or link a file',
        icon: FileText,
        command: ({ editor, range }) => {
            const url = window.prompt('Enter File URL:');
            if (url) {
                const title = window.prompt('Enter File Name (optional):') || '';
                editor.chain().focus().deleteRange(range).insertContent({
                    type: 'fileBlock',
                    attrs: { src: url, title: title || url.split('/').pop() }
                }).run();
            }
        },
    },
    {
        title: 'Divider',
        description: 'Insert a horizontal divider',
        icon: Minus,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },
    {
        title: 'Callout',
        description: 'Add a callout block with emoji',
        icon: Smile,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'admonition',
                attrs: { type: 'CALLOUT' },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Enter callout content...' }] }],
            }).run();
        },
    },
    {
        title: 'Web Bookmark',
        description: 'Embed a link as a visual bookmark',
        icon: Globe,
        command: ({ editor, range }) => {
            const url = window.prompt('Enter URL:');
            if (url) {
                editor.chain().focus().deleteRange(range).setWebBookmark(url).run();
            }
        },
    },
    {
        title: 'Note',
        description: 'Add a note admonition',
        icon: AlertCircle,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'admonition',
                attrs: { type: 'NOTE' },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Enter note content...' }] }],
            }).run();
        },
    },
    {
        title: 'Tip',
        description: 'Add a tip admonition',
        icon: CheckSquare,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'admonition',
                attrs: { type: 'TIP' },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Enter tip content...' }] }],
            }).run();
        },
    },
    {
        title: 'Warning',
        description: 'Add a warning admonition',
        icon: AlertTriangle,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'admonition',
                attrs: { type: 'WARNING' },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Enter warning content...' }] }],
            }).run();
        },
    },
    {
        title: 'Caution',
        description: 'Add a caution admonition',
        icon: Flame,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'admonition',
                attrs: { type: 'CAUTION' },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Enter caution content...' }] }],
            }).run();
        },
    },
    {
        title: 'Important',
        description: 'Add an important admonition',
        icon: ShieldAlert,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'admonition',
                attrs: { type: 'IMPORTANT' },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Enter important content...' }] }],
            }).run();
        },
    },
];

// 命令列表组件属性
interface CommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
}

// 命令列表组件
export const CommandList = forwardRef<{ onKeyDown: (props: SuggestionKeyDownProps) => boolean }, CommandListProps>(
    ({ items, command }, ref) => {
        const [selectedIndex, setSelectedIndex] = useState(0);
        const containerRef = useRef<HTMLDivElement>(null);

        // 重置选中索引
        useEffect(() => {
            setSelectedIndex(0);
        }, [items]);

        // 滚动到选中项
        useEffect(() => {
            const container = containerRef.current;
            if (container) {
                const selectedItem = container.children[selectedIndex] as HTMLElement;
                if (selectedItem) {
                    selectedItem.scrollIntoView({ block: 'nearest' });
                }
            }
        }, [selectedIndex]);

        const selectItem = useCallback((index: number) => {
            const item = items[index];
            if (item) {
                command(item);
            }
        }, [items, command]);

        useImperativeHandle(ref, () => ({
            onKeyDown: ({ event }: SuggestionKeyDownProps) => {
                if (event.key === 'ArrowUp') {
                    setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
                    return true;
                }
                if (event.key === 'ArrowDown') {
                    setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
                    return true;
                }
                if (event.key === 'Enter') {
                    selectItem(selectedIndex);
                    return true;
                }
                return false;
            },
        }));

        if (items.length === 0) {
            return (
                <div className="slash-command-menu bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-3 text-sm text-gray-500 dark:text-slate-400">
                    No results found
                </div>
            );
        }

        return (
            <div
                ref={containerRef}
                className="slash-command-menu bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden max-h-80 overflow-y-auto"
            >
                {items.map((item, index) => {
                    const IconComponent = item.icon;
                    const isSelected = index === selectedIndex;

                    return (
                        <button
                            key={item.title}
                            onClick={() => selectItem(index)}
                            className={`
                w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                ${isSelected
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }
              `}
                        >
                            <div className={`
                flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center
                ${isSelected
                                    ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                                }
              `}>
                                <IconComponent size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{item.title}</div>
                                <div className="text-xs text-gray-500 dark:text-slate-500 truncate">{item.description}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    }
);

CommandList.displayName = 'CommandList';

// Slash Commands 扩展
export const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                startOfLine: false,
                command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
                items: ({ query }: { query: string }) => {
                    return slashCommands.filter((item) =>
                        item.title.toLowerCase().includes(query.toLowerCase()) ||
                        item.description.toLowerCase().includes(query.toLowerCase())
                    );
                },
                render: () => {
                    let component: ReactRenderer | null = null;
                    let popup: TippyInstance[] | null = null;

                    return {
                        onStart: (props: SuggestionProps) => {
                            component = new ReactRenderer(CommandList, {
                                props,
                                editor: props.editor,
                            });

                            if (!props.clientRect) return;

                            popup = tippy('body', {
                                getReferenceClientRect: props.clientRect as () => DOMRect,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                            });
                        },

                        onUpdate: (props: SuggestionProps) => {
                            component?.updateProps(props);

                            if (popup && props.clientRect) {
                                popup[0].setProps({
                                    getReferenceClientRect: props.clientRect as () => DOMRect,
                                });
                            }
                        },

                        onKeyDown: (props: SuggestionKeyDownProps) => {
                            if (props.event.key === 'Escape') {
                                popup?.[0].hide();
                                return true;
                            }

                            return (component?.ref as any)?.onKeyDown?.(props) ?? false;
                        },

                        onExit: () => {
                            popup?.[0].destroy();
                            component?.destroy();
                        },
                    };
                },
            }),
        ];
    },
});

export default SlashCommands;
