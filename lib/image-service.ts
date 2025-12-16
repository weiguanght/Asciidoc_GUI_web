/**
 * ImageService - 图片存储服务
 * 使用 IndexedDB 存储图片，管理 Blob URL 生命周期
 */

// 数据库配置
const DB_NAME = 'AsciiDocEditorImages';
const DB_VERSION = 1;
const STORE_NAME = 'images';

// 图片元数据
export interface ImageMetadata {
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: number;
    documentId?: string;
}

// 存储的图片对象
export interface StoredImage {
    id: string;
    metadata: ImageMetadata;
    blob: Blob;
}

// Blob URL 缓存（用于生命周期管理）
const blobUrlCache = new Map<string, string>();

/**
 * 打开/创建数据库
 */
const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('documentId', 'metadata.documentId', { unique: false });
                store.createIndex('name', 'metadata.name', { unique: false });
            }
        };
    });
};

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 存储图片
 */
export const putImage = async (
    blob: Blob,
    name: string,
    documentId?: string
): Promise<StoredImage> => {
    const db = await openDatabase();

    const id = generateId();
    const metadata: ImageMetadata = {
        id,
        name,
        type: blob.type,
        size: blob.size,
        createdAt: Date.now(),
        documentId,
    };

    const storedImage: StoredImage = { id, metadata, blob };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(storedImage);

        request.onsuccess = () => {
            db.close();
            resolve(storedImage);
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
};

/**
 * 获取图片
 */
export const getImage = async (id: string): Promise<StoredImage | null> => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            db.close();
            resolve(request.result || null);
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
};

/**
 * 删除图片
 */
export const deleteImage = async (id: string): Promise<void> => {
    // 先释放 Blob URL
    revokeImageUrl(id);

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            db.close();
            resolve();
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
};

/**
 * 获取文档的所有图片
 */
export const getImagesByDocument = async (documentId: string): Promise<StoredImage[]> => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('documentId');
        const request = index.getAll(documentId);

        request.onsuccess = () => {
            db.close();
            resolve(request.result || []);
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
};

/**
 * 获取所有图片
 */
export const getAllImages = async (): Promise<StoredImage[]> => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            db.close();
            resolve(request.result || []);
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
};

/**
 * 创建 Blob URL（带缓存和生命周期管理）
 */
export const createImageUrl = async (id: string): Promise<string | null> => {
    // 检查缓存
    if (blobUrlCache.has(id)) {
        return blobUrlCache.get(id)!;
    }

    // 从 IndexedDB 获取
    const image = await getImage(id);
    if (!image) return null;

    // 创建并缓存 Blob URL
    const url = URL.createObjectURL(image.blob);
    blobUrlCache.set(id, url);

    return url;
};

/**
 * 释放 Blob URL
 */
export const revokeImageUrl = (id: string): void => {
    const url = blobUrlCache.get(id);
    if (url) {
        URL.revokeObjectURL(url);
        blobUrlCache.delete(id);
        console.log(`[ImageService] Revoked Blob URL for ${id}`);
    }
};

/**
 * 释放所有 Blob URL（组件卸载时调用）
 */
export const revokeAllImageUrls = (): void => {
    for (const [id, url] of blobUrlCache) {
        URL.revokeObjectURL(url);
        console.log(`[ImageService] Revoked Blob URL for ${id}`);
    }
    blobUrlCache.clear();
};

/**
 * 从 Base64 Data URL 创建 Blob
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
    const [header, data] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(data);
    const array = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], { type: mime });
};

/**
 * 从 Data URL 导入图片到 IndexedDB
 */
export const importFromDataUrl = async (
    dataUrl: string,
    name: string,
    documentId?: string
): Promise<StoredImage> => {
    const blob = dataUrlToBlob(dataUrl);
    return putImage(blob, name, documentId);
};

/**
 * 获取存储使用情况
 */
export const getStorageUsage = async (): Promise<{
    count: number;
    totalSize: number;
}> => {
    const images = await getAllImages();
    const totalSize = images.reduce((sum, img) => sum + img.metadata.size, 0);

    return {
        count: images.length,
        totalSize,
    };
};

/**
 * 清理未使用的图片（不在任何文档中引用）
 */
export const cleanupOrphanImages = async (
    usedImageIds: Set<string>
): Promise<number> => {
    const allImages = await getAllImages();
    let deletedCount = 0;

    for (const image of allImages) {
        if (!usedImageIds.has(image.id)) {
            await deleteImage(image.id);
            deletedCount++;
        }
    }

    console.log(`[ImageService] Cleaned up ${deletedCount} orphan images`);
    return deletedCount;
};

export default {
    putImage,
    getImage,
    deleteImage,
    getImagesByDocument,
    getAllImages,
    createImageUrl,
    revokeImageUrl,
    revokeAllImageUrls,
    dataUrlToBlob,
    importFromDataUrl,
    getStorageUsage,
    cleanupOrphanImages,
};
