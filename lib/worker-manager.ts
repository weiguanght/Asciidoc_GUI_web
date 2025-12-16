/**
 * Asciidoctor Worker 管理器
 * 提供与 Web Worker 交互的 Promise API
 */

// Worker 消息类型
interface WorkerMessage {
    type: 'ready' | 'result' | 'parsed' | 'error';
    id?: string;
    html?: string;
    duration?: number;
    title?: string;
    attributes?: Record<string, string>;
    sections?: Array<{ level: number; title: string; id: string }>;
    error?: string;
    success?: boolean;
}

// 渲染选项
export interface RenderOptions {
    attributes?: Record<string, string>;
    standalone?: boolean;
    safe?: string;
}

// 回调存储
type Callback = (message: WorkerMessage) => void;
const pendingCallbacks = new Map<string, Callback>();

// Worker 实例
let worker: Worker | null = null;
let isReady = false;
let readyCallbacks: (() => void)[] = [];

// 消息 ID 计数器
let messageId = 0;

/**
 * 初始化 Worker
 */
export const initWorker = (): Promise<void> => {
    return new Promise((resolve) => {
        if (worker && isReady) {
            resolve();
            return;
        }

        if (worker) {
            readyCallbacks.push(resolve);
            return;
        }

        // 创建 Worker
        worker = new Worker(
            new URL('../workers/asciidoctor.worker.ts', import.meta.url),
            { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const message = event.data;

            if (message.type === 'ready') {
                isReady = true;
                readyCallbacks.forEach((cb) => cb());
                readyCallbacks = [];
                resolve();
                return;
            }

            // 处理带 ID 的消息
            if (message.id) {
                const callback = pendingCallbacks.get(message.id);
                if (callback) {
                    callback(message);
                    pendingCallbacks.delete(message.id);
                }
            }
        };

        worker.onerror = (error) => {
            console.error('[AsciidoctorWorker] Error:', error);
        };
    });
};

/**
 * 发送消息到 Worker
 */
const sendMessage = <T extends WorkerMessage>(
    type: string,
    content: string,
    options?: RenderOptions
): Promise<T> => {
    return new Promise((resolve, reject) => {
        if (!worker) {
            reject(new Error('Worker not initialized'));
            return;
        }

        const id = `msg-${++messageId}`;

        pendingCallbacks.set(id, (message) => {
            if (message.success) {
                resolve(message as T);
            } else {
                reject(new Error(message.error));
            }
        });

        worker.postMessage({ type, id, content, options });
    });
};

/**
 * 在 Worker 中渲染 AsciiDoc
 */
export const renderInWorker = async (
    content: string,
    options?: RenderOptions
): Promise<{ html: string; duration: number }> => {
    await initWorker();
    const result = await sendMessage<WorkerMessage>('render', content, options);
    return {
        html: result.html || '',
        duration: result.duration || 0,
    };
};

/**
 * 在 Worker 中解析 AsciiDoc（获取结构信息）
 */
export const parseInWorker = async (
    content: string
): Promise<{
    title: string;
    attributes: Record<string, string>;
    sections: Array<{ level: number; title: string; id: string }>;
}> => {
    await initWorker();
    const result = await sendMessage<WorkerMessage>('parse', content);
    return {
        title: result.title || '',
        attributes: result.attributes || {},
        sections: result.sections || [],
    };
};

/**
 * 终止 Worker
 */
export const terminateWorker = (): void => {
    if (worker) {
        worker.terminate();
        worker = null;
        isReady = false;
        pendingCallbacks.clear();
    }
};

/**
 * 带防抖的渲染函数
 */
let debounceTimer: number | null = null;
let lastRenderPromise: Promise<{ html: string; duration: number }> | null = null;

export const renderDebounced = (
    content: string,
    options?: RenderOptions,
    delay: number = 150
): Promise<{ html: string; duration: number }> => {
    return new Promise((resolve, reject) => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = window.setTimeout(async () => {
            try {
                lastRenderPromise = renderInWorker(content, options);
                const result = await lastRenderPromise;
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }, delay);
    });
};

export default {
    initWorker,
    renderInWorker,
    parseInWorker,
    terminateWorker,
    renderDebounced,
};
