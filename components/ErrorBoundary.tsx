/**
 * ErrorBoundary 组件
 * 捕获 React 组件树中的错误，防止白屏
 * 显示错误报告界面，引导用户提交 GitHub Issue
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logCollector } from '../lib/log-collector';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    reportCopied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
        reportCopied: false,
    };

    constructor(props: Props) {
        super(props);
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Error info:', errorInfo);

        this.setState({ errorInfo });

        // 尝试保存当前文档到 localStorage
        this.emergencySave();
    }

    emergencySave(): void {
        try {
            const storedData = localStorage.getItem('asciidoc-editor-storage');
            if (storedData) {
                const parsed = JSON.parse(storedData);
                const backup = {
                    timestamp: Date.now(),
                    sourceContent: parsed.state?.sourceContent || '',
                    files: parsed.state?.files || [],
                };
                localStorage.setItem('asciidoc-emergency-backup', JSON.stringify(backup));
                console.log('[ErrorBoundary] Emergency backup saved');
            }
        } catch (e) {
            console.error('[ErrorBoundary] Failed to save emergency backup:', e);
        }
    }

    handleReload = (): void => {
        window.location.reload();
    };

    handleRecover = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null, reportCopied: false });
    };

    handleCopyReport = async (): Promise<void> => {
        const report = logCollector.generateReport(
            this.state.error || undefined,
            this.state.errorInfo?.componentStack
        );

        try {
            await navigator.clipboard.writeText(report);
            this.setState({ reportCopied: true });
            setTimeout(() => this.setState({ reportCopied: false }), 3000);
        } catch (e) {
            // 回退方案：创建临时文本框
            const textArea = document.createElement('textarea');
            textArea.value = report;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.setState({ reportCopied: true });
            setTimeout(() => this.setState({ reportCopied: false }), 3000);
        }
    };

    handleOpenGitHub = (): void => {
        const report = logCollector.generateReport(
            this.state.error || undefined,
            this.state.errorInfo?.componentStack
        );
        const url = logCollector.generateIssueUrl(report);
        window.open(url, '_blank');
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // 自定义 fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
                    <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-2xl p-6 border border-gray-700">
                        {/* 标题 */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-14 h-14 rounded-full bg-red-900/50 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">应用发生错误</h1>
                                <p className="text-sm text-gray-400">Something went wrong</p>
                            </div>
                        </div>

                        {/* 错误信息 */}
                        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-4">
                            <p className="text-sm font-mono text-red-300 break-all">
                                {this.state.error?.message || 'Unknown error'}
                            </p>
                        </div>

                        {/* 文档已备份提示 */}
                        <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-medium text-green-300">文档已自动备份</span>
                            </div>
                            <p className="text-sm text-green-400/80">
                                刷新页面后将自动恢复您的文档。
                            </p>
                        </div>

                        {/* 操作步骤 */}
                        <div className="space-y-3 mb-6">
                            <p className="text-sm text-gray-400 mb-2">帮助我们修复这个问题：</p>

                            {/* 步骤 1: 复制报告 */}
                            <button
                                onClick={this.handleCopyReport}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${this.state.reportCopied
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                    }`}
                            >
                                <span className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">1</span>
                                {this.state.reportCopied ? (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>已复制错误报告</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span>复制错误报告</span>
                                    </>
                                )}
                            </button>

                            {/* 步骤 2: 提交 Issue */}
                            <button
                                onClick={this.handleOpenGitHub}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-200"
                            >
                                <span className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">2</span>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                <span>去 GitHub 提交反馈</span>
                            </button>
                        </div>

                        {/* 隐私提示 */}
                        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 mb-6">
                            <p className="text-xs text-yellow-400/80">
                                ⚠️ 错误报告可能包含文件名和 URL，请在提交前检查是否有敏感信息。
                            </p>
                        </div>

                        {/* 底部操作 */}
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReload}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                刷新页面
                            </button>
                            <button
                                onClick={this.handleRecover}
                                className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                            >
                                尝试恢复
                            </button>
                        </div>

                        {/* 展开详情 */}
                        {this.state.errorInfo && (
                            <details className="mt-4">
                                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                                    显示技术详情
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-900 p-3 rounded overflow-auto max-h-40 font-mono text-gray-400 border border-gray-700">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
