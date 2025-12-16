/**
 * Tiptap Include Node Extension
 * 支持 AsciiDoc include:: 指令的可视化显示
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React, { useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { FileText, ChevronDown, ChevronRight, ExternalLink, AlertCircle } from 'lucide-react';

// Include 组件属性
interface IncludeComponentProps {
    node: {
        attrs: {
            path: string;
            levelOffset?: number;
            lines?: string;
            tag?: string;
            content?: string;
        };
    };
    updateAttributes: (attrs: Record<string, unknown>) => void;
    deleteNode: () => void;
    selected: boolean;
}

// Include 组件
const IncludeComponent: React.FC<IncludeComponentProps> = ({ node, selected, deleteNode }) => {
    const [expanded, setExpanded] = useState(false);
    const { path, levelOffset, lines, tag, content } = node.attrs;

    // 解析文件名
    const fileName = path.split('/').pop() || path;

    // 构建显示的属性标签
    const attributes: string[] = [];
    if (levelOffset !== undefined && levelOffset !== 0) {
        attributes.push(`leveloffset=${levelOffset > 0 ? '+' : ''}${levelOffset}`);
    }
    if (lines) {
        attributes.push(`lines=${lines}`);
    }
    if (tag) {
        attributes.push(`tag=${tag}`);
    }

    const hasContent = content && content.trim().length > 0;

    return (
        <NodeViewWrapper className= "include-wrapper my-2" >
        <div className={
            `
        rounded-lg border
        ${selected
                ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900'
                : 'border-gray-200 dark:border-gray-700'
            }
        bg-gray-50 dark:bg-gray-800/50
        transition-all duration-200
      `}>
        {/* 头部 */ }
        < div
    className = "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-t-lg"
    onClick = {() => hasContent && setExpanded(!expanded)}
contentEditable = { false}
    >
    {/* 展开/折叠图标 */ }
{
    hasContent ? (
        expanded ? (
            <ChevronDown size= { 16} className = "text-gray-400 flex-shrink-0" />
            ) : (
        <ChevronRight size= { 16} className = "text-gray-400 flex-shrink-0" />
            )
          ) : (
        <AlertCircle size= { 16} className = "text-yellow-500 flex-shrink-0" title = "Content not loaded" />
          )
}

{/* 文件图标 */ }
<FileText size={ 16 } className = "text-purple-500 flex-shrink-0" />

    {/* 文件路径 */ }
    < span className = "font-mono text-sm text-gray-700 dark:text-gray-300 truncate" >
        include:: { path }
</span>

{/* 属性标签 */ }
{
    attributes.length > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono" >
            [{ attributes.join(', ') }]
            </span>
          )
}

{/* 外部链接图标 */ }
<button
            className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
onClick = {(e) => {
    e.stopPropagation();
    // 这里可以添加打开文件的逻辑
    console.log('Open file:', path);
}}
title = "Open file"
    >
    <ExternalLink size={ 14 } className = "text-gray-400" />
        </button>
        </div>

{/* 预览内容 */ }
{
    expanded && hasContent && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700" >
            <pre className="font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-48" >
                { content }
                </pre>
                </div>
        )
}

{/* 底部提示 */ }
{
    !hasContent && (
        <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700" >
            Click to load referenced content
                </div>
        )
}
</div>
    </NodeViewWrapper>
  );
};

// Tiptap Node 定义
export const IncludeNode = Node.create({
    name: 'include',

    group: 'block',

    atom: true, // 不可编辑的原子节点

    addAttributes() {
        return {
            path: {
                default: '',
                parseHTML: element => element.getAttribute('data-path') || '',
                renderHTML: attributes => ({
                    'data-path': attributes.path,
                }),
            },
            levelOffset: {
                default: 0,
                parseHTML: element => parseInt(element.getAttribute('data-leveloffset') || '0'),
                renderHTML: attributes => ({
                    'data-leveloffset': attributes.levelOffset,
                }),
            },
            lines: {
                default: '',
                parseHTML: element => element.getAttribute('data-lines') || '',
                renderHTML: attributes => ({
                    'data-lines': attributes.lines,
                }),
            },
            tag: {
                default: '',
                parseHTML: element => element.getAttribute('data-tag') || '',
                renderHTML: attributes => ({
                    'data-tag': attributes.tag,
                }),
            },
            content: {
                default: '',
                parseHTML: element => element.getAttribute('data-content') || '',
                renderHTML: attributes => ({
                    'data-content': attributes.content,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-include]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-include': true })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(IncludeComponent);
    },

    addCommands() {
        return {
            setInclude: (path: string, options?: { levelOffset?: number; lines?: string; tag?: string }) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        path,
                        levelOffset: options?.levelOffset || 0,
                        lines: options?.lines || '',
                        tag: options?.tag || '',
                        content: '',
                    },
                });
            },
        };
    },
});

/**
 * 从 AsciiDoc 源码解析 include 指令
 * @param line AsciiDoc 行
 * @returns 解析后的 include 信息，或 null
 */
export const parseIncludeDirective = (line: string): {
    path: string;
    levelOffset?: number;
    lines?: string;
    tag?: string;
} | null => {
    const match = line.match(/^include::([^\[]+)\[(.*)\]$/);
    if (!match) return null;

    const path = match[1].trim();
    const attrsStr = match[2];

    const result: { path: string; levelOffset?: number; lines?: string; tag?: string } = { path };

    // 解析属性
    if (attrsStr) {
        const levelOffsetMatch = attrsStr.match(/leveloffset=([+-]?\d+)/);
        if (levelOffsetMatch) {
            result.levelOffset = parseInt(levelOffsetMatch[1]);
        }

        const linesMatch = attrsStr.match(/lines=([\d;,-]+)/);
        if (linesMatch) {
            result.lines = linesMatch[1];
        }

        const tagMatch = attrsStr.match(/tag=(\w+)/);
        if (tagMatch) {
            result.tag = tagMatch[1];
        }
    }

    return result;
};

export default IncludeNode;
