import React from 'react';
import { FileText, Upload, Plus, Search, X } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { Button } from './ui/Button';

export const Sidebar: React.FC = () => {
  const {
    files,
    activeFileId,
    setActiveFile,
    createFile,
    importFile,
    sidebarVisible,
    closeSidebar
  } = useEditorStore();

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.adoc,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
            importFile(file.name, content);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden
          ${sidebarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={closeSidebar}
      />

      {/* 侧边栏 */}
      <aside
        className={`
          sidebar-container
          bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-50
          w-72 md:w-64
          fixed md:relative
          top-0 left-0 bottom-0
          transform transition-transform duration-300 ease-in-out
          ${sidebarVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* 移动端关闭按钮 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between md:justify-start gap-2">
          <div className="flex items-center gap-2 font-bold text-lg text-blue-600">
            <span className="bg-blue-600 text-white p-1 rounded text-xs font-black">AD</span>
            <span className="text-slate-800 tracking-tight">AsciiDoc</span>
          </div>
          <button
            onClick={closeSidebar}
            className="p-1.5 hover:bg-gray-100 rounded-lg md:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 px-2 mt-2 tracking-wider">Documents</div>
          <div className="space-y-0.5">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => setActiveFile(file.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors ${activeFileId === file.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <FileText size={16} className={activeFileId === file.id ? 'text-blue-500' : 'text-gray-400'} />
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50/50">
          <Button
            variant="secondary"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => createFile(`Untitled ${files.length + 1}`)}
          >
            <Plus size={14} /> New Document
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-xs text-gray-500"
            onClick={handleImport}
          >
            <Upload size={14} /> Import .adoc
          </Button>
        </div>
      </aside>
    </>
  );
};