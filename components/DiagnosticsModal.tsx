/**
 * DiagnosticsModal - 诊断与帮助中心
 * 显示错误日志、生成错误报告、链接到 GitHub Issues
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from './Modal';
import { useEditorStore } from '../store/useEditorStore';
import {
    AlertTriangle,
    Copy,
    ExternalLink,
    Check,
    RefreshCw,
    Trash2,
    Info,
    AlertCircle,
} from 'lucide-react';
import { logCollector, LogEntry, ErrorEntry } from '../lib/log-collector';
import { useTranslation } from '../hooks/useTranslation';

type LogLevel = 'all' | 'error' | 'warn' | 'info';

export const DiagnosticsModal: React.FC = () => {
    const { isDiagnosticsModalOpen, closeDiagnosticsModal, darkMode } = useEditorStore();
    const { t } = useTranslation();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [errors, setErrors] = useState<ErrorEntry[]>([]);
    const [copied, setCopied] = useState(false);
    const [filter, setFilter] = useState<LogLevel>('all');

    // 加载日志
    const refreshLogs = useCallback(() => {
        setLogs(logCollector.getLogs());
        setErrors(logCollector.getErrors());
    }, []);

    // 打开时加载
    useEffect(() => {
        if (isDiagnosticsModalOpen) {
            refreshLogs();
        }
    }, [isDiagnosticsModalOpen, refreshLogs]);

    // 复制报告到剪贴板
    const copyReport = useCallback(async () => {
        const report = logCollector.generateReport();
        try {
            await navigator.clipboard.writeText(report);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }, []);

    // 打开 GitHub Issue
    const openGitHubIssue = useCallback(() => {
        const report = logCollector.generateReport();
        const url = logCollector.generateIssueUrl(report);
        window.open(url, '_blank');
    }, []);

    // 清除日志
    const clearLogs = useCallback(() => {
        logCollector.clear();
        refreshLogs();
    }, [refreshLogs]);

    // 过滤日志
    const filteredLogs = logs.filter((log) => {
        if (filter === 'all') return true;
        return log.level === filter;
    });

    // 日志级别颜色
    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error':
                return darkMode ? 'text-red-400' : 'text-red-600';
            case 'warn':
                return darkMode ? 'text-amber-400' : 'text-amber-600';
            case 'info':
                return darkMode ? 'text-blue-400' : 'text-blue-600';
            default:
                return darkMode ? 'text-slate-400' : 'text-gray-600';
        }
    };

    // 日志级别图标
    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error':
                return <AlertCircle size={12} />;
            case 'warn':
                return <AlertTriangle size={12} />;
            case 'info':
                return <Info size={12} />;
            default:
                return null;
        }
    };

    // 格式化时间
    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <Modal
            isOpen={isDiagnosticsModalOpen}
            onClose={closeDiagnosticsModal}
            title={t('diagnostics.title')}
            size="lg"
        >
            <div className="flex flex-col h-[500px]">
                {/* 操作按钮区 */}
                <div
                    className={`px-6 py-3 border-b flex items-center justify-between ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        {/* 过滤器 */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as LogLevel)}
                            className={`px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode
                                ? 'bg-slate-700 border-slate-600 text-slate-300'
                                : 'bg-white border-gray-200 text-gray-700'
                                }`}
                        >
                            <option value="all">{t('diagnostics.allLevels')}</option>
                            <option value="error">{t('diagnostics.errors')}</option>
                            <option value="warn">{t('diagnostics.warnings')}</option>
                            <option value="info">{t('diagnostics.info')}</option>
                        </select>

                        <button
                            onClick={refreshLogs}
                            className={`p-1.5 rounded transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            title={t('diagnostics.refresh')}
                        >
                            <RefreshCw size={14} />
                        </button>

                        <button
                            onClick={clearLogs}
                            className={`p-1.5 rounded transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            title={t('diagnostics.clearLogs')}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span
                            className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}
                        >
                            {filteredLogs.length} {t('diagnostics.entries')}, {errors.length} {t('diagnostics.errorsCount')}
                        </span>
                    </div>
                </div>

                {/* 日志内容 */}
                <div
                    className={`flex-1 overflow-y-auto font-mono text-xs ${darkMode ? 'bg-slate-900' : 'bg-gray-900'
                        }`}
                >
                    {errors.length > 0 && (
                        <div className="border-b border-red-900/50 bg-red-900/20 p-3">
                            <div className="text-red-400 font-bold mb-2 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {t('diagnostics.capturedErrors')} ({errors.length})
                            </div>
                            {errors.map((err, i) => (
                                <div key={i} className="text-red-300 mb-2">
                                    <span className="text-slate-500">[{formatTime(err.timestamp)}]</span>{' '}
                                    {err.message}
                                    {err.stack && (
                                        <pre className="mt-1 text-red-400/70 text-[10px] whitespace-pre-wrap">
                                            {err.stack}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredLogs.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                            <Info size={24} className="mx-auto mb-2 opacity-50" />
                            {t('diagnostics.noLogs')}
                        </div>
                    ) : (
                        <div className="p-3 space-y-1">
                            {filteredLogs.map((log, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-slate-600 shrink-0">
                                        [{formatTime(log.timestamp)}]
                                    </span>
                                    <span className={`shrink-0 ${getLevelColor(log.level)}`}>
                                        {getLevelIcon(log.level)}
                                    </span>
                                    <span
                                        className={`break-all ${log.level === 'error'
                                            ? 'text-red-400'
                                            : log.level === 'warn'
                                                ? 'text-amber-400'
                                                : 'text-slate-400'
                                            }`}
                                    >
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 底部操作 */}
                <div
                    className={`px-6 py-4 border-t flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-gray-200'
                        }`}
                >
                    <p
                        className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-500'
                            }`}
                    >
                        {t('diagnostics.footer')}
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={copyReport}
                            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${copied
                                ? 'bg-green-500 text-white'
                                : darkMode
                                    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check size={14} />
                                    {t('diagnostics.copied')}
                                </>
                            ) : (
                                <>
                                    <Copy size={14} />
                                    {t('diagnostics.copyReport')}
                                </>
                            )}
                        </button>

                        <button
                            onClick={openGitHubIssue}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            <ExternalLink size={14} />
                            {t('diagnostics.reportIssue')}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default DiagnosticsModal;
