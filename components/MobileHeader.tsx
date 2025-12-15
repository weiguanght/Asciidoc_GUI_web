import React, { useState } from 'react';
import { Menu, PencilRuler, X, Braces, SquarePen, MoreVertical, Upload, Download, FileText, FileCode } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { ViewMode } from '../types';
import { adocToHtml } from '../lib/asciidoc';

export const MobileHeader: React.FC = () => {
    const {
        files,
        activeFileId,
        toggleSidebar,
        toggleToolbar,
        toolbarVisible,
        sourceContent,
        viewMode,
        toggleViewMode,
        importFile,
        darkMode,
    } = useEditorStore();

    const [menuOpen, setMenuOpen] = useState(false);

    const activeFile = files.find(f => f.id === activeFileId);

    const handleExportAdoc = () => {
        const blob = new Blob([sourceContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = activeFile?.name || 'document.adoc';
        link.click();
        URL.revokeObjectURL(url);
        setMenuOpen(false);
    };

    const handleExportHtml = () => {
        const html = adocToHtml(sourceContent);
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeFile?.name?.replace('.adoc', '') || 'Document'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; margin-left: 0; color: #666; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = (activeFile?.name?.replace('.adoc', '') || 'document') + '.html';
        link.click();
        URL.revokeObjectURL(url);
        setMenuOpen(false);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.adoc,.txt,.html,.htm';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    let content = event.target?.result as string;
                    if (content) {
                        // 如果是 HTML 文件，提取纯文本
                        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(content, 'text/html');
                            content = doc.body.textContent || content;
                        }
                        const fileName = file.name.replace(/\.(html|htm)$/, '.adoc');
                        importFile(fileName, content);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
        setMenuOpen(false);
    };

    return (
        <header className={`mobile-header h-12 border-b flex items-center justify-between px-3 sticky top-0 z-30 md:hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
            {/* 左侧：菜单按钮 */}
            <button
                onClick={toggleSidebar}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                aria-label="Toggle sidebar"
            >
                <Menu size={22} className={darkMode ? 'text-slate-300' : 'text-gray-700'} />
            </button>

            {/* 中间：应用标题/文件名 */}
            <div className="flex-1 text-center">
                <h1 className={`text-sm font-semibold truncate px-2 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                    {activeFile?.name?.replace('.adoc', '') || 'AsciiDoc'}
                </h1>
            </div>

            {/* 右侧：视图切换、工具栏、更多菜单 */}
            <div className="flex items-center gap-0.5">
                {/* Split 视图切换 */}
                <button
                    onClick={toggleViewMode}
                    className={`p-2 rounded-lg transition-colors ${viewMode === ViewMode.SPLIT
                            ? 'bg-blue-100 text-blue-600'
                            : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                    aria-label="Toggle split view"
                    title={viewMode === ViewMode.SPLIT ? 'Editor Only' : 'Split View'}
                >
                    {viewMode === ViewMode.SPLIT ? (
                        <SquarePen size={20} />
                    ) : (
                        <Braces size={20} />
                    )}
                </button>

                {/* 工具栏切换 */}
                <button
                    onClick={toggleToolbar}
                    className={`p-2 rounded-lg transition-colors ${toolbarVisible
                            ? 'bg-blue-100 text-blue-600'
                            : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                    aria-label="Toggle toolbar"
                >
                    {toolbarVisible ? <X size={20} /> : <PencilRuler size={20} />}
                </button>

                {/* 三点菜单 */}
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`p-2 rounded-lg transition-colors ${menuOpen
                                ? 'bg-blue-100 text-blue-600'
                                : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'
                            }`}
                        aria-label="More options"
                    >
                        <MoreVertical size={20} />
                    </button>

                    {/* 下拉菜单 */}
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                            <div className={`absolute right-0 top-full mt-2 py-2 rounded-xl shadow-xl z-50 min-w-[180px] backdrop-blur-sm ${darkMode
                                    ? 'bg-slate-800/95 border border-slate-700'
                                    : 'bg-white/95 border border-gray-200'
                                }`}>
                                <button
                                    onClick={handleImport}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    <Upload size={18} className="text-blue-500" />
                                    Import File
                                </button>
                                <div className={`my-1 h-px ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                                <button
                                    onClick={handleExportAdoc}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    <FileText size={18} className="text-green-500" />
                                    Export as .adoc
                                </button>
                                <button
                                    onClick={handleExportHtml}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    <FileCode size={18} className="text-orange-500" />
                                    Export as .html
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};
