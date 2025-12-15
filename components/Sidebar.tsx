import React, { useState } from 'react';
import { FileText, Upload, Plus, Search, X, Pencil, Trash2, Moon, Sun, MoreVertical } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { Button } from './ui/Button';

export const Sidebar: React.FC = () => {
  const {
    files,
    activeFileId,
    setActiveFile,
    createFile,
    importFile,
    renameFile,
    deleteFile,
    sidebarVisible,
    closeSidebar,
    darkMode,
    toggleDarkMode
  } = useEditorStore();

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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
  };

  const handleStartRename = (file: { id: string; name: string }) => {
    setEditingFileId(file.id);
    setEditingName(file.name.replace('.adoc', ''));
    setMenuOpenId(null);
  };

  const handleFinishRename = () => {
    if (editingFileId && editingName.trim()) {
      renameFile(editingFileId, editingName.trim());
    }
    setEditingFileId(null);
    setEditingName('');
  };

  const handleDelete = (id: string) => {
    if (files.length > 1) {
      deleteFile(id);
    }
    setMenuOpenId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setEditingFileId(null);
      setEditingName('');
    }
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
          ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}
          border-r flex flex-col h-full flex-shrink-0 z-50
          w-72 md:w-64
          fixed md:relative
          top-0 left-0 bottom-0
          transform transition-all duration-300 ease-in-out
          ${sidebarVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* 头部 */}
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-100'} flex items-center justify-between md:justify-start gap-2`}>
          <div className="flex items-center gap-2 font-bold text-lg text-blue-600">
            <span className="bg-blue-600 text-white p-1 rounded text-xs font-black">AD</span>
            <span className={darkMode ? 'text-slate-200' : 'text-slate-800'}>AsciiDoc</span>
          </div>
          <button
            onClick={closeSidebar}
            className={`p-1.5 rounded-lg md:hidden ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            aria-label="Close sidebar"
          >
            <X size={20} className={darkMode ? 'text-slate-400' : 'text-gray-500'} />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-3">
          <div className="relative">
            <Search size={14} className={`absolute left-2.5 top-2.5 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search files..."
              className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow ${darkMode
                ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500'
                : 'bg-gray-50 border-gray-200 text-gray-900'
                } border`}
            />
          </div>
        </div>

        {/* 文件列表 */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className={`text-[10px] uppercase font-bold mb-2 px-2 mt-2 tracking-wider ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Documents</div>
          <div className="space-y-0.5">
            {files.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors relative ${activeFileId === file.id
                  ? darkMode ? 'bg-blue-900/50 text-blue-300 font-medium' : 'bg-blue-50 text-blue-700 font-medium'
                  : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                onClick={() => editingFileId !== file.id && setActiveFile(file.id)}
              >
                <FileText size={16} className={activeFileId === file.id ? 'text-blue-500' : darkMode ? 'text-slate-500' : 'text-gray-400'} />

                {editingFileId === file.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={handleKeyDown}
                    className={`flex-1 text-sm px-1 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-slate-600 border-slate-500 text-slate-200' : 'bg-white border-gray-300'
                      }`}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate flex-1">{file.name}</span>
                )}

                {/* 操作菜单按钮 */}
                {editingFileId !== file.id && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === file.id ? null : file.id);
                      }}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'
                        }`}
                    >
                      <MoreVertical size={14} className={darkMode ? 'text-slate-400' : 'text-gray-500'} />
                    </button>

                    {/* 下拉菜单 */}
                    {menuOpenId === file.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                        <div className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-20 min-w-[120px] ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-gray-200'
                          }`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(file);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'hover:bg-slate-600 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                              }`}
                          >
                            <Pencil size={14} /> Rename
                          </button>
                          {files.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(file.id);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-100'
                                }`}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作区 */}
        <div className={`p-4 border-t space-y-2 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
          {/* 深色模式切换 */}
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode
              ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          <Button
            variant="secondary"
            className={`w-full justify-start gap-2 text-xs ${darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-slate-600' : ''}`}
            onClick={() => createFile(`Untitled ${files.length + 1}`)}
          >
            <Plus size={14} /> New Document
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 text-xs ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-gray-500'}`}
            onClick={handleImport}
          >
            <Upload size={14} /> Import .adoc .html
          </Button>
        </div>
      </aside>
    </>
  );
};