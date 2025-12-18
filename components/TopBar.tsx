/**
 * TopBar 顶部导航栏组件
 * Notion 风格的精简顶栏，包含面包屑导航、状态指示器和导出菜单
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronRight,
    FileText,
    Download,
    FileDown,
    FileArchive,
    MoreHorizontal,
    Check,
    Loader2,
    Share2,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { exportToPdf } from '../lib/pdf-export';
import { exportAsZip } from '../lib/zip-export';
import { exportEditorToMarkdown } from '../lib/markdown-converter';
import { jsonToAdoc } from '../lib/asciidoc';

interface TopBarProps {
    editor: any;
}

export const TopBar: React.FC<TopBarProps> = ({ editor }) => {
    const {
        files,
        activeFileId,
        isSaving,
        lastSavedAt,
        darkMode,
        sourceContent,
        desktopSidebarVisible,
        toggleDesktopSidebar,
    } = useEditorStore();

    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // 获取当前文件
    const currentFile = files.find(f => f.id === activeFileId);

    // 构建面包屑路径
    const buildBreadcrumbs = () => {
        if (!currentFile) return [];

        const crumbs: { id: string; name: string }[] = [];
        let current = currentFile;

        // 向上遍历父节点
        while (current) {
            crumbs.unshift({ id: current.id, name: current.name });
            if (current.parentId) {
                const parent = files.find(f => f.id === current.parentId);
                if (parent) {
                    current = parent;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        return crumbs;
    };

    const breadcrumbs = buildBreadcrumbs();

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setExportMenuOpen(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setMoreMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 导出处理函数
    const handleExportPdf = async () => {
        setExportMenuOpen(false);
        if (editor) {
            await exportToPdf(sourceContent, currentFile?.name || 'document');
        }
    };

    const handleExportAdoc = () => {
        setExportMenuOpen(false);
        if (editor) {
            const adocContent = jsonToAdoc(editor.getJSON());
            const blob = new Blob([adocContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile?.name || 'document.adoc';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const handleExportMarkdown = () => {
        setExportMenuOpen(false);
        if (editor) {
            const filename = currentFile?.name?.replace(/\.adoc$/, '.md') || 'document.md';
            exportEditorToMarkdown(editor, filename);
        }
    };

    const handleExportZip = async () => {
        setExportMenuOpen(false);
        if (editor) {
            await exportAsZip(sourceContent, currentFile?.name || 'document');
        }
    };

    // 格式化保存时间
    const formatSaveTime = () => {
        if (!lastSavedAt) return null;
        const date = new Date(lastSavedAt);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            className={`topbar h-12 flex items-center justify-between px-4 border-b shrink-0 ${darkMode
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-gray-200'
                }`}
        >
            {/* 左侧：侧边栏开关 + 面包屑导航 */}
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                {/* 侧边栏开关按钮 */}
                <button
                    onClick={toggleDesktopSidebar}
                    className={`hidden md:flex p-1.5 rounded-md transition-colors ${darkMode
                        ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                    title={desktopSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
                >
                    {desktopSidebarVisible ? (
                        <PanelLeftClose size={18} />
                    ) : (
                        <PanelLeftOpen size={18} />
                    )}
                </button>

                {/* 面包屑导航 */}
                {breadcrumbs.length === 0 ? (
                    <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        No file selected
                    </span>
                ) : (
                    breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.id}>
                            {index > 0 && (
                                <ChevronRight
                                    size={14}
                                    className={`shrink-0 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}
                                />
                            )}
                            <span
                                className={`text-sm truncate max-w-[150px] ${index === breadcrumbs.length - 1
                                    ? darkMode
                                        ? 'text-slate-200 font-medium'
                                        : 'text-gray-900 font-medium'
                                    : darkMode
                                        ? 'text-slate-400 hover:text-slate-300'
                                        : 'text-gray-500 hover:text-gray-700'
                                    } ${index < breadcrumbs.length - 1 ? 'cursor-pointer' : ''}`}
                            >
                                {index === 0 && breadcrumbs.length > 1 ? (
                                    <FileText size={14} className="inline mr-1" />
                                ) : null}
                                {crumb.name}
                            </span>
                        </React.Fragment>
                    ))
                )}
            </div>

            {/* 右侧：状态和操作 */}
            <div className="flex items-center gap-2">
                {/* 保存状态 */}
                <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {isSaving ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : lastSavedAt ? (
                        <>
                            <Check size={12} className="text-green-500" />
                            <span>Saved {formatSaveTime()}</span>
                        </>
                    ) : null}
                </div>

                {/* 分隔线 */}
                <div className={`h-5 w-px ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />

                {/* 导出按钮 */}
                <div className="relative" ref={exportMenuRef}>
                    <button
                        onClick={() => setExportMenuOpen(!exportMenuOpen)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${darkMode
                            ? 'text-slate-300 hover:bg-slate-700'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <Share2 size={14} />
                        <span>Export</span>
                    </button>

                    {/* 导出下拉菜单 */}
                    {exportMenuOpen && (
                        <div
                            className={`absolute right-0 top-full mt-1 w-48 py-1 rounded-lg shadow-xl border z-50 ${darkMode
                                ? 'bg-slate-800 border-slate-700'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <button
                                onClick={handleExportPdf}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${darkMode
                                    ? 'text-slate-300 hover:bg-slate-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Download size={14} />
                                Export as PDF
                            </button>
                            <button
                                onClick={handleExportAdoc}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${darkMode
                                    ? 'text-slate-300 hover:bg-slate-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <FileDown size={14} />
                                Export as AsciiDoc
                            </button>
                            <button
                                onClick={handleExportMarkdown}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${darkMode
                                    ? 'text-slate-300 hover:bg-slate-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <FileDown size={14} />
                                Export as Markdown
                            </button>
                            <div className={`my-1 h-px ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                            <button
                                onClick={handleExportZip}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${darkMode
                                    ? 'text-slate-300 hover:bg-slate-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <FileArchive size={14} />
                                Export as ZIP
                            </button>
                        </div>
                    )}
                </div>

                {/* 更多菜单 */}
                <div className="relative" ref={moreMenuRef}>
                    <button
                        onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                        className={`p-1.5 rounded-md transition-colors ${darkMode
                            ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    {/* 更多下拉菜单 */}
                    {moreMenuOpen && (
                        <div
                            className={`absolute right-0 top-full mt-1 w-56 py-1 rounded-lg shadow-xl border z-50 ${darkMode
                                ? 'bg-slate-800 border-slate-700'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <div className={`px-3 py-2 text-xs font-medium ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                Page Settings
                            </div>
                            <button
                                onClick={() => {
                                    setMoreMenuOpen(false);
                                    // TODO: 插入 :toc: 属性
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${darkMode
                                    ? 'text-slate-300 hover:bg-slate-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span>Table of Contents</span>
                                <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                    :toc:
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    setMoreMenuOpen(false);
                                    // TODO: 插入 :numbered: 属性
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${darkMode
                                    ? 'text-slate-300 hover:bg-slate-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span>Numbered Sections</span>
                                <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                    :sectnums:
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
