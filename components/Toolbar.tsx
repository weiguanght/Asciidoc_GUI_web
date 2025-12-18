import React, { useState, useCallback, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Quote, Download, Upload, Image as ImageIcon, Table as TableIcon,
  Underline, Strikethrough, Palette, Highlighter, Link as LinkIcon,
  Undo, Redo, Minus, X, Combine, SplitSquareHorizontal,
  Plus, Trash2, RowsIcon, ColumnsIcon, ChevronDown, Search
} from 'lucide-react';
import { Button } from './ui/Button';
import { useEditorStore } from '../store/useEditorStore';
import { ViewMode } from '../types';
import { adocToHtml } from '../lib/asciidoc';
import { exportAsZip } from '../lib/zip-export';
import { exportToPdf } from '../lib/pdf-export';
import { useTranslation } from '../hooks/useTranslation';

interface ToolbarProps {
  editor: Editor | null;
}

// Link Dialog Component
const LinkDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, text: string) => void;
  initialUrl?: string;
  initialText?: string;
}> = ({ isOpen, onClose, onSubmit, initialUrl = '', initialText = '' }) => {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      onSubmit(url, text);
      setUrl('');
      setText('');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Insert Link</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text (optional)</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Link text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Insert
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

// Image Dialog Component
const ImageDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, alt: string) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedImage(dataUrl);
        setUploadedFileName(file.name);
        if (!alt) {
          setAlt(file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'url' && url) {
      onSubmit(url, alt);
      resetForm();
    } else if (activeTab === 'upload' && uploadedImage) {
      onSubmit(uploadedImage, alt);
      resetForm();
    }
  };

  const resetForm = () => {
    setUrl('');
    setAlt('');
    setUploadedImage(null);
    setUploadedFileName('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={handleClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-[420px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Insert Image</h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'url'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            From URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'upload'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Upload Local
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {activeTab === 'url' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
                >
                  {uploadedImage ? (
                    <div className="space-y-2">
                      <img
                        src={uploadedImage}
                        alt="Preview"
                        className="max-h-32 mx-auto rounded"
                      />
                      <p className="text-sm text-gray-600">{uploadedFileName}</p>
                      <p className="text-xs text-blue-600">Click to choose another</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload size={32} className="mx-auto text-gray-400" />
                      <p className="text-sm text-gray-600">Click to select image</p>
                      <p className="text-xs text-gray-400">PNG, JPG, GIF, WebP</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text (optional)</label>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Image description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(activeTab === 'url' && !url) || (activeTab === 'upload' && !uploadedImage)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const {
    toggleViewMode, viewMode, sourceContent, importFile, toolbarVisible, darkMode,
    files, activeFileId, openSearchDialog,
    desktopSidebarVisible, toggleDesktopSidebar, editorWidth, setEditorWidth
  } = useEditorStore();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [widthMenuOpen, setWidthMenuOpen] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId);
  const { t } = useTranslation();

  // 全局快捷键：Ctrl/Cmd + F 打开搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        openSearchDialog();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearchDialog]);

  if (!editor) return null;

  const handleExportAdoc = () => {
    const fileName = activeFile?.name || 'document.adoc';
    const blob = new Blob([sourceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const handleExportZip = async () => {
    const baseName = activeFile?.name?.replace('.adoc', '') || 'document';
    await exportAsZip(baseName, sourceContent);
    setExportMenuOpen(false);
  };

  const handleExportHtml = () => {
    const baseName = activeFile?.name?.replace('.adoc', '') || 'document';
    const html = adocToHtml(sourceContent);
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName}</title>
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
    link.download = baseName + '.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
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
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleImageSubmit = (url: string, alt: string) => {
    editor.chain().focus().setImage({ src: url, alt: alt || undefined }).run();
    setImageDialogOpen(false);
  };

  const handleLinkSubmit = (url: string, text: string) => {
    if (text) {
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
    setLinkDialogOpen(false);
  };

  const setHighlightColor = (color: string) => {
    if (color) {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
  };

  return (
    <>
      {/* 桌面端始终显示，移动端根据 toolbarVisible 显示 */}
      <div className={`
        toolbar-container
        h-14 border-b flex items-center justify-between px-4 sticky top-0 z-40 overflow-visible no-scrollbar
        transition-all duration-300 ease-in-out
        ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}
        ${toolbarVisible ? 'max-h-14 opacity-100' : 'max-h-0 opacity-0 overflow-hidden border-b-0 md:max-h-14 md:opacity-100 md:border-b'}
      `}>
        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title={t('toolbar.undo')}
          >
            <Undo size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title={t('toolbar.redo')}
          >
            <Redo size={18} />
          </Button>

          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          {/* Basic Formatting */}
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title={t('toolbar.bold')}
          >
            <Bold size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title={t('toolbar.italic')}
          >
            <Italic size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title={t('toolbar.underline')}
          >
            <Underline size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title={t('toolbar.strikethrough')}
          >
            <Strikethrough size={18} />
          </Button>

          {/* Color & Highlight */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <div className="flex items-center gap-1 mx-1">
            <div className="relative">
              <div className="flex items-center p-1.5 hover:bg-gray-100 rounded" title={t('toolbar.textColor')}>
                <Palette size={18} className="text-gray-600" />
              </div>
              <input
                id="text-color-input"
                type="color"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(event) => {
                  editor.chain().focus().setColor((event.target as HTMLInputElement).value).run();
                }}
                value={editor.getAttributes('textStyle').color || '#000000'}
              />
            </div>
            <div className="relative">
              <div className="flex items-center p-1.5 hover:bg-gray-100 rounded" title={t('toolbar.backgroundColor')}>
                <Highlighter size={18} className="text-yellow-500" />
              </div>
              <input
                id="highlight-color-input"
                type="color"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                defaultValue="#fef08a"
                onChange={(event) => {
                  editor.chain().focus().toggleHighlight({ color: (event.target as HTMLInputElement).value }).run();
                }}
              />
            </div>
            <select
              className="text-xs border border-gray-200 rounded p-1 bg-gray-50 focus:outline-none focus:border-blue-500 w-16"
              onChange={(e) => {
                const val = e.target.value;
                if (val) (editor.chain().focus() as any).setFontSize(val).run();
                else (editor.chain().focus() as any).unsetFontSize().run();
              }}
              value={editor.getAttributes('textStyle').fontSize || ''}
              title={t('toolbar.fontSize')}
            >
              <option value="">Size</option>
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
              <option value="24px">24px</option>
              <option value="30px">30px</option>
            </select>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          {/* Headings */}
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title={t('toolbar.heading1')}
          >
            <Heading1 size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title={t('toolbar.heading2')}
          >
            <Heading2 size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title={t('toolbar.heading3')}
          >
            <Heading3 size={18} />
          </Button>

          {/* Lists & Blocks */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title={t('toolbar.bulletList')}
          >
            <List size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title={t('toolbar.orderedList')}
          >
            <ListOrdered size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title={t('toolbar.codeBlock')}
          >
            <Code size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title={t('toolbar.blockquote')}
          >
            <Quote size={18} />
          </Button>

          {/* Inserts */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <Button
            variant="toolbar"
            onClick={() => setImageDialogOpen(true)}
            title={t('toolbar.insertImage')}
          >
            <ImageIcon size={18} />
          </Button>

          {/* Table Grid Selector */}
          <div className="relative">
            <Button
              variant="toolbar"
              onClick={() => setTableMenuOpen(!tableMenuOpen)}
              active={editor.isActive('table') || tableMenuOpen}
              title={t('toolbar.insertTable')}
            >
              <TableIcon size={18} />
            </Button>
            {tableMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTableMenuOpen(false)} />
                <div className={`absolute left-0 top-full mt-1 p-3 rounded-lg shadow-xl z-50 ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-gray-200'
                  }`}>
                  <div className={`text-xs mb-2 text-center ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t('toolbar.selectTableSize')}
                  </div>
                  <div className="flex flex-col gap-1">
                    {[1, 2, 3, 4, 5].map((rows) => (
                      <div key={rows} className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((cols) => (
                          <button
                            key={`${rows}-${cols}`}
                            onClick={() => {
                              editor.chain().focus().insertTable({
                                rows: rows,
                                cols: cols,
                                withHeaderRow: true
                              }).run();
                              setTableMenuOpen(false);
                            }}
                            className={`min-w-[24px] min-h-[24px] w-6 h-6 border rounded-sm transition-colors ${darkMode
                              ? 'border-slate-500 hover:bg-blue-600 hover:border-blue-500 bg-slate-600'
                              : 'border-gray-300 hover:bg-blue-500 hover:border-blue-400 bg-gray-100'
                              }`}
                            title={`${rows} × ${cols}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className={`text-xs mt-2 text-center ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t('toolbar.clickToInsert')}
                  </div>
                </div>
              </>
            )}
          </div>
          <Button
            variant="toolbar"
            onClick={() => setLinkDialogOpen(true)}
            active={editor.isActive('link')}
            title={t('toolbar.insertLink')}
          >
            <LinkIcon size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title={t('toolbar.horizontalRule')}
          >
            <Minus size={18} />
          </Button>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-gray-50 flex-shrink-0">
            <button
              onClick={() => viewMode === ViewMode.SPLIT && toggleViewMode()}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === ViewMode.EDITOR_ONLY ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('toolbar.editor')}
            </button>
            <button
              onClick={() => viewMode !== ViewMode.SPLIT && toggleViewMode()}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === ViewMode.SPLIT ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('toolbar.split')}
            </button>
          </div>

          <Button variant="ghost" onClick={handleImport} className="gap-1.5 flex-shrink-0" title={t('toolbar.import')}>
            <Upload size={16} /> {t('toolbar.import')}
          </Button>

          <div className="relative">
            <Button
              variant="primary"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="gap-2 flex-shrink-0"
            >
              <Download size={16} /> {t('toolbar.export')} <ChevronDown size={14} />
            </Button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[140px] ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-gray-200'
                  }`}>
                  <button
                    onClick={handleExportAdoc}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'hover:bg-slate-600 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    {t('topBar.exportAdoc').replace('AsciiDoc', '.adoc')}
                  </button>
                  <button
                    onClick={handleExportHtml}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'hover:bg-slate-600 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    {t('topBar.exportHtml').replace('HTML', '.html')}
                  </button>
                  <button
                    onClick={handleExportZip}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'hover:bg-slate-600 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    {t('topBar.exportZipImages')}
                  </button>
                  <button
                    onClick={() => {
                      exportToPdf(sourceContent, activeFile?.name?.replace('.adoc', '.pdf') || 'document.pdf');
                      setExportMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${darkMode ? 'hover:bg-slate-600 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    {t('topBar.exportPdf').replace('PDF', '.pdf')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 侧边栏切换 - 仅桌面端显示 */}
          {!desktopSidebarVisible && (
            <Button
              variant="toolbar"
              onClick={toggleDesktopSidebar}
              title={t('toolbar.showSidebar')}
              className="hidden md:flex"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          )}

          {/* 页面宽度选择 - 仅非 Split 模式下显示 */}
          {viewMode !== ViewMode.SPLIT && (
            <div className="relative hidden md:block">
              <Button
                variant="toolbar"
                onClick={() => setWidthMenuOpen(!widthMenuOpen)}
                title={t('toolbar.editorWidth')}
                className="gap-1 text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
                {editorWidth}%
                <ChevronDown size={12} />
              </Button>
              {widthMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWidthMenuOpen(false)} />
                  <div className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[100px] ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-gray-200'}`}>
                    {[50, 75, 100].map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          setEditorWidth(w as 50 | 75 | 100);
                          setWidthMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm ${editorWidth === w
                          ? darkMode ? 'bg-slate-600 text-blue-400' : 'bg-blue-50 text-blue-600'
                          : darkMode ? 'hover:bg-slate-600 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                      >
                        {w}%
                        {editorWidth === w && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 二级工具栏 - 表格操作 */}
      {editor.isActive('table') && (
        <div className={`
          secondary-toolbar
          h-10 border-b flex items-center px-4 gap-2
          transition-all duration-200 ease-in-out
          ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}
        `}>
          <span className={`text-xs font-medium mr-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Table:
          </span>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().mergeCells().run()}
            title="Merge Cells"
          >
            <Combine size={16} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().splitCell().run()}
            title="Split Cell"
          >
            <SplitSquareHorizontal size={16} />
          </Button>

          <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />

          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add Row"
          >
            <Plus size={14} className="text-green-500" />
            <RowsIcon size={16} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Delete Row"
          >
            <Minus size={14} className="text-red-500" />
            <RowsIcon size={16} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Add Column"
          >
            <Plus size={14} className="text-green-500" />
            <ColumnsIcon size={16} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Delete Column"
          >
            <Minus size={14} className="text-red-500" />
            <ColumnsIcon size={16} />
          </Button>

          <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />

          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Delete Table"
          >
            <Trash2 size={16} className="text-red-500" />
          </Button>
        </div>
      )}

      <LinkDialog
        isOpen={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onSubmit={handleLinkSubmit}
      />

      <ImageDialog
        isOpen={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onSubmit={handleImageSubmit}
      />
    </>
  );
};