/**
 * Asciidoctor Web Worker
 * 在后台线程中执行 AsciiDoc 到 HTML 的转换
 */

import Asciidoctor from 'asciidoctor';

// 初始化 Asciidoctor 实例
const asciidoctor = Asciidoctor();

// 消息处理器
self.onmessage = (event: MessageEvent) => {
    const { type, id, content, options } = event.data;

    switch (type) {
        case 'render':
            try {
                const startTime = performance.now();

                // 默认渲染选项
                const renderOptions = {
                    standalone: false,
                    safe: 'safe',
                    sourcemap: true, // 启用 Source Map，在 HTML 块上添加 data-line 属性
                    attributes: {
                        showtitle: true,
                        sectanchors: true,
                        icons: 'font',
                        'source-highlighter': 'highlight.js',
                        ...options?.attributes,
                    },
                    ...options,
                };

                // 执行渲染
                const html = asciidoctor.convert(content, renderOptions) as string;

                const endTime = performance.now();
                const duration = endTime - startTime;

                // 发送结果
                self.postMessage({
                    type: 'result',
                    id,
                    html,
                    duration,
                    success: true,
                });
            } catch (error) {
                self.postMessage({
                    type: 'error',
                    id,
                    error: (error as Error).message,
                    success: false,
                });
            }
            break;

        case 'parse':
            try {
                // 解析文档获取 AST（用于大纲提取等）
                const doc = asciidoctor.load(content);
                const title = doc.getDocumentTitle();
                const attributes = doc.getAttributes();

                // 提取章节结构
                const sections: Array<{ level: number; title: string; id: string }> = [];
                const extractSections = (parent: any, level: number = 0) => {
                    const blocks = parent.getBlocks?.() || [];
                    for (const block of blocks) {
                        if (block.getContext?.() === 'section') {
                            sections.push({
                                level: block.getLevel?.() || level,
                                title: block.getTitle?.() || '',
                                id: block.getId?.() || '',
                            });
                            extractSections(block, level + 1);
                        }
                    }
                };
                extractSections(doc);

                self.postMessage({
                    type: 'parsed',
                    id,
                    title,
                    attributes,
                    sections,
                    success: true,
                });
            } catch (error) {
                self.postMessage({
                    type: 'error',
                    id,
                    error: (error as Error).message,
                    success: false,
                });
            }
            break;

        default:
            self.postMessage({
                type: 'error',
                id,
                error: `Unknown message type: ${type}`,
                success: false,
            });
    }
};

// 通知主线程 Worker 已就绪
self.postMessage({ type: 'ready' });
