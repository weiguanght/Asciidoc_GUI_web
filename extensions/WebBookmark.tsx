/**
 * Web Bookmark Extension - 网页书签扩展
 * 
 * 显示网页的预览信息（标题、描述、图片）
 * TODO: 实际的元数据抓取需要在后端或通过 API 实现，目前仅为前端 UI 展示
 */

import { Node, mergeAttributes, Extension } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Globe, Loader2 } from 'lucide-react';

// ============================================
// Web Bookmark 组件
// ============================================

const WebBookmarkComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
    const url = node.attrs.url;
    const [title, setTitle] = useState(node.attrs.title || '');
    const [description, setDescription] = useState(node.attrs.description || '');
    const [image, setImage] = useState(node.attrs.image || '');
    const [loading, setLoading] = useState(!node.attrs.title && !!url);
    const [error, setError] = useState(false);

    // 模拟获取元数据 (实际项目应替换为真实的 API 调用)
    useEffect(() => {
        if (url && !node.attrs.title && !error) {
            setLoading(true);

            // 模拟 API 延迟
            const timer = setTimeout(() => {
                // 简单的模拟数据，基于 URL
                const mockData = {
                    title: `Website: ${new URL(url).hostname}`,
                    description: 'This is a preview of the website. Real metadata fetching requires a backend service.',
                    image: 'https://placehold.co/200x200/e2e8f0/64748b?text=Preview',
                };

                setTitle(mockData.title);
                setDescription(mockData.description);
                setImage(mockData.image);

                updateAttributes({
                    title: mockData.title,
                    description: mockData.description,
                    image: mockData.image,
                });
                setLoading(false);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [url, node.attrs.title, error, updateAttributes]);

    return (
        <NodeViewWrapper className="web-bookmark-wrapper my-4">
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none no-underline ${selected ? 'ring-2 ring-blue-400' : ''}`}
                contentEditable={false}
            >
                {/* 文本区域 */}
                <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">Loading preview...</span>
                        </div>
                    ) : (
                        <>
                            <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate mb-1" title={title}>
                                {title || url}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 md:line-clamp-1 mb-2">
                                {description || 'No description available.'}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Globe size={12} />
                                <span className="truncate">{url}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* 图片区域 */}
                {!loading && image && (
                    <div className="w-[120px] bg-gray-100 dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 bg-cover bg-center"
                        style={{ backgroundImage: `url(${image})` }}
                    />
                )}
            </a>
        </NodeViewWrapper>
    );
};

// ============================================
// Tiptap Node 定义
// ============================================

export const WebBookmark = Node.create({
    name: 'webBookmark',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            url: {
                default: null,
            },
            title: {
                default: null,
            },
            description: {
                default: null,
            },
            image: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-web-bookmark]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-web-bookmark': '' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(WebBookmarkComponent);
    },

    addCommands() {
        return {
            setWebBookmark: (url: string) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: { url },
                });
            },
        } as any;
    },
});

export default WebBookmark;
