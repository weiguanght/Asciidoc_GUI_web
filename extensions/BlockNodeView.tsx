/**
 * BlockNodeView - 通用块级 NodeView
 * 
 * 使用 ReactNodeViewRenderer 将 BlockWrapper 应用到所有顶级节点
 * 传递 editor、getPos、nodeSize 给 BlockWrapper 以支持拖拽
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

    return (
        <NodeViewWrapper className="block-node-view">
            <BlockWrapper
                blockId={blockId}
                onAddBlock={handleAddBlock}
                onOpenMenu={handleOpenMenu}
                editor={editor}
                getPos={getPos}
                nodeSize={node.nodeSize}
            >
                <NodeViewContent />
            </BlockWrapper>
        </NodeViewWrapper>
    );
};

export default BlockNodeView;
