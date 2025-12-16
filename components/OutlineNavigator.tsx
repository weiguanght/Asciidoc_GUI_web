/**
 * 大纲导航面板组件
 * 支持 Source 和 WYSIWYG 双视图同步导航
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Hash, Eye, Code2, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

// 大纲项目
interface OutlineItem {
    id: string;
    level: number;
    title: string;
    line: number;
    children: OutlineItem[];
}

// 从 AsciiDoc 内容提取大纲
const extractOutline = (content: string): OutlineItem[] => {
    const lines = content.split('\n');
    const items: OutlineItem[] = [];
    const stack: OutlineItem[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(=+)\s+(.+)$/);

        if (match) {
            const level = match[1].length;
            const title = match[2].trim();
            const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            const item: OutlineItem = {
                id: `heading-${i}`,
                level,
                title,
                line: i + 1,
                children: [],
            };

            // 构建树形结构
            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            if (stack.length === 0) {
                items.push(item);
            } else {
                stack[stack.length - 1].children.push(item);
            }

            stack.push(item);
        }
    }

    return items;
};

// 大纲项组件
interface OutlineItemComponentProps {
    item: OutlineItem;
    currentLine: number | null;
    onNavigate: (line: number) => void;
    darkMode: boolean;
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
}

const OutlineItemComponent: React.FC<OutlineItemComponentProps> = ({
    item,
    currentLine,
    onNavigate,
    darkMode,
    expandedIds,
    toggleExpand,
}) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const isActive = currentLine !== null && currentLine >= item.line &&
        (item.children.length === 0 || currentLine < (item.children[0]?.line || Infinity));

    return (
        <div>
            <button
                onClick={() => onNavigate(item.line)}
                className={`
          w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-sm transition-colors
          ${isActive
                        ? darkMode
                            ? 'bg-blue-900/40 text-blue-300'
                            : 'bg-blue-50 text-blue-700 font-medium'
                        : darkMode
                            ? 'text-slate-300 hover:bg-slate-700'
                            : 'text-gray-600 hover:bg-gray-100'
                    }
        `}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(item.id);
                        }}
                        className="p-0.5"
                    >
                        {isExpanded ? (
                            <ChevronDown size={12} className={darkMode ? 'text-slate-500' : 'text-gray-400'} />
                        ) : (
                            <ChevronRight size={12} className={darkMode ? 'text-slate-500' : 'text-gray-400'} />
                        )}
                    </button>
                )}
                {!hasChildren && <span className="w-4" />}

                <Hash size={12} className={isActive ? 'text-blue-400' : darkMode ? 'text-slate-500' : 'text-gray-400'} />

                <span className="truncate flex-1 text-left">{item.title}</span>

                <span className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-gray-300'}`}>
                    L{item.line}
                </span>
            </button>

            {hasChildren && isExpanded && (
                <div>
                    {item.children.map((child) => (
                        <OutlineItemComponent
                            key={child.id}
                            item={child}
                            currentLine={currentLine}
                            onNavigate={onNavigate}
                            darkMode={darkMode}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// 大纲导航面板属性
interface OutlineNavigatorProps {
    className?: string;
}

export const OutlineNavigator: React.FC<OutlineNavigatorProps> = ({ className = '' }) => {
    const { sourceContent, highlightLine, setHighlightLine, darkMode, viewMode } = useEditorStore();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [viewSource, setViewSource] = useState<'source' | 'preview'>('source');

    // 提取大纲
    const outline = useMemo(() => extractOutline(sourceContent), [sourceContent]);

    // 自动展开所有项
    useEffect(() => {
        const allIds = new Set<string>();
        const collectIds = (items: OutlineItem[]) => {
            items.forEach(item => {
                allIds.add(item.id);
                collectIds(item.children);
            });
        };
        collectIds(outline);
        setExpandedIds(allIds);
    }, [outline]);

    // 切换展开
    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // 导航到行
    const handleNavigate = useCallback((line: number) => {
        setHighlightLine(line, viewSource);
    }, [setHighlightLine, viewSource]);

    // 全部展开/折叠
    const expandAll = useCallback(() => {
        const allIds = new Set<string>();
        const collectIds = (items: OutlineItem[]) => {
            items.forEach(item => {
                allIds.add(item.id);
                collectIds(item.children);
            });
        };
        collectIds(outline);
        setExpandedIds(allIds);
    }, [outline]);

    const collapseAll = useCallback(() => {
        setExpandedIds(new Set());
    }, []);

    const currentLine = highlightLine?.line || null;

    return (
        <div className={`flex flex-col ${className}`}>
            {/* 头部 */}
            <div className={`
        flex items-center justify-between px-3 py-2 border-b
        ${darkMode ? 'border-slate-700' : 'border-gray-200'}
      `}>
                <div className="flex items-center gap-1.5">
                    <FileText size={14} className={darkMode ? 'text-slate-400' : 'text-gray-500'} />
                    <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        Outline
                    </span>
                    <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        ({outline.length})
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {/* 视图切换 */}
                    <div className={`
            flex rounded-md text-[10px] p-0.5
            ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}
          `}>
                        <button
                            onClick={() => setViewSource('source')}
                            className={`
                px-1.5 py-0.5 rounded transition-colors
                ${viewSource === 'source'
                                    ? darkMode ? 'bg-slate-600 text-slate-200' : 'bg-white text-gray-700 shadow-sm'
                                    : darkMode ? 'text-slate-400' : 'text-gray-500'
                                }
              `}
                            title="Navigate in Source"
                        >
                            <Code2 size={10} />
                        </button>
                        <button
                            onClick={() => setViewSource('preview')}
                            className={`
                px-1.5 py-0.5 rounded transition-colors
                ${viewSource === 'preview'
                                    ? darkMode ? 'bg-slate-600 text-slate-200' : 'bg-white text-gray-700 shadow-sm'
                                    : darkMode ? 'text-slate-400' : 'text-gray-500'
                                }
              `}
                            title="Navigate in Preview"
                        >
                            <Eye size={10} />
                        </button>
                    </div>

                    {/* 刷新 */}
                    <button
                        onClick={expandAll}
                        className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                        title="Expand All"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>

            {/* 大纲列表 */}
            <div className="flex-1 overflow-y-auto p-2">
                {outline.length === 0 ? (
                    <div className={`text-xs text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        No headings found
                    </div>
                ) : (
                    outline.map((item) => (
                        <OutlineItemComponent
                            key={item.id}
                            item={item}
                            currentLine={currentLine}
                            onNavigate={handleNavigate}
                            darkMode={darkMode}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default OutlineNavigator;
