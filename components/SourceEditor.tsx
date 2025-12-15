import React, { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { getLineFromCursorPosition, scrollToLineInTextarea } from '../lib/sync-utils';

export const SourceEditor: React.FC = () => {
  const {
    sourceContent,
    setSourceContent,
    highlightLine,
    setHighlightLine,
    syncToLine,
    setSyncToLine,
  } = useEditorStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceContent(e.target.value, 'SOURCE');
  };

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

  // 计算行号
  const lineCount = sourceContent.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-300">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333] text-xs uppercase tracking-wider font-mono text-gray-500 select-none">
        <span>Source Code (AsciiDoc)</span>
        <span className="text-[10px]">Read/Write</span>
      </div>

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