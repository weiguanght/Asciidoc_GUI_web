/**
 * 图片资源管理器
 * 处理图片的上传、存储和预览
 */

import React, { useState, useCallback } from 'react';
import { Image, Upload, X, Copy, Trash2 } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

// 图片项接口
export interface ImageItem {
    id: string;
    name: string;
    dataUrl: string;  // Base64 Data URL
    size: number;
    type: string;
    createdAt: number;
}

// 图片管理器状态（使用 localStorage）
const STORAGE_KEY = 'asciidoc-images';

const getStoredImages = (): ImageItem[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

const saveImages = (images: ImageItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
};

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
    const [images, setImages] = useState<ImageItem[]>(getStoredImages);
    const [uploading, setUploading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // 处理文件上传
    const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const newImages: ImageItem[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;

            // 转换为 Base64
            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            newImages.push({
                id: `img-${Date.now()}-${i}`,
                name: file.name,
                dataUrl,
                size: file.size,
                type: file.type,
                createdAt: Date.now(),
            });
        }

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        saveImages(updatedImages);
        setUploading(false);
        e.target.value = ''; // 重置 input
    }, [images]);

    // 删除图片
    const handleDelete = useCallback((id: string) => {
        const updatedImages = images.filter(img => img.id !== id);
        setImages(updatedImages);
        saveImages(updatedImages);
    }, [images]);

    // 复制 AsciiDoc 引用语法
    const handleCopyRef = useCallback((image: ImageItem) => {
        const ref = `image::${image.name}[]`;
        navigator.clipboard.writeText(ref);
        setCopiedId(image.id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

    // 插入图片到编辑器
    const handleInsert = useCallback((image: ImageItem) => {
        // 对于内嵌图片，使用 data URL
        const ref = `image::${image.dataUrl}[${image.name}]`;
        onInsertImage(ref);
        onClose();
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
                        />
                    </label>
                </div>

                {/* 图片列表 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {images.length === 0 ? (
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
                                        <img
                                            src={image.dataUrl}
                                            alt={image.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* 信息 */}
                                    <div className={`p-2 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                        <p className={`text-xs truncate ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                            {image.name}
                                        </p>
                                        <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                            {formatSize(image.size)}
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
                    Images are stored locally in your browser. Total: {images.length} images
                </div>
            </div>
        </div>
    );
};
