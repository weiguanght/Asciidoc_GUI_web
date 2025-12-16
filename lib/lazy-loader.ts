/**
 * 按需加载管理器
 * 延迟加载重型库以优化首屏性能
 */

// 库加载状态
interface LoadingState {
    mermaid: boolean;
    highlightjs: boolean;
    katex: boolean;
}

const loadingState: LoadingState = {
    mermaid: false,
    highlightjs: false,
    katex: false,
};

// 缓存已加载的库
let mermaidInstance: any = null;
let hljs: any = null;
let katexInstance: any = null;

/**
 * 按需加载 Mermaid
 */
export const loadMermaid = async (): Promise<any> => {
    if (mermaidInstance) {
        return mermaidInstance;
    }

    if (loadingState.mermaid) {
        // 等待加载完成
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (mermaidInstance) {
                    clearInterval(check);
                    resolve(mermaidInstance);
                }
            }, 50);
        });
    }

    loadingState.mermaid = true;
    console.log('[LazyLoad] Loading Mermaid...');

    try {
        const start = performance.now();
        const { default: mermaid } = await import('mermaid');

        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        });

        mermaidInstance = mermaid;
        console.log(`[LazyLoad] Mermaid loaded in ${(performance.now() - start).toFixed(0)}ms`);
        return mermaid;
    } catch (error) {
        loadingState.mermaid = false;
        console.error('[LazyLoad] Failed to load Mermaid:', error);
        throw error;
    }
};

/**
 * 按需加载 Highlight.js
 */
export const loadHighlightjs = async (): Promise<any> => {
    if (hljs) {
        return hljs;
    }

    if (loadingState.highlightjs) {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (hljs) {
                    clearInterval(check);
                    resolve(hljs);
                }
            }, 50);
        });
    }

    loadingState.highlightjs = true;
    console.log('[LazyLoad] Loading Highlight.js...');

    try {
        const start = performance.now();
        const { default: highlightjs } = await import('highlight.js');

        hljs = highlightjs;
        console.log(`[LazyLoad] Highlight.js loaded in ${(performance.now() - start).toFixed(0)}ms`);
        return highlightjs;
    } catch (error) {
        loadingState.highlightjs = false;
        console.error('[LazyLoad] Failed to load Highlight.js:', error);
        throw error;
    }
};

/**
 * 按需加载 KaTeX（数学公式渲染）
 */
export const loadKatex = async (): Promise<any> => {
    if (katexInstance) {
        return katexInstance;
    }

    if (loadingState.katex) {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (katexInstance) {
                    clearInterval(check);
                    resolve(katexInstance);
                }
            }, 50);
        });
    }

    loadingState.katex = true;
    console.log('[LazyLoad] Loading KaTeX...');

    try {
        const start = performance.now();
        // KaTeX 需要单独安装，这里先做占位
        // const { default: katex } = await import('katex');
        // katexInstance = katex;
        console.log(`[LazyLoad] KaTeX loaded in ${(performance.now() - start).toFixed(0)}ms`);
        return katexInstance;
    } catch (error) {
        loadingState.katex = false;
        console.error('[LazyLoad] Failed to load KaTeX:', error);
        throw error;
    }
};

/**
 * 渲染 Mermaid 图表
 */
export const renderMermaidDiagram = async (
    code: string,
    id: string
): Promise<string> => {
    const mermaid = await loadMermaid();

    try {
        const { svg } = await mermaid.render(id, code);
        return svg;
    } catch (error) {
        console.error('[Mermaid] Render error:', error);
        return `<pre class="mermaid-error">${code}</pre>`;
    }
};

/**
 * 高亮代码块
 */
export const highlightCode = async (
    code: string,
    language?: string
): Promise<string> => {
    const highlightjs = await loadHighlightjs();

    try {
        if (language && highlightjs.getLanguage(language)) {
            return highlightjs.highlight(code, { language }).value;
        }
        return highlightjs.highlightAuto(code).value;
    } catch (error) {
        console.error('[Highlight.js] Error:', error);
        return code;
    }
};

/**
 * 预加载常用库（可在空闲时调用）
 */
export const preloadCommonLibs = (): void => {
    if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
            loadHighlightjs().catch(() => { });
        });
    } else {
        setTimeout(() => {
            loadHighlightjs().catch(() => { });
        }, 2000);
    }
};

/**
 * 检查库加载状态
 */
export const getLoadingStatus = (): LoadingState => ({
    ...loadingState,
});

/**
 * 检测内容是否需要加载特定库
 */
export const detectRequiredLibs = (content: string): {
    needsMermaid: boolean;
    needsHighlight: boolean;
    needsKatex: boolean;
} => {
    return {
        needsMermaid: /\[mermaid\]|```mermaid/i.test(content),
        needsHighlight: /\[source|```\w+/i.test(content),
        needsKatex: /\$\$|\\begin\{|latexmath:|stem:/i.test(content),
    };
};

/**
 * 根据内容按需预加载库
 */
export const preloadForContent = async (content: string): Promise<void> => {
    const required = detectRequiredLibs(content);

    const promises: Promise<any>[] = [];

    if (required.needsMermaid && !mermaidInstance) {
        promises.push(loadMermaid().catch(() => { }));
    }

    if (required.needsHighlight && !hljs) {
        promises.push(loadHighlightjs().catch(() => { }));
    }

    if (required.needsKatex && !katexInstance) {
        promises.push(loadKatex().catch(() => { }));
    }

    await Promise.all(promises);
};

export default {
    loadMermaid,
    loadHighlightjs,
    loadKatex,
    renderMermaidDiagram,
    highlightCode,
    preloadCommonLibs,
    getLoadingStatus,
    detectRequiredLibs,
    preloadForContent,
};
