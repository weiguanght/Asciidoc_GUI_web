import React from 'react';
import { Sidebar } from './components/Sidebar';
import { TiptapEditor } from './components/TiptapEditor';
import { MobileHeader } from './components/MobileHeader';
import { useEditorStore } from './store/useEditorStore';

function App() {
  const { darkMode } = useEditorStore();

  return (
    <div className={`flex flex-col md:flex-row h-screen w-screen overflow-hidden font-sans ${darkMode ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
      {/* 移动端顶部导航 */}
      <MobileHeader />

      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden shadow-xl z-0 md:rounded-tl-2xl md:border-t md:border-l md:ml-[-1px] ${darkMode
          ? 'bg-slate-850 border-slate-700'
          : 'bg-white border-gray-200'
        }`}>
        <TiptapEditor />
      </main>
    </div>
  );
}

export default App;