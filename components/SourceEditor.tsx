/**
 * 源码编辑器 (CodeMirror 6)
 * 集成 useTransientUpdates 实现防抖同步
 * 使用 forwardRef + useImperativeHandle 暴露 scrollToLine 方法
 */

import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { SearchReplaceDialog } from './SearchReplaceDialog';
import { convertToAdoc } from '../lib/paste-converter';
import { useTransientContent, useTransientCursor } from '../hooks/useTransientUpdates';
import {
  EditorView,
  createEditorState,
  scrollToLine as cmScrollToLine,
  updateContent,
} from '../lib/codemirror-editor';

// 暴露的方法接口
export interface SourceEditorRef {
  scrollToLine: (line: number) => void;
  focus: () => void;
  getContent: () => string;
}

export const SourceEditor = forwardRef<SourceEditorRef, {}>((_, ref) => {
  const {
    sourceContent,
    highlightLine,
    setHighlightLine,
    syncToLine,
    setSyncToLine,
    searchDialogOpen,
    closeSearchDialog,
    darkMode,
  } = useEditorStore();

  // 瞬时更新 Hooks
  const { contentRef, updateContent: transientUpdate, flushSync } = useTransientContent();
  const { updateCursor } = useTransientCursor();

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const isInternalUpdate = useRef(false);
  const lastExternalContent = useRef(sourceContent);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    scrollToLine: (line: number) => {
      const view = editorViewRef.current;
      if (view) {
        cmScrollToLine(view, line);
      }
    },
    focus: () => {
      editorViewRef.current?.focus();
    },
    getContent: () => {
      return contentRef.current;
    },
  }), [contentRef]);

  // 处理内容变化（使用防抖）
  const handleChange = useCallback((content: string) => {
    if (!isInternalUpdate.current) {
      // 使用瞬时更新（防抖同步到 Store）
      transientUpdate(content, 'SOURCE');
    }
  }, [transientUpdate]);

  // 处理光标活动（瞬时，不触发 Store 更新）
  const handleCursorActivity = useCallback((line: number) => {
    updateCursor(line, 0);
    // 只在点击时设置高亮，不是每次移动
  }, [updateCursor]);

  // 初始化 CodeMirror 编辑器
  useEffect(() => {
    if (!editorContainerRef.current) return;

    // 清理旧的编辑器
    if (editorViewRef.current) {
      editorViewRef.current.destroy();
    }

    const state = createEditorState(
      sourceContent,
      darkMode,
      handleChange,
      handleCursorActivity
    );

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;
    lastExternalContent.current = sourceContent;
    contentRef.current = sourceContent;

    // 处理粘贴事件
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const html = clipboardData.getData('text/html');
      const text = clipboardData.getData('text/plain');

      // 如果有 HTML 内容，尝试转换
      if (html && html.trim()) {
        const hasRichContent = /<(h[1-6]|p|ul|ol|li|table|blockquote|pre|code|strong|b|em|i|a|img|div|span)[^>]*>/i.test(html);

        if (hasRichContent) {
          e.preventDefault();
          const converted = convertToAdoc(html, 'html');

          if (view) {
            const { from, to } = view.state.selection.main;
            view.dispatch({
              changes: { from, to, insert: converted },
              selection: { anchor: from + converted.length },
            });
          }
          return;
        }
      }

      // 检查纯文本是否是 Markdown
      if (text && text.trim()) {
        const hasMarkdownFeatures =
          /^#{1,6}\s/m.test(text) ||
          /\*\*[^*]+\*\*/.test(text) ||
          /__[^_]+__/.test(text) ||
          /\*[^*]+\*/.test(text) ||
          /_[^_]+_/.test(text) ||
          /\[([^\]]+)\]\(([^)]+)\)/.test(text) ||
          /!\[([^\]]*)\]\(([^)]+)\)/.test(text) ||
          /```/.test(text) ||
          /^[-*]\s/m.test(text) ||
          /^\d+\.\s/m.test(text) ||
          /^>\s/m.test(text);

        if (hasMarkdownFeatures) {
          e.preventDefault();
          const converted = convertToAdoc(text, 'markdown');

          if (view) {
            const { from, to } = view.state.selection.main;
            view.dispatch({
              changes: { from, to, insert: converted },
              selection: { anchor: from + converted.length },
            });
          }
          return;
        }
      }
    };

    view.dom.addEventListener('paste', handlePaste);

    // 失去焦点时立即同步
    const handleBlur = () => {
      flushSync();
    };
    view.dom.addEventListener('blur', handleBlur);

    return () => {
      view.dom.removeEventListener('paste', handlePaste);
      view.dom.removeEventListener('blur', handleBlur);
      flushSync(); // 卸载前同步
      view.destroy();
    };
  }, [darkMode, handleChange, handleCursorActivity, flushSync, contentRef]);

  // 同步外部内容变化
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    // 检查内容是否从外部更新（非本组件触发）
    if (sourceContent !== lastExternalContent.current) {
      const currentContent = view.state.doc.toString();
      if (currentContent !== sourceContent) {
        isInternalUpdate.current = true;
        updateContent(view, sourceContent);
        contentRef.current = sourceContent;
        isInternalUpdate.current = false;
      }
      lastExternalContent.current = sourceContent;
    }
  }, [sourceContent, contentRef]);

  // 处理同步滚动 - 当从 preview 点击时同步到 source
  useEffect(() => {
    if (syncToLine && syncToLine.source === 'editor' && editorViewRef.current) {
      cmScrollToLine(editorViewRef.current, syncToLine.line);
      setSyncToLine(null);
    }
  }, [syncToLine, setSyncToLine]);

  // 处理高亮行 - 添加视觉高亮效果
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view || !highlightLine) return;

    // 移除旧的高亮
    const existingHighlights = view.dom.querySelectorAll('.cm-highlight-line');
    existingHighlights.forEach(el => el.classList.remove('cm-highlight-line'));

    // 添加新的高亮
    if (highlightLine.line >= 1 && highlightLine.line <= view.state.doc.lines) {
      const contentDom = view.contentDOM;
      const children = Array.from(contentDom.children) as Element[];
      const targetIndex = highlightLine.line - 1;

      if (children[targetIndex]) {
        children[targetIndex].classList.add('cm-highlight-line');

        // 高亮一段时间后自动移除
        setTimeout(() => {
          children[targetIndex]?.classList.remove('cm-highlight-line');
        }, 2000);
      }
    }
  }, [highlightLine]);

  // 处理搜索替换
  const handleSearchReplace = useCallback((newContent: string) => {
    transientUpdate(newContent, 'SOURCE');
    flushSync(); // 立即同步
  }, [transientUpdate, flushSync]);

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-[#0d1117]' : 'bg-white'} relative`}>
      <div className={`flex items-center justify-between px-4 py-2 ${darkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-gray-50 border-gray-200'} border-b text-xs uppercase tracking-wider font-mono ${darkMode ? 'text-gray-500' : 'text-gray-600'} select-none`}>
        <span>Source Code (AsciiDoc)</span>
        <span className="text-[10px]">Read/Write</span>
      </div>

      {/* 搜索对话框 */}
      <SearchReplaceDialog
        isOpen={searchDialogOpen}
        onClose={closeSearchDialog}
        content={contentRef.current}
        onReplace={handleSearchReplace}
        mode="source"
      />

      {/* CodeMirror 编辑器容器 */}
      <div
        ref={editorContainerRef}
        className="flex-1 overflow-hidden"
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      />

      {/* 全局样式补充 */}
      <style>{`
        .cm-editor {
          height: 100%;
          flex: 1;
        }
        .cm-scroller {
          overflow: auto;
        }
        .cm-highlight-line {
          transition: background-color 0.3s ease;
          animation: pulse-highlight 1s ease-in-out;
        }
        @keyframes pulse-highlight {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
});

SourceEditor.displayName = 'SourceEditor';

export default SourceEditor;