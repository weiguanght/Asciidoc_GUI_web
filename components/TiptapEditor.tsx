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
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const adoc = jsonToAdoc(json as any);
      setSourceContent(adoc, 'EDITOR');
    },
  });

  // Sync from Source -> Editor (使用 Asciidoctor.js 渲染)
  useEffect(() => {
    if (editor && lastSyncedFrom !== 'EDITOR') {
      const html = adocToHtml(sourceContent);
      const currentHTML = editor.getHTML();
      if (currentHTML !== html) {
        editor.commands.setContent(html, false);
      }
    }
  }, [sourceContent, editor, lastSyncedFrom]);

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
    <div className="flex flex-col h-full bg-white">
      <Toolbar editor={editor} />

      <div className="flex-1 flex overflow-hidden">
        {/* WYSIWYG Editor / Preview Pane */}
        <div
          ref={editorContainerRef}
          className={`
            flex-1 overflow-y-auto cursor-text transition-all duration-300 ease-in-out
            ${viewMode === ViewMode.SPLIT ? 'border-r border-gray-200' : ''}
          `}
        >
          {renderPreview ? (
            // Asciidoctor.js 渲染的预览
            <div
              ref={previewRef}
              className="max-w-4xl mx-auto px-8 py-12 asciidoc-preview"
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
          <div className="w-1/2 min-w-[300px] max-w-[50%] transition-all duration-300 animate-in fade-in">
            <SourceEditor />
          </div>
        )}
      </div>
    </div>
  );
};