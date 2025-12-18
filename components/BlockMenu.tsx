/**
 * BlockMenu - 块操作菜单组件
 * 
 * 功能：
 * - 删除块
 * - 复制块
 * - 移动块（上/下）
 * - 转换块类型
 * - 颜色设置（背景色）
 * - 复制块链接
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
    Palette,
    Link2,
    CheckSquare,
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

// Notion 风格背景色
const blockColors = [
    { name: 'Default', value: null },
    { name: 'Gray', value: '#F1F1EF' },
    { name: 'Brown', value: '#F4EEEE' },
    { name: 'Orange', value: '#FBECDD' },
    { name: 'Yellow', value: '#FBF3DB' },
    { name: 'Green', value: '#EDF3EC' },
    { name: 'Blue', value: '#E7F3F8' },
    { name: 'Purple', value: '#F6F3F9' },
    { name: 'Pink', value: '#FAF1F5' },
    { name: 'Red', value: '#FDEBEC' },
];

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
    const [showColorMenu, setShowColorMenu] = useState(false);

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

    // 重置子菜单状态
    useEffect(() => {
        if (!isOpen) {
            setShowTransformMenu(false);
            setShowColorMenu(false);
        }
    }, [isOpen]);

    if (!isOpen || !editor) return null;

    // 获取当前节点
    const getNode = () => editor.state.doc.nodeAt(blockPos);

    // 删除块
    const deleteBlock = () => {
        const node = getNode();
        if (node) {
            editor.chain().focus().deleteRange({ from: blockPos, to: blockPos + node.nodeSize }).run();
        }
        onClose();
    };

    // 复制块（深拷贝）
    const duplicateBlock = () => {
        const node = getNode();
        if (node) {
            const insertPos = blockPos + node.nodeSize;
            // 使用 node.toJSON() 进行深拷贝
            const nodeJson = node.toJSON();
            // 移除 id 属性以便自动生成新 ID
            if (nodeJson.attrs) {
                delete nodeJson.attrs.id;
            }
            editor.chain().focus().insertContentAt(insertPos, nodeJson).run();
        }
        onClose();
    };

    // 向上移动
    const moveUp = () => {
        if (blockPos > 0) {
            const $pos = editor.state.doc.resolve(blockPos);
            const prevPos = $pos.before($pos.depth);
            if (prevPos >= 0) {
                const node = getNode();
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
        const node = getNode();
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

    // 复制块链接到剪贴板
    const copyLinkToBlock = async () => {
        const url = `${window.location.href.split('#')[0]}#block-${blockId}`;
        try {
            await navigator.clipboard.writeText(url);
            // 可以添加 toast 提示
            console.log('[BlockMenu] Copied link:', url);
        } catch (err) {
            console.error('[BlockMenu] Failed to copy link:', err);
        }
        onClose();
    };

    // 转换为其他类型
    const transformTo = (type: string, attrs?: Record<string, any>) => {
        editor.chain().focus().setNode(type, attrs).run();
        setShowTransformMenu(false);
        onClose();
    };

    // 切换列表类型
    const toggleList = (listType: 'bulletList' | 'orderedList' | 'taskList') => {
        switch (listType) {
            case 'bulletList':
                editor.chain().focus().toggleBulletList().run();
                break;
            case 'orderedList':
                editor.chain().focus().toggleOrderedList().run();
                break;
            case 'taskList':
                editor.chain().focus().toggleTaskList().run();
                break;
        }
        setShowTransformMenu(false);
        onClose();
    };

    // 设置块背景色（通过包裹 div 或自定义属性）
    const setBlockColor = (color: string | null) => {
        // TODO: 需要实现块级背景色
        // 目前 Tiptap 没有原生支持块级背景色，可以通过扩展节点属性实现
        console.log('[BlockMenu] Set block color:', color);
        setShowColorMenu(false);
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
            label: '复制链接',
            icon: <Link2 size={16} />,
            action: copyLinkToBlock,
            divider: true,
        },
        {
            label: '向上移动',
            icon: <ArrowUp size={16} />,
            action: moveUp,
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
            action: () => toggleList('bulletList'),
        },
        {
            label: '有序列表',
            icon: <ListOrdered size={16} />,
            action: () => toggleList('orderedList'),
        },
        {
            label: '待办清单',
            icon: <CheckSquare size={16} />,
            action: () => toggleList('taskList'),
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

    // 渲染子菜单
    const renderSubMenu = () => {
        if (showTransformMenu) {
            return (
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
            );
        }

        if (showColorMenu) {
            return (
                <>
                    <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                        <span>背景色</span>
                        <button
                            onClick={() => setShowColorMenu(false)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="p-2 grid grid-cols-5 gap-1">
                        {blockColors.map((color) => (
                            <button
                                key={color.name}
                                onClick={() => setBlockColor(color.value)}
                                className="w-7 h-7 rounded border border-gray-200 dark:border-slate-600 hover:scale-110 transition-transform flex items-center justify-center"
                                style={{ backgroundColor: color.value || 'transparent' }}
                                title={color.name}
                            >
                                {color.value === null && <X size={12} className="text-gray-400" />}
                            </button>
                        ))}
                    </div>
                </>
            );
        }

        return null;
    };

    return (
        <div
            ref={menuRef}
            className="block-menu fixed bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50 min-w-[180px]"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            {showTransformMenu || showColorMenu ? (
                renderSubMenu()
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
                        onClick={() => setShowColorMenu(true)}
                    >
                        <span className="text-gray-400"><Palette size={16} /></span>
                        <span>颜色</span>
                    </button>
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
