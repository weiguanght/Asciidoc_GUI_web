import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { BlockWrapper } from '../components/BlockWrapper';
import { FileIcon, Download, Music, Video } from 'lucide-react';

// Common logic for Block handling
const useBlockHandlers = (editor: any, getPos: any, node: any) => {
    const blockId = node.attrs.id || '';

    const handleAddBlock = (id: string, position: 'before' | 'after') => {
        if (typeof getPos !== 'function') return;
        const pos = getPos();
        const insertPos = position === 'before' ? pos : pos + node.nodeSize;

        editor.chain().focus().insertContentAt(insertPos, { type: 'paragraph' }).run();
    };

    const handleOpenMenu = (id: string, event: React.MouseEvent) => {
        event.preventDefault();
        if (typeof getPos !== 'function') return;

        const customEvent = new CustomEvent('block-menu-open', {
            detail: {
                blockId: id,
                x: event.clientX,
                y: event.clientY,
                pos: getPos(),
            },
        });
        document.dispatchEvent(customEvent);
    };

    return { blockId, handleAddBlock, handleOpenMenu };
};

export const VideoNodeView: React.FC<NodeViewProps> = ({ node, editor, getPos, updateAttributes }) => {
    const { src, width, height } = node.attrs;
    const isYoutube = src.includes('youtube.com') || src.includes('youtu.be');
    const { blockId, handleAddBlock, handleOpenMenu } = useBlockHandlers(editor, getPos, node);

    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('youtube.com/embed/')) return url;
        if (url.includes('youtube.com/watch?v=')) {
            const v = url.split('v=')[1]?.split('&')[0];
            return `https://www.youtube.com/embed/${v}`;
        }
        if (url.includes('youtu.be/')) {
            const v = url.split('youtu.be/')[1]?.split('?')[0];
            return `https://www.youtube.com/embed/${v}`;
        }
        return url;
    };

    const finalSrc = isYoutube ? getEmbedUrl(src) : src;

    return (
        <NodeViewWrapper className="media-node-view video-view relative group">
            <BlockWrapper
                blockId={blockId}
                onAddBlock={handleAddBlock}
                onOpenMenu={handleOpenMenu}
                editor={editor}
                getPos={getPos}
                nodeSize={node.nodeSize}
            >
                <div className="media-content rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex justify-center">
                    {src ? (
                        isYoutube ? (
                            <iframe
                                width={width || '100%'}
                                height={height || 400}
                                src={finalSrc}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full aspect-video"
                            />
                        ) : (
                            <video
                                src={src}
                                controls
                                className="max-w-full max-h-[500px]"
                                style={{ width: width || 'auto', height: height || 'auto' }}
                            />
                        )
                    ) : (
                        <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                            <Video size={32} />
                            <span>No Video Source</span>
                        </div>
                    )}
                </div>
            </BlockWrapper>
        </NodeViewWrapper>
    );
};

export const AudioNodeView: React.FC<NodeViewProps> = ({ node, editor, getPos }) => {
    const { src } = node.attrs;
    const { blockId, handleAddBlock, handleOpenMenu } = useBlockHandlers(editor, getPos, node);

    return (
        <NodeViewWrapper className="media-node-view audio-view relative group">
            <BlockWrapper
                blockId={blockId}
                onAddBlock={handleAddBlock}
                onOpenMenu={handleOpenMenu}
                editor={editor}
                getPos={getPos}
                nodeSize={node.nodeSize}
            >
                <div className="media-content p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center">
                    {src ? (
                        <audio src={src} controls className="w-full" />
                    ) : (
                        <div className="text-gray-400 text-sm flex items-center gap-2">
                            <Music size={20} />
                            <span>No Audio Source</span>
                        </div>
                    )}
                </div>
            </BlockWrapper>
        </NodeViewWrapper>
    );
};

export const FileNodeView: React.FC<NodeViewProps> = ({ node, editor, getPos }) => {
    const { src, title, size } = node.attrs;
    const { blockId, handleAddBlock, handleOpenMenu } = useBlockHandlers(editor, getPos, node);

    const fileName = title || src.split('/').pop() || 'Untitled';

    return (
        <NodeViewWrapper className="media-node-view file-view relative group">
            <BlockWrapper
                blockId={blockId}
                onAddBlock={handleAddBlock}
                onOpenMenu={handleOpenMenu}
                editor={editor}
                getPos={getPos}
                nodeSize={node.nodeSize}
            >
                <div className="media-content flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => window.open(src, '_blank')}>
                    <div className="p-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                        <FileIcon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {fileName}
                        </div>
                        {(size || src) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {size ? size : src}
                            </div>
                        )}
                    </div>
                    <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                        <Download size={16} />
                    </button>
                </div>
            </BlockWrapper>
        </NodeViewWrapper>
    );
};
