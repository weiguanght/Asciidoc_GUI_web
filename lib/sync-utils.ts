/**
 * 同步工具函数
 * 实现编辑器和源码之间的位置同步和高亮
 */

/**
 * 高亮样式配置
 */
export const HIGHLIGHT_STYLES = {
    editor: {
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        outline: '2px solid rgba(59, 130, 246, 0.7)',
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(59, 130, 246, 0.1)',
        borderRadius: '4px',
        transition: 'all 0.3s ease',
    },
    source: {
        backgroundColor: 'rgba(250, 204, 21, 0.4)',
        borderLeft: '4px solid #facc15',
        boxShadow: '0 0 15px rgba(250, 204, 21, 0.3)',
    },
    duration: 2500, // 高亮持续时间 (毫秒)
};

/**
 * 从 HTML 元素获取对应的行号
 * @param element HTML 元素
 * @returns 行号或 null
 */
export const getLineFromElement = (element: HTMLElement): number | null => {
    // 向上查找带有 data-line 属性的元素
    let current: HTMLElement | null = element;
    while (current) {
        const line = current.getAttribute('data-line');
        if (line) {
            const parsed = parseInt(line, 10);
            if (!isNaN(parsed)) {
                return parsed;
            }
        }
        current = current.parentElement;
    }
    return null;
};

/**
 * 查找最近的带 data-line 属性的元素
 * 支持表格单元格、图片等嵌套元素
 * @param element 起始元素
 * @param container 容器元素
 * @returns 带 data-line 属性的元素或 null
 */
export const findNearestDataLineElement = (
    element: HTMLElement,
    container: HTMLElement
): HTMLElement | null => {
    // 向上查找带有 data-line 属性的元素
    let current: HTMLElement | null = element;
    while (current && current !== container) {
        if (current.hasAttribute('data-line')) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
};

/**
 * 高亮并滚动到目标元素
 * @param element 目标元素
 * @param container 滚动容器
 * @param duration 高亮持续时间
 */
export const highlightAndScrollToElement = (
    element: HTMLElement,
    container: HTMLElement,
    duration: number = HIGHLIGHT_STYLES.duration
): void => {
    // 先滚动到目标位置
    scrollToElement(element, container);

    // 延迟一点再高亮，确保滚动完成后用户能看到
    setTimeout(() => {
        highlightElement(element, duration);
    }, 150);
};

/**
 * 从行号查找对应的 HTML 元素
 * @param container 容器元素
 * @param line 行号
 * @returns HTML 元素或 null
 */
export const getElementFromLine = (container: HTMLElement, line: number): HTMLElement | null => {
    return container.querySelector(`[data-line="${line}"]`);
};

/**
 * 高亮元素
 * @param element 要高亮的元素
 * @param duration 高亮持续时间 (毫秒)
 */
export const highlightElement = (element: HTMLElement, duration: number = HIGHLIGHT_STYLES.duration): void => {
    const originalStyles = {
        backgroundColor: element.style.backgroundColor,
        outline: element.style.outline,
        boxShadow: element.style.boxShadow,
        borderRadius: element.style.borderRadius,
        transition: element.style.transition,
        animation: element.style.animation,
    };

    // 应用高亮样式
    element.style.backgroundColor = HIGHLIGHT_STYLES.editor.backgroundColor;
    element.style.outline = HIGHLIGHT_STYLES.editor.outline;
    element.style.boxShadow = HIGHLIGHT_STYLES.editor.boxShadow;
    element.style.borderRadius = HIGHLIGHT_STYLES.editor.borderRadius;
    element.style.transition = HIGHLIGHT_STYLES.editor.transition;
    element.style.animation = 'pulse 0.5s ease-in-out 2';

    // 延迟后恢复原样式
    setTimeout(() => {
        element.style.backgroundColor = originalStyles.backgroundColor;
        element.style.outline = originalStyles.outline;
        element.style.boxShadow = originalStyles.boxShadow;
        element.style.borderRadius = originalStyles.borderRadius;
        element.style.transition = originalStyles.transition;
        element.style.animation = originalStyles.animation;
    }, duration);
};

/**
 * 滚动到元素并居中显示
 * @param element 目标元素
 * @param container 滚动容器
 */
export const scrollToElement = (element: HTMLElement, container: HTMLElement): void => {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // 计算需要滚动的位置使元素垂直居中
    const scrollTop = element.offsetTop - container.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);

    container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
    });
};

/**
 * 在文本区域中滚动到指定行并高亮
 * @param textarea 文本区域元素
 * @param lineNumber 行号 (1-indexed)
 * @param highlightDuration 高亮持续时间
 */
export const scrollToLineInTextarea = (
    textarea: HTMLTextAreaElement,
    lineNumber: number,
    highlightDuration: number = HIGHLIGHT_STYLES.duration
): void => {
    const lines = textarea.value.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) return;

    // 计算行的起始和结束位置
    let startPos = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
        startPos += lines[i].length + 1; // +1 for newline
    }
    const endPos = startPos + lines[lineNumber - 1].length;

    // 设置选择范围
    textarea.focus();
    textarea.setSelectionRange(startPos, endPos);

    // 计算滚动位置
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const scrollTop = (lineNumber - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight / 2;

    textarea.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
    });
};

/**
 * 从光标位置计算行号
 * @param text 文本内容
 * @param cursorPosition 光标位置
 * @returns 行号 (1-indexed)
 */
export const getLineFromCursorPosition = (text: string, cursorPosition: number): number => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    return textBeforeCursor.split('\n').length;
};

/**
 * 从行号计算光标位置
 * @param text 文本内容
 * @param lineNumber 行号 (1-indexed)
 * @returns 该行起始的光标位置
 */
export const getCursorPositionFromLine = (text: string, lineNumber: number): number => {
    const lines = text.split('\n');
    let position = 0;
    for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
        position += lines[i].length + 1; // +1 for newline
    }
    return position;
};

/**
 * 创建高亮行覆盖层元素
 * @param lineNumber 行号
 * @param lineHeight 行高
 * @returns 覆盖层元素
 */
export const createLineHighlightOverlay = (lineNumber: number, lineHeight: number): HTMLDivElement => {
    const overlay = document.createElement('div');
    overlay.className = 'line-highlight-overlay';
    overlay.style.cssText = `
    position: absolute;
    left: 0;
    right: 0;
    top: ${(lineNumber - 1) * lineHeight}px;
    height: ${lineHeight}px;
    background-color: ${HIGHLIGHT_STYLES.source.backgroundColor};
    border-left: ${HIGHLIGHT_STYLES.source.borderLeft};
    pointer-events: none;
    transition: opacity 0.3s ease;
  `;
    return overlay;
};

/**
 * 计算元素的滚动百分比
 * @param element 可滚动元素
 * @returns 滚动百分比 (0-1)
 */
export const getScrollPercentage = (element: HTMLElement): number => {
    const scrollHeight = element.scrollHeight - element.clientHeight;
    if (scrollHeight <= 0) return 0;
    return element.scrollTop / scrollHeight;
};

/**
 * 根据滚动百分比设置元素的滚动位置
 * @param element 可滚动元素
 * @param percentage 滚动百分比 (0-1)
 * @param smooth 是否平滑滚动
 */
export const setScrollPercentage = (
    element: HTMLElement,
    percentage: number,
    smooth: boolean = false
): void => {
    const scrollHeight = element.scrollHeight - element.clientHeight;
    const targetScroll = Math.max(0, Math.min(scrollHeight, percentage * scrollHeight));

    if (smooth) {
        element.scrollTo({ top: targetScroll, behavior: 'smooth' });
    } else {
        element.scrollTop = targetScroll;
    }
};

/**
 * 创建防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间 (毫秒)
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

/**
 * 创建节流函数
 * @param fn 要节流的函数
 * @param limit 时间限制 (毫秒)
 * @returns 节流后的函数
 */
export const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    limit: number
): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limit);
        }
    };
};

/**
 * 同步滚动管理器
 * 用于管理两个可滚动区域之间的同步滚动
 */
export class ScrollSyncManager {
    private sourceElement: HTMLElement | null = null;
    private targetElement: HTMLElement | null = null;
    private isSyncing = false;
    private syncDelay = 16; // ~60fps

    constructor(
        source: HTMLElement | null = null,
        target: HTMLElement | null = null
    ) {
        this.sourceElement = source;
        this.targetElement = target;
    }

    /**
     * 设置源和目标元素
     */
    setElements(source: HTMLElement, target: HTMLElement): void {
        this.sourceElement = source;
        this.targetElement = target;
    }

    /**
     * 从源同步到目标
     */
    syncFromSource(): void {
        if (!this.sourceElement || !this.targetElement || this.isSyncing) return;

        this.isSyncing = true;
        const percentage = getScrollPercentage(this.sourceElement);
        setScrollPercentage(this.targetElement, percentage);

        setTimeout(() => { this.isSyncing = false; }, this.syncDelay);
    }

    /**
     * 从目标同步到源
     */
    syncFromTarget(): void {
        if (!this.sourceElement || !this.targetElement || this.isSyncing) return;

        this.isSyncing = true;
        const percentage = getScrollPercentage(this.targetElement);
        setScrollPercentage(this.sourceElement, percentage);

        setTimeout(() => { this.isSyncing = false; }, this.syncDelay);
    }

    /**
     * 检查当前是否在同步中
     */
    isCurrentlySyncing(): boolean {
        return this.isSyncing;
    }
}

// ============ CodeMirror 6 精确同步工具 ============

import { EditorView } from '@codemirror/view';

/**
 * 在 CodeMirror 中精确滚动到指定行
 * 使用 lineBlockAt 获取真实视觉位置，比行号估算更准确
 * @param view CodeMirror EditorView
 * @param line 行号 (1-indexed)
 * @param center 是否居中显示
 */
export const syncCodeMirrorToLine = (
    view: EditorView,
    line: number,
    center: boolean = true
): void => {
    const doc = view.state.doc;

    // 边界检查
    if (line < 1) line = 1;
    if (line > doc.lines) line = doc.lines;

    try {
        // 获取行的起始位置
        const lineInfo = doc.line(line);
        const pos = lineInfo.from;

        // 使用 scrollIntoView 精确滚动
        view.dispatch({
            effects: EditorView.scrollIntoView(pos, {
                y: center ? 'center' : 'start',
            }),
        });
    } catch (error) {
        console.error('[syncCodeMirrorToLine] Error:', error);
    }
};

/**
 * 从 CodeMirror 获取当前可见行范围
 * @param view CodeMirror EditorView
 * @returns 可见行范围 { from, to }
 */
export const getCodeMirrorVisibleLines = (view: EditorView): { from: number; to: number } => {
    const rect = view.dom.getBoundingClientRect();
    const topPos = view.lineBlockAtHeight(view.scrollDOM.scrollTop);
    const bottomPos = view.lineBlockAtHeight(view.scrollDOM.scrollTop + rect.height);

    const fromLine = view.state.doc.lineAt(topPos.from).number;
    const toLine = view.state.doc.lineAt(bottomPos.from).number;

    return { from: fromLine, to: toLine };
};

/**
 * 获取 CodeMirror 当前光标所在行
 * @param view CodeMirror EditorView
 */
export const getCodeMirrorCurrentLine = (view: EditorView): number => {
    const pos = view.state.selection.main.head;
    return view.state.doc.lineAt(pos).number;
};

/**
 * 在预览区域中查找最接近指定行号的 data-line 元素
 * @param container 预览容器
 * @param targetLine 目标行号
 */
export const findClosestDataLineElement = (
    container: HTMLElement,
    targetLine: number
): HTMLElement | null => {
    const elements = container.querySelectorAll('[data-line]');
    let closestElement: HTMLElement | null = null;
    let closestDistance = Infinity;

    elements.forEach((el) => {
        const lineAttr = el.getAttribute('data-line');
        if (lineAttr) {
            const line = parseInt(lineAttr, 10);
            const distance = Math.abs(line - targetLine);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestElement = el as HTMLElement;
            }
        }
    });

    return closestElement;
};

/**
 * 从预览同步到 CodeMirror (Preview -> Source)
 * @param previewContainer 预览容器
 * @param clickedElement 点击的元素
 * @param cmView CodeMirror EditorView
 */
export const syncPreviewToCodeMirror = (
    previewContainer: HTMLElement,
    clickedElement: HTMLElement,
    cmView: EditorView
): void => {
    // 查找带有 data-line 属性的最近元素
    const dataLineElement = findNearestDataLineElement(clickedElement, previewContainer);

    if (dataLineElement) {
        const lineAttr = dataLineElement.getAttribute('data-line');
        if (lineAttr) {
            const line = parseInt(lineAttr, 10);
            if (!isNaN(line)) {
                syncCodeMirrorToLine(cmView, line);
            }
        }
    }
};

/**
 * 从 CodeMirror 同步到预览 (Source -> Preview)
 * @param cmView CodeMirror EditorView
 * @param previewContainer 预览容器
 */
export const syncCodeMirrorToPreview = (
    cmView: EditorView,
    previewContainer: HTMLElement
): void => {
    const currentLine = getCodeMirrorCurrentLine(cmView);
    const targetElement = findClosestDataLineElement(previewContainer, currentLine);

    if (targetElement) {
        scrollToElement(targetElement, previewContainer);
    }
};

/**
 * 建立双向映射关系
 * 返回一个映射表：源码行号 -> 预览元素
 */
export const buildLineToElementMap = (
    previewContainer: HTMLElement
): Map<number, HTMLElement> => {
    const map = new Map<number, HTMLElement>();
    const elements = previewContainer.querySelectorAll('[data-line]');

    elements.forEach((el) => {
        const lineAttr = el.getAttribute('data-line');
        if (lineAttr) {
            const line = parseInt(lineAttr, 10);
            if (!isNaN(line)) {
                map.set(line, el as HTMLElement);
            }
        }
    });

    return map;
};

/**
 * 块级同步管理器
 * 管理 CodeMirror 和预览区域之间的精确同步
 */
export class BlockSyncManager {
    private cmView: EditorView | null = null;
    private previewContainer: HTMLElement | null = null;
    private lineMap: Map<number, HTMLElement> = new Map();
    private isSyncing = false;
    private syncDelay = 50;

    /**
     * 设置 CodeMirror 视图
     */
    setCodeMirrorView(view: EditorView): void {
        this.cmView = view;
    }

    /**
     * 设置预览容器并重建映射
     */
    setPreviewContainer(container: HTMLElement): void {
        this.previewContainer = container;
        this.rebuildMap();
    }

    /**
     * 重建行号到元素的映射
     */
    rebuildMap(): void {
        if (this.previewContainer) {
            this.lineMap = buildLineToElementMap(this.previewContainer);
        }
    }

    /**
     * 从 CodeMirror 同步到预览
     */
    syncToPreview(): void {
        if (!this.cmView || !this.previewContainer || this.isSyncing) return;

        this.isSyncing = true;
        syncCodeMirrorToPreview(this.cmView, this.previewContainer);

        setTimeout(() => { this.isSyncing = false; }, this.syncDelay);
    }

    /**
     * 从预览同步到 CodeMirror
     */
    syncToCodeMirror(clickedElement: HTMLElement): void {
        if (!this.cmView || !this.previewContainer || this.isSyncing) return;

        this.isSyncing = true;
        syncPreviewToCodeMirror(this.previewContainer, clickedElement, this.cmView);

        setTimeout(() => { this.isSyncing = false; }, this.syncDelay);
    }

    /**
     * 通过行号直接滚动
     */
    scrollToLine(line: number): void {
        if (this.cmView) {
            syncCodeMirrorToLine(this.cmView, line);
        }

        if (this.previewContainer) {
            const element = this.lineMap.get(line) || findClosestDataLineElement(this.previewContainer, line);
            if (element) {
                scrollToElement(element, this.previewContainer);
            }
        }
    }

    /**
     * 检查是否正在同步
     */
    isCurrentlySyncing(): boolean {
        return this.isSyncing;
    }
}

