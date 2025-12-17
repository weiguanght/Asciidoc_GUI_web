/**
 * LSP 类型定义
 * 用于 Worker 与主线程之间的类型安全通信
 */

// ============================================
// 诊断信息 (Diagnostic)
// ============================================

/**
 * 诊断严重程度
 * - error: 语法错误，阻断导出
 * - warning: 警告，不阻断
 * - info: 信息提示
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * 诊断信息
 * 注意：Asciidoctor 仅提供行号，不提供列号
 */
export interface Diagnostic {
    /** 行号 (1-indexed) */
    line: number;
    /** 错误/警告消息 */
    message: string;
    /** 严重程度 */
    severity: DiagnosticSeverity;
    /** 来源 (如 'asciidoctor') */
    source?: string;
}

// ============================================
// 大纲信息 (Outline)
// ============================================

/**
 * 章节大纲项
 */
export interface OutlineItem {
    /** 章节级别 (0-5) */
    level: number;
    /** 章节标题 */
    title: string;
    /** 章节 ID (用于锚点) */
    id: string;
    /** 对应的行号 */
    line?: number;
}

// ============================================
// Worker 通信协议
// ============================================

/**
 * Worker 请求类型
 */
export type WorkerRequestType = 'lint' | 'render';

/**
 * Lint 请求 - 发送给 Worker 进行语法检查
 */
export interface LintRequest {
    type: 'lint';
    id: string;
    content: string;
}

/**
 * Render 请求 - 发送给 Worker 进行 HTML 渲染
 */
export interface RenderRequest {
    type: 'render';
    id: string;
    content: string;
    options?: RenderOptions;
}

export interface RenderOptions {
    attributes?: Record<string, string>;
}

/**
 * Lint 响应 - Worker 返回诊断和大纲
 * 注意：不返回 AST，Worker 仅作为只读观察者
 */
export interface LintResponse {
    type: 'lint-result';
    id: string;
    diagnostics: Diagnostic[];
    outline: OutlineItem[];
    success: boolean;
    /** 解析耗时 (ms) */
    duration?: number;
}

/**
 * Render 响应 - Worker 返回 HTML
 */
export interface RenderResponse {
    type: 'render-result';
    id: string;
    html: string;
    success: boolean;
    duration?: number;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
    type: 'error';
    id: string;
    error: string;
    success: false;
}

/**
 * Worker 就绪消息
 */
export interface ReadyMessage {
    type: 'ready';
}

/**
 * 所有 Worker 响应类型
 */
export type WorkerResponse =
    | LintResponse
    | RenderResponse
    | ErrorResponse
    | ReadyMessage;

/**
 * 所有 Worker 请求类型
 */
export type WorkerRequest = LintRequest | RenderRequest;

// ============================================
// Source Map (位置映射)
// ============================================

/**
 * Source Map - BlockID 与 AsciiDoc 行号的映射
 * 在序列化阶段生成，用于将 Worker 返回的行号映射回编辑器块
 * 
 * 使用 BlockID 而非位置偏移量，因为：
 * 1. BlockID 在编辑过程中保持稳定
 * 2. 不受文档结构变化影响
 * 3. 支持精确的双向同步
 */
export interface SourceMap {
    /** BlockID → AsciiDoc 行号 */
    blockIdToLine: Map<string, number>;
    /** AsciiDoc 行号 → BlockID */
    lineToBlockId: Map<number, string>;
    /** 兼容旧版：AsciiDoc 行号 → ProseMirror 位置 (deprecated) */
    lineToPos?: Map<number, number>;
    /** 兼容旧版：ProseMirror 位置 → AsciiDoc 行号 (deprecated) */
    posToLine?: Map<number, number>;
}

// ============================================
// DTO (数据传输对象)
// ============================================

/**
 * 轻量级 AST 节点 DTO
 * 用于避免循环引用，仅提取必要字段
 */
export interface AstNodeDTO {
    /** 节点类型 (paragraph, section, listing 等) */
    type: string;
    /** 行号 */
    lineno?: number;
    /** 文本内容 */
    text?: string;
    /** 属性 */
    attrs?: Record<string, unknown>;
    /** 子节点 */
    children?: AstNodeDTO[];
}
