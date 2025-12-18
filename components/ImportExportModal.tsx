/**
 * ImportExportModal - 导入导出中心
 * 支持导入 AsciiDoc、Markdown、HTML 文件
 */

import React, { useState, useCallback, useRef } from 'react';
import { Modal } from './Modal';
import { useEditorStore } from '../store/useEditorStore';
import { Upload, FileText, FileDown, AlertCircle } from 'lucide-react';
import { importMarkdown, readMarkdownFile } from '../lib/markdown-converter';
import { htmlToAdoc } from '../lib/paste-converter';
import { useTranslation } from '../hooks/useTranslation';

type ImportFormat = 'adoc' | 'md' | 'html';

interface ImportedFile {
    name: string;
    content: string;
    format: ImportFormat;
}

export const ImportExportModal: React.FC = () => {
    const { isImportModalOpen, closeImportModal, importFile, darkMode } = useEditorStore();
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 处理文件选择
    const handleFiles = useCallback(async (files: FileList | File[]) => {
        setError(null);
        const newFiles: ImportedFile[] = [];

        for (const file of Array.from(files)) {
            try {
                const ext = file.name.split('.').pop()?.toLowerCase();
                let format: ImportFormat = 'adoc';
                let content = '';

                if (ext === 'md' || ext === 'markdown') {
                    format = 'md';
                    const result = await readMarkdownFile(file);
                    // 将 Markdown HTML 转换为 AsciiDoc
                    content = htmlToAdoc(result.html);
                } else if (ext === 'html' || ext === 'htm') {
                    format = 'html';
                    const text = await file.text();
                    content = htmlToAdoc(text);
                } else if (ext === 'adoc' || ext === 'asciidoc' || ext === 'txt') {
                    format = 'adoc';
                    content = await file.text();
                } else {
                    console.warn(`Unsupported file format: ${ext}`);
                    continue;
                }

                newFiles.push({
                    name: file.name.replace(/\.(md|markdown|html|htm)$/, '.adoc'),
                    content,
                    format,
                });
            } catch (err) {
                console.error('Import error:', err);
                setError(`Failed to import ${file.name}`);
            }
        }

        setImportedFiles((prev) => [...prev, ...newFiles]);
    }, []);

    // 拖放处理
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFiles(files);
            }
        },
        [handleFiles]
    );

    // 点击上传
    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleFiles(files);
            }
        },
        [handleFiles]
    );

    // 导入选中的文件
    const handleImport = useCallback(
        (file: ImportedFile) => {
            importFile(file.name, file.content);
            setImportedFiles((prev) => prev.filter((f) => f.name !== file.name));
            closeImportModal();
        },
        [importFile, closeImportModal]
    );

    // 导入全部
    const handleImportAll = useCallback(() => {
        importedFiles.forEach((file) => {
            importFile(file.name, file.content);
        });
        setImportedFiles([]);
        closeImportModal();
    }, [importedFiles, importFile, closeImportModal]);

    // 清除待导入列表
    const clearFiles = useCallback(() => {
        setImportedFiles([]);
        setError(null);
    }, []);

    // 关闭时清空状态
    const handleClose = useCallback(() => {
        setImportedFiles([]);
        setError(null);
        closeImportModal();
    }, [closeImportModal]);

    return (
        <Modal isOpen={isImportModalOpen} onClose={handleClose} title={t('import.title')} size="md">
            <div className="p-6 space-y-4">
                {/* 拖放区域 */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : darkMode
                            ? 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".adoc,.asciidoc,.md,.markdown,.html,.htm,.txt"
                        onChange={handleFileInputChange}
                        className="hidden"
                    />
                    <Upload
                        size={32}
                        className={`mx-auto mb-3 ${isDragging
                            ? 'text-blue-500'
                            : darkMode
                                ? 'text-slate-500'
                                : 'text-gray-400'
                            }`}
                    />
                    <p
                        className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'
                            }`}
                    >
                        {t('import.dragDrop')}
                    </p>
                    <p
                        className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-500'
                            }`}
                    >
                        {t('import.orClickToBrowse')}
                    </p>
                </div>

                {/* 支持的格式 */}
                <div className="flex justify-center gap-4">
                    {[
                        { ext: '.adoc', label: 'AsciiDoc' },
                        { ext: '.md', label: 'Markdown' },
                        { ext: '.html', label: 'HTML' },
                    ].map(({ ext, label }) => (
                        <div
                            key={ext}
                            className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-500' : 'text-gray-500'
                                }`}
                        >
                            <FileText size={12} />
                            <span>
                                {label} ({ext})
                            </span>
                        </div>
                    ))}
                </div>

                {/* 错误提示 */}
                {error && (
                    <div
                        className={`flex items-center gap-2 p-3 rounded-lg text-sm ${darkMode
                            ? 'bg-red-900/30 text-red-400 border border-red-900'
                            : 'bg-red-50 text-red-600 border border-red-200'
                            }`}
                    >
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* 待导入文件列表 */}
                {importedFiles.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span
                                className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'
                                    }`}
                            >
                                {t('import.readyToImport')} ({importedFiles.length})
                            </span>
                            <button
                                onClick={clearFiles}
                                className={`text-xs ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {t('import.clearAll')}
                            </button>
                        </div>

                        <div
                            className={`max-h-40 overflow-y-auto rounded-lg border ${darkMode ? 'border-slate-700' : 'border-gray-200'
                                }`}
                        >
                            {importedFiles.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className={`flex items-center justify-between px-3 py-2 ${index > 0
                                        ? darkMode
                                            ? 'border-t border-slate-700'
                                            : 'border-t border-gray-200'
                                        : ''
                                        } ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <FileDown size={14} className={darkMode ? 'text-slate-500' : 'text-gray-400'} />
                                        <span
                                            className={`text-sm truncate max-w-[200px] ${darkMode ? 'text-slate-300' : 'text-gray-700'
                                                }`}
                                        >
                                            {file.name}
                                        </span>
                                        <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${darkMode
                                                ? 'bg-slate-700 text-slate-400'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            {file.format}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleImport(file)}
                                        className="text-xs text-blue-500 hover:text-blue-600"
                                    >
                                        {t('import.import')}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleImportAll}
                            className="w-full py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            {t('import.importAll')} ({importedFiles.length})
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImportExportModal;
