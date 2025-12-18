/**
 * useDragDrop - 块级拖拽逻辑 Hook
 * 
 * 实现 HTML5 Drag & Drop API，支持块级节点的拖拽排序
 * 使用 throttle 优化性能，避免拖拽过程中频繁重渲染
 */

import { useState, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/core';

// 节流函数
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let lastCall = 0;
    return ((...args: any[]) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args);
        }
    }) as T;
}

// 拖拽数据类型
const DRAG_DATA_TYPE = 'application/x-tiptap-block';

export interface DragDropState {
    isDragging: boolean;
    isDragOver: boolean;
    dropPosition: 'before' | 'after' | null;
}

export interface UseDragDropProps {
    editor: Editor | null;
    blockId: string;
    getPos: () => number;
    nodeSize: number;
}

export interface UseDragDropReturn {
    state: DragDropState;
    handleDragStart: (e: React.DragEvent) => void;
    handleDragEnd: (e: React.DragEvent) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    dragHandleProps: {
        draggable: true;
        onDragStart: (e: React.DragEvent) => void;
        onDragEnd: (e: React.DragEvent) => void;
    };
    dropZoneProps: {
        onDragOver: (e: React.DragEvent) => void;
        onDragLeave: (e: React.DragEvent) => void;
        onDrop: (e: React.DragEvent) => void;
    };
}

export function useDragDrop({
    editor,
    blockId,
    getPos,
    nodeSize,
}: UseDragDropProps): UseDragDropReturn {
    const [state, setState] = useState<DragDropState>({
        isDragging: false,
        isDragOver: false,
        dropPosition: null,
    });

    const elementRef = useRef<HTMLElement | null>(null);

    // 拖拽开始
    const handleDragStart = useCallback((e: React.DragEvent) => {
        console.log('[useDragDrop] handleDragStart called for block:', blockId);
        if (!editor) {
            console.log('[useDragDrop] No editor in handleDragStart');
            return;
        }

        const pos = getPos();
        const node = editor.state.doc.nodeAt(pos);
        if (!node) {
            console.log('[useDragDrop] No node found at pos:', pos);
            return;
        }

        // 设置拖拽数据
        e.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify({
            blockId,
            pos,
            nodeSize,
            nodeJSON: node.toJSON(),
        }));
        e.dataTransfer.effectAllowed = 'move';

        // 设置拖拽预览
        const target = e.currentTarget as HTMLElement;
        if (target) {
            e.dataTransfer.setDragImage(target, 20, 20);
        }

        setState(prev => ({ ...prev, isDragging: true }));

        // 添加全局拖拽状态类
        document.body.classList.add('is-dragging-block');
    }, [editor, blockId, getPos, nodeSize]);

    // 拖拽结束
    const handleDragEnd = useCallback((e: React.DragEvent) => {
        setState({
            isDragging: false,
            isDragOver: false,
            dropPosition: null,
        });

        // 移除全局拖拽状态类
        document.body.classList.remove('is-dragging-block');
    }, []);

    // 节流的状态更新函数
    const throttledUpdateDropPosition = useCallback(
        throttle((clientY: number, rect: DOMRect) => {
            const midY = rect.top + rect.height / 2;
            const dropPosition = clientY < midY ? 'before' : 'after';

            setState(prev => ({
                ...prev,
                isDragOver: true,
                dropPosition,
            }));
        }, 50),
        []
    );

    // 拖拽经过 - 必须立即 preventDefault 才能允许 drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        console.log('[useDragDrop] handleDragOver called on block:', blockId);

        // 计算放置位置 (使用节流优化状态更新)
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        throttledUpdateDropPosition(e.clientY, rect);
    }, [throttledUpdateDropPosition, blockId]);

    // 拖拽离开
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        // 检查是否真的离开了元素（而非进入子元素）
        const relatedTarget = e.relatedTarget as HTMLElement;
        const currentTarget = e.currentTarget as HTMLElement;

        if (!currentTarget.contains(relatedTarget)) {
            setState(prev => ({
                ...prev,
                isDragOver: false,
                dropPosition: null,
            }));
        }
    }, []);

    // 放置
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('[useDragDrop] handleDrop called');

        if (!editor) {
            console.log('[useDragDrop] No editor, aborting');
            return;
        }

        const dataStr = e.dataTransfer.getData(DRAG_DATA_TYPE);
        console.log('[useDragDrop] Data received:', dataStr ? 'has data' : 'NO DATA', 'type:', DRAG_DATA_TYPE);

        if (!dataStr) {
            console.log('[useDragDrop] No data string, aborting');
            return;
        }

        try {
            const dragData = JSON.parse(dataStr);
            console.log('[useDragDrop] Parsed drag data:', dragData);
            const { pos: sourcePos, nodeSize: sourceNodeSize, nodeJSON } = dragData;
            const targetPos = getPos();

            // 如果拖拽到自己，忽略
            if (sourcePos === targetPos) {
                setState({
                    isDragging: false,
                    isDragOver: false,
                    dropPosition: null,
                });
                return;
            }

            // 计算放置位置
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const insertBefore = e.clientY < midY;

            // 计算最终插入位置
            let insertPos: number;
            if (insertBefore) {
                insertPos = targetPos;
            } else {
                insertPos = targetPos + nodeSize;
            }

            // 执行移动操作
            // 注意：删除后位置会变化，需要根据相对位置调整
            editor.chain()
                .focus()
                .command(({ tr, dispatch }) => {
                    if (!dispatch) return false;

                    const node = tr.doc.nodeAt(sourcePos);
                    if (!node) return false;

                    // 如果源在目标之前，先删除源再插入
                    if (sourcePos < insertPos) {
                        // 先插入，再删除（删除后位置会前移）
                        tr.insert(insertPos, node);
                        tr.delete(sourcePos, sourcePos + sourceNodeSize);
                    } else {
                        // 先删除，再插入
                        tr.delete(sourcePos, sourcePos + sourceNodeSize);
                        tr.insert(insertPos, node);
                    }

                    return true;
                })
                .run();

        } catch (err) {
            console.error('[useDragDrop] Drop failed:', err);
        }

        setState({
            isDragging: false,
            isDragOver: false,
            dropPosition: null,
        });
    }, [editor, getPos, nodeSize]);

    return {
        state,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        dragHandleProps: {
            draggable: true,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
        },
        dropZoneProps: {
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
        },
    };
}

export default useDragDrop;
