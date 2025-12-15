import React, { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Quote, Download, Upload, Image as ImageIcon, Table as TableIcon,
  Underline, Strikethrough, Palette, Highlighter, Link as LinkIcon,
  Undo, Redo, Minus, X, Combine, SplitSquareHorizontal,
  Plus, Trash2, RowsIcon, ColumnsIcon, ChevronDown
} from 'lucide-react';
import { Button } from './ui/Button';
import { useEditorStore } from '../store/useEditorStore';
import { ViewMode } from '../types';

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
  const [url, setUrl] = useState('https://source.unsplash.com/random/800x400');
  const [alt, setAlt] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      onSubmit(url, alt);
      setUrl('https://source.unsplash.com/random/800x400');
      setAlt('');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Insert Image</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
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

export const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const { toggleViewMode, viewMode, sourceContent, importFile, toolbarVisible } = useEditorStore();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  if (!editor) return null;

  const handleExport = () => {
    const blob = new Blob([sourceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.adoc';
    link.click();
    URL.revokeObjectURL(url);
  };

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
        h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white sticky top-0 z-20 overflow-x-auto no-scrollbar
        transition-all duration-300 ease-in-out
        ${toolbarVisible ? 'max-h-14 opacity-100' : 'max-h-0 opacity-0 overflow-hidden border-b-0 md:max-h-14 md:opacity-100 md:border-b'}
      `}>
        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo size={18} />
          </Button>

          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          {/* Basic Formatting */}
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <Underline size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough size={18} />
          </Button>

          {/* Color & Highlight */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <div className="flex items-center gap-1 mx-1">
            <div className="relative">
              <button
                type="button"
                className="flex items-center cursor-pointer p-1.5 hover:bg-gray-100 rounded"
                title="Text Color"
                onClick={() => {
                  const colorInput = document.getElementById('text-color-input') as HTMLInputElement;
                  colorInput?.click();
                }}
              >
                <Palette size={18} className="text-gray-600" />
              </button>
              <input
                id="text-color-input"
                type="color"
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                onChange={(event) => {
                  editor.chain().focus().setColor((event.target as HTMLInputElement).value).run();
                }}
                value={editor.getAttributes('textStyle').color || '#000000'}
              />
            </div>
            <div className="relative">
              <button
                type="button"
                className="flex items-center cursor-pointer p-1.5 hover:bg-gray-100 rounded"
                title="Background Color"
                onClick={() => {
                  const colorInput = document.getElementById('highlight-color-input') as HTMLInputElement;
                  colorInput?.click();
                }}
              >
                <Highlighter size={18} className="text-yellow-500" />
              </button>
              <input
                id="highlight-color-input"
                type="color"
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
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
              title="Font Size"
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
            title="Heading 1"
          >
            <Heading1 size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 size={18} />
          </Button>

          {/* Lists & Blocks */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote size={18} />
          </Button>

          {/* Inserts */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <Button
            variant="toolbar"
            onClick={() => setImageDialogOpen(true)}
            title="Insert Image"
          >
            <ImageIcon size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={addTable}
            title="Insert Table"
          >
            <TableIcon size={18} />
          </Button>

          {/* Table Operations - only show when in a table */}
          {editor.isActive('table') && (
            <>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <Button
                variant="toolbar"
                onClick={() => editor.chain().focus().mergeCells().run()}
                title="Merge Cells"
              >
                <Combine size={18} />
              </Button>
              <Button
                variant="toolbar"
                onClick={() => editor.chain().focus().splitCell().run()}
                title="Split Cell"
              >
                <SplitSquareHorizontal size={18} />
              </Button>
              <Button
                variant="toolbar"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                title="Add Row"
              >
                <RowsIcon size={18} className="text-green-600" />
              </Button>
              <Button
                variant="toolbar"
                onClick={() => editor.chain().focus().deleteRow().run()}
                title="Delete Row"
              >
                <RowsIcon size={18} className="text-red-500" />
              </Button>
              <Button
                variant="toolbar"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                title="Add Column"
              >
                <ColumnsIcon size={18} className="text-green-600" />
              </Button>
              <Button
                variant="toolbar"
                onClick={() => editor.chain().focus().deleteColumn().run()}
                title="Delete Column"
              >
                <ColumnsIcon size={18} className="text-red-500" />
              </Button>
              <Button
                variant="toolbar"
                onClick={() => editor.chain().focus().deleteTable().run()}
                title="Delete Table"
              >
                <Trash2 size={18} className="text-red-500" />
              </Button>
            </>
          )}
          <Button
            variant="toolbar"
            onClick={() => setLinkDialogOpen(true)}
            active={editor.isActive('link')}
            title="Insert Link"
          >
            <LinkIcon size={18} />
          </Button>
          <Button
            variant="toolbar"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
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
              Editor
            </button>
            <button
              onClick={() => viewMode !== ViewMode.SPLIT && toggleViewMode()}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === ViewMode.SPLIT ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Split
            </button>
          </div>

          <Button variant="ghost" onClick={handleImport} className="gap-1.5 flex-shrink-0" title="Import .adoc">
            <Upload size={16} /> Import
          </Button>

          <Button variant="primary" onClick={handleExport} className="gap-2 flex-shrink-0">
            <Download size={16} /> Export
          </Button>
        </div>
      </div>

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