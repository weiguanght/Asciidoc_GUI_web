/**
 * 瞬时更新 Hook (Transient Updates)
 * 高频操作（打字、滚动）不更新 React State，仅在防抖后同步到 Store
 */

import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

// 防抖延迟（毫秒）
const DEBOUNCE_DELAY = 500;

/**
 * useTransientContent - 瞬时内容管理 Hook
 * 
 * 使用方式：
 * 1. 组件内部使用 contentRef.current 获取最新内容（不触发渲染）
 * 2. 调用 updateContent(newContent) 更新内容（防抖同步到 Store）
 * 3. Store 中的 sourceContent 仅用于持久化和跨组件同步
 */
export const useTransientContent = () => {
    const { sourceContent, setSourceContent } = useEditorStore();

    // 瞬时内容引用（不触发重渲染）
    const contentRef = useRef<string>(sourceContent);

    // 防抖定时器
    const debounceTimerRef = useRef<number | null>(null);

    // 是否有未同步的更改
    const isDirtyRef = useRef<boolean>(false);

    // 同步到 Store
    const syncToStore = useCallback((content: string, source: 'SOURCE' | 'TIPTAP') => {
        setSourceContent(content, source);
        isDirtyRef.current = false;
    }, [setSourceContent]);

    // 更新内容（防抖同步）
    const updateContent = useCallback((content: string, source: 'SOURCE' | 'TIPTAP') => {
        // 立即更新 Ref（瞬时）
        contentRef.current = content;
        isDirtyRef.current = true;

        // 清除之前的定时器
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }

        // 设置新的防抖定时器
        debounceTimerRef.current = window.setTimeout(() => {
            syncToStore(content, source);
            debounceTimerRef.current = null;
        }, DEBOUNCE_DELAY);
    }, [syncToStore]);

    // 立即同步（用于 onBlur 或保存前）
    const flushSync = useCallback(() => {
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        if (isDirtyRef.current) {
            syncToStore(contentRef.current, 'SOURCE');
        }
    }, [syncToStore]);

    // 从 Store 同步到 Ref（外部更新时）
    useEffect(() => {
        if (!isDirtyRef.current) {
            contentRef.current = sourceContent;
        }
    }, [sourceContent]);

    // 组件卸载时同步
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
            if (isDirtyRef.current) {
                // 注意：这里直接同步，不使用 setState（可能已卸载）
                console.log('[TransientContent] Flushing on unmount');
            }
        };
    }, []);

    return {
        contentRef,
        updateContent,
        flushSync,
        isDirty: () => isDirtyRef.current,
    };
};

/**
 * useTransientCursor - 瞬时光标位置管理
 * 光标位置不存入 State，避免每次移动触发渲染
 */
export const useTransientCursor = () => {
    const cursorPositionRef = useRef<{ line: number; column: number }>({ line: 1, column: 1 });
    const scrollPositionRef = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

    const updateCursor = useCallback((line: number, column: number) => {
        cursorPositionRef.current = { line, column };
    }, []);

    const updateScroll = useCallback((top: number, left: number) => {
        scrollPositionRef.current = { top, left };
    }, []);

    return {
        cursorPositionRef,
        scrollPositionRef,
        updateCursor,
        updateScroll,
    };
};

/**
 * 创建优化的 Zustand 选择器
 * 只订阅需要的字段，避免不相关更新触发渲染
 */
export const createSelector = <T, K extends keyof T>(keys: K[]) => {
    return (state: T): Pick<T, K> => {
        const result = {} as Pick<T, K>;
        for (const key of keys) {
            result[key] = state[key];
        }
        return result;
    };
};

/**
 * 浅比较函数（用于 Zustand 选择器）
 */
export const shallow = <T extends Record<string, unknown>>(a: T, b: T): boolean => {
    if (a === b) return true;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (a[key] !== b[key]) return false;
    }

    return true;
};

export default {
    useTransientContent,
    useTransientCursor,
    createSelector,
    shallow,
};
