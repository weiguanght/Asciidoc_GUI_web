/**
 * 图片资源管理器 (v2)
 * 使用 IndexedDB 存储图片，管理 Blob URL 生命周期
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Image, Upload, X, Copy, Trash2, AlertCircle } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import {
    putImage,
    getImage,
    deleteImage,
    getAllImages,
    createImageUrl,
    revokeImageUrl,
    revokeAllImageUrls,
    dataUrlToBlob,
    StoredImage,
    ImageMetadata,
} from '../lib/image-service';

// 显示用的图片项（带 Blob URL）
interface DisplayImage {
    id: string;
    metadata: ImageMetadata;
    blobUrl: string | null;
}

interface ImageManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertImage: (imageRef: string) => void;
}

export const ImageManagerDialog: React.FC<ImageManagerDialogProps> = ({
    isOpen,
    onClose,
    onInsertImage,
}) => {
    const { darkMode } = useEditorStore();
    const [images, setImages] = useState<DisplayImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // 跟踪已创建的 Blob URL（用于清理）
    const blobUrlsRef = useRef<Set<string>>(new Set());

    // 加载图片列表
    const loadImages = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const storedImages = await getAllImages();

            // 为每个图片创建 Blob URL
            const displayImages: DisplayImage[] = await Promise.all(
                storedImages.map(async (img) => {
                    const blobUrl = await createImageUrl(img.id);
                    if (blobUrl) {
                        blobUrlsRef.current.add(img.id);
                    }
                    return {
                        id: img.id,
                        metadata: img.metadata,
                        blobUrl,
                    };
                })
            );

            setImages(displayImages);
        } catch (err) {
            console.error('[ImageManager] Load error:', err);
            setError('Failed to load images');
        } finally {
            setLoading(false);
        }
    }, []);

    // 组件挂载时加载图片
    useEffect(() => {
        if (isOpen) {
            loadImages();
        }
    }, [isOpen, loadImages]);

    // 组件卸载时清理所有 Blob URL
    useEffect(() => {
        return () => {
            console.log('[ImageManager] Cleaning up Blob URLs on unmount');
            revokeAllImageUrls();
            blobUrlsRef.current.clear();
        };
    }, []);

    // 处理文件上传
    const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.type.startsWith('image/')) continue;

                // 存储到 IndexedDB
                const stored = await putImage(file, file.name);

                // 创建 Blob URL 用于显示
                const blobUrl = await createImageUrl(stored.id);
                if (blobUrl) {
                    blobUrlsRef.current.add(stored.id);
                }

                setImages(prev => [...prev, {
                    id: stored.id,
                    metadata: stored.metadata,
                    blobUrl,
                }]);
            }
        } catch (err) {
            console.error('[ImageManager] Upload error:', err);
            setError('Failed to upload image');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    }, []);

    // 删除图片
    const handleDelete = useCallback(async (id: string) => {
        try {
            // 释放 Blob URL
            revokeImageUrl(id);
            blobUrlsRef.current.delete(id);

            // 从 IndexedDB 删除
            await deleteImage(id);

            // 更新状态
            setImages(prev => prev.filter(img => img.id !== id));
        } catch (err) {
            console.error('[ImageManager] Delete error:', err);
            setError('Failed to delete image');
        }
    }, []);

    // 复制 AsciiDoc 引用语法
    const handleCopyRef = useCallback((image: DisplayImage) => {
        const ref = `image::${image.metadata.name}[]`;
        navigator.clipboard.writeText(ref);
        setCopiedId(image.id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

    // 插入图片到编辑器
    const handleInsert = useCallback(async (image: DisplayImage) => {
        // 使用 Blob URL 作为 src
        if (image.blobUrl) {
            const ref = `image::${image.blobUrl}[${image.metadata.name}]`;
            onInsertImage(ref);
            onClose();
        }
    }, [onInsertImage, onClose]);

    // 格式化文件大小
    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl overflow-hidden flex flex-col ${darkMode ? 'bg-slate-800' : 'bg-white'
                }`}>
                {/* 标题栏 */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        <Image size={20} className="text-blue-500" />
                        <h2 className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                            Image Manager
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                    >
                        <X size={20} className={darkMode ? 'text-slate-400' : 'text-gray-500'} />
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* 上传区域 */}
                <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    <label className={`flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${darkMode
                        ? 'border-slate-600 hover:border-blue-500 hover:bg-slate-700/50'
                        : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}>
                        <Upload size={20} className={darkMode ? 'text-slate-400' : 'text-gray-400'} />
                        <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {uploading ? 'Uploading...' : 'Click or drag images here'}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                </div>

                {/* 图片列表 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                            Loading...
                        </div>
                    ) : images.length === 0 ? (
                        <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                            No images uploaded yet
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {images.map((image) => (
                                <div
                                    key={image.id}
                                    className={`group relative rounded-lg overflow-hidden border ${darkMode ? 'border-slate-700 bg-slate-700/50' : 'border-gray-200 bg-gray-50'
                                        }`}
                                >
                                    {/* 预览图 */}
                                    <div className="aspect-square overflow-hidden">
                                        {image.blobUrl ? (
                                            <img
                                                src={image.blobUrl}
                                                alt={image.metadata.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                                <Image size={32} className={darkMode ? 'text-slate-500' : 'text-gray-400'} />
                                            </div>
                                        )}
                                    </div>

                                    {/* 信息 */}
                                    <div className={`p-2 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                        <p className={`text-xs truncate ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                            {image.metadata.name}
                                        </p>
                                        <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                            {formatSize(image.metadata.size)}
                                        </p>
                                    </div>

                                    {/* 操作按钮 */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleInsert(image)}
                                            className="p-1.5 rounded bg-blue-500 text-white hover:bg-blue-600"
                                            title="Insert into document"
                                        >
                                            <Image size={12} />
                                        </button>
                                        <button
                                            onClick={() => handleCopyRef(image)}
                                            className={`p-1.5 rounded ${copiedId === image.id
                                                ? 'bg-green-500 text-white'
                                                : darkMode ? 'bg-slate-600 text-slate-200 hover:bg-slate-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                            title="Copy reference"
                                        >
                                            <Copy size={12} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(image.id)}
                                            className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 底部提示 */}
                <div className={`px-4 py-2 text-[10px] border-t ${darkMode ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'
                    }`}>
                    Images stored in IndexedDB. Total: {images.length} images
                </div>
            </div>
        </div>
    );
};

export default ImageManagerDialog;
