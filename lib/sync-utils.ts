/**
 * 同步工具函数
 * 实现编辑器和源码之间的位置同步和高亮
 */

/**
 * 高亮样式配置
 */
export const HIGHLIGHT_STYLES = {
    editor: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        outline: '2px solid rgba(59, 130, 246, 0.5)',
        transition: 'all 0.3s ease',
    },
    source: {
        backgroundColor: 'rgba(250, 204, 21, 0.3)',
        borderLeft: '3px solid #facc15',
    },
    duration: 2000, // 高亮持续时间 (毫秒)
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
            return parseInt(line, 10);
        }
        current = current.parentElement;
    }
    return null;
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
        transition: element.style.transition,
    };

    // 应用高亮样式
    Object.assign(element.style, HIGHLIGHT_STYLES.editor);

    // 延迟后恢复原样式
    setTimeout(() => {
        element.style.backgroundColor = originalStyles.backgroundColor;
        element.style.outline = originalStyles.outline;
        element.style.transition = originalStyles.transition;
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
