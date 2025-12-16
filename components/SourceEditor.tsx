import React, { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { getLineFromCursorPosition, scrollToLineInTextarea } from '../lib/sync-utils';
import { SearchReplaceDialog } from './SearchReplaceDialog';
import { convertToAdoc } from '../lib/paste-converter';

export const SourceEditor: React.FC = () => {
  const {
    sourceContent,
    setSourceContent,
    highlightLine,
    setHighlightLine,
    syncToLine,
    setSyncToLine,
    searchDialogOpen,
    closeSearchDialog,
  } = useEditorStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceContent(e.target.value, 'SOURCE');
  };

  // 处理搜索替换
  const handleSearchReplace = useCallback((newContent: string) => {
    setSourceContent(newContent, 'SOURCE');
  }, [setSourceContent]);

  // 处理点击事件，获取点击的行号
  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const lineNumber = getLineFromCursorPosition(sourceContent, cursorPos);
    setHighlightLine(lineNumber, 'source');
  }, [sourceContent, setHighlightLine]);

  // 处理同步滚动
  useEffect(() => {
    if (syncToLine && syncToLine.source === 'editor' && textareaRef.current) {
      scrollToLineInTextarea(textareaRef.current, syncToLine.line);
      setSyncToLine(null);
    }
  }, [syncToLine, setSyncToLine]);

  // 同步行号滚动
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // 处理粘贴事件，自动转换 Markdown/HTML
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    console.log('[Paste Debug] HTML:', html ? html.substring(0, 200) : 'none');
    console.log('[Paste Debug] Text:', text ? text.substring(0, 200) : 'none');

    // 如果有 HTML 内容，尝试转换
    if (html && html.trim()) {
      // 检查是否是富文本粘贴（更宽松的检测）
      const hasRichContent = /<(h[1-6]|p|ul|ol|li|table|blockquote|pre|code|strong|b|em|i|a|img|div|span)[^>]*>/i.test(html);

      console.log('[Paste Debug] Has rich HTML content:', hasRichContent);

      if (hasRichContent) {
        e.preventDefault();
        const converted = convertToAdoc(html, 'html');
        console.log('[Paste Debug] Converted HTML to AsciiDoc:', converted.substring(0, 200));

        // 在光标位置插入转换后的内容
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent = sourceContent.slice(0, start) + converted + sourceContent.slice(end);
          setSourceContent(newContent, 'SOURCE');

          // 设置新的光标位置
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + converted.length;
            textarea.focus();
          }, 0);
        }
        return;
      }
    }

    // 检查纯文本是否是 Markdown（更宽松的检测）
    if (text && text.trim()) {
      const hasMarkdownFeatures =
        /^#{1,6}\s/m.test(text) ||           // 标题
        /\*\*[^*]+\*\*/.test(text) ||         // 粗体 **text**
        /__[^_]+__/.test(text) ||             // 粗体 __text__
        /\*[^*]+\*/.test(text) ||             // 斜体 *text*
        /_[^_]+_/.test(text) ||               // 斜体 _text_
        /\[([^\]]+)\]\(([^)]+)\)/.test(text) || // 链接
        /!\[([^\]]*)\]\(([^)]+)\)/.test(text) || // 图片
        /```/.test(text) ||                   // 代码块
        /^[-*]\s/m.test(text) ||              // 无序列表
        /^\d+\.\s/m.test(text) ||             // 有序列表
        /^>\s/m.test(text);                   // 引用

      console.log('[Paste Debug] Has Markdown features:', hasMarkdownFeatures);

      if (hasMarkdownFeatures) {
        e.preventDefault();
        const converted = convertToAdoc(text, 'markdown');
        console.log('[Paste Debug] Converted Markdown to AsciiDoc:', converted.substring(0, 200));

        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent = sourceContent.slice(0, start) + converted + sourceContent.slice(end);
          setSourceContent(newContent, 'SOURCE');

          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + converted.length;
            textarea.focus();
          }, 0);
        }
        return;
      }
    }

    console.log('[Paste Debug] No conversion needed, using default paste');
    // 默认行为：不拦截，让浏览器处理
  }, [sourceContent, setSourceContent]);

  // 计算行号
  const lineCount = sourceContent.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-300 relative">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333] text-xs uppercase tracking-wider font-mono text-gray-500 select-none">
        <span>Source Code (AsciiDoc)</span>
        <span className="text-[10px]">Read/Write</span>
      </div>

      {/* 搜索对话框 */}
      <SearchReplaceDialog
        isOpen={searchDialogOpen}
        onClose={closeSearchDialog}
        content={sourceContent}
        onReplace={handleSearchReplace}
        mode="source"
        textareaRef={textareaRef}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 行号区域 */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 w-12 bg-[#1e1e1e] border-r border-[#333] overflow-hidden select-none"
          style={{ paddingTop: '16px' }}
        >
          <div className="font-mono text-sm text-gray-600 text-right pr-3 leading-relaxed">
            {lineNumbers.map(num => (
              <div
                key={num}
                className={`${highlightLine?.line === num ? 'bg-yellow-500/20 text-yellow-400' : ''}`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* 编辑区域 */}
        <div className="flex-1 relative">
          {/* 高亮行覆盖层 */}
          {highlightLine?.source === 'editor' && highlightLine.line && (
            <div
              className="absolute left-0 right-0 pointer-events-none transition-opacity duration-300"
              style={{
                top: `${(highlightLine.line - 1) * 24 + 16}px`, // 24px line height + 16px padding
                height: '24px',
                backgroundColor: 'rgba(250, 204, 21, 0.15)',
                borderLeft: '3px solid #facc15',
              }}
            />
          )}

          <textarea
            ref={textareaRef}
            value={sourceContent}
            onChange={handleChange}
            onClick={handleClick}
            onScroll={handleScroll}
            onPaste={handlePaste}
            className="w-full h-full p-4 bg-transparent text-[#d4d4d4] font-mono text-sm leading-relaxed resize-none focus:outline-none border-none"
            style={{ lineHeight: '24px' }}
            spellCheck={false}
            placeholder="Type your AsciiDoc source here..."
          />
        </div>
      </div>
    </div>
  );
};