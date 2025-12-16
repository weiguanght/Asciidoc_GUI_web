/**
 * AST 错误收集器
 * 收集 AST 转换过程中的错误和未知节点类型
 */

// 错误类型
export interface ASTError {
    timestamp: number;
    nodeType: string;
    message: string;
    context?: Record<string, any>;
}

// 遥测事件类型
export interface TelemetryEvent {
    type: 'unknown_node' | 'conversion_error' | 'validation_error';
    data: ASTError;
}

// 错误收集器
class ASTErrorCollector {
    private errors: ASTError[] = [];
    private maxErrors = 100;
    private listeners: ((event: TelemetryEvent) => void)[] = [];

    /**
     * 记录未知节点类型
     */
    recordUnknownNode(nodeType: string, context?: Record<string, any>): void {
        const error: ASTError = {
            timestamp: Date.now(),
            nodeType,
            message: `Unknown node type encountered: ${nodeType}`,
            context,
        };

        this.addError(error);
        this.emit({ type: 'unknown_node', data: error });

        // 开发环境警告
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[AST] Unknown node type: ${nodeType}`, context);
        }
    }

    /**
     * 记录转换错误
     */
    recordConversionError(nodeType: string, errorMessage: string, context?: Record<string, any>): void {
        const error: ASTError = {
            timestamp: Date.now(),
            nodeType,
            message: errorMessage,
            context,
        };

        this.addError(error);
        this.emit({ type: 'conversion_error', data: error });

        console.error(`[AST] Conversion error for ${nodeType}:`, errorMessage);
    }

    /**
     * 记录验证错误
     */
    recordValidationError(nodeType: string, message: string, context?: Record<string, any>): void {
        const error: ASTError = {
            timestamp: Date.now(),
            nodeType,
            message,
            context,
        };

        this.addError(error);
        this.emit({ type: 'validation_error', data: error });
    }

    /**
     * 添加错误到队列
     */
    private addError(error: ASTError): void {
        this.errors.push(error);

        // 限制错误数量
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // 持久化到 localStorage（用于调试）
        this.persistErrors();
    }

    /**
     * 持久化错误到 localStorage
     */
    private persistErrors(): void {
        try {
            const recent = this.errors.slice(-20);
            localStorage.setItem('ast-errors', JSON.stringify(recent));
        } catch (e) {
            // localStorage 可能已满或禁用
        }
    }

    /**
     * 注册监听器
     */
    subscribe(listener: (event: TelemetryEvent) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * 发送事件
     */
    private emit(event: TelemetryEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (e) {
                console.error('[AST ErrorCollector] Listener error:', e);
            }
        });
    }

    /**
     * 获取所有错误
     */
    getErrors(): ASTError[] {
        return [...this.errors];
    }

    /**
     * 获取错误统计
     */
    getStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        this.errors.forEach(error => {
            stats[error.nodeType] = (stats[error.nodeType] || 0) + 1;
        });
        return stats;
    }

    /**
     * 清除错误
     */
    clear(): void {
        this.errors = [];
        localStorage.removeItem('ast-errors');
    }

    /**
     * 加载持久化的错误
     */
    loadPersistedErrors(): void {
        try {
            const stored = localStorage.getItem('ast-errors');
            if (stored) {
                this.errors = JSON.parse(stored);
            }
        } catch (e) {
            // 忽略解析错误
        }
    }
}

// 单例实例
export const astErrorCollector = new ASTErrorCollector();

// 初始化时加载持久化的错误
if (typeof window !== 'undefined') {
    astErrorCollector.loadPersistedErrors();
}

export default astErrorCollector;
