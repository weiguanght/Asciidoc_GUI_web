/**
 * BlockWrapper - 块级节点包装组件
 * 
 * 功能：
 * - 显示拖拽手柄 (Six-dot Grip) - 支持真正的块拖拽
 * - 显示添加按钮 (+)
 * - Notion 风格的块交互
 * - 放置指示器显示
 */

import React, { useState, useCallback } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { Editor } from '@tiptap/core';
import { useDragDrop } from '../hooks/useDragDrop';

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
    /** 编辑器实例 */
    editor?: Editor | null;
    /** 获取节点位置 */
    getPos?: () => number;
    /** 节点大小 */
    nodeSize?: number;
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
    editor = null,
    getPos = () => 0,
    nodeSize = 1,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // 使用拖拽 Hook
    const {
        state: dragState,
        dragHandleProps,
        dropZoneProps,
    } = useDragDrop({
        editor,
        blockId,
        getPos,
        nodeSize,
    });

    // 处理点击添加按钮
    const handleAddClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        onAddBlock?.(blockId, 'after');
    }, [blockId, onAddBlock]);

    // 拖拽状态跟踪
    const [isDragStarted, setIsDragStarted] = useState(false);

    // 处理点击拖拽手柄（打开菜单）- 只有在没有拖拽时才触发
    const handleGripClick = useCallback((event: React.MouseEvent) => {
        if (isDragStarted) {
            setIsDragStarted(false);
            return;
        }
        event.stopPropagation();
        onOpenMenu?.(blockId, event);
    }, [blockId, onOpenMenu, isDragStarted]);

    // 自定义拖拽开始处理 - 标记为正在拖拽
    const handleDragStartWrapper = useCallback((e: React.DragEvent) => {
        console.log('[BlockWrapper] handleDragStartWrapper called for block:', blockId);
        setIsDragStarted(true);
        dragHandleProps.onDragStart(e);
    }, [dragHandleProps, blockId]);

    // 自定义拖拽结束处理 - 重置状态
    const handleDragEndWrapper = useCallback((e: React.DragEvent) => {
        console.log('[BlockWrapper] handleDragEndWrapper called for block:', blockId);
        setTimeout(() => setIsDragStarted(false), 100);
        dragHandleProps.onDragEnd(e);
    }, [dragHandleProps, blockId]);

    return (
        <div
            className={`
                block-wrapper group relative
                ${isSelected ? 'block-wrapper-selected' : ''}
                ${dragState.isDragging ? 'block-wrapper-dragging opacity-50' : ''}
                ${dragState.isDragOver ? 'block-wrapper-drag-over' : ''}
            `}
            data-block-id={blockId}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...dropZoneProps}
        >
            {/* 放置指示器 - 上方 */}
            {dragState.isDragOver && dragState.dropPosition === 'before' && (
                <div className="absolute -top-0.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-20 pointer-events-none" />
            )}

            {/* 左侧控件区域 */}
            <div
                className={`
                    block-controls absolute -left-12 top-0 flex items-center gap-0.5
                    transition-opacity duration-150 z-10
                    ${isHovered || isSelected || dragState.isDragging ? 'opacity-100' : 'opacity-0'}
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

                {/* 拖拽手柄 */}
                <div
                    className="block-drag-handle p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 cursor-grab active:cursor-grabbing transition-colors"
                    onClick={handleGripClick}
                    onMouseDown={(e) => e.preventDefault()}
                    data-drag-handle
                    draggable={true}
                    onDragStart={handleDragStartWrapper}
                    onDragEnd={handleDragEndWrapper}
                    title="拖拽移动块，点击打开菜单"
                    tabIndex={-1}
                >
                    <GripVertical size={14} className="text-gray-400 dark:text-gray-500" />
                </div>
            </div>

            {/* 块内容 */}
            <div className="block-content">
                {children}
            </div>

            {/* 放置指示器 - 下方 */}
            {dragState.isDragOver && dragState.dropPosition === 'after' && (
                <div className="absolute -bottom-0.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-20 pointer-events-none" />
            )}
        </div>
    );
};

export default BlockWrapper;
