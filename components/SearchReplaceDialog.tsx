import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Replace, ChevronUp, ChevronDown, CaseSensitive, Regex } from 'lucide-react';

interface SearchResult {
    index: number;
    start: number;
    end: number;
    lineNumber: number;
    lineContent: string;
}

interface SearchReplaceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    onReplace: (newContent: string) => void;
    mode: 'source' | 'editor';
    textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const SearchReplaceDialog: React.FC<SearchReplaceDialogProps> = ({
    isOpen,
    onClose,
    content,
    onReplace,
    mode,
    textareaRef,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [showReplace, setShowReplace] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // 执行搜索
    const performSearch = useCallback(() => {
        if (!searchQuery) {
            setResults([]);
            setCurrentIndex(-1);
            return;
        }

        try {
            let pattern: RegExp;
            if (useRegex) {
                pattern = new RegExp(searchQuery, caseSensitive ? 'g' : 'gi');
            } else {
                const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
            }

            const matches: SearchResult[] = [];
            const lines = content.split('\n');
            let charIndex = 0;

            lines.forEach((line, lineIndex) => {
                let match;
                const linePattern = new RegExp(pattern.source, pattern.flags);
                while ((match = linePattern.exec(line)) !== null) {
                    matches.push({
                        index: matches.length,
                        start: charIndex + match.index,
                        end: charIndex + match.index + match[0].length,
                        lineNumber: lineIndex + 1,
                        lineContent: line,
                    });
                    if (!linePattern.global) break;
                }
                charIndex += line.length + 1; // +1 for newline
            });

            setResults(matches);
            setCurrentIndex(matches.length > 0 ? 0 : -1);

            // 高亮第一个匹配
            if (matches.length > 0 && textareaRef?.current) {
                highlightMatch(matches[0]);
            }
        } catch (e) {
            // 正则表达式无效
            setResults([]);
            setCurrentIndex(-1);
        }
    }, [searchQuery, content, caseSensitive, useRegex, textareaRef]);

    // 高亮匹配项
    const highlightMatch = useCallback((match: SearchResult) => {
        if (textareaRef?.current) {
            const textarea = textareaRef.current;
            textarea.focus();
            textarea.setSelectionRange(match.start, match.end);

            // 滚动到匹配位置
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
            const scrollTop = (match.lineNumber - 1) * lineHeight - textarea.clientHeight / 2;
            textarea.scrollTop = Math.max(0, scrollTop);
        }
    }, [textareaRef]);

    // 导航到上一个/下一个匹配
    const goToNext = useCallback(() => {
        if (results.length === 0) return;
        const newIndex = (currentIndex + 1) % results.length;
        setCurrentIndex(newIndex);
        highlightMatch(results[newIndex]);
    }, [results, currentIndex, highlightMatch]);

    const goToPrev = useCallback(() => {
        if (results.length === 0) return;
        const newIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
        highlightMatch(results[newIndex]);
    }, [results, currentIndex, highlightMatch]);

    // 替换当前匹配
    const replaceCurrent = useCallback(() => {
        if (results.length === 0 || currentIndex < 0) return;

        const match = results[currentIndex];
        const newContent =
            content.substring(0, match.start) +
            replaceQuery +
            content.substring(match.end);

        onReplace(newContent);
    }, [results, currentIndex, content, replaceQuery, onReplace]);

    // 替换全部
    const replaceAll = useCallback(() => {
        if (results.length === 0) return;

        try {
            let pattern: RegExp;
            if (useRegex) {
                pattern = new RegExp(searchQuery, caseSensitive ? 'g' : 'gi');
            } else {
                const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
            }

            const newContent = content.replace(pattern, replaceQuery);
            onReplace(newContent);
        } catch (e) {
            // 正则表达式无效
        }
    }, [results, searchQuery, replaceQuery, content, caseSensitive, useRegex, onReplace]);

    // 搜索触发
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch();
        }, 150);
        return () => clearTimeout(timer);
    }, [searchQuery, caseSensitive, useRegex, content, performSearch]);

    // 打开时聚焦搜索框
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
        }
    }, [isOpen]);

    // 键盘快捷键
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                goToNext();
            } else if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                goToPrev();
            } else if (e.key === 'F3' || (e.key === 'g' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                if (e.shiftKey) goToPrev();
                else goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, goToNext, goToPrev]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-2 right-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[320px]">
            {/* 搜索行 */}
            <div className="flex items-center gap-2 p-2 border-b border-gray-100">
                <button
                    onClick={() => setShowReplace(!showReplace)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title={showReplace ? 'Hide Replace' : 'Show Replace'}
                >
                    <ChevronDown
                        size={16}
                        className={`text-gray-500 transition-transform ${showReplace ? 'rotate-180' : ''}`}
                    />
                </button>

                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCaseSensitive(!caseSensitive)}
                        className={`p-1.5 rounded transition-colors ${caseSensitive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="Case Sensitive"
                    >
                        <CaseSensitive size={14} />
                    </button>
                    <button
                        onClick={() => setUseRegex(!useRegex)}
                        className={`p-1.5 rounded transition-colors ${useRegex ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="Use Regular Expression"
                    >
                        <Regex size={14} />
                    </button>
                </div>

                <span className="text-xs text-gray-500 min-w-[60px] text-center">
                    {results.length > 0 ? `${currentIndex + 1} / ${results.length}` : 'No results'}
                </span>

                <div className="flex items-center gap-0.5">
                    <button
                        onClick={goToPrev}
                        disabled={results.length === 0}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous (Shift+Enter)"
                    >
                        <ChevronUp size={16} className="text-gray-600" />
                    </button>
                    <button
                        onClick={goToNext}
                        disabled={results.length === 0}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next (Enter)"
                    >
                        <ChevronDown size={16} className="text-gray-600" />
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Close (Escape)"
                >
                    <X size={16} className="text-gray-500" />
                </button>
            </div>

            {/* 替换行 */}
            {showReplace && (
                <div className="flex items-center gap-2 p-2">
                    <div className="w-6" /> {/* 占位，对齐搜索框 */}

                    <div className="flex-1 relative">
                        <Replace size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={replaceQuery}
                            onChange={(e) => setReplaceQuery(e.target.value)}
                            placeholder="Replace with..."
                            className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <button
                        onClick={replaceCurrent}
                        disabled={results.length === 0}
                        className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Replace
                    </button>
                    <button
                        onClick={replaceAll}
                        disabled={results.length === 0}
                        className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Replace All
                    </button>
                </div>
            )}
        </div>
    );
};
