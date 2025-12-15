import React from 'react';
import { Menu, Wrench, Download, X } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export const MobileHeader: React.FC = () => {
    const {
        files,
        activeFileId,
        toggleSidebar,
        toggleToolbar,
        toolbarVisible,
        sourceContent,
    } = useEditorStore();

    const activeFile = files.find(f => f.id === activeFileId);

    const handleExport = () => {
        const blob = new Blob([sourceContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = activeFile?.name || 'document.adoc';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <header className="mobile-header h-12 border-b border-gray-200 flex items-center justify-between px-3 bg-white sticky top-0 z-30 md:hidden">
            {/* 左侧：菜单按钮 */}
            <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle sidebar"
            >
                <Menu size={22} className="text-gray-700" />
            </button>

            {/* 中间：应用标题/文件名 */}
            <div className="flex-1 text-center">
                <h1 className="text-sm font-semibold text-gray-800 truncate px-2">
                    {activeFile?.name?.replace('.adoc', '') || 'AsciiDoc'}
                </h1>
            </div>

            {/* 右侧：工具栏切换和导出按钮 */}
            <div className="flex items-center gap-1">
                <button
                    onClick={toggleToolbar}
                    className={`p-2 rounded-lg transition-colors ${toolbarVisible ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                    aria-label="Toggle toolbar"
                >
                    {toolbarVisible ? <X size={20} /> : <Wrench size={20} />}
                </button>
                <button
                    onClick={handleExport}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Export"
                >
                    <Download size={20} className="text-gray-700" />
                </button>
            </div>
        </header>
    );
};
