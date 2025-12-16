/**
 * 日志收集器
 * 拦截 console.error、window.onerror 和 Promise 异常
 * 用于崩溃时生成错误报告
 */

// 日志条目类型
export interface LogEntry {
    timestamp: number;
    level: 'log' | 'warn' | 'error' | 'info';
    message: string;
    args?: any[];
}

// 错误条目类型
export interface ErrorEntry {
    timestamp: number;
    message: string;
    stack?: string;
    source?: string;
    lineno?: number;
    colno?: number;
}

// 环境信息类型
export interface EnvironmentInfo {
    userAgent: string;
    platform: string;
    language: string;
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    url: string;
    timestamp: string;
    timezone: string;
}

class LogCollector {
    private logs: LogEntry[] = [];
    private errors: ErrorEntry[] = [];
    private maxLogs = 50;
    private maxErrors = 10;
    private originalConsole: Partial<Console> = {};
    private initialized = false;

    /**
     * 初始化日志收集器，劫持 console 方法
     */
    init(): void {
        if (this.initialized || typeof window === 'undefined') return;

        // 保存原始方法
        this.originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
        };

        // 劫持 console 方法
        console.log = (...args) => {
            this.addLog('log', args);
            this.originalConsole.log?.(...args);
        };

        console.warn = (...args) => {
            this.addLog('warn', args);
            this.originalConsole.warn?.(...args);
        };

        console.error = (...args) => {
            this.addLog('error', args);
            this.originalConsole.error?.(...args);
        };

        console.info = (...args) => {
            this.addLog('info', args);
            this.originalConsole.info?.(...args);
        };

        // 全局错误处理
        window.onerror = (message, source, lineno, colno, error) => {
            this.addError({
                timestamp: Date.now(),
                message: String(message),
                stack: error?.stack,
                source,
                lineno,
                colno,
            });
            return false; // 继续默认处理
        };

        // Promise 异常处理
        window.onunhandledrejection = (event) => {
            this.addError({
                timestamp: Date.now(),
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
            });
        };

        this.initialized = true;
    }

    /**
     * 添加日志条目
     */
    private addLog(level: LogEntry['level'], args: any[]): void {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        this.logs.push({
            timestamp: Date.now(),
            level,
            message: message.substring(0, 500), // 限制长度
        });

        // 保持最大数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    /**
     * 添加错误条目
     */
    private addError(error: ErrorEntry): void {
        this.errors.push(error);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    }

    /**
     * 获取环境信息
     */
    getEnvironment(): EnvironmentInfo {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }

    /**
     * 获取最近的日志
     */
    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * 获取最近的错误
     */
    getErrors(): ErrorEntry[] {
        return [...this.errors];
    }

    /**
     * 生成 Markdown 格式的错误报告
     */
    generateReport(crashError?: Error, componentStack?: string): string {
        const env = this.getEnvironment();
        const logs = this.getLogs();
        const errors = this.getErrors();

        let report = `## 🐛 Error Report

### Environment
| Property | Value |
|----------|-------|
| Browser | \`${this.getBrowserName()}\` |
| Platform | \`${env.platform}\` |
| Language | \`${env.language}\` |
| Screen | \`${env.screenWidth}x${env.screenHeight}\` |
| Window | \`${env.windowWidth}x${env.windowHeight}\` |
| Timezone | \`${env.timezone}\` |
| Time | \`${env.timestamp}\` |

`;

        // 主要崩溃错误
        if (crashError) {
            report += `### Crash Error
\`\`\`
${crashError.message}
\`\`\`

`;
            if (crashError.stack) {
                report += `### Stack Trace
\`\`\`
${crashError.stack}
\`\`\`

`;
            }
        }

        // React 组件栈
        if (componentStack) {
            report += `### Component Stack
\`\`\`
${componentStack}
\`\`\`

`;
        }

        // 之前捕获的错误
        if (errors.length > 0) {
            report += `### Previous Errors (${errors.length})
`;
            errors.forEach((err, i) => {
                const time = new Date(err.timestamp).toLocaleTimeString();
                report += `
#### Error ${i + 1} (${time})
\`\`\`
${err.message}
${err.stack || '(no stack)'}
\`\`\`
`;
            });
        }

        // 最近的日志
        if (logs.length > 0) {
            report += `### Recent Logs (${logs.length})
\`\`\`
`;
            logs.forEach(log => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                report += `[${time}] [${log.level.toUpperCase()}] ${log.message}\n`;
            });
            report += `\`\`\`

`;
        }

        report += `---
*Report generated by AsciiDoc Editor Error Collector*`;

        return report;
    }

    /**
     * 获取浏览器名称
     */
    private getBrowserName(): string {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Edg')) return 'Edge';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Opera')) return 'Opera';
        return 'Unknown';
    }

    /**
     * 生成 GitHub Issue URL
     */
    generateIssueUrl(report: string, title?: string): string {
        const baseUrl = 'https://github.com/weiguanght/Asciidoc_GUI_web/issues/new';
        const params = new URLSearchParams();

        params.set('title', title || '[Bug] Application Crash Report');
        params.set('labels', 'bug');

        // 如果报告太长（>2000字符），只包含基本信息
        if (report.length < 2000) {
            params.set('body', report);
        } else {
            params.set('body', `## 🐛 Error Report

*报告内容过长，请粘贴下方复制的完整报告*

### Environment
- Browser: \`${this.getBrowserName()}\`
- Platform: \`${navigator.platform}\`
- Time: \`${new Date().toISOString()}\`

---
请粘贴完整的错误报告...`);
        }

        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * 清除日志
     */
    clear(): void {
        this.logs = [];
        this.errors = [];
    }
}

// 单例实例
export const logCollector = new LogCollector();

// 自动初始化
if (typeof window !== 'undefined') {
    logCollector.init();
}

export default logCollector;
