/**
 * 自动补全下拉菜单组件
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CompletionItem, getCompletions, applyCompletion } from '../lib/intellisense';
import { Code, FileText, Hash, Zap } from 'lucide-react';

interface AutocompleteProps {
    text: string;
    cursorPosition: number;
    position: { top: number; left: number };
    onSelect: (text: string, cursorOffset: number) => void;
    onClose: () => void;
    darkMode?: boolean;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
    text,
    cursorPosition,
    position,
    onSelect,
    onClose,
    darkMode = false,
}) => {
    const [items, setItems] = useState<CompletionItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // 获取补全项
    useEffect(() => {
        const completions = getCompletions(text, cursorPosition);
        setItems(completions.slice(0, 10)); // 最多显示 10 项
        setSelectedIndex(0);
    }, [text, cursorPosition]);

    // 处理键盘事件
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % items.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
                break;
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                if (items[selectedIndex]) {
                    const { text, cursorOffset } = applyCompletion(items[selectedIndex].insertText);
                    onSelect(text, cursorOffset);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [items, selectedIndex, onSelect, onClose]);

    // 添加键盘监听
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // 获取图标
    const getIcon = (kind: CompletionItem['kind']) => {
        switch (kind) {
            case 'snippet': return <Code size={14} />;
            case 'keyword': return <Hash size={14} />;
            case 'attribute': return <FileText size={14} />;
            case 'macro': return <Zap size={14} />;
        }
    };

    if (items.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className={`fixed z-50 rounded-lg shadow-xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                }`}
            style={{
                top: position.top,
                left: position.left,
                minWidth: '280px',
                maxWidth: '400px',
                maxHeight: '300px',
                overflowY: 'auto',
            }}
        >
            {items.map((item, index) => (
                <div
                    key={item.label + index}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${index === selectedIndex
                            ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                            : darkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    onClick={() => {
                        const { text, cursorOffset } = applyCompletion(item.insertText);
                        onSelect(text, cursorOffset);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                >
                    <span className={`flex-shrink-0 ${index === selectedIndex ? 'text-white' : darkMode ? 'text-slate-400' : 'text-gray-400'
                        }`}>
                        {getIcon(item.kind)}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm truncate">{item.label}</div>
                        <div className={`text-xs truncate ${index === selectedIndex ? 'text-blue-100' : darkMode ? 'text-slate-500' : 'text-gray-400'
                            }`}>
                            {item.detail}
                        </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${index === selectedIndex
                            ? 'bg-blue-400/30 text-blue-100'
                            : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {item.kind}
                    </span>
                </div>
            ))}
            <div className={`px-3 py-1.5 text-[10px] border-t ${darkMode ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'
                }`}>
                ↑↓ Navigate • Enter/Tab Select • Esc Close
            </div>
        </div>
    );
};
