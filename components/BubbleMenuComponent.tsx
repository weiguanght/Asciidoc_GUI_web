/**
 * BubbleMenuComponent - 浮动格式化菜单
 * 选中文本时显示，提供快速格式化选项
 */

import React, { useState, useCallback } from 'react';
import { BubbleMenu } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Link as LinkIcon,
    Highlighter,
    Code,
    X,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

interface BubbleMenuComponentProps {
    editor: Editor;
}

export const BubbleMenuComponent: React.FC<BubbleMenuComponentProps> = ({ editor }) => {
    const { darkMode } = useEditorStore();
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    // 高亮颜色列表
    const highlightColors = [
        { name: 'Yellow', color: '#fef08a' },
        { name: 'Green', color: '#bbf7d0' },
        { name: 'Blue', color: '#bfdbfe' },
        { name: 'Pink', color: '#fbcfe8' },
        { name: 'Orange', color: '#fed7aa' },
    ];

    const [showHighlightPicker, setShowHighlightPicker] = useState(false);

    // 设置链接
    const setLink = useCallback(() => {
        if (!linkUrl) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // 自动添加 https:// 如果没有协议
        const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`;

        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();

        setLinkUrl('');
        setShowLinkInput(false);
    }, [editor, linkUrl]);

    // 取消链接
    const unsetLink = useCallback(() => {
        editor.chain().focus().unsetLink().run();
    }, [editor]);

    // 打开链接编辑
    const openLinkInput = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href || '';
        setLinkUrl(previousUrl);
        setShowLinkInput(true);
    }, [editor]);

    // 工具按钮样式
    const buttonClass = (isActive: boolean) =>
        `p-1.5 rounded transition-colors ${isActive
            ? darkMode
                ? 'bg-blue-500/30 text-blue-400'
                : 'bg-blue-100 text-blue-600'
            : darkMode
                ? 'text-slate-300 hover:bg-slate-600'
                : 'text-gray-700 hover:bg-gray-100'
        }`;

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{
                duration: 100,
                placement: 'top',
            }}
            className={`flex items-center gap-0.5 p-1 rounded-lg shadow-xl border ${darkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-gray-200'
                }`}
        >
            {showLinkInput ? (
                // 链接输入模式
                <div className="flex items-center gap-1 px-1">
                    <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                setLink();
                            }
                            if (e.key === 'Escape') {
                                setShowLinkInput(false);
                                setLinkUrl('');
                            }
                        }}
                        placeholder="Enter URL..."
                        className={`w-48 px-2 py-1 text-sm rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode
                                ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}
                        autoFocus
                    />
                    <button
                        onClick={setLink}
                        className={`px-2 py-1 text-sm font-medium rounded ${darkMode
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                    >
                        Save
                    </button>
                    <button
                        onClick={() => {
                            setShowLinkInput(false);
                            setLinkUrl('');
                        }}
                        className={`p-1 rounded ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                // 格式化按钮模式
                <>
                    {/* 粗体 */}
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={buttonClass(editor.isActive('bold'))}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold size={16} />
                    </button>

                    {/* 斜体 */}
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={buttonClass(editor.isActive('italic'))}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic size={16} />
                    </button>

                    {/* 下划线 */}
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={buttonClass(editor.isActive('underline'))}
                        title="Underline (Ctrl+U)"
                    >
                        <UnderlineIcon size={16} />
                    </button>

                    {/* 删除线 */}
                    <button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={buttonClass(editor.isActive('strike'))}
                        title="Strikethrough"
                    >
                        <Strikethrough size={16} />
                    </button>

                    {/* 分隔线 */}
                    <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />

                    {/* 行内代码 */}
                    <button
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={buttonClass(editor.isActive('code'))}
                        title="Inline Code"
                    >
                        <Code size={16} />
                    </button>

                    {/* 链接 */}
                    <button
                        onClick={editor.isActive('link') ? unsetLink : openLinkInput}
                        className={buttonClass(editor.isActive('link'))}
                        title={editor.isActive('link') ? 'Remove Link' : 'Add Link'}
                    >
                        <LinkIcon size={16} />
                    </button>

                    {/* 高亮 */}
                    <div className="relative">
                        <button
                            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                            className={buttonClass(editor.isActive('highlight'))}
                            title="Highlight"
                        >
                            <Highlighter size={16} />
                        </button>

                        {/* 高亮颜色选择器 */}
                        {showHighlightPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowHighlightPicker(false)}
                                />
                                <div
                                    className={`absolute top-full left-0 mt-1 p-1.5 rounded-lg shadow-lg border z-20 ${darkMode
                                            ? 'bg-slate-800 border-slate-700'
                                            : 'bg-white border-gray-200'
                                        }`}
                                >
                                    <div className="flex gap-1">
                                        {highlightColors.map(({ name, color }) => (
                                            <button
                                                key={name}
                                                onClick={() => {
                                                    editor.chain().focus().toggleHighlight({ color }).run();
                                                    setShowHighlightPicker(false);
                                                }}
                                                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                style={{ backgroundColor: color }}
                                                title={name}
                                            />
                                        ))}
                                        {/* 移除高亮 */}
                                        <button
                                            onClick={() => {
                                                editor.chain().focus().unsetHighlight().run();
                                                setShowHighlightPicker(false);
                                            }}
                                            className={`w-6 h-6 rounded border flex items-center justify-center ${darkMode ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'
                                                }`}
                                            title="Remove Highlight"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </BubbleMenu>
    );
};

export default BubbleMenuComponent;
