/**
 * BlockNodeView - 通用块级 NodeView
 * 
 * 使用 ReactNodeViewRenderer 将 BlockWrapper 应用到所有顶级节点
 */

import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { BlockWrapper } from '../components/BlockWrapper';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Editor } from '@tiptap/core';

// ============================================
// 类型定义
// ============================================

interface BlockNodeViewProps {
    node: ProseMirrorNode;
    editor: Editor;
    getPos: () => number;
    updateAttributes: (attrs: Record<string, any>) => void;
    deleteNode: () => void;
}

// ============================================
// BlockNodeView 组件
// ============================================

export const BlockNodeView: React.FC<BlockNodeViewProps> = ({
    node,
    editor,
    getPos,
    deleteNode,
}) => {
    const blockId = node.attrs.id || '';

    // 处理添加新块
    const handleAddBlock = (id: string, position: 'before' | 'after') => {
        const pos = getPos();
        const insertPos = position === 'before' ? pos : pos + node.nodeSize;

        editor
            .chain()
            .focus()
            .insertContentAt(insertPos, { type: 'paragraph' })
            .run();
    };

    // 处理打开菜单
    const handleOpenMenu = (id: string, event: React.MouseEvent) => {
        event.preventDefault();
        // 触发自定义事件，由父组件处理菜单显示
        const customEvent = new CustomEvent('block-menu-open', {
            detail: {
                blockId: id,
                x: event.clientX,
                y: event.clientY,
                pos: getPos(),
            },
        });
        document.dispatchEvent(customEvent);
    };

    // 处理拖拽开始
    const handleDragStart = (id: string, event: React.DragEvent) => {
        // 设置拖拽数据
        event.dataTransfer.setData('application/x-block-id', id);
        event.dataTransfer.setData('text/plain', id);

        // 设置拖拽效果
        const dragImage = document.createElement('div');
        dragImage.textContent = node.textContent?.slice(0, 50) || 'Block';
        dragImage.style.cssText = `
            padding: 8px 12px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            font-size: 13px;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        document.body.appendChild(dragImage);
        event.dataTransfer.setDragImage(dragImage, 10, 10);

        // 延迟移除拖拽图像
        setTimeout(() => document.body.removeChild(dragImage), 0);
    };

    return (
        <NodeViewWrapper className="block-node-view">
            <BlockWrapper
                blockId={blockId}
                onAddBlock={handleAddBlock}
                onOpenMenu={handleOpenMenu}
                onDragStart={handleDragStart}
            >
                <NodeViewContent />
            </BlockWrapper>
        </NodeViewWrapper>
    );
};

export default BlockNodeView;
