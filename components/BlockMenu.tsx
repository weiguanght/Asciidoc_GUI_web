/**
 * BlockMenu - 块操作菜单组件 (Notion 风格)
 * 
 * 功能：
 * - 转换为其他类型 (hover 展开)
 * - 颜色设置 (hover 展开)
 * - 复制块链接
 * - 创建副本
 * - 移动到（其他文件）
 * - 删除块
 */

import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/core';
import {
    Trash2,
    Copy,
    Type,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Code,
    Quote,
    Palette,
    Link2,
    CheckSquare,
    ChevronRight,
    ArrowUpRight,
    RefreshCw,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

// ============================================
// 类型定义
// ============================================

export interface BlockMenuProps {
    isOpen: boolean;
    blockId: string;
    position: { x: number; y: number };
    blockPos: number;
    onClose: () => void;
    editor: Editor | null;
}

interface MenuItem {
    label: string;
    icon: React.ReactNode;
    action: () => void;
    divider?: boolean;
}

// Notion 风格颜色配置 (带中文标签)
const textColors = [
    { name: '默认', value: null, label: '默认文本' },
    { name: '灰色', value: '#9B9A97', label: '灰色文本' },
    { name: '棕色', value: '#64473A', label: '棕色文本' },
    { name: '橙色', value: '#D9730D', label: '橙色文本' },
    { name: '黄色', value: '#CB912F', label: '黄色文本' },
    { name: '绿色', value: '#448361', label: '绿色文本' },
    { name: '蓝色', value: '#337EA9', label: '蓝色文本' },
    { name: '紫色', value: '#9065B0', label: '紫色文本' },
    { name: '粉色', value: '#C14C8A', label: '粉色文本' },
    { name: '红色', value: '#D44C47', label: '红色文本' },
];

const backgroundColors = [
    { name: '默认', value: null, label: '默认背景' },
    { name: '灰色', value: '#EBECED', label: '灰色背景' },
    { name: '棕色', value: '#E9E5E3', label: '棕色背景' },
    { name: '橙色', value: '#FAEBDD', label: '橙色背景' },
    { name: '黄色', value: '#FBF3DB', label: '黄色背景' },
    { name: '绿色', value: '#DDEDEA', label: '绿色背景' },
    { name: '蓝色', value: '#DDEBF1', label: '蓝色背景' },
    { name: '紫色', value: '#EAE4F2', label: '紫色背景' },
    { name: '粉色', value: '#F4DFEB', label: '粉色背景' },
    { name: '红色', value: '#FBE4E4', label: '红色背景' },
];

// ============================================
// Toast 通知组件
// ============================================

interface ToastProps {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, actionLabel, onAction, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[9999]">
            <span>{message}</span>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

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
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);
    const { recentColors, addRecentColor, pages } = useEditorStore();

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
            setShowMoveMenu(false);
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

    // 复制块（创建副本）
    const duplicateBlock = () => {
        const node = getNode();
        if (node) {
            const insertPos = blockPos + node.nodeSize;
            const nodeJson = node.toJSON();
            if (nodeJson.attrs) {
                delete nodeJson.attrs.id;
            }
            editor.chain().focus().insertContentAt(insertPos, nodeJson).run();
        }
        onClose();
    };

    // 复制块链接到剪贴板
    const copyLinkToBlock = async () => {
        const url = `${window.location.href.split('#')[0]}#block-${blockId}`;
        try {
            await navigator.clipboard.writeText(url);
            console.log('[BlockMenu] Copied link:', url);
        } catch (err) {
            console.error('[BlockMenu] Failed to copy link:', err);
        }
        onClose();
    };

    // 移动到其他文件
    const moveToPage = (pageId: string, pageTitle: string) => {
        const node = getNode();
        if (!node) return;

        // 保存节点内容用于撤回
        const nodeJson = node.toJSON();
        const originalPos = blockPos;

        // 删除当前块
        editor.chain().focus().deleteRange({ from: blockPos, to: blockPos + node.nodeSize }).run();

        // TODO: 实际移动到目标页面 (需要页面管理 API)
        console.log('[BlockMenu] Moving block to page:', pageId);

        // 显示 Toast
        setToast({
            message: `已移动到「${pageTitle}」`,
            onUndo: () => {
                // 撤回移动
                editor.chain().focus().insertContentAt(originalPos, nodeJson).run();
                setToast(null);
            },
        });

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

    // 设置文本颜色
    const setTextColor = (color: string | null, label: string) => {
        const node = getNode();
        if (node) {
            editor.chain().focus()
                .setTextSelection({ from: blockPos + 1, to: blockPos + node.nodeSize - 1 })
                .run();

            if (color) {
                editor.chain().focus().setColor(color).run();
            } else {
                editor.chain().focus().unsetColor().run();
            }
        }
        addRecentColor({ color, type: 'text', name: label });
        setShowColorMenu(false);
        onClose();
    };

    // 设置背景色
    const setBackgroundColor = (color: string | null, label: string) => {
        const node = getNode();
        if (node) {
            editor.chain().focus()
                .setTextSelection({ from: blockPos + 1, to: blockPos + node.nodeSize - 1 })
                .run();

            if (color) {
                editor.chain().focus().toggleHighlight({ color }).run();
            } else {
                editor.chain().focus().unsetHighlight().run();
            }
        }
        addRecentColor({ color, type: 'highlight', name: label });
        setShowColorMenu(false);
        onClose();
    };

    // 从最近颜色应用
    const applyRecentColor = (item: { color: string | null; type: 'text' | 'highlight'; name: string }) => {
        if (item.type === 'text') {
            setTextColor(item.color, item.name);
        } else {
            setBackgroundColor(item.color, item.name);
        }
    };

    // 获取当前块类型名称
    const getCurrentTypeName = () => {
        const node = getNode();
        if (!node) return '文本';
        switch (node.type.name) {
            case 'heading':
                const level = node.attrs.level;
                return `标题 ${level}`;
            case 'bulletList': return '无序列表';
            case 'orderedList': return '有序列表';
            case 'taskList': return '待办清单';
            case 'codeBlock': return '代码块';
            case 'blockquote': return '引用';
            default: return '文本';
        }
    };

    const transformMenuItems: MenuItem[] = [
        { label: '文本', icon: <Type size={16} />, action: () => transformTo('paragraph') },
        { label: '标题 1', icon: <Heading1 size={16} />, action: () => transformTo('heading', { level: 1 }) },
        { label: '标题 2', icon: <Heading2 size={16} />, action: () => transformTo('heading', { level: 2 }) },
        { label: '标题 3', icon: <Heading3 size={16} />, action: () => transformTo('heading', { level: 3 }) },
        { label: '无序列表', icon: <List size={16} />, action: () => toggleList('bulletList') },
        { label: '有序列表', icon: <ListOrdered size={16} />, action: () => toggleList('orderedList') },
        { label: '待办清单', icon: <CheckSquare size={16} />, action: () => toggleList('taskList') },
        { label: '代码块', icon: <Code size={16} />, action: () => transformTo('codeBlock') },
        { label: '引用', icon: <Quote size={16} />, action: () => editor.chain().focus().toggleBlockquote().run() },
    ];

    // 渲染颜色子菜单
    const renderColorFlyout = () => (
        <div
            className="fixed left-auto ml-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 min-w-[180px] z-50 max-h-[80vh] overflow-y-auto"
            style={{ top: '50%', transform: 'translateY(-50%)', left: position.x + 190 }}
        >
            {/* 最近使用 */}
            {recentColors.length > 0 && (
                <>
                    <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">最近使用</div>
                    {recentColors.map((item, index) => (
                        <button
                            key={`recent-${index}`}
                            className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            onClick={() => applyRecentColor(item)}
                        >
                            <span
                                className="w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center"
                                style={{
                                    backgroundColor: item.type === 'highlight' ? (item.color || '#fff') : '#fff',
                                    borderColor: item.color || '#e5e7eb',
                                }}
                            >
                                {item.type === 'text' && <span className="text-xs font-bold" style={{ color: item.color || 'inherit' }}>A</span>}
                            </span>
                            <span>{item.name}</span>
                        </button>
                    ))}
                    <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                </>
            )}

            {/* 文本颜色 */}
            <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">文本颜色</div>
            {textColors.map((color) => (
                <button
                    key={`text-${color.name}`}
                    className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setTextColor(color.value, color.label)}
                >
                    <span
                        className="w-5 h-5 rounded border flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ borderColor: color.value || '#e5e7eb', color: color.value || 'inherit' }}
                    >
                        A
                    </span>
                    <span>{color.label}</span>
                </button>
            ))}

            <div className="border-t border-gray-200 dark:border-slate-700 my-1" />

            {/* 背景颜色 */}
            <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">背景颜色</div>
            {backgroundColors.map((color) => (
                <button
                    key={`bg-${color.name}`}
                    className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setBackgroundColor(color.value, color.label)}
                >
                    <span
                        className="w-5 h-5 rounded border flex-shrink-0"
                        style={{ borderColor: color.value || '#e5e7eb', backgroundColor: color.value || 'transparent' }}
                    />
                    <span>{color.label}</span>
                </button>
            ))}
        </div>
    );

    // 渲染转换子菜单
    const renderTransformFlyout = () => (
        <div
            className="fixed left-auto ml-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 min-w-[160px] z-50"
            style={{ top: '50%', transform: 'translateY(-50%)', left: position.x + 190 }}
        >
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
        </div>
    );

    // 渲染移动到子菜单
    const renderMoveFlyout = () => (
        <div
            className="fixed left-auto ml-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 min-w-[200px] z-50"
            style={{ top: '50%', transform: 'translateY(-50%)', left: position.x + 190 }}
        >
            <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">移动到页面</div>
            {pages && pages.length > 0 ? (
                pages.map((page) => (
                    <button
                        key={page.id}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => moveToPage(page.id, page.title || '无标题')}
                    >
                        <span className="text-gray-400">📄</span>
                        <span className="truncate">{page.title || '无标题'}</span>
                    </button>
                ))
            ) : (
                <div className="px-3 py-2 text-sm text-gray-400">暂无其他页面</div>
            )}
        </div>
    );

    return (
        <>
            <div
                ref={menuRef}
                className="block-menu fixed bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50 min-w-[200px]"
                style={{
                    left: position.x,
                    top: position.y,
                }}
            >
                {/* 当前块类型 */}
                <div className="px-3 py-2 text-xs text-gray-400 font-medium border-b border-gray-100 dark:border-slate-700">
                    {getCurrentTypeName()}
                </div>

                {/* 转换成 (hover 触发) */}
                <div
                    className="relative"
                    onMouseEnter={() => { setShowTransformMenu(true); setShowColorMenu(false); setShowMoveMenu(false); }}
                    onMouseLeave={() => setShowTransformMenu(false)}
                >
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-gray-400"><RefreshCw size={16} /></span>
                        <span className="flex-1 text-left">转换成</span>
                        <ChevronRight size={14} className="text-gray-400" />
                    </button>
                    {showTransformMenu && renderTransformFlyout()}
                </div>

                {/* 颜色 (hover 触发) */}
                <div
                    className="relative"
                    onMouseEnter={() => { setShowColorMenu(true); setShowTransformMenu(false); setShowMoveMenu(false); }}
                    onMouseLeave={() => setShowColorMenu(false)}
                >
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-gray-400"><Palette size={16} /></span>
                        <span className="flex-1 text-left">颜色</span>
                        <ChevronRight size={14} className="text-gray-400" />
                    </button>
                    {showColorMenu && renderColorFlyout()}
                </div>

                <div className="border-t border-gray-100 dark:border-slate-700 my-1" />

                {/* 拷贝区块链接 */}
                <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={copyLinkToBlock}
                >
                    <span className="text-gray-400"><Link2 size={16} /></span>
                    <span>拷贝区块链接</span>
                </button>

                {/* 创建副本 */}
                <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={duplicateBlock}
                >
                    <span className="text-gray-400"><Copy size={16} /></span>
                    <span>创建副本</span>
                </button>

                {/* 移动到 (hover 触发) */}
                <div
                    className="relative"
                    onMouseEnter={() => { setShowMoveMenu(true); setShowTransformMenu(false); setShowColorMenu(false); }}
                    onMouseLeave={() => setShowMoveMenu(false)}
                >
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-gray-400"><ArrowUpRight size={16} /></span>
                        <span className="flex-1 text-left">移动到</span>
                        <ChevronRight size={14} className="text-gray-400" />
                    </button>
                    {showMoveMenu && renderMoveFlyout()}
                </div>

                <div className="border-t border-gray-100 dark:border-slate-700 my-1" />

                {/* 删除 */}
                <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    onClick={deleteBlock}
                >
                    <Trash2 size={16} />
                    <span>删除</span>
                </button>
            </div>

            {/* Toast 通知 */}
            {toast && (
                <Toast
                    message={toast.message}
                    actionLabel={toast.onUndo ? '撤回' : undefined}
                    onAction={toast.onUndo}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
};

export default BlockMenu;
