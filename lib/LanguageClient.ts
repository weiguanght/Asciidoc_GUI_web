/**
 * LanguageClient - Worker 通信封装
 * 
 * 架构原则：
 * - 强类型的 Worker 通信
 * - Debounce 机制 (500ms-1000ms)
 * - Worker 仅作为只读观察者
 */

import type {
    Diagnostic,
    OutlineItem,
    LintResponse,
    RenderResponse,
    WorkerResponse,
} from '../types/lsp';

// ============================================
// 类型定义
// ============================================

type LintCallback = (diagnostics: Diagnostic[], outline: OutlineItem[]) => void;
type Callback = (response: WorkerResponse) => void;

interface PendingRequest {
    resolve: (response: any) => void;
    reject: (error: Error) => void;
}

// ============================================
// LanguageClient 类
// ============================================

export class LanguageClient {
    private worker: Worker | null = null;
    private isReady = false;
    private readyCallbacks: (() => void)[] = [];
    private pendingRequests = new Map<string, PendingRequest>();
    private messageId = 0;

    // Debounce 状态
    private lintDebounceTimer: number | null = null;
    private lintDebounceMs = 800; // 默认 800ms

    // 订阅者
    private diagnosticsListeners: LintCallback[] = [];

    // 最新的诊断结果（用于保存校验）
    private currentDiagnostics: Diagnostic[] = [];
    private currentOutline: OutlineItem[] = [];

    constructor() {
        this.initWorker();
    }

    // ----------------------------------------
    // 初始化
    // ----------------------------------------

    private initWorker(): void {
        if (this.worker) return;

        this.worker = new Worker(
            new URL('../workers/asciidoctor.worker.ts', import.meta.url),
            { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const message = event.data;

            if (message.type === 'ready') {
                this.isReady = true;
                this.readyCallbacks.forEach(cb => cb());
                this.readyCallbacks = [];
                return;
            }

            // 处理 lint-result - 通知订阅者
            if (message.type === 'lint-result') {
                this.currentDiagnostics = message.diagnostics;
                this.currentOutline = message.outline;
                this.notifyDiagnosticsListeners(message.diagnostics, message.outline);
            }

            // 处理带 ID 的响应
            if ('id' in message && message.id) {
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    if (message.type === 'error') {
                        pending.reject(new Error(message.error));
                    } else {
                        pending.resolve(message);
                    }
                    this.pendingRequests.delete(message.id);
                }
            }
        };

        this.worker.onerror = (error) => {
            console.error('[LanguageClient] Worker error:', error);
        };
    }

    private async waitForReady(): Promise<void> {
        if (this.isReady) return;
        return new Promise(resolve => {
            this.readyCallbacks.push(resolve);
        });
    }

    // ----------------------------------------
    // 公共 API
    // ----------------------------------------

    /**
     * 发送 Lint 请求（带 Debounce）
     * Worker 仅返回 Diagnostics + Outline，不返回 AST
     */
    lintDebounced(content: string): void {
        if (this.lintDebounceTimer !== null) {
            clearTimeout(this.lintDebounceTimer);
        }

        this.lintDebounceTimer = window.setTimeout(() => {
            this.lintDebounceTimer = null;
            this.lint(content).catch(console.error);
        }, this.lintDebounceMs);
    }

    /**
     * 发送 Lint 请求（立即执行）
     */
    async lint(content: string): Promise<LintResponse> {
        await this.waitForReady();
        return this.sendRequest<LintResponse>('lint', content);
    }

    /**
     * 发送 Render 请求
     */
    async render(content: string, options?: Record<string, any>): Promise<RenderResponse> {
        await this.waitForReady();
        return this.sendRequest<RenderResponse>('render', content, options);
    }

    /**
     * 订阅诊断更新
     */
    onDiagnostics(callback: LintCallback): () => void {
        this.diagnosticsListeners.push(callback);
        return () => {
            const index = this.diagnosticsListeners.indexOf(callback);
            if (index > -1) {
                this.diagnosticsListeners.splice(index, 1);
            }
        };
    }

    /**
     * 获取当前诊断结果（用于保存校验）
     */
    getCurrentDiagnostics(): Diagnostic[] {
        return this.currentDiagnostics;
    }

    /**
     * 获取当前大纲
     */
    getCurrentOutline(): OutlineItem[] {
        return this.currentOutline;
    }

    /**
     * 检查是否有错误（用于阻断导出）
     */
    hasErrors(): boolean {
        return this.currentDiagnostics.some(d => d.severity === 'error');
    }

    /**
     * 设置 Debounce 时间
     */
    setDebounceMs(ms: number): void {
        this.lintDebounceMs = Math.max(100, Math.min(ms, 2000));
    }

    /**
     * 销毁
     */
    dispose(): void {
        if (this.lintDebounceTimer !== null) {
            clearTimeout(this.lintDebounceTimer);
        }
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isReady = false;
        this.pendingRequests.clear();
        this.diagnosticsListeners = [];
    }

    // ----------------------------------------
    // 私有方法
    // ----------------------------------------

    private sendRequest<T extends WorkerResponse>(
        type: string,
        content: string,
        options?: Record<string, any>
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const id = `msg-${++this.messageId}`;
            this.pendingRequests.set(id, { resolve, reject });
            this.worker.postMessage({ type, id, content, options });
        });
    }

    private notifyDiagnosticsListeners(diagnostics: Diagnostic[], outline: OutlineItem[]): void {
        for (const listener of this.diagnosticsListeners) {
            try {
                listener(diagnostics, outline);
            } catch (e) {
                console.error('[LanguageClient] Listener error:', e);
            }
        }
    }
}

// ============================================
// 单例导出
// ============================================

let languageClientInstance: LanguageClient | null = null;

/**
 * 获取 LanguageClient 单例
 */
export function getLanguageClient(): LanguageClient {
    if (!languageClientInstance) {
        languageClientInstance = new LanguageClient();
    }
    return languageClientInstance;
}

/**
 * 销毁 LanguageClient 单例
 */
export function disposeLanguageClient(): void {
    if (languageClientInstance) {
        languageClientInstance.dispose();
        languageClientInstance = null;
    }
}

export default LanguageClient;
