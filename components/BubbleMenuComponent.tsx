/**
 * BubbleMenuComponent - 浮动格式化菜单
 * 选中文本时显示，提供快速格式化选项
 * 
 * 增强功能：
 * - Turn into 下拉菜单（转换块类型）
 * - Notion 风格颜色选择器（文字色 + 背景色）
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
    ChevronDown,
    Type,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Quote,
    Palette,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

interface BubbleMenuComponentProps {
    editor: Editor;
}

// Notion 风格颜色配置
const notionColors = {
    text: [
        { name: 'Default', value: null },
        { name: 'Gray', value: '#9B9A97' },
        { name: 'Brown', value: '#64473A' },
        { name: 'Orange', value: '#D9730D' },
        { name: 'Yellow', value: '#CB912F' },
        { name: 'Green', value: '#448361' },
        { name: 'Blue', value: '#337EA9' },
        { name: 'Purple', value: '#9065B0' },
        { name: 'Pink', value: '#C14C8A' },
        { name: 'Red', value: '#D44C47' },
    ],
    background: [
        { name: 'Default', value: null },
        { name: 'Gray', value: '#EBECED' },
        { name: 'Brown', value: '#E9E5E3' },
        { name: 'Orange', value: '#FAEBDD' },
        { name: 'Yellow', value: '#FBF3DB' },
        { name: 'Green', value: '#DDEDEA' },
        { name: 'Blue', value: '#DDEBF1' },
        { name: 'Purple', value: '#EAE4F2' },
        { name: 'Pink', value: '#F4DFEB' },
        { name: 'Red', value: '#FBE4E4' },
    ],
};

// Turn into 菜单项
const turnIntoItems = [
    { name: 'Text', icon: Type, action: 'paragraph' },
    { name: 'Heading 1', icon: Heading1, action: 'heading', attrs: { level: 1 } },
    { name: 'Heading 2', icon: Heading2, action: 'heading', attrs: { level: 2 } },
    { name: 'Heading 3', icon: Heading3, action: 'heading', attrs: { level: 3 } },
    { name: 'Bullet List', icon: List, action: 'bulletList' },
    { name: 'Numbered List', icon: ListOrdered, action: 'orderedList' },
    { name: 'To-do List', icon: CheckSquare, action: 'taskList' },
    { name: 'Quote', icon: Quote, action: 'blockquote' },
];

export const BubbleMenuComponent: React.FC<BubbleMenuComponentProps> = ({ editor }) => {
    const { darkMode } = useEditorStore();
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showTurnIntoMenu, setShowTurnIntoMenu] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [colorTab, setColorTab] = useState<'text' | 'background'>('text');

    // 设置链接
    const setLink = useCallback(() => {
        if (!linkUrl) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

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

    // 执行 Turn into 操作
    const handleTurnInto = useCallback((item: typeof turnIntoItems[0]) => {
        setShowTurnIntoMenu(false);

        switch (item.action) {
            case 'paragraph':
                editor.chain().focus().setParagraph().run();
                break;
            case 'heading':
                editor.chain().focus().setNode('heading', item.attrs).run();
                break;
            case 'bulletList':
                editor.chain().focus().toggleBulletList().run();
                break;
            case 'orderedList':
                editor.chain().focus().toggleOrderedList().run();
                break;
            case 'taskList':
                editor.chain().focus().toggleTaskList().run();
                break;
            case 'blockquote':
                editor.chain().focus().toggleBlockquote().run();
                break;
        }
    }, [editor]);

    // 设置文字颜色
    const setTextColor = useCallback((color: string | null) => {
        if (color) {
            editor.chain().focus().setColor(color).run();
        } else {
            editor.chain().focus().unsetColor().run();
        }
        setShowColorPicker(false);
    }, [editor]);

    // 设置背景色（高亮）
    const setBackgroundColor = useCallback((color: string | null) => {
        if (color) {
            editor.chain().focus().toggleHighlight({ color }).run();
        } else {
            editor.chain().focus().unsetHighlight().run();
        }
        setShowColorPicker(false);
    }, [editor]);

    // 关闭所有弹出菜单
    const closeAllMenus = () => {
        setShowHighlightPicker(false);
        setShowTurnIntoMenu(false);
        setShowColorPicker(false);
    };

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
                onHide: closeAllMenus,
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
                    {/* Turn into 下拉菜单 */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                closeAllMenus();
                                setShowTurnIntoMenu(!showTurnIntoMenu);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${darkMode
                                ? 'text-slate-300 hover:bg-slate-600'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            title="Turn into"
                        >
                            <Type size={14} />
                            <span className="text-xs">Turn into</span>
                            <ChevronDown size={12} />
                        </button>

                        {showTurnIntoMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowTurnIntoMenu(false)}
                                />
                                <div
                                    className={`absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg border z-20 min-w-[160px] ${darkMode
                                        ? 'bg-slate-800 border-slate-700'
                                        : 'bg-white border-gray-200'
                                        }`}
                                >
                                    {turnIntoItems.map((item) => {
                                        const IconComponent = item.icon;
                                        return (
                                            <button
                                                key={item.name}
                                                onClick={() => handleTurnInto(item)}
                                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${darkMode
                                                    ? 'text-slate-300 hover:bg-slate-700'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <IconComponent size={14} />
                                                {item.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* 分隔线 */}
                    <div className={`w-px h-5 mx-0.5 ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />

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
                    <div className={`w-px h-5 mx-0.5 ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />

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

                    {/* 颜色选择器 (Notion 风格) */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                closeAllMenus();
                                setShowColorPicker(!showColorPicker);
                            }}
                            className={buttonClass(false)}
                            title="Color"
                        >
                            <Palette size={16} />
                        </button>

                        {showColorPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowColorPicker(false)}
                                />
                                <div
                                    className={`absolute top-full right-0 mt-1 p-2 rounded-lg shadow-lg border z-20 w-48 ${darkMode
                                        ? 'bg-slate-800 border-slate-700'
                                        : 'bg-white border-gray-200'
                                        }`}
                                >
                                    {/* 标签切换 */}
                                    <div className="flex gap-1 mb-2">
                                        <button
                                            onClick={() => setColorTab('text')}
                                            className={`flex-1 px-2 py-1 text-xs rounded ${colorTab === 'text'
                                                    ? darkMode ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-900'
                                                    : darkMode ? 'text-slate-400' : 'text-gray-500'
                                                }`}
                                        >
                                            Text
                                        </button>
                                        <button
                                            onClick={() => setColorTab('background')}
                                            className={`flex-1 px-2 py-1 text-xs rounded ${colorTab === 'background'
                                                    ? darkMode ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-900'
                                                    : darkMode ? 'text-slate-400' : 'text-gray-500'
                                                }`}
                                        >
                                            Background
                                        </button>
                                    </div>

                                    {/* 颜色网格 */}
                                    <div className="grid grid-cols-5 gap-1">
                                        {(colorTab === 'text' ? notionColors.text : notionColors.background).map((color) => (
                                            <button
                                                key={color.name}
                                                onClick={() =>
                                                    colorTab === 'text'
                                                        ? setTextColor(color.value)
                                                        : setBackgroundColor(color.value)
                                                }
                                                className={`w-7 h-7 rounded border flex items-center justify-center text-xs ${darkMode ? 'border-slate-600' : 'border-gray-200'
                                                    } hover:scale-110 transition-transform`}
                                                style={{
                                                    backgroundColor: colorTab === 'background' ? (color.value || 'transparent') : undefined,
                                                    color: colorTab === 'text' ? (color.value || 'inherit') : undefined,
                                                }}
                                                title={color.name}
                                            >
                                                {color.value === null ? (
                                                    <X size={12} className={darkMode ? 'text-slate-400' : 'text-gray-400'} />
                                                ) : colorTab === 'text' ? (
                                                    'A'
                                                ) : null}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 高亮（保留旧版快速高亮） */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                closeAllMenus();
                                setShowHighlightPicker(!showHighlightPicker);
                            }}
                            className={buttonClass(editor.isActive('highlight'))}
                            title="Highlight"
                        >
                            <Highlighter size={16} />
                        </button>

                        {showHighlightPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowHighlightPicker(false)}
                                />
                                <div
                                    className={`absolute top-full right-0 mt-1 p-1.5 rounded-lg shadow-lg border z-20 ${darkMode
                                        ? 'bg-slate-800 border-slate-700'
                                        : 'bg-white border-gray-200'
                                        }`}
                                >
                                    <div className="flex gap-1">
                                        {notionColors.background.slice(1).map((color) => (
                                            <button
                                                key={color.name}
                                                onClick={() => {
                                                    editor.chain().focus().toggleHighlight({ color: color.value! }).run();
                                                    setShowHighlightPicker(false);
                                                }}
                                                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                style={{ backgroundColor: color.value! }}
                                                title={color.name}
                                            />
                                        ))}
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
