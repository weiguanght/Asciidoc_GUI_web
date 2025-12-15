import { create } from 'zustand';
import { FileItem, ViewMode } from '../types';
import { INITIAL_CONTENT } from '../lib/asciidoc';

// 高亮行信息
interface HighlightInfo {
  line: number;
  source: 'editor' | 'source';
}

// 同步到行信息
interface SyncInfo {
  line: number;
  source: 'editor' | 'source';
}

interface EditorState {
  files: FileItem[];
  activeFileId: string | null;
  viewMode: ViewMode;
  sourceContent: string;
  lastSyncedFrom: 'EDITOR' | 'SOURCE' | null;

  // 同步状态
  highlightLine: HighlightInfo | null;
  syncToLine: SyncInfo | null;

  // 移动端 UI 状态
  sidebarVisible: boolean;
  toolbarVisible: boolean;

  // Actions
  setFiles: (files: FileItem[]) => void;
  setActiveFile: (id: string) => void;
  toggleViewMode: () => void;
  setSourceContent: (content: string, source: 'EDITOR' | 'SOURCE') => void;
  createFile: (name: string) => void;
  importFile: (name: string, content: string) => void;

  // 同步操作
  setHighlightLine: (line: number, source: 'editor' | 'source') => void;
  clearHighlightLine: () => void;
  setSyncToLine: (info: SyncInfo | null) => void;

  // 移动端 UI 操作
  toggleSidebar: () => void;
  toggleToolbar: () => void;
  closeSidebar: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  files: [
    { id: '1', name: 'Getting Started.adoc', content: INITIAL_CONTENT, lastModified: Date.now() },
    { id: '2', name: 'Architecture.adoc', content: '= Architecture\n\nDetails about system design.', lastModified: Date.now() }
  ],
  activeFileId: '1',
  viewMode: ViewMode.EDITOR_ONLY,
  sourceContent: INITIAL_CONTENT,
  lastSyncedFrom: null,
  highlightLine: null,
  syncToLine: null,
  sidebarVisible: false,
  toolbarVisible: false,

  setFiles: (files) => set({ files }),

  setActiveFile: (id) => set((state) => {
    const file = state.files.find(f => f.id === id);
    return {
      activeFileId: id,
      sourceContent: file ? file.content : '',
      highlightLine: null,
      syncToLine: null,
      sidebarVisible: false, // 选择文件后自动关闭侧边栏
    };
  }),

  toggleViewMode: () => set((state) => {
    const nextMode = state.viewMode === ViewMode.EDITOR_ONLY ? ViewMode.SPLIT : ViewMode.EDITOR_ONLY;
    return { viewMode: nextMode };
  }),

  setSourceContent: (content, source) => set((state) => {
    const updatedFiles = state.files.map(f =>
      f.id === state.activeFileId ? { ...f, content } : f
    );
    return {
      sourceContent: content,
      lastSyncedFrom: source,
      files: updatedFiles
    };
  }),

  createFile: (name) => set((state) => {
    const newFile: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.endsWith('.adoc') ? name : `${name}.adoc`,
      content: '= New Document\n\nStart writing...',
      lastModified: Date.now()
    };
    return {
      files: [...state.files, newFile],
      activeFileId: newFile.id,
      sourceContent: newFile.content,
      sidebarVisible: false,
    };
  }),

  importFile: (name, content) => set((state) => {
    const newFile: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.endsWith('.adoc') ? name : `${name}.adoc`,
      content: content,
      lastModified: Date.now()
    };
    return {
      files: [...state.files, newFile],
      activeFileId: newFile.id,
      sourceContent: newFile.content,
      lastSyncedFrom: 'SOURCE',
      sidebarVisible: false,
    };
  }),

  // 设置高亮行并触发另一侧同步
  setHighlightLine: (line, source) => set(() => {
    const oppositeSource = source === 'editor' ? 'source' : 'editor';
    return {
      highlightLine: { line, source },
      syncToLine: { line, source: oppositeSource },
    };
  }),

  clearHighlightLine: () => set({ highlightLine: null }),

  setSyncToLine: (info) => set({ syncToLine: info }),

  // 移动端 UI 操作
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  toggleToolbar: () => set((state) => ({ toolbarVisible: !state.toolbarVisible })),
  closeSidebar: () => set({ sidebarVisible: false }),
}));