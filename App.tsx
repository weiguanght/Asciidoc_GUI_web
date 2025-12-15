import React from 'react';
import { Sidebar } from './components/Sidebar';
import { TiptapEditor } from './components/TiptapEditor';
import { MobileHeader } from './components/MobileHeader';

function App() {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      {/* 移动端顶部导航 */}
      <MobileHeader />

      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden shadow-xl z-0 md:rounded-tl-2xl md:border-t md:border-l border-gray-200 bg-white md:ml-[-1px]">
        <TiptapEditor />
      </main>
    </div>
  );
}

export default App;