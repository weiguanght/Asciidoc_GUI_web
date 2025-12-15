import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TableCaption } from '../extensions/TableCaption';
import { useEditorStore } from '../store/useEditorStore';
import { jsonToAdoc, adocToHtml } from '../lib/asciidoc';
import { Toolbar } from './Toolbar';
import { SourceEditor } from './SourceEditor';
import { ViewMode } from '../types';
import { getLineFromElement, highlightElement, scrollToElement } from '../lib/sync-utils';

// Custom FontSize Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

export const TiptapEditor: React.FC = () => {
  const {
    sourceContent,
    setSourceContent,
    lastSyncedFrom,
    viewMode,
    setHighlightLine,
    syncToLine,
    setSyncToLine,
    highlightLine,
    darkMode,
  } = useEditorStore();

  const previewRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableCaption,
      TextStyle,
      Color,
      Underline,
      FontSize,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your AsciiDoc document...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px]',
      },
      handlePaste: (view, event, slice) => {
        const html = event.clipboardData?.getData('text/html');
        if (html && html.includes('<table')) {
          // 解析 HTML 表格
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const table = doc.querySelector('table');

          if (table) {
            const rows = table.querySelectorAll('tr');
            const tableData: string[][] = [];

            rows.forEach(row => {
              const cells = row.querySelectorAll('td, th');
              const rowData: string[] = [];
              cells.forEach(cell => {
                rowData.push(cell.textContent?.trim() || '');
              });
              if (rowData.length > 0) {
                tableData.push(rowData);
              }
            });

            if (tableData.length > 0) {
              const colCount = Math.max(...tableData.map(row => row.length));

              // 使用 Tiptap 的表格命令插入表格
              const editor = view.state.schema;
              view.dispatch(view.state.tr);

              // 创建 Tiptap 表格 HTML
              let tableHtml = '<table>';
              tableData.forEach((row, rowIndex) => {
                tableHtml += '<tr>';
                row.forEach(cell => {
                  const tag = rowIndex === 0 ? 'th' : 'td';
                  tableHtml += `<${tag}><p>${cell}</p></${tag}>`;
                });
                // 填充缺少的单元格
                for (let i = row.length; i < colCount; i++) {
                  const tag = rowIndex === 0 ? 'th' : 'td';
                  tableHtml += `<${tag}><p></p></${tag}>`;
                }
                tableHtml += '</tr>';
              });
              tableHtml += '</table>';

              // 使用 insertContent 插入表格
              const editorInstance = (window as any).__tiptapEditor;
              if (editorInstance) {
                editorInstance.chain().focus().insertContent(tableHtml).run();
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const adoc = jsonToAdoc(json as any);
      setSourceContent(adoc, 'EDITOR');
    },
    onCreate: ({ editor }) => {
      // 保存 editor 实例供粘贴处理使用
      (window as any).__tiptapEditor = editor;
    },
  });

  // Sync from Source -> Editor (仅在 Editor Only 模式下同步到 Tiptap)
  // Split 模式下左侧使用 dangerouslySetInnerHTML 预览，不需要同步到 Tiptap
  useEffect(() => {
    if (editor && lastSyncedFrom !== 'EDITOR' && viewMode === ViewMode.EDITOR_ONLY) {
      const html = adocToHtml(sourceContent);
      const currentHTML = editor.getHTML();
      if (currentHTML !== html) {
        editor.commands.setContent(html, false);
      }
    }
  }, [sourceContent, editor, lastSyncedFrom, viewMode]);

  // 处理预览区域点击，触发同步
  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const line = getLineFromElement(target);
    if (line) {
      setHighlightLine(line, 'editor');
      highlightElement(target);
    }
  }, [setHighlightLine]);

  // 处理同步滚动到指定行
  useEffect(() => {
    if (syncToLine && syncToLine.source === 'source' && previewRef.current) {
      const targetElement = previewRef.current.querySelector(`[data-line="${syncToLine.line}"]`) as HTMLElement;
      if (targetElement && editorContainerRef.current) {
        scrollToElement(targetElement, editorContainerRef.current);
        highlightElement(targetElement);
      }
      setSyncToLine(null);
    }
  }, [syncToLine, setSyncToLine]);

  if (!editor) {
    return null;
  }

  // 在分屏模式下，使用 Asciidoctor.js 渲染预览
  const renderPreview = viewMode === ViewMode.SPLIT;

  return (
    <div className={`flex flex-col h-full ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
      <Toolbar editor={editor} />

      <div className={`flex-1 flex overflow-hidden ${viewMode === ViewMode.SPLIT ? 'flex-col md:flex-row' : ''}`}>
        {/* WYSIWYG Editor / Preview Pane */}
        <div
          ref={editorContainerRef}
          className={`
            flex-1 overflow-y-auto cursor-text transition-all duration-300 ease-in-out
            ${viewMode === ViewMode.SPLIT ? `border-b md:border-b-0 md:border-r h-1/2 md:h-auto ${darkMode ? 'border-slate-700' : 'border-gray-200'}` : ''}
          `}
        >
          {renderPreview ? (
            // Asciidoctor.js 渲染的预览
            <div
              ref={previewRef}
              className={`max-w-4xl mx-auto px-8 py-12 asciidoc-preview ${darkMode ? 'dark-preview' : ''}`}
              onClick={handlePreviewClick}
              dangerouslySetInnerHTML={{ __html: adocToHtml(sourceContent) }}
            />
          ) : (
            // Tiptap 富文本编辑器
            <div
              className="max-w-3xl mx-auto px-8 py-12"
              onClick={() => editor.chain().focus().run()}
            >
              <EditorContent editor={editor} />
            </div>
          )}
        </div>

        {/* Source Code Pane */}
        {viewMode === ViewMode.SPLIT && (
          <div className="h-1/2 md:h-auto md:w-1/2 md:min-w-[300px] md:max-w-[50%] transition-all duration-300 animate-in fade-in">
            <SourceEditor />
          </div>
        )}
      </div>
    </div>
  );
};