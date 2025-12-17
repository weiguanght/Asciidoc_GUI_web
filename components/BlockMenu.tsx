/**
 * BlockMenu - 块操作菜单组件
 * 
 * 功能：
 * - 删除块
 * - 复制块
 * - 移动块（上/下）
 * - 转换块类型
 */

import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/core';
import {
    Trash2,
    Copy,
    ArrowUp,
    ArrowDown,
    Type,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Code,
    Quote,
    X,
} from 'lucide-react';

// ============================================
// 类型定义
// ============================================

export interface BlockMenuProps {
    /** 是否显示 */
    isOpen: boolean;
    /** 块 ID */
    blockId: string;
    /** 菜单位置 */
    position: { x: number; y: number };
    /** 块在文档中的位置 */
    blockPos: number;
    /** 关闭回调 */
    onClose: () => void;
    /** 编辑器实例 */
    editor: Editor | null;
}

interface MenuItem {
    label: string;
    icon: React.ReactNode;
    action: () => void;
    divider?: boolean;
}

// ============================================
// BlockMenu 组件
// ============================================

export const BlockMenu: React.FC<BlockMenuProps> = ({
    isOpen,
    blockId,
    position,
    blockPos,
    onClose,
    editor,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showTransformMenu, setShowTransformMenu] = useState(false);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // ESC 键关闭
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !editor) return null;

    // 删除块
    const deleteBlock = () => {
        editor.chain().focus().deleteRange({ from: blockPos, to: blockPos + 1 }).run();
        onClose();
    };

    // 复制块
    const duplicateBlock = () => {
        const node = editor.state.doc.nodeAt(blockPos);
        if (node) {
            const insertPos = blockPos + node.nodeSize;
            editor.chain().focus().insertContentAt(insertPos, node.toJSON()).run();
        }
        onClose();
    };

    // 向上移动
    const moveUp = () => {
        // 找到前一个块并交换位置
        if (blockPos > 0) {
            const $pos = editor.state.doc.resolve(blockPos);
            const prevPos = $pos.before($pos.depth);
            if (prevPos >= 0) {
                // 简单实现：删除并在前面插入
                const node = editor.state.doc.nodeAt(blockPos);
                if (node) {
                    editor.chain().focus()
                        .deleteRange({ from: blockPos, to: blockPos + node.nodeSize })
                        .insertContentAt(prevPos, node.toJSON())
                        .run();
                }
            }
        }
        onClose();
    };

    // 向下移动
    const moveDown = () => {
        const node = editor.state.doc.nodeAt(blockPos);
        if (node) {
            const nextPos = blockPos + node.nodeSize;
            const nextNode = editor.state.doc.nodeAt(nextPos);
            if (nextNode) {
                const insertPos = nextPos + nextNode.nodeSize;
                editor.chain().focus()
                    .deleteRange({ from: blockPos, to: blockPos + node.nodeSize })
                    .insertContentAt(insertPos - node.nodeSize, node.toJSON())
                    .run();
            }
        }
        onClose();
    };

    // 转换为其他类型
    const transformTo = (type: string, attrs?: Record<string, any>) => {
        editor.chain().focus().setNode(type, attrs).run();
        setShowTransformMenu(false);
        onClose();
    };

    const mainMenuItems: MenuItem[] = [
        {
            label: '删除',
            icon: <Trash2 size={16} />,
            action: deleteBlock,
        },
        {
            label: '复制',
            icon: <Copy size={16} />,
            action: duplicateBlock,
        },
        {
            label: '向上移动',
            icon: <ArrowUp size={16} />,
            action: moveUp,
            divider: true,
        },
        {
            label: '向下移动',
            icon: <ArrowDown size={16} />,
            action: moveDown,
        },
    ];

    const transformMenuItems: MenuItem[] = [
        {
            label: '段落',
            icon: <Type size={16} />,
            action: () => transformTo('paragraph'),
        },
        {
            label: '一级标题',
            icon: <Heading1 size={16} />,
            action: () => transformTo('heading', { level: 1 }),
        },
        {
            label: '二级标题',
            icon: <Heading2 size={16} />,
            action: () => transformTo('heading', { level: 2 }),
        },
        {
            label: '三级标题',
            icon: <Heading3 size={16} />,
            action: () => transformTo('heading', { level: 3 }),
        },
        {
            label: '无序列表',
            icon: <List size={16} />,
            action: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
            label: '有序列表',
            icon: <ListOrdered size={16} />,
            action: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
            label: '代码块',
            icon: <Code size={16} />,
            action: () => transformTo('codeBlock'),
        },
        {
            label: '引用',
            icon: <Quote size={16} />,
            action: () => editor.chain().focus().toggleBlockquote().run(),
        },
    ];

    return (
        <div
            ref={menuRef}
            className="block-menu fixed bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50 min-w-[180px]"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            {showTransformMenu ? (
                <>
                    <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                        <span>转换为</span>
                        <button
                            onClick={() => setShowTransformMenu(false)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    {transformMenuItems.map((item, index) => (
                        <button
                            key={index}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            onClick={item.action}
                        >
                            <span className="text-gray-400">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </>
            ) : (
                <>
                    {mainMenuItems.map((item, index) => (
                        <React.Fragment key={index}>
                            <button
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                onClick={item.action}
                            >
                                <span className="text-gray-400">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                            {item.divider && (
                                <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                            )}
                        </React.Fragment>
                    ))}
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                    <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setShowTransformMenu(true)}
                    >
                        <span className="text-gray-400"><Type size={16} /></span>
                        <span>转换为...</span>
                    </button>
                </>
            )}
        </div>
    );
};

export default BlockMenu;
