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
import { AdmonitionNode } from '../extensions/admonition-node';
import { IncludeNode } from '../extensions/include-node';
import { SlashCommands } from '../extensions/slash-commands';
import { useEditorStore } from '../store/useEditorStore';
import { jsonToAdoc, adocToHtml } from '../lib/asciidoc';
import { renderMermaidDiagrams } from '../lib/asciidoctor-renderer';
import { convertToAdoc } from '../lib/paste-converter';
import { sanitizeHtml } from '../lib/html-sanitizer';
import { Toolbar } from './Toolbar';
import { SourceEditor } from './SourceEditor';
import { ContextMenu } from './ContextMenu';
import { ViewMode } from '../types';
import { getLineFromElement, highlightElement, scrollToElement, findNearestDataLineElement, highlightAndScrollToElement } from '../lib/sync-utils';

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
    } as any;
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
    editorWidth,
  } = useEditorStore();

  // 计算编辑器/预览区域的宽度类
  const getContainerWidthClass = () => {
    if (viewMode === ViewMode.SPLIT) return 'w-full';

    switch (editorWidth) {
      case 50: return 'w-1/2 mx-auto';
      case 75: return 'w-3/4 mx-auto';
      case 100: return 'w-full';
      default: return 'max-w-3xl mx-auto'; // 默认回退
    }
  };

  const containerWidthClass = getContainerWidthClass();

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
      AdmonitionNode,
      IncludeNode,
      SlashCommands,
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
        const html = event.clipboardData?.getData('text/html') || '';
        const text = event.clipboardData?.getData('text/plain') || '';

        console.log('[TiptapEditor Paste] HTML:', html.substring(0, 100));
        console.log('[TiptapEditor Paste] Text:', text.substring(0, 100));

        // 检查 Markdown 特征
        const hasMarkdownFeatures =
          /^#{1,6}\s/m.test(text) ||           // 标题
          /\*\*[^*]+\*\*/.test(text) ||         // 粗体
          /__[^_]+__/.test(text) ||             // 粗体
          /\[([^\]]+)\]\(([^)]+)\)/.test(text) || // 链接
          /!\[([^\]]*)\]\(([^)]+)\)/.test(text) || // 图片
          /```/.test(text) ||                   // 代码块
          /^[-*]\s/m.test(text) ||              // 无序列表
          /^\d+\.\s/m.test(text) ||             // 有序列表
          /^>\s/m.test(text);                   // 引用

        if (hasMarkdownFeatures) {
          console.log('[TiptapEditor Paste] Detected Markdown, converting to HTML...');

          // 将 Markdown 转换为 HTML（保留富文本格式）
          let htmlContent = text;

          // 标题
          htmlContent = htmlContent.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
          htmlContent = htmlContent.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
          htmlContent = htmlContent.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
          htmlContent = htmlContent.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
          htmlContent = htmlContent.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
          htmlContent = htmlContent.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

          // 粗体和斜体
          htmlContent = htmlContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          htmlContent = htmlContent.replace(/__([^_]+)__/g, '<strong>$1</strong>');
          htmlContent = htmlContent.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
          htmlContent = htmlContent.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

          // 行内代码
          htmlContent = htmlContent.replace(/`([^`]+)`/g, '<code>$1</code>');

          // 链接
          htmlContent = htmlContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

          // 无序列表项
          htmlContent = htmlContent.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');

          // 有序列表项
          htmlContent = htmlContent.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

          // 段落（非标题、非列表的行）
          htmlContent = htmlContent.split('\n').map(line => {
            if (!line.trim()) return '<p></p>';
            if (line.startsWith('<')) return line;
            return `<p>${line}</p>`;
          }).join('');

          const editorInstance = (window as any).__tiptapEditor;
          if (editorInstance) {
            editorInstance.chain().focus().insertContent(htmlContent).run();
            return true;
          }
        }

        // 处理 HTML 表格
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

        // 让 Tiptap 默认处理其他 HTML 内容
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
      const rawHtml = adocToHtml(sourceContent);
      const processedHtml = processHtmlForTiptap(rawHtml);
      const currentHTML = editor.getHTML();

      // 简单比较可能不准确，但可以避免一些不必要的更新
      if (currentHTML !== processedHtml) {
        editor.commands.setContent(processedHtml, false);
      }
    }
  }, [sourceContent, editor, lastSyncedFrom, viewMode]);

  /**
   * 处理 AsciiDoc生成的 HTML，使其适配 Tiptap
   * 主要将 CSS 类转换为内联样式
   */
  const processHtmlForTiptap = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 处理颜色和背景色
    const colorMap: Record<string, string> = {
      'red': 'red',
      'blue': '#3b82f6', // Tailwind blue-500
      'green': '#22c55e', // Tailwind green-500
      'yellow': '#eab308', // Tailwind yellow-500
      'purple': '#a855f7', // Tailwind purple-500
      'orange': '#f97316', // Tailwind orange-500
      'gray': '#6b7280',   // Tailwind gray-500
      'aqua': '#06b6d4',   // Tailwind cyan-500
      'black': 'black',
      'white': 'white',
    };

    // 查找所有带 class 的 span
    const spans = doc.querySelectorAll('span[class]');
    spans.forEach(span => {
      const classes = Array.from(span.classList);
      let style = span.getAttribute('style') || '';

      classes.forEach(cls => {
        // 文本颜色
        if (colorMap[cls]) {
          style += `color: ${colorMap[cls]};`;
        }

        // 背景色
        if (cls.endsWith('-background')) {
          const colorName = cls.replace('-background', '');
          const bgColor = colorMap[colorName] || colorName;
          style += `background-color: ${bgColor};`;
        }

        // 下划线
        if (cls === 'underline') {
          style += 'text-decoration: underline;';
        }

        // 删除线
        if (cls === 'line-through') {
          style += 'text-decoration: line-through;';
        }

        // 大号字体
        if (cls === 'big') {
          style += 'font-size: 1.25em;';
        }
      });

      if (style) {
        span.setAttribute('style', style);
      }
    });

    return doc.body.innerHTML;
  };

  // 处理预览区域点击，触发同步
  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const container = previewRef.current;

    if (!container) return;

    // 查找最近的带 data-line 属性的元素
    const dataLineElement = findNearestDataLineElement(target, container);

    if (dataLineElement) {
      const line = getLineFromElement(dataLineElement);
      if (line) {
        setHighlightLine(line, 'editor');
        highlightElement(dataLineElement);
      }
    } else {
      // 如果没找到 data-line 元素，尝试使用相对位置计算行号
      const containerRect = container.getBoundingClientRect();
      const clickY = e.clientY - containerRect.top + container.scrollTop;
      const contentHeight = container.scrollHeight;
      const lineCount = sourceContent.split('\n').length;
      const estimatedLine = Math.max(1, Math.ceil((clickY / contentHeight) * lineCount));
      setHighlightLine(estimatedLine, 'editor');
    }
  }, [setHighlightLine, sourceContent]);

  // 处理同步滚动到指定行 - 当从 source 点击时同步到预览区
  useEffect(() => {
    if (syncToLine && syncToLine.source === 'source' && previewRef.current && editorContainerRef.current) {
      // 精确匹配：查找带有精确行号的元素
      let targetElement = previewRef.current.querySelector(`[data-line="${syncToLine.line}"]`) as HTMLElement;

      // 如果没找到精确匹配，尝试查找最接近的元素
      if (!targetElement) {
        const allElements = previewRef.current.querySelectorAll('[data-line]');
        let closestElement: HTMLElement | null = null;
        let closestDistance = Infinity;

        allElements.forEach(el => {
          const line = parseInt(el.getAttribute('data-line') || '0', 10);
          if (!isNaN(line)) {
            const distance = Math.abs(line - syncToLine.line);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestElement = el as HTMLElement;
            }
          }
        });

        if (closestElement && closestDistance <= 5) {
          targetElement = closestElement;
        }
      }

      if (targetElement) {
        highlightAndScrollToElement(targetElement, editorContainerRef.current);
      } else {
        // 使用比例滚动作为回退方案
        const lineCount = sourceContent.split('\n').length;
        const scrollPercentage = syncToLine.line / lineCount;
        const scrollHeight = editorContainerRef.current.scrollHeight - editorContainerRef.current.clientHeight;
        editorContainerRef.current.scrollTo({
          top: scrollPercentage * scrollHeight,
          behavior: 'smooth'
        });
      }

      setSyncToLine(null);
    }
  }, [syncToLine, setSyncToLine, sourceContent]);

  if (!editor) {
    return null;
  }

  // 在分屏模式下，使用 Asciidoctor.js 渲染预览
  const renderPreview = viewMode === ViewMode.SPLIT;

  // Mermaid 图表渲染（在 DOM 更新后异步执行）
  useEffect(() => {
    if (renderPreview && previewRef.current) {
      // 延迟执行以确保 DOM 已更新
      const timer = setTimeout(() => {
        renderMermaidDiagrams();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sourceContent, renderPreview]);

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
            // Asciidoctor.js 渲染的预览（使用 DOMPurify 清洗防止 XSS）
            <div
              ref={previewRef}
              className={`px-8 py-12 asciidoc-preview ${darkMode ? 'dark-preview' : ''} ${containerWidthClass}`}
              onClick={handlePreviewClick}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(adocToHtml(sourceContent)) }}
            />
          ) : (
            // Tiptap 富文本编辑器
            // Tiptap 富文本编辑器
            <div
              className={`px-8 py-12 ${containerWidthClass}`}
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

      {/* Context Menu */}
      <ContextMenu editor={editor} />
    </div>
  );
};