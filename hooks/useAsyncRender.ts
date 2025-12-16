/**
 * useAsyncRender - 异步渲染 Hook
 * 使用 Web Worker 在后台渲染 AsciiDoc，避免阻塞主线程
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { renderInWorker, initWorker, terminateWorker } from '../lib/worker-manager';
import { adocToHtml } from '../lib/asciidoctor-renderer';

// 渲染状态
interface RenderState {
    html: string;
    isLoading: boolean;
    error: string | null;
    renderTime: number;
}

// 配置
interface AsyncRenderOptions {
    debounceMs?: number;
    useWorker?: boolean;
    fallbackOnError?: boolean;
}

const DEFAULT_OPTIONS: AsyncRenderOptions = {
    debounceMs: 150,
    useWorker: true,
    fallbackOnError: true,
};

/**
 * useAsyncRender - 异步渲染 AsciiDoc
 * 
 * @param content AsciiDoc 源码
 * @param options 配置选项
 * @returns 渲染状态（html, isLoading, error, renderTime）
 */
export const useAsyncRender = (
    content: string,
    options: AsyncRenderOptions = {}
): RenderState => {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const [state, setState] = useState<RenderState>({
        html: '',
        isLoading: false,
        error: null,
        renderTime: 0,
    });

    const debounceTimerRef = useRef<number | null>(null);
    const lastContentRef = useRef<string>('');
    const isMountedRef = useRef<boolean>(true);

    // 渲染函数
    const render = useCallback(async (adoc: string) => {
        if (!isMountedRef.current) return;

        const startTime = performance.now();
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            let html: string;

            if (opts.useWorker) {
                // 使用 Worker 渲染
                const result = await renderInWorker(adoc);
                html = result.html;
            } else {
                // 主线程渲染
                html = adocToHtml(adoc);
            }

            if (!isMountedRef.current) return;

            const renderTime = performance.now() - startTime;
            setState({
                html,
                isLoading: false,
                error: null,
                renderTime,
            });
        } catch (error) {
            console.error('[AsyncRender] Error:', error);

            if (!isMountedRef.current) return;

            // 如果 Worker 失败，尝试主线程回退
            if (opts.useWorker && opts.fallbackOnError) {
                try {
                    const html = adocToHtml(adoc);
                    const renderTime = performance.now() - startTime;
                    setState({
                        html,
                        isLoading: false,
                        error: null,
                        renderTime,
                    });
                    return;
                } catch (fallbackError) {
                    console.error('[AsyncRender] Fallback error:', fallbackError);
                }
            }

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: (error as Error).message,
            }));
        }
    }, [opts.useWorker, opts.fallbackOnError]);

    // 防抖渲染
    useEffect(() => {
        // 跳过空内容
        if (!content && !lastContentRef.current) {
            return;
        }

        // 相同内容不重复渲染
        if (content === lastContentRef.current) {
            return;
        }

        lastContentRef.current = content;

        // 清除之前的定时器
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }

        // 设置防抖
        debounceTimerRef.current = window.setTimeout(() => {
            render(content);
        }, opts.debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, opts.debounceMs, render]);

    // 初始化 Worker
    useEffect(() => {
        if (opts.useWorker) {
            initWorker().catch(console.error);
        }

        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, [opts.useWorker]);

    return state;
};

/**
 * useWorkerStatus - 获取 Worker 状态
 */
export const useWorkerStatus = () => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        initWorker()
            .then(() => setIsReady(true))
            .catch(() => setIsReady(false));
    }, []);

    return { isReady };
};

export default useAsyncRender;
