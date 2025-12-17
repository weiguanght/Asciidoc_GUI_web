/**
 * LintingExtension - 行级语法错误显示
 * 
 * 功能：
 * - 监听 LanguageClient 的诊断更新
 * - 使用 Source Map 将行号映射到 PM 位置
 * - 使用 ProseMirror Decorations 显示行级高亮
 * 
 * 设计原则：
 * - 行级精度（Asciidoctor 仅提供行号）
 * - 不干扰编辑流程
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Diagnostic, SourceMap } from '../types/lsp';

// ============================================
// Plugin Key
// ============================================

export const lintingPluginKey = new PluginKey('linting');

// ============================================
// 类型定义
// ============================================

export interface LintingOptions {
    /** 是否启用 Linting */
    enabled: boolean;
}

interface LintingPluginState {
    decorations: DecorationSet;
    diagnostics: Diagnostic[];
    sourceMap: SourceMap | null;
}

// ============================================
// Decoration 创建
// ============================================

/**
 * 根据诊断信息和 Source Map 创建 Decorations
 * 使用行级高亮而非字符级波浪线
 */
function createDecorations(
    doc: any,
    diagnostics: Diagnostic[],
    sourceMap: SourceMap | null
): DecorationSet {
    if (!diagnostics.length) {
        return DecorationSet.empty;
    }

    const decorations: Decoration[] = [];

    for (const diagnostic of diagnostics) {
        let from: number | null = null;
        let to: number | null = null;

        // 尝试使用 Source Map 获取精确位置
        if (sourceMap && sourceMap.lineToPos.has(diagnostic.line)) {
            const pos = sourceMap.lineToPos.get(diagnostic.line)!;
            // 找到该位置所在的节点范围
            try {
                const $pos = doc.resolve(Math.min(pos, doc.content.size));
                from = $pos.before($pos.depth);
                to = $pos.after($pos.depth);
            } catch (e) {
                // 位置无效，使用回退方案
            }
        }

        // 回退方案：基于行号估算位置
        if (from === null) {
            const result = findLinePosition(doc, diagnostic.line);
            if (result) {
                from = result.from;
                to = result.to;
            }
        }

        if (from !== null && to !== null) {
            const severityClass = `lint-${diagnostic.severity}`;

            decorations.push(
                Decoration.node(from, to, {
                    class: `lint-line ${severityClass}`,
                    'data-lint-message': diagnostic.message,
                    'data-lint-line': String(diagnostic.line),
                })
            );
        }
    }

    return DecorationSet.create(doc, decorations);
}

/**
 * 回退方案：通过遍历文档估算行位置
 */
function findLinePosition(
    doc: any,
    targetLine: number
): { from: number; to: number } | null {
    let currentLine = 1;
    let result: { from: number; to: number } | null = null;

    doc.descendants((node: any, pos: number) => {
        if (result) return false; // 已找到，停止遍历

        if (node.isBlock) {
            if (currentLine === targetLine) {
                result = { from: pos, to: pos + node.nodeSize };
                return false;
            }
            currentLine++;
        }
        return true;
    });

    return result;
}

// ============================================
// LintingExtension
// ============================================

export const LintingExtension = Extension.create<LintingOptions>({
    name: 'linting',

    addOptions() {
        return {
            enabled: true,
        };
    },

    addProseMirrorPlugins() {
        const extension = this;

        return [
            new Plugin({
                key: lintingPluginKey,

                state: {
                    init(): LintingPluginState {
                        return {
                            decorations: DecorationSet.empty,
                            diagnostics: [],
                            sourceMap: null,
                        };
                    },

                    apply(tr, pluginState, oldState, newState): LintingPluginState {
                        // 检查是否有诊断更新
                        const meta = tr.getMeta(lintingPluginKey);

                        if (meta?.diagnostics !== undefined) {
                            const diagnostics = meta.diagnostics as Diagnostic[];
                            const sourceMap = meta.sourceMap as SourceMap | null;

                            return {
                                diagnostics,
                                sourceMap,
                                decorations: createDecorations(newState.doc, diagnostics, sourceMap),
                            };
                        }

                        // 如果文档改变，重新映射 decorations
                        if (tr.docChanged && pluginState.decorations !== DecorationSet.empty) {
                            return {
                                ...pluginState,
                                decorations: pluginState.decorations.map(tr.mapping, tr.doc),
                            };
                        }

                        return pluginState;
                    },
                },

                props: {
                    decorations(state) {
                        if (!extension.options.enabled) {
                            return DecorationSet.empty;
                        }
                        return lintingPluginKey.getState(state)?.decorations || DecorationSet.empty;
                    },
                },
            }),
        ];
    },
});

// ============================================
// Helper 函数
// ============================================

/**
 * 更新诊断信息
 * 在 LanguageClient 收到结果后调用
 */
export function updateDiagnostics(
    view: any,
    diagnostics: Diagnostic[],
    sourceMap: SourceMap | null
): void {
    const tr = view.state.tr.setMeta(lintingPluginKey, {
        diagnostics,
        sourceMap,
    });
    view.dispatch(tr);
}

/**
 * 清除所有诊断
 */
export function clearDiagnostics(view: any): void {
    const tr = view.state.tr.setMeta(lintingPluginKey, {
        diagnostics: [],
        sourceMap: null,
    });
    view.dispatch(tr);
}

export default LintingExtension;
