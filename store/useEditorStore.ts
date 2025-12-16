import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FileItem, ViewMode } from '../types';
import { INITIAL_CONTENT } from '../lib/asciidoc';
import { openLocalFile, saveLocalFile, saveLocalFileAs } from '../lib/file-system-access';

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

// 当前文件的文件句柄（不持久化）
let currentFileHandle: FileSystemFileHandle | null = null;

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

  // 桌面端 UI 状态
  desktopSidebarVisible: boolean;
  editorWidth: 50 | 75 | 100;

  // 搜索对话框状态
  searchDialogOpen: boolean;

  // 图片管理器状态
  imageManagerOpen: boolean;

  // 主题状态
  darkMode: boolean;

  // 保存状态
  isSaving: boolean;
  lastSavedAt: number | null;

  // Actions
  setFiles: (files: FileItem[]) => void;
  setActiveFile: (id: string) => void;
  toggleViewMode: () => void;
  setSourceContent: (content: string, source: 'EDITOR' | 'SOURCE') => void;
  createFile: (name: string, parentId?: string | null) => void;
  createFolder: (name: string, parentId?: string | null) => void;
  importFile: (name: string, content: string) => void;
  renameFile: (id: string, newName: string) => void;
  deleteFile: (id: string) => void;
  moveItem: (id: string, newParentId: string | null) => void;
  toggleFolderExpand: (id: string) => void;

  // 同步操作
  setHighlightLine: (line: number, source: 'editor' | 'source') => void;
  clearHighlightLine: () => void;
  setSyncToLine: (info: SyncInfo | null) => void;

  // 移动端 UI 操作
  toggleSidebar: () => void;
  toggleToolbar: () => void;
  closeSidebar: () => void;

  // 桌面端 UI 操作
  toggleDesktopSidebar: () => void;
  setEditorWidth: (width: 50 | 75 | 100) => void;

  // 搜索对话框操作
  openSearchDialog: () => void;
  closeSearchDialog: () => void;

  // 图片管理器操作
  openImageManager: () => void;
  closeImageManager: () => void;

  // 主题操作
  toggleDarkMode: () => void;

  // 文件系统操作
  saveCurrentFile: () => Promise<boolean>;
  saveAsFile: () => Promise<boolean>;
  openLocalFile: () => Promise<boolean>;
  getFileHandle: () => FileSystemFileHandle | null;
  setFileHandle: (handle: FileSystemFileHandle | null) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      files: [
        { id: '1', name: 'Getting Started.adoc', content: INITIAL_CONTENT, lastModified: Date.now(), parentId: null, type: 'file' as const },
        { id: '2', name: 'Architecture.adoc', content: '= Architecture\n\nDetails about system design.', lastModified: Date.now(), parentId: null, type: 'file' as const }
      ],
      activeFileId: '1',
      viewMode: ViewMode.EDITOR_ONLY,
      sourceContent: INITIAL_CONTENT,
      lastSyncedFrom: null,
      highlightLine: null,
      syncToLine: null,
      sidebarVisible: false,
      toolbarVisible: false,
      desktopSidebarVisible: true,
      editorWidth: 75,
      searchDialogOpen: false,
      imageManagerOpen: false,
      darkMode: false,
      isSaving: false,
      lastSavedAt: null,

      setFiles: (files) => set({ files }),

      setActiveFile: (id) => set((state) => {
        const file = state.files.find(f => f.id === id);
        // 切换文件时清除文件句柄
        currentFileHandle = null;
        return {
          activeFileId: id,
          sourceContent: file ? file.content : '',
          highlightLine: null,
          syncToLine: null,
          sidebarVisible: false,
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

      createFile: (name, parentId = null) => set((state) => {
        const newFile: FileItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: name.endsWith('.adoc') ? name : `${name}.adoc`,
          content: '= New Document\n\nStart writing...',
          lastModified: Date.now(),
          parentId,
          type: 'file'
        };
        currentFileHandle = null;
        return {
          files: [...state.files, newFile],
          activeFileId: newFile.id,
          sourceContent: newFile.content,
          sidebarVisible: false,
        };
      }),

      createFolder: (name, parentId = null) => set((state) => {
        const newFolder: FileItem = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          content: '',
          lastModified: Date.now(),
          parentId,
          type: 'folder'
        };
        return {
          files: [...state.files, newFolder],
        };
      }),

      importFile: (name, content) => set((state) => {
        const newFile: FileItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: name.endsWith('.adoc') ? name : `${name}.adoc`,
          content: content,
          lastModified: Date.now(),
          parentId: null,
          type: 'file'
        };
        return {
          files: [...state.files, newFile],
          activeFileId: newFile.id,
          sourceContent: newFile.content,
          lastSyncedFrom: 'SOURCE',
          sidebarVisible: false,
        };
      }),

      renameFile: (id, newName) => set((state) => {
        const updatedFiles = state.files.map(f =>
          f.id === id ? { ...f, name: newName.endsWith('.adoc') ? newName : `${newName}.adoc`, lastModified: Date.now() } : f
        );
        return { files: updatedFiles };
      }),

      deleteFile: (id) => set((state) => {
        const updatedFiles = state.files.filter(f => f.id !== id);
        if (state.activeFileId === id) {
          const newActiveFile = updatedFiles[0];
          currentFileHandle = null;
          return {
            files: updatedFiles,
            activeFileId: newActiveFile?.id || null,
            sourceContent: newActiveFile?.content || '',
          };
        }
        return { files: updatedFiles };
      }),

      moveItem: (id, newParentId) => set((state) => {
        const updatedFiles = state.files.map(f =>
          f.id === id ? { ...f, parentId: newParentId, lastModified: Date.now() } : f
        );
        return { files: updatedFiles };
      }),

      toggleFolderExpand: (id) => {
        const expandedFolders = JSON.parse(localStorage.getItem('expanded-folders') || '{}');
        expandedFolders[id] = !expandedFolders[id];
        localStorage.setItem('expanded-folders', JSON.stringify(expandedFolders));
      },

      setHighlightLine: (line, source) => set(() => {
        const oppositeSource = source === 'editor' ? 'source' : 'editor';
        return {
          highlightLine: { line, source },
          syncToLine: { line, source: oppositeSource },
        };
      }),

      clearHighlightLine: () => set({ highlightLine: null }),
      setSyncToLine: (info) => set({ syncToLine: info }),

      toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
      toggleToolbar: () => set((state) => ({ toolbarVisible: !state.toolbarVisible })),
      closeSidebar: () => set({ sidebarVisible: false }),

      toggleDesktopSidebar: () => set((state) => ({ desktopSidebarVisible: !state.desktopSidebarVisible })),
      setEditorWidth: (width) => set({ editorWidth: width }),

      openSearchDialog: () => set({ searchDialogOpen: true }),
      closeSearchDialog: () => set({ searchDialogOpen: false }),

      openImageManager: () => set({ imageManagerOpen: true }),
      closeImageManager: () => set({ imageManagerOpen: false }),

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      // 文件系统操作
      saveCurrentFile: async () => {
        const state = get();
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        const fileName = activeFile?.name || 'document.adoc';
        set({ isSaving: true });

        try {
          // 使用 saveLocalFile（会检查缓存的句柄）
          const success = await saveLocalFile(state.sourceContent, fileName);
          set({ isSaving: false, lastSavedAt: success ? Date.now() : state.lastSavedAt });
          return success;
        } catch (error) {
          console.error('[saveCurrentFile] Error:', error);
          set({ isSaving: false });
          return false;
        }
      },

      saveAsFile: async () => {
        const state = get();
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        const suggestedName = activeFile?.name || 'document.adoc';

        try {
          const success = await saveLocalFileAs(state.sourceContent, suggestedName);
          if (success) {
            set({ lastSavedAt: Date.now() });
          }
          return success;
        } catch (error) {
          console.error('[saveAsFile] Error:', error);
          return false;
        }
      },

      openLocalFile: async () => {
        try {
          const result = await openLocalFile();
          if (result && result.content !== undefined) {
            const name = result.name || 'Untitled.adoc';
            const content = result.content;

            // 导入文件
            get().importFile(name, content);
            return true;
          }
          return false;
        } catch (error) {
          console.error('[openLocalFile] Error:', error);
          return false;
        }
      },

      getFileHandle: () => currentFileHandle,
      setFileHandle: (handle) => { currentFileHandle = handle; },
    }),
    {
      name: 'asciidoc-editor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
        viewMode: state.viewMode,
        sourceContent: state.sourceContent,
        darkMode: state.darkMode,
      }),
    }
  )
);