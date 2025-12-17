/**
 * 保存校验模块
 * 
 * 校验策略：
 * - Auto-save (IndexedDB): 不阻断 - 本地优先
 * - 导出 / 文件系统写入: 有 Error 时阻断
 */

import type { Diagnostic } from '../../types/lsp';
import { getLanguageClient } from '../LanguageClient';

// ============================================
// 类型定义
// ============================================

export interface ValidationResult {
    /** 是否通过校验 */
    valid: boolean;
    /** 错误列表 */
    errors: Diagnostic[];
    /** 警告列表 */
    warnings: Diagnostic[];
}

/**
 * 保存校验错误
 */
export class SaveValidationError extends Error {
    public readonly diagnostics: Diagnostic[];
    public readonly errors: Diagnostic[];
    public readonly warnings: Diagnostic[];

    constructor(message: string, diagnostics: Diagnostic[]) {
        super(message);
        this.name = 'SaveValidationError';
        this.diagnostics = diagnostics;
        this.errors = diagnostics.filter(d => d.severity === 'error');
        this.warnings = diagnostics.filter(d => d.severity === 'warning');
    }
}

// ============================================
// 校验函数
// ============================================

/**
 * 检查当前文档是否可以安全保存/导出
 * 
 * @returns ValidationResult
 */
export function validateForExport(): ValidationResult {
    const client = getLanguageClient();
    const diagnostics = client.getCurrentDiagnostics();

    const errors = diagnostics.filter(d => d.severity === 'error');
    const warnings = diagnostics.filter(d => d.severity === 'warning');

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * 阻断式校验 - 有错误时抛出异常
 * 
 * @throws SaveValidationError 如果存在语法错误
 */
export function assertValidForExport(): void {
    const result = validateForExport();

    if (!result.valid) {
        throw new SaveValidationError(
            `文档包含 ${result.errors.length} 个语法错误，请修复后再导出`,
            result.errors
        );
    }
}

/**
 * 检查是否有语法错误（快速检查）
 */
export function hasErrors(): boolean {
    const client = getLanguageClient();
    return client.hasErrors();
}

/**
 * 获取当前诊断信息
 */
export function getCurrentDiagnostics(): Diagnostic[] {
    const client = getLanguageClient();
    return client.getCurrentDiagnostics();
}

/**
 * 格式化诊断信息用于显示
 */
export function formatDiagnostics(diagnostics: Diagnostic[]): string {
    if (diagnostics.length === 0) {
        return '无错误';
    }

    return diagnostics
        .map((d, i) => `${i + 1}. 第 ${d.line} 行: ${d.message}`)
        .join('\n');
}

export default {
    validateForExport,
    assertValidForExport,
    hasErrors,
    getCurrentDiagnostics,
    formatDiagnostics,
    SaveValidationError,
};
