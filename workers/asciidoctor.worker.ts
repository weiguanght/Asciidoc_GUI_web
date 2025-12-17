/**
 * Asciidoctor Web Worker
 * 在后台线程中执行 AsciiDoc 解析、语法检查和 HTML 渲染
 * 
 * 架构原则：
 * - Worker 仅作为只读观察者，不反向更新编辑器内容
 * - 使用 DTO 传输，避免循环引用
 */

import Asciidoctor from 'asciidoctor';
import type {
    Diagnostic,
    OutlineItem,
    LintResponse,
    RenderResponse,
    ErrorResponse,
    AstNodeDTO
} from '../types/lsp';

// 初始化 Asciidoctor 实例
const asciidoctor = Asciidoctor();

// ============================================
// DTO Mapper - 避免循环引用
// ============================================

/**
 * 将 Asciidoctor 日志消息映射为 Diagnostic DTO
 * Asciidoctor 仅提供行号，无列号
 */
function mapLogToDiagnostic(log: any): Diagnostic {
    const severityMap: Record<string, Diagnostic['severity']> = {
        'ERROR': 'error',
        'WARN': 'warning',
        'INFO': 'info',
        'DEBUG': 'info',
    };

    return {
        line: log.lineno || log.source_location?.lineno || 1,
        message: log.text || log.message || String(log),
        severity: severityMap[log.severity] || 'warning',
        source: 'asciidoctor',
    };
}

/**
 * 提取章节大纲 (DTO)
 * 仅提取必要字段，避免循环引用
 */
function extractOutline(doc: any): OutlineItem[] {
    const outline: OutlineItem[] = [];

    const extractSections = (parent: any) => {
        const blocks = parent.getBlocks?.() || [];
        for (const block of blocks) {
            if (block.getContext?.() === 'section') {
                const sourceLocation = block.getSourceLocation?.();
                outline.push({
                    level: block.getLevel?.() ?? 0,
                    title: block.getTitle?.() ?? '',
                    id: block.getId?.() ?? '',
                    line: sourceLocation?.lineno,
                });
                extractSections(block);
            }
        }
    };

    extractSections(doc);
    return outline;
}

/**
 * 将 AST 节点转换为轻量级 DTO
 * 避免循环引用和原型链问题
 */
function nodeToDTO(node: any): AstNodeDTO | null {
    if (!node) return null;

    const sourceLocation = node.getSourceLocation?.();

    return {
        type: node.getContext?.() || node.getNodeName?.() || 'unknown',
        lineno: sourceLocation?.lineno,
        text: node.getText?.()?.slice(0, 200), // 限制文本长度
        attrs: node.getAttributes?.() ? { ...node.getAttributes() } : undefined,
    };
}

// ============================================
// 消息处理器
// ============================================

self.onmessage = (event: MessageEvent) => {
    const { type, id, content, options } = event.data;

    switch (type) {
        // ----------------------------------------
        // Lint 请求 - 语法检查（仅返回 Diagnostics + Outline）
        // ----------------------------------------
        case 'lint':
            try {
                const startTime = performance.now();
                const diagnostics: Diagnostic[] = [];

                // 创建 MemoryLogger 捕获错误
                const memoryLogger = asciidoctor.MemoryLogger.create();
                asciidoctor.LoggerManager.setLogger(memoryLogger);

                // 解析文档
                const doc = asciidoctor.load(content, {
                    safe: 'safe',
                    sourcemap: true,
                });

                // 从 MemoryLogger 提取诊断信息
                const messages = memoryLogger.getMessages();
                for (const msg of messages) {
                    diagnostics.push(mapLogToDiagnostic(msg));
                }

                // 提取大纲
                const outline = extractOutline(doc);

                const duration = performance.now() - startTime;

                // 响应 - 注意：不返回 AST，Worker 仅为只读观察者
                const response: LintResponse = {
                    type: 'lint-result',
                    id,
                    diagnostics,
                    outline,
                    success: true,
                    duration,
                };

                self.postMessage(response);
            } catch (error) {
                const response: ErrorResponse = {
                    type: 'error',
                    id,
                    error: (error as Error).message,
                    success: false,
                };
                self.postMessage(response);
            }
            break;

        // ----------------------------------------
        // Render 请求 - HTML 渲染
        // ----------------------------------------
        case 'render':
            try {
                const startTime = performance.now();

                const renderOptions = {
                    standalone: false,
                    safe: 'safe',
                    sourcemap: true,
                    attributes: {
                        showtitle: true,
                        sectanchors: true,
                        icons: 'font',
                        'source-highlighter': 'highlight.js',
                        ...options?.attributes,
                    },
                    ...options,
                };

                const html = asciidoctor.convert(content, renderOptions) as string;
                const duration = performance.now() - startTime;

                const response: RenderResponse = {
                    type: 'render-result',
                    id,
                    html,
                    success: true,
                    duration,
                };

                self.postMessage(response);
            } catch (error) {
                const response: ErrorResponse = {
                    type: 'error',
                    id,
                    error: (error as Error).message,
                    success: false,
                };
                self.postMessage(response);
            }
            break;

        // ----------------------------------------
        // Parse 请求 - 兼容旧 API（大纲提取）
        // ----------------------------------------
        case 'parse':
            try {
                const doc = asciidoctor.load(content);
                const title = doc.getDocumentTitle();
                const attributes = doc.getAttributes();
                const sections = extractOutline(doc);

                self.postMessage({
                    type: 'parsed',
                    id,
                    title,
                    attributes,
                    sections,
                    success: true,
                });
            } catch (error) {
                self.postMessage({
                    type: 'error',
                    id,
                    error: (error as Error).message,
                    success: false,
                });
            }
            break;

        default:
            self.postMessage({
                type: 'error',
                id,
                error: `Unknown message type: ${type}`,
                success: false,
            });
    }
};

// 通知主线程 Worker 已就绪
self.postMessage({ type: 'ready' });
