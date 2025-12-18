/**
 * Modal - 通用模态框组件
 * 提供统一的模态框外壳，支持标题、内容和关闭按钮
 */

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
}) => {
    const { darkMode } = useEditorStore();

    // ESC 键关闭
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // 禁止背景滚动
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    // 尺寸映射
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <>
            {/* 背景遮罩 */}
            <div
                className="fixed inset-0 bg-black/50 z-[100] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* 模态框容器 */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className={`${sizeClasses[size]} w-full max-h-[90vh] flex flex-col rounded-xl shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-200 ${darkMode
                            ? 'bg-slate-800 border border-slate-700'
                            : 'bg-white border border-gray-200'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 头部 */}
                    <div
                        className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${darkMode ? 'border-slate-700' : 'border-gray-200'
                            }`}
                    >
                        <h2
                            className={`text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-gray-900'
                                }`}
                        >
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded-lg transition-colors ${darkMode
                                    ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* 内容区域 */}
                    <div className="flex-1 overflow-y-auto">{children}</div>
                </div>
            </div>
        </>
    );
};

export default Modal;
