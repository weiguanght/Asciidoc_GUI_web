/**
 * 文档属性面板组件
 * 管理 AsciiDoc 文档头部属性（Header Attributes）
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Plus, Trash2, Settings2 } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

// 常用属性预设
const PRESET_ATTRIBUTES = [
    { key: 'toc', value: '', description: 'Table of Contents' },
    { key: 'toc-title', value: 'Contents', description: 'TOC title' },
    { key: 'toclevels', value: '3', description: 'TOC depth level' },
    { key: 'sectnums', value: '', description: 'Section numbering' },
    { key: 'author', value: '', description: 'Author name' },
    { key: 'email', value: '', description: 'Author email' },
    { key: 'revdate', value: '', description: 'Revision date' },
    { key: 'revnumber', value: '', description: 'Revision number' },
    { key: 'description', value: '', description: 'Document description' },
    { key: 'keywords', value: '', description: 'Document keywords' },
    { key: 'icons', value: 'font', description: 'Icon type (font/image)' },
    { key: 'source-highlighter', value: 'highlight.js', description: 'Code highlighter' },
    { key: 'imagesdir', value: './images', description: 'Images directory' },
    { key: 'experimental', value: '', description: 'Enable experimental features' },
];

// 属性条目
interface AttributeEntry {
    key: string;
    value: string;
    isNegated?: boolean; // :!key: 格式
}

// 从内容解析属性
const parseAttributes = (content: string): AttributeEntry[] => {
    const attrs: AttributeEntry[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
        // 匹配 :key: value 或 :key: 或 :!key:
        const match = line.match(/^:(!?)(\w[\w-]*):(.*)?$/);
        if (match) {
            attrs.push({
                key: match[2],
                value: match[3]?.trim() || '',
                isNegated: match[1] === '!',
            });
        } else if (line.trim() && !line.startsWith(':') && !line.startsWith('//')) {
            // 遇到非属性行，停止解析
            break;
        }
    }

    return attrs;
};

// 序列化属性到 AsciiDoc
const serializeAttributes = (attrs: AttributeEntry[]): string => {
    return attrs.map(attr => {
        const prefix = attr.isNegated ? '!' : '';
        const value = attr.value ? ` ${attr.value}` : '';
        return `:${prefix}${attr.key}:${value}`;
    }).join('\n');
};

// 更新内容中的属性
const updateContentAttributes = (content: string, newAttrs: AttributeEntry[]): string => {
    const lines = content.split('\n');
    let attrEndIndex = 0;

    // 找到属性区域的结束位置
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^:(!?)(\w[\w-]*):(.*)?$/) || line.trim() === '' || line.startsWith('//')) {
            attrEndIndex = i + 1;
        } else if (line.startsWith('= ')) {
            // 跳过标题行
            continue;
        } else {
            break;
        }
    }

    // 找到标题行
    let titleLine = '';
    let titleIndex = -1;
    for (let i = 0; i < attrEndIndex; i++) {
        if (lines[i].startsWith('= ')) {
            titleLine = lines[i];
            titleIndex = i;
            break;
        }
    }

    // 构建新内容
    const contentPart = lines.slice(attrEndIndex).join('\n');
    const attrPart = serializeAttributes(newAttrs);

    if (titleLine) {
        return `${titleLine}\n${attrPart}${attrPart ? '\n' : ''}\n${contentPart}`;
    } else {
        return `${attrPart}${attrPart ? '\n' : ''}\n${contentPart}`;
    }
};

interface AttributesPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AttributesPanel: React.FC<AttributesPanelProps> = ({ isOpen, onClose }) => {
    const { sourceContent, setSourceContent, darkMode } = useEditorStore();
    const [attributes, setAttributes] = useState<AttributeEntry[]>([]);
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [showPresets, setShowPresets] = useState(false);

    // 解析当前内容中的属性
    useEffect(() => {
        if (isOpen) {
            setAttributes(parseAttributes(sourceContent));
        }
    }, [isOpen, sourceContent]);

    // 添加属性
    const addAttribute = useCallback(() => {
        if (!newKey.trim()) return;

        const newAttrs = [...attributes, { key: newKey.trim(), value: newValue.trim() }];
        setAttributes(newAttrs);
        setNewKey('');
        setNewValue('');

        // 更新源内容
        const updatedContent = updateContentAttributes(sourceContent, newAttrs);
        setSourceContent(updatedContent, 'SOURCE');
    }, [newKey, newValue, attributes, sourceContent, setSourceContent]);

    // 删除属性
    const removeAttribute = useCallback((index: number) => {
        const newAttrs = attributes.filter((_, i) => i !== index);
        setAttributes(newAttrs);

        const updatedContent = updateContentAttributes(sourceContent, newAttrs);
        setSourceContent(updatedContent, 'SOURCE');
    }, [attributes, sourceContent, setSourceContent]);

    // 更新属性值
    const updateAttribute = useCallback((index: number, value: string) => {
        const newAttrs = [...attributes];
        newAttrs[index] = { ...newAttrs[index], value };
        setAttributes(newAttrs);

        const updatedContent = updateContentAttributes(sourceContent, newAttrs);
        setSourceContent(updatedContent, 'SOURCE');
    }, [attributes, sourceContent, setSourceContent]);

    // 从预设添加
    const addFromPreset = useCallback((preset: typeof PRESET_ATTRIBUTES[0]) => {
        if (attributes.some(a => a.key === preset.key)) return;

        const newAttrs = [...attributes, { key: preset.key, value: preset.value }];
        setAttributes(newAttrs);
        setShowPresets(false);

        const updatedContent = updateContentAttributes(sourceContent, newAttrs);
        setSourceContent(updatedContent, 'SOURCE');
    }, [attributes, sourceContent, setSourceContent]);

    if (!isOpen) return null;

    return (
        <>
            {/* 背景遮罩 */}
            <div
                className="fixed inset-0 bg-black/30 z-50"
                onClick={onClose}
            />

            {/* 面板 */}
            <div className={`
        fixed right-0 top-0 bottom-0 w-96 z-50
        ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-900'}
        shadow-2xl flex flex-col
      `}>
                {/* 头部 */}
                <div className={`
          flex items-center justify-between p-4 border-b
          ${darkMode ? 'border-slate-700' : 'border-gray-200'}
        `}>
                    <div className="flex items-center gap-2">
                        <Settings2 size={20} className="text-blue-500" />
                        <h2 className="font-semibold">Document Attributes</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 属性列表 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {attributes.length === 0 ? (
                        <div className={`text-sm ${darkMode ? 'text-slate-500' : 'text-gray-400'} text-center py-8`}>
                            No attributes defined
                        </div>
                    ) : (
                        attributes.map((attr, index) => (
                            <div
                                key={`${attr.key}-${index}`}
                                className={`
                  flex items-center gap-2 p-3 rounded-lg
                  ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}
                `}
                            >
                                <div className="flex-1">
                                    <div className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                        :{attr.isNegated ? '!' : ''}{attr.key}:
                                    </div>
                                    <input
                                        type="text"
                                        value={attr.value}
                                        onChange={(e) => updateAttribute(index, e.target.value)}
                                        placeholder="(empty)"
                                        className={`
                      w-full mt-1 px-2 py-1 text-sm rounded border
                      ${darkMode
                                                ? 'bg-slate-600 border-slate-500 text-slate-200 placeholder-slate-400'
                                                : 'bg-white border-gray-300 placeholder-gray-400'
                                            }
                      focus:outline-none focus:ring-1 focus:ring-blue-500
                    `}
                                    />
                                </div>
                                <button
                                    onClick={() => removeAttribute(index)}
                                    className={`p-1.5 rounded ${darkMode ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* 添加新属性 */}
                <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            placeholder="Attribute name"
                            className={`
                flex-1 px-3 py-2 text-sm rounded-lg border
                ${darkMode
                                    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400'
                                    : 'bg-white border-gray-300 placeholder-gray-400'
                                }
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
                            onKeyDown={(e) => e.key === 'Enter' && addAttribute()}
                        />
                        <input
                            type="text"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="Value"
                            className={`
                flex-1 px-3 py-2 text-sm rounded-lg border
                ${darkMode
                                    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400'
                                    : 'bg-white border-gray-300 placeholder-gray-400'
                                }
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
                            onKeyDown={(e) => e.key === 'Enter' && addAttribute()}
                        />
                        <button
                            onClick={addAttribute}
                            disabled={!newKey.trim()}
                            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* 预设按钮 */}
                    <button
                        onClick={() => setShowPresets(!showPresets)}
                        className={`
              w-full py-2 text-sm rounded-lg
              ${darkMode
                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
            `}
                    >
                        {showPresets ? 'Hide Presets' : 'Show Common Presets'}
                    </button>

                    {/* 预设列表 */}
                    {showPresets && (
                        <div className={`
              mt-3 p-3 rounded-lg max-h-48 overflow-y-auto
              ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}
            `}>
                            <div className="grid grid-cols-2 gap-2">
                                {PRESET_ATTRIBUTES.filter(p => !attributes.some(a => a.key === p.key)).map(preset => (
                                    <button
                                        key={preset.key}
                                        onClick={() => addFromPreset(preset)}
                                        className={`
                      text-left px-2 py-1.5 rounded text-xs
                      ${darkMode
                                                ? 'hover:bg-slate-600 text-slate-300'
                                                : 'hover:bg-gray-200 text-gray-700'
                                            }
                    `}
                                        title={preset.description}
                                    >
                                        <span className="font-mono">:{preset.key}:</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AttributesPanel;
