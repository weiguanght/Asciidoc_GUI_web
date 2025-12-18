/**
 * BlockWrapper - 块级节点包装组件
 * 
 * 功能：
 * - 显示拖拽手柄 (Six-dot Grip) - 仅作为视觉提示
 * - 显示添加按钮 (+)
 * - Notion 风格的块交互
 * 
 * 注意：Tiptap/ProseMirror 的块拖拽需要通过 schema 和 NodeView 实现，
 * 原生 HTML5 拖拽会导致 block ID 被当作文本插入。
 * 本组件的拖拽手柄目前仅作为视觉提示，点击时打开上下文菜单。
 */

import React, { useState, useCallback } from 'react';
import { GripVertical, Plus } from 'lucide-react';

// ============================================
// 类型定义
// ============================================

export interface BlockWrapperProps {
    /** 块的唯一 ID */
    blockId: string;
    /** 块内容 */
    children: React.ReactNode;
    /** 添加新块的回调 */
    onAddBlock?: (blockId: string, position: 'before' | 'after') => void;
    /** 打开块菜单的回调 */
    onOpenMenu?: (blockId: string, event: React.MouseEvent) => void;
    /** 是否选中 */
    isSelected?: boolean;
    /** 拖拽开始的回调 (已禁用原生拖拽) */
    onDragStart?: (blockId: string, event: React.DragEvent) => void;
}

// ============================================
// BlockWrapper 组件
// ============================================

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
    blockId,
    children,
    onAddBlock,
    onOpenMenu,
    isSelected = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // 处理点击添加按钮
    const handleAddClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        onAddBlock?.(blockId, 'after');
    }, [blockId, onAddBlock]);

    // 处理点击拖拽手柄（打开菜单）
    const handleGripClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        onOpenMenu?.(blockId, event);
    }, [blockId, onOpenMenu]);

    return (
        <div
            className={`
                block-wrapper group relative
                ${isSelected ? 'block-wrapper-selected' : ''}
            `}
            data-block-id={blockId}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 左侧控件区域 */}
            <div
                className={`
                    block-controls absolute -left-12 top-0 flex items-center gap-0.5
                    transition-opacity duration-150 z-10
                    ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}
                `}
            >
                {/* 添加按钮 */}
                <button
                    type="button"
                    className="block-add-button p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={handleAddClick}
                    title="点击添加新块"
                    tabIndex={-1}
                >
                    <Plus size={14} className="text-gray-400 dark:text-gray-500" />
                </button>

                {/* 拖拽手柄 - 仅作为菜单触发器 */}
                <button
                    type="button"
                    className="block-drag-handle p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    onClick={handleGripClick}
                    title="点击打开菜单"
                    tabIndex={-1}
                >
                    <GripVertical size={14} className="text-gray-400 dark:text-gray-500" />
                </button>
            </div>

            {/* 块内容 */}
            <div className="block-content">
                {children}
            </div>
        </div>
    );
};

export default BlockWrapper;
