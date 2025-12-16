/**
 * IndexedDB 存储模块
 * 提供比 localStorage 更大容量的持久化存储
 */

import { FileItem } from '../types';

const DB_NAME = 'asciidoc-editor-db';
const DB_VERSION = 1;

// 对象存储名称
const STORES = {
    FILES: 'files',
    HISTORY: 'history',
    SETTINGS: 'settings',
} as const;

// 历史记录条目
export interface HistoryEntry {
    id: string;
    fileId: string;
    content: string;
    timestamp: number;
    action: 'create' | 'update' | 'snapshot';
}

// 设置条目
export interface SettingsEntry {
    key: string;
    value: unknown;
}

let dbInstance: IDBDatabase | null = null;

/**
 * 初始化 IndexedDB 数据库
 */
export const initDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB open error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // 创建文件存储
            if (!db.objectStoreNames.contains(STORES.FILES)) {
                const fileStore = db.createObjectStore(STORES.FILES, { keyPath: 'id' });
                fileStore.createIndex('name', 'name', { unique: false });
                fileStore.createIndex('parentId', 'parentId', { unique: false });
                fileStore.createIndex('lastModified', 'lastModified', { unique: false });
            }

            // 创建历史记录存储
            if (!db.objectStoreNames.contains(STORES.HISTORY)) {
                const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
                historyStore.createIndex('fileId', 'fileId', { unique: false });
                historyStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // 创建设置存储
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }
        };
    });
};

/**
 * 获取数据库实例
 */
const getDB = async (): Promise<IDBDatabase> => {
    if (!dbInstance) {
        return initDatabase();
    }
    return dbInstance;
};

// ==================== 文件操作 ====================

/**
 * 获取所有文件
 */
export const getAllFiles = async (): Promise<FileItem[]> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.FILES, 'readonly');
        const store = transaction.objectStore(STORES.FILES);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * 获取单个文件
 */
export const getFile = async (id: string): Promise<FileItem | undefined> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.FILES, 'readonly');
        const store = transaction.objectStore(STORES.FILES);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * 保存文件（创建或更新）
 */
export const saveFile = async (file: FileItem): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.FILES, 'readwrite');
        const store = transaction.objectStore(STORES.FILES);
        const request = store.put(file);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * 批量保存文件
 */
export const saveAllFiles = async (files: FileItem[]): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.FILES, 'readwrite');
        const store = transaction.objectStore(STORES.FILES);

        // 先清空再添加
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            files.forEach(file => store.put(file));
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

/**
 * 删除文件
 */
export const deleteFile = async (id: string): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.FILES, 'readwrite');
        const store = transaction.objectStore(STORES.FILES);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// ==================== 历史记录操作 ====================

/**
 * 添加历史记录
 */
export const addHistory = async (
    fileId: string,
    content: string,
    action: HistoryEntry['action'] = 'update'
): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HISTORY, 'readwrite');
        const store = transaction.objectStore(STORES.HISTORY);

        const entry: HistoryEntry = {
            id: `${fileId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            fileId,
            content,
            timestamp: Date.now(),
            action,
        };

        const request = store.add(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * 获取文件的历史记录
 */
export const getFileHistory = async (fileId: string, limit = 50): Promise<HistoryEntry[]> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HISTORY, 'readonly');
        const store = transaction.objectStore(STORES.HISTORY);
        const index = store.index('fileId');
        const request = index.getAll(fileId);

        request.onsuccess = () => {
            const results = request.result
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
};

/**
 * 清理旧的历史记录（保留最近 N 条）
 */
export const cleanupHistory = async (fileId: string, keepCount = 100): Promise<void> => {
    const db = await getDB();
    const history = await getFileHistory(fileId, 1000);

    if (history.length <= keepCount) return;

    const toDelete = history.slice(keepCount);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HISTORY, 'readwrite');
        const store = transaction.objectStore(STORES.HISTORY);

        toDelete.forEach(entry => store.delete(entry.id));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// ==================== 设置操作 ====================

/**
 * 获取设置
 */
export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.SETTINGS, 'readonly');
        const store = transaction.objectStore(STORES.SETTINGS);
        const request = store.get(key);

        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.value as T);
            } else {
                resolve(defaultValue);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

/**
 * 保存设置
 */
export const setSetting = async (key: string, value: unknown): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
        const store = transaction.objectStore(STORES.SETTINGS);
        const request = store.put({ key, value });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// ==================== 迁移工具 ====================

/**
 * 从 localStorage 迁移数据到 IndexedDB
 */
export const migrateFromLocalStorage = async (): Promise<boolean> => {
    try {
        const localData = localStorage.getItem('asciidoc-editor-storage');
        if (!localData) return false;

        const parsed = JSON.parse(localData);
        if (!parsed.state) return false;

        const { files, activeFileId, viewMode, darkMode } = parsed.state;

        // 迁移文件
        if (files && Array.isArray(files)) {
            await saveAllFiles(files);
        }

        // 迁移设置
        if (activeFileId) {
            await setSetting('activeFileId', activeFileId);
        }
        if (viewMode !== undefined) {
            await setSetting('viewMode', viewMode);
        }
        if (darkMode !== undefined) {
            await setSetting('darkMode', darkMode);
        }

        // 标记迁移完成（不删除 localStorage 数据作为备份）
        await setSetting('migratedFromLocalStorage', true);

        console.log('[IndexedDB] Migration from localStorage completed');
        return true;
    } catch (error) {
        console.error('[IndexedDB] Migration error:', error);
        return false;
    }
};

/**
 * 检查是否需要迁移
 */
export const needsMigration = async (): Promise<boolean> => {
    const migrated = await getSetting('migratedFromLocalStorage', false);
    if (migrated) return false;

    const localData = localStorage.getItem('asciidoc-editor-storage');
    return !!localData;
};

// ==================== Zustand 存储适配器 ====================

/**
 * 创建 Zustand IndexedDB 存储适配器
 */
export const createIndexedDBStorage = () => ({
    getItem: async (name: string): Promise<string | null> => {
        try {
            const value = await getSetting<string | null>(name, null);
            return value;
        } catch {
            return null;
        }
    },
    setItem: async (name: string, value: string): Promise<void> => {
        try {
            await setSetting(name, value);
        } catch (error) {
            console.error('[IndexedDB] setItem error:', error);
        }
    },
    removeItem: async (name: string): Promise<void> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
                const store = transaction.objectStore(STORES.SETTINGS);
                const request = store.delete(name);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('[IndexedDB] removeItem error:', error);
        }
    },
});

export default {
    initDatabase,
    getAllFiles,
    getFile,
    saveFile,
    saveAllFiles,
    deleteFile,
    addHistory,
    getFileHistory,
    cleanupHistory,
    getSetting,
    setSetting,
    migrateFromLocalStorage,
    needsMigration,
    createIndexedDBStorage,
};
