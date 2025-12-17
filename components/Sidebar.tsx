import React, { useState, useMemo, useCallback } from 'react';
import { FileText, Upload, Plus, Search, X, Pencil, Trash2, Moon, Sun, MoreVertical, List, ChevronRight, Folder, FolderOpen, FolderPlus, Move, HardDrive, Save } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { Button } from './ui/Button';
import { FileItem } from '../types';
import { openLocalFile, saveLocalFile, saveLocalFileAs, isFileSystemAccessSupported } from '../lib/file-system-access';

// 大纲项接口
interface OutlineItem {
  id: string;
  level: number;
  title: string;
  lineNumber: number;
}

// 从 AsciiDoc 内容提取标题
const extractOutline = (content: string): OutlineItem[] => {
  const lines = content.split('\n');
  const outline: OutlineItem[] = [];

  lines.forEach((line, index) => {
    // 匹配 AsciiDoc 标题语法: = Title, == Title, === Title, etc.
    const match = line.match(/^(=+)\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      outline.push({
        id: `heading-${index}`,
        level,
        title,
        lineNumber: index + 1
      });
    }
  });

  return outline;
};

export const Sidebar: React.FC = () => {
  const {
    files,
    activeFileId,
    setActiveFile,
    createFile,
    createFolder,
    importFile,
    renameFile,
    deleteFile,
    moveItem,
    sidebarVisible,
    closeSidebar,
    desktopSidebarVisible,
    toggleDesktopSidebar,
    darkMode,
    toggleDarkMode,
    sourceContent,
    setHighlightLine
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<'files' | 'outline'>('files');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('expanded-folders') || '{}');
    } catch {
      return {};
    }
  });
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveDialogId, setMoveDialogId] = useState<string | null>(null);

  // 提取大纲
  const outlineItems = useMemo(() => extractOutline(sourceContent), [sourceContent]);

  // 构建树形结构
  const buildTree = useCallback((parentId: string | null): FileItem[] => {
    return files
      .filter(f => f.parentId === parentId)
      .sort((a, b) => {
        // 文件夹排在前面
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [files]);

  // 过滤文件（搜索时展平显示）
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return null; // 返回 null 表示使用树形结构
    return files.filter(f =>
      f.type === 'file' && f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  // 切换文件夹展开/折叠
  const toggleExpand = useCallback((id: string) => {
    setExpandedFolders(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('expanded-folders', JSON.stringify(next));
      return next;
    });
  }, []);

  // 创建文件夹
  const handleCreateFolder = useCallback(() => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderInput(false);
    }
  }, [newFolderName, createFolder]);

  // 跳转到大纲项
  const goToOutlineItem = useCallback((item: OutlineItem) => {
    setHighlightLine(item.lineNumber, 'source');
  }, [setHighlightLine]);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.adoc,.txt,.html,.htm';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          let content = event.target?.result as string;
          if (content) {
            // 如果是 HTML 文件，使用 htmlToAdoc 进行完整转换
            if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
              // 动态导入 paste-converter
              const { htmlToAdoc } = await import('../lib/paste-converter');
              content = htmlToAdoc(content);
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
          ${sidebarVisible ? 'translate-x-0' : '-translate-x-full'}
          ${!sidebarVisible && desktopSidebarVisible ? 'md:translate-x-0' : ''}
          ${!desktopSidebarVisible ? 'md:-translate-x-full md:absolute' : ''}
        `}
      >
        {/* 头部 */}
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-100'} flex items-center justify-between md:justify-start gap-2`}>
          <div className="flex items-center gap-2 font-bold text-lg text-blue-600">
            <span className="bg-blue-600 text-white p-1 rounded text-xs font-black">AD</span>
            <span className={darkMode ? 'text-slate-200' : 'text-slate-800'}>AsciiDoc</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDesktopSidebar}
              className={`p-1.5 rounded-lg hidden md:block ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              <X size={18} className={darkMode ? 'text-slate-400' : 'text-gray-500'} />
            </button>
            <button
              onClick={closeSidebar}
              className={`p-1.5 rounded-lg md:hidden ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              aria-label="Close sidebar"
            >
              <X size={20} className={darkMode ? 'text-slate-400' : 'text-gray-500'} />
            </button>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className={`flex border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${activeTab === 'files'
              ? darkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
              : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <FileText size={14} />
            Files
          </button>
          <button
            onClick={() => setActiveTab('outline')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${activeTab === 'outline'
              ? darkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
              : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <List size={14} />
            Outline
          </button>
        </div>

        {/* 搜索框 - 仅在 Files Tab 显示 */}
        {activeTab === 'files' && (
          <div className="p-3">
            <div className="relative">
              <Search size={14} className={`absolute left-2.5 top-2.5 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow ${darkMode
                  ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900'
                  } border`}
              />
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-2">
          {activeTab === 'files' ? (
            <>
              {/* 文件列表标题和新建文件夹 */}
              <div className={`flex items-center justify-between px-2 mt-2 mb-2`}>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Documents</span>
                <button
                  onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                  className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="New Folder"
                >
                  <FolderPlus size={14} />
                </button>
              </div>

              {/* 新建文件夹输入 */}
              {showNewFolderInput && (
                <div className="px-2 mb-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(''); }
                    }}
                    onBlur={handleCreateFolder}
                    placeholder="Folder name..."
                    className={`w-full px-2 py-1.5 text-sm rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-gray-300'
                      }`}
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-0.5">
                {/* 搜索结果（扁平显示）或树形结构 */}
                {(filteredFiles || buildTree(null)).map((item) => {
                  const isFolder = item.type === 'folder';
                  const isExpanded = expandedFolders[item.id];
                  const children = isFolder ? buildTree(item.id) : [];

                  return (
                    <React.Fragment key={item.id}>
                      <div
                        className={`group flex items-center gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors relative ${activeFileId === item.id && !isFolder
                          ? darkMode ? 'bg-blue-900/50 text-blue-300 font-medium' : 'bg-blue-50 text-blue-700 font-medium'
                          : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        onClick={() => {
                          if (isFolder) {
                            toggleExpand(item.id);
                          } else if (editingFileId !== item.id) {
                            setActiveFile(item.id);
                          }
                        }}
                      >
                        {/* 图标 */}
                        {isFolder ? (
                          isExpanded ? (
                            <FolderOpen size={16} className={darkMode ? 'text-amber-400' : 'text-amber-500'} />
                          ) : (
                            <Folder size={16} className={darkMode ? 'text-amber-400' : 'text-amber-500'} />
                          )
                        ) : (
                          <FileText size={16} className={activeFileId === item.id ? 'text-blue-500' : darkMode ? 'text-slate-500' : 'text-gray-400'} />
                        )}

                        {/* 名称 */}
                        {editingFileId === item.id ? (
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
                          <span className="truncate flex-1">{item.name}</span>
                        )}

                        {/* 操作菜单 */}
                        {editingFileId !== item.id && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === item.id ? null : item.id);
                              }}
                              className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'
                                }`}
                            >
                              <MoreVertical size={14} className={darkMode ? 'text-slate-400' : 'text-gray-500'} />
                            </button>

                            {menuOpenId === item.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                                <div className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-20 min-w-[120px] ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-gray-200'
                                  }`}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartRename(item);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'hover:bg-slate-600 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                                      }`}
                                  >
                                    <Pencil size={14} /> Rename
                                  </button>
                                  {(files.length > 1 || isFolder) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item.id);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-100'
                                        }`}
                                    >
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  )}
                                  {/* 移动选项 - 仅对文件显示 */}
                                  {item.type === 'file' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMoveDialogId(item.id);
                                        setMenuOpenId(null);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'hover:bg-slate-600 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                      <Move size={14} /> Move to...
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 文件夹子项 */}
                      {isFolder && isExpanded && children.length > 0 && (
                        <div className="ml-4 border-l border-gray-200 dark:border-slate-700">
                          {children.map((child) => (
                            <div
                              key={child.id}
                              className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${activeFileId === child.id
                                ? darkMode ? 'bg-blue-900/50 text-blue-300 font-medium' : 'bg-blue-50 text-blue-700 font-medium'
                                : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              onClick={() => child.type === 'file' && setActiveFile(child.id)}
                            >
                              <FileText size={14} className={activeFileId === child.id ? 'text-blue-500' : darkMode ? 'text-slate-500' : 'text-gray-400'} />
                              <span className="truncate flex-1 text-xs">{child.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* 大纲视图 */}
              <div className={`text-[10px] uppercase font-bold mb-2 px-2 mt-3 tracking-wider ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                Document Outline
              </div>
              {outlineItems.length === 0 ? (
                <div className={`text-sm px-3 py-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  No headings found in document.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {outlineItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => goToOutlineItem(item)}
                      className={`w-full flex items-center gap-1.5 py-2 rounded-md text-sm text-left transition-colors ${darkMode
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                    >
                      <ChevronRight size={12} className={darkMode ? 'text-slate-500' : 'text-gray-400'} />
                      <span className="truncate" title={item.title}>
                        {item.title}
                      </span>
                      <span className={`text-[10px] ml-auto mr-2 ${darkMode ? 'text-slate-600' : 'text-gray-300'}`}>
                        L{item.lineNumber}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
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

          {/* 本地文件操作 */}
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 text-xs ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-gray-500'}`}
            onClick={async () => {
              try {
                const result = await openLocalFile();
                if (result) {
                  importFile(result.name, result.content);
                }
              } catch (error) {
                console.error('Open file error:', error);
              }
            }}
          >
            <HardDrive size={14} /> Open Local File
          </Button>

          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 text-xs ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-gray-500'}`}
            onClick={async () => {
              const activeFile = files.find(f => f.id === activeFileId);
              if (activeFile) {
                try {
                  await saveLocalFileAs(activeFile.content, activeFile.name);
                } catch (error) {
                  console.error('Save file error:', error);
                }
              }
            }}
          >
            <Save size={14} /> Save to Local
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

      {/* 移动对话框 */}
      {moveDialogId && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setMoveDialogId(null)} />
          <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl p-6 z-[60] w-80 ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-900'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Move to Folder</h3>
              <button onClick={() => setMoveDialogId(null)} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {/* 根目录选项 */}
              <button
                onClick={() => {
                  moveItem(moveDialogId, null);
                  setMoveDialogId(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                  }`}
              >
                <Folder size={16} className={darkMode ? 'text-amber-400' : 'text-amber-500'} />
                <span>Root (No folder)</span>
              </button>

              {/* 文件夹列表 */}
              {files.filter(f => f.type === 'folder' && f.id !== moveDialogId).map(folder => (
                <button
                  key={folder.id}
                  onClick={() => {
                    moveItem(moveDialogId, folder.id);
                    setMoveDialogId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                    }`}
                >
                  <Folder size={16} className={darkMode ? 'text-amber-400' : 'text-amber-500'} />
                  <span>{folder.name}</span>
                </button>
              ))}

              {files.filter(f => f.type === 'folder').length === 0 && (
                <p className={`text-sm px-3 py-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  No folders found. Create a folder first.
                </p>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setMoveDialogId(null)}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};