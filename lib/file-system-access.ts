/**
 * File System Access API 模块
 * 支持直接读写本地磁盘上的 .adoc 文件
 */

// 文件句柄缓存（用于"保存"操作）
const fileHandleCache = new Map<string, FileSystemFileHandle>();

/**
 * 检查浏览器是否支持 File System Access API
 */
export const isFileSystemAccessSupported = (): boolean => {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
};

/**
 * 打开本地 .adoc 文件
 * @returns 文件内容和文件名，如果取消则返回 null
 */
export const openLocalFile = async (): Promise<{
    content: string;
    name: string;
    handle: FileSystemFileHandle;
} | null> => {
    if (!isFileSystemAccessSupported()) {
        // 回退到传统文件输入
        return openLocalFileFallback();
    }

    try {
        const [handle] = await window.showOpenFilePicker({
            types: [
                {
                    description: 'AsciiDoc Files',
                    accept: {
                        'text/asciidoc': ['.adoc', '.asc', '.asciidoc'],
                        'text/plain': ['.txt'],
                    },
                },
            ],
            multiple: false,
        });

        const file = await handle.getFile();
        const content = await file.text();

        // 缓存文件句柄
        fileHandleCache.set(file.name, handle);

        return {
            content,
            name: file.name,
            handle,
        };
    } catch (error) {
        // 用户取消或发生错误
        if ((error as Error).name === 'AbortError') {
            return null;
        }
        console.error('[FileSystemAccess] Open error:', error);
        throw error;
    }
};

/**
 * 传统文件打开（回退方案）
 */
const openLocalFileFallback = (): Promise<{
    content: string;
    name: string;
    handle: FileSystemFileHandle;
} | null> => {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.adoc,.asc,.asciidoc,.txt';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                resolve(null);
                return;
            }

            const content = await file.text();
            resolve({
                content,
                name: file.name,
                handle: null as unknown as FileSystemFileHandle, // 回退模式无句柄
            });
        };

        input.oncancel = () => resolve(null);
        input.click();
    });
};

/**
 * 保存到本地文件（使用已有句柄）
 * @param content 文件内容
 * @param fileName 文件名（用于查找缓存的句柄）
 * @returns 是否保存成功
 */
export const saveLocalFile = async (
    content: string,
    fileName: string
): Promise<boolean> => {
    const handle = fileHandleCache.get(fileName);

    if (handle && isFileSystemAccessSupported()) {
        try {
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            console.log('[FileSystemAccess] Saved to:', fileName);
            return true;
        } catch (error) {
            console.error('[FileSystemAccess] Save error:', error);
            // 可能权限已过期，尝试另存为
            return saveLocalFileAs(content, fileName);
        }
    }

    // 没有句柄，执行另存为
    return saveLocalFileAs(content, fileName);
};

/**
 * 另存为本地文件
 * @param content 文件内容
 * @param suggestedName 建议的文件名
 * @returns 是否保存成功
 */
export const saveLocalFileAs = async (
    content: string,
    suggestedName: string = 'document.adoc'
): Promise<boolean> => {
    if (!isFileSystemAccessSupported()) {
        // 回退到下载方式
        return saveLocalFileFallback(content, suggestedName);
    }

    try {
        const handle = await window.showSaveFilePicker({
            suggestedName,
            types: [
                {
                    description: 'AsciiDoc Files',
                    accept: {
                        'text/asciidoc': ['.adoc'],
                    },
                },
            ],
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        // 更新缓存
        const file = await handle.getFile();
        fileHandleCache.set(file.name, handle);

        console.log('[FileSystemAccess] Saved as:', file.name);
        return true;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            return false; // 用户取消
        }
        console.error('[FileSystemAccess] Save as error:', error);
        throw error;
    }
};

/**
 * 传统下载保存（回退方案）
 */
const saveLocalFileFallback = (
    content: string,
    fileName: string
): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve(true);
        } catch (error) {
            console.error('[FileSystemAccess] Fallback save error:', error);
            resolve(false);
        }
    });
};

/**
 * 获取缓存的文件句柄
 */
export const getCachedHandle = (fileName: string): FileSystemFileHandle | undefined => {
    return fileHandleCache.get(fileName);
};

/**
 * 设置文件句柄缓存
 */
export const setCachedHandle = (fileName: string, handle: FileSystemFileHandle): void => {
    fileHandleCache.set(fileName, handle);
};

/**
 * 清除文件句柄缓存
 */
export const clearCachedHandle = (fileName: string): void => {
    fileHandleCache.delete(fileName);
};

/**
 * 请求持久化存储权限
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log('[Storage] Persistent storage:', isPersisted ? 'granted' : 'denied');
        return isPersisted;
    }
    return false;
};

/**
 * 检查存储使用情况
 */
export const getStorageEstimate = async (): Promise<{
    usage: number;
    quota: number;
    usagePercent: number;
} | null> => {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        return {
            usage,
            quota,
            usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
        };
    }
    return null;
};

// TypeScript 类型声明扩展
declare global {
    interface Window {
        showOpenFilePicker: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
        showSaveFilePicker: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
    }

    interface OpenFilePickerOptions {
        types?: FilePickerAcceptType[];
        excludeAcceptAllOption?: boolean;
        multiple?: boolean;
    }

    interface SaveFilePickerOptions {
        suggestedName?: string;
        types?: FilePickerAcceptType[];
        excludeAcceptAllOption?: boolean;
    }

    interface FilePickerAcceptType {
        description?: string;
        accept: Record<string, string[]>;
    }
}

export default {
    isFileSystemAccessSupported,
    openLocalFile,
    saveLocalFile,
    saveLocalFileAs,
    getCachedHandle,
    setCachedHandle,
    clearCachedHandle,
    requestPersistentStorage,
    getStorageEstimate,
};
