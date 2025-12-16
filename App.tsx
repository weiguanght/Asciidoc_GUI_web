import React, { useEffect, useCallback, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TiptapEditor } from './components/TiptapEditor';
import { MobileHeader } from './components/MobileHeader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useEditorStore } from './store/useEditorStore';

// Toast 通知组件
const SaveToast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  );
};

function App() {
  const { darkMode, saveCurrentFile, isSaving } = useEditorStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 全局快捷键监听
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    // Ctrl+S / Cmd+S - 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const success = await saveCurrentFile();
      if (success) {
        setToastMessage('Saved successfully!');
      }
    }

    // Ctrl+Shift+S / Cmd+Shift+S - 另存为
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const { saveAsFile } = useEditorStore.getState();
      const success = await saveAsFile();
      if (success) {
        setToastMessage('Saved as new file!');
      }
    }

    // Ctrl+O / Cmd+O - 打开
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      const { openLocalFile } = useEditorStore.getState();
      await openLocalFile();
    }
  }, [saveCurrentFile]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={`flex flex-col md:flex-row h-screen w-screen overflow-hidden font-sans ${darkMode ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
      {/* 移动端顶部导航 */}
      <MobileHeader />

      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden shadow-xl z-0 md:border-t md:border-l md:ml-[-1px] ${darkMode
        ? 'bg-slate-850 border-slate-700'
        : 'bg-white border-gray-200'
        }`}>
        <TiptapEditor />
      </main>

      {/* 保存 Toast */}
      {toastMessage && (
        <SaveToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* 保存中指示器 */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </div>
        </div>
      )}
    </div>
  );
}

// 用 ErrorBoundary 包裹导出
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;