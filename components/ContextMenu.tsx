/**
 * 自定义右键菜单组件
 * 插件化架构：不同的 Tiptap 节点可注册自己的菜单项
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
    Copy, Scissors, Clipboard, Trash2,
    Table2, Image, Code, Quote,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    Merge, SplitSquareHorizontal,
    Link, Unlink, ExternalLink,
    Bold, Italic, Heading1
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

// 菜单项定义
export interface MenuItem {
    id: string;
    label: string;
    icon?: React.FC<{ size?: number }>;
    shortcut?: string;
    action: (editor: Editor) => void;
    isVisible?: (editor: Editor) => boolean;
    isDisabled?: (editor: Editor) => boolean;
    dividerAfter?: boolean;
}

// 菜单分组
export interface MenuGroup {
    id: string;
    items: MenuItem[];
}

// 通用菜单项
const commonMenuItems: MenuItem[] = [
    {
        id: 'cut',
        label: 'Cut',
        icon: Scissors,
        shortcut: '⌘X',
        action: (editor) => document.execCommand('cut'),
        dividerAfter: false,
    },
    {
        id: 'copy',
        label: 'Copy',
        icon: Copy,
        shortcut: '⌘C',
        action: (editor) => document.execCommand('copy'),
    },
    {
        id: 'paste',
        label: 'Paste',
        icon: Clipboard,
        shortcut: '⌘V',
        action: (editor) => document.execCommand('paste'),
        dividerAfter: true,
    },
    {
        id: 'bold',
        label: 'Bold',
        icon: Bold,
        shortcut: '⌘B',
        action: (editor) => editor.chain().focus().toggleBold().run(),
        isVisible: (editor) => !editor.isActive('codeBlock'),
    },
    {
        id: 'italic',
        label: 'Italic',
        icon: Italic,
        shortcut: '⌘I',
        action: (editor) => editor.chain().focus().toggleItalic().run(),
        isVisible: (editor) => !editor.isActive('codeBlock'),
        dividerAfter: true,
    },
];

// 表格菜单项
const tableMenuItems: MenuItem[] = [
    {
        id: 'table-add-row-above',
        label: 'Add Row Above',
        icon: ArrowUp,
        action: (editor) => editor.chain().focus().addRowBefore().run(),
    },
    {
        id: 'table-add-row-below',
        label: 'Add Row Below',
        icon: ArrowDown,
        action: (editor) => editor.chain().focus().addRowAfter().run(),
    },
    {
        id: 'table-add-col-left',
        label: 'Add Column Left',
        icon: ArrowLeft,
        action: (editor) => editor.chain().focus().addColumnBefore().run(),
    },
    {
        id: 'table-add-col-right',
        label: 'Add Column Right',
        icon: ArrowRight,
        action: (editor) => editor.chain().focus().addColumnAfter().run(),
        dividerAfter: true,
    },
    {
        id: 'table-merge',
        label: 'Merge Cells',
        icon: Merge,
        action: (editor) => editor.chain().focus().mergeCells().run(),
    },
    {
        id: 'table-split',
        label: 'Split Cell',
        icon: SplitSquareHorizontal,
        action: (editor) => editor.chain().focus().splitCell().run(),
        dividerAfter: true,
    },
    {
        id: 'table-delete-row',
        label: 'Delete Row',
        icon: Trash2,
        action: (editor) => editor.chain().focus().deleteRow().run(),
    },
    {
        id: 'table-delete-col',
        label: 'Delete Column',
        icon: Trash2,
        action: (editor) => editor.chain().focus().deleteColumn().run(),
    },
    {
        id: 'table-delete',
        label: 'Delete Table',
        icon: Trash2,
        action: (editor) => editor.chain().focus().deleteTable().run(),
    },
];

// 图片菜单项
const imageMenuItems: MenuItem[] = [
    {
        id: 'image-open',
        label: 'Open in New Tab',
        icon: ExternalLink,
        action: (editor) => {
            const { src } = editor.getAttributes('image');
            if (src) window.open(src, '_blank');
        },
    },
    {
        id: 'image-copy-url',
        label: 'Copy Image URL',
        icon: Copy,
        action: (editor) => {
            const { src } = editor.getAttributes('image');
            if (src) navigator.clipboard.writeText(src);
        },
        dividerAfter: true,
    },
    {
        id: 'image-delete',
        label: 'Delete Image',
        icon: Trash2,
        action: (editor) => editor.chain().focus().deleteSelection().run(),
    },
];

// 链接菜单项
const linkMenuItems: MenuItem[] = [
    {
        id: 'link-open',
        label: 'Open Link',
        icon: ExternalLink,
        action: (editor) => {
            const { href } = editor.getAttributes('link');
            if (href) window.open(href, '_blank');
        },
    },
    {
        id: 'link-copy',
        label: 'Copy Link',
        icon: Copy,
        action: (editor) => {
            const { href } = editor.getAttributes('link');
            if (href) navigator.clipboard.writeText(href);
        },
        dividerAfter: true,
    },
    {
        id: 'link-unlink',
        label: 'Remove Link',
        icon: Unlink,
        action: (editor) => editor.chain().focus().unsetLink().run(),
    },
];

// 代码块菜单项
const codeBlockMenuItems: MenuItem[] = [
    {
        id: 'code-copy',
        label: 'Copy Code',
        icon: Copy,
        action: (editor) => {
            const { state } = editor;
            const { from, to } = state.selection;
            const text = state.doc.textBetween(from, to, '\n');
            navigator.clipboard.writeText(text);
        },
        dividerAfter: true,
    },
    {
        id: 'code-delete',
        label: 'Delete Code Block',
        icon: Trash2,
        action: (editor) => editor.chain().focus().deleteNode('codeBlock').run(),
    },
];

// 菜单项注册中心
const menuRegistry = new Map<string, MenuItem[]>();

// 注册菜单项
export const registerMenuItems = (nodeType: string, items: MenuItem[]): void => {
    menuRegistry.set(nodeType, items);
};

// 初始化默认菜单
registerMenuItems('table', tableMenuItems);
registerMenuItems('image', imageMenuItems);
registerMenuItems('link', linkMenuItems);
registerMenuItems('codeBlock', codeBlockMenuItems);

// 获取当前上下文菜单项
const getContextMenuItems = (editor: Editor): MenuItem[] => {
    const items: MenuItem[] = [...commonMenuItems];

    // 检查当前选区的节点类型
    if (editor.isActive('table')) {
        items.push(...(menuRegistry.get('table') || []));
    }

    if (editor.isActive('image')) {
        items.push(...(menuRegistry.get('image') || []));
    }

    if (editor.isActive('link')) {
        items.push(...(menuRegistry.get('link') || []));
    }

    if (editor.isActive('codeBlock')) {
        items.push(...(menuRegistry.get('codeBlock') || []));
    }

    // 过滤不可见项
    return items.filter(item => !item.isVisible || item.isVisible(editor));
};

// 菜单组件属性
interface ContextMenuProps {
    editor: Editor | null;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ editor }) => {
    const { darkMode } = useEditorStore();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = useCallback((event: MouseEvent) => {
        if (!editor) return;

        // 检查是否点击在编辑器内
        const editorElement = document.querySelector('.ProseMirror');
        if (!editorElement?.contains(event.target as Node)) {
            return;
        }

        event.preventDefault();
        setPosition({ x: event.clientX, y: event.clientY });
        setIsOpen(true);
    }, [editor]);

    const handleClick = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleContextMenu, handleClick, handleKeyDown]);

    // 调整菜单位置避免溢出
    useEffect(() => {
        if (isOpen && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let { x, y } = position;

            if (x + rect.width > viewportWidth) {
                x = viewportWidth - rect.width - 10;
            }
            if (y + rect.height > viewportHeight) {
                y = viewportHeight - rect.height - 10;
            }

            if (x !== position.x || y !== position.y) {
                setPosition({ x, y });
            }
        }
    }, [isOpen, position]);

    if (!isOpen || !editor) return null;

    const menuItems = getContextMenuItems(editor);

    return (
        <div
            ref={menuRef}
            className={`
        fixed z-[100] min-w-[180px] py-1 rounded-lg shadow-xl
        ${darkMode
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-white border border-gray-200'
                }
      `}
            style={{ left: position.x, top: position.y }}
        >
            {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isDisabled = item.isDisabled?.(editor) ?? false;

                return (
                    <React.Fragment key={item.id}>
                        <button
                            onClick={() => {
                                if (!isDisabled) {
                                    item.action(editor);
                                    setIsOpen(false);
                                }
                            }}
                            disabled={isDisabled}
                            className={`
                w-full flex items-center gap-3 px-3 py-1.5 text-sm
                ${isDisabled
                                    ? 'opacity-50 cursor-not-allowed'
                                    : darkMode
                                        ? 'hover:bg-slate-700 text-slate-200'
                                        : 'hover:bg-gray-100 text-gray-700'
                                }
              `}
                        >
                            {Icon && (
                                <Icon size={14} />
                            )}
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.shortcut && (
                                <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                    {item.shortcut}
                                </span>
                            )}
                        </button>
                        {item.dividerAfter && (
                            <div className={`my-1 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default ContextMenu;
