import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeEditorStore } from './store/useEditorStore';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 初始化 IndexedDB 存储后再渲染应用
initializeEditorStore().then(() => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch(error => {
  console.error('[Init] Failed to initialize store:', error);
  // 即使初始化失败也渲染应用
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});