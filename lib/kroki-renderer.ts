/**
 * Kroki 图表渲染服务
 * 支持 PlantUML、Graphviz、D2、Mermaid 等多种图表格式
 * 使用 Kroki.io 公共 API 进行渲染
 */

// Kroki API 端点
const KROKI_BASE_URL = 'https://kroki.io';

// 支持的图表类型
export type DiagramType =
    | 'plantuml'
    | 'graphviz'
    | 'd2'
    | 'mermaid'
    | 'ditaa'
    | 'blockdiag'
    | 'seqdiag'
    | 'actdiag'
    | 'nwdiag'
    | 'packetdiag'
    | 'rackdiag'
    | 'c4plantuml'
    | 'erd'
    | 'excalidraw'
    | 'nomnoml'
    | 'pikchr'
    | 'structurizr'
    | 'svgbob'
    | 'vega'
    | 'vegalite'
    | 'wavedrom'
    | 'bpmn'
    | 'bytefield'
    | 'symbolator';

// 输出格式
export type OutputFormat = 'svg' | 'png' | 'pdf' | 'base64';

// 图表语法检测
const DIAGRAM_PATTERNS: Record<DiagramType, RegExp> = {
    plantuml: /@startuml|@enduml/,
    graphviz: /digraph|graph\s+\{|strict\s+(di)?graph/,
    d2: /->|<->|--|shape:|style:/,
    mermaid: /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)/m,
    ditaa: /\+[-=]+\+|[\|\/\\]|cBLU|cRED/,
    blockdiag: /blockdiag\s*\{/,
    seqdiag: /seqdiag\s*\{/,
    actdiag: /actdiag\s*\{/,
    nwdiag: /nwdiag\s*\{|network\s*\{/,
    packetdiag: /packetdiag\s*\{/,
    rackdiag: /rackdiag\s*\{/,
    c4plantuml: /@startuml.*C4/s,
    erd: /\[.*\].*\*--\*/,
    excalidraw: /"type":\s*"excalidraw"/,
    nomnoml: /\[.*\]-/,
    pikchr: /arrow|box|circle|cylinder|dot|ellipse|file|line|move|oval|spline|text/,
    structurizr: /workspace|model|views/,
    svgbob: /[+\-|\/\\*=<>]/,
    vega: /"\$schema":\s*"https:\/\/vega\.github\.io\/schema\/vega\//,
    vegalite: /"\$schema":\s*"https:\/\/vega\.github\.io\/schema\/vega-lite\//,
    wavedrom: /signal|wave|name/,
    bpmn: /bpmn:definitions/,
    bytefield: /defattrs|draw-box/,
    symbolator: /module|input|output/,
};

/**
 * Base64 编码（用于 Kroki API）
 */
const encodeForKroki = (input: string): string => {
    // 使用 pako 进行 deflate 压缩（如果可用），否则使用 base64
    try {
        const textEncoder = new TextEncoder();
        const data = textEncoder.encode(input);

        // 简单的 base64 编码
        const base64 = btoa(String.fromCharCode(...data));
        // URL 安全的 base64
        return base64.replace(/\+/g, '-').replace(/\//g, '_');
    } catch {
        return btoa(unescape(encodeURIComponent(input)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }
};

/**
 * 检测图表类型
 */
export const detectDiagramType = (code: string): DiagramType | null => {
    for (const [type, pattern] of Object.entries(DIAGRAM_PATTERNS)) {
        if (pattern.test(code)) {
            return type as DiagramType;
        }
    }
    return null;
};

/**
 * 获取 Kroki 渲染 URL
 */
export const getKrokiUrl = (
    diagramType: DiagramType,
    code: string,
    format: OutputFormat = 'svg'
): string => {
    const encoded = encodeForKroki(code);
    return `${KROKI_BASE_URL}/${diagramType}/${format}/${encoded}`;
};

/**
 * 渲染图表为 SVG
 */
export const renderDiagram = async (
    code: string,
    diagramType?: DiagramType,
    format: OutputFormat = 'svg'
): Promise<string> => {
    const type = diagramType || detectDiagramType(code);

    if (!type) {
        throw new Error('Unable to detect diagram type');
    }

    const url = getKrokiUrl(type, code, format);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Kroki API error: ${response.status} - ${errorText}`);
        }

        if (format === 'svg') {
            return await response.text();
        } else if (format === 'base64' || format === 'png') {
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('[Kroki] Render error:', error);
        throw error;
    }
};

/**
 * 批量渲染图表
 */
export const renderDiagrams = async (
    diagrams: Array<{ id: string; code: string; type?: DiagramType }>
): Promise<Map<string, string>> => {
    const results = new Map<string, string>();

    const promises = diagrams.map(async ({ id, code, type }) => {
        try {
            const svg = await renderDiagram(code, type);
            results.set(id, svg);
        } catch (error) {
            console.error(`[Kroki] Failed to render ${id}:`, error);
            results.set(id, `<div class="kroki-error">Diagram render failed: ${(error as Error).message}</div>`);
        }
    });

    await Promise.all(promises);
    return results;
};

/**
 * 从 AsciiDoc 内容中提取图表代码块
 */
export const extractDiagramBlocks = (content: string): Array<{
    id: string;
    type: DiagramType;
    code: string;
    startLine: number;
    endLine: number;
}> => {
    const blocks: Array<{
        id: string;
        type: DiagramType;
        code: string;
        startLine: number;
        endLine: number;
    }> = [];

    const lines = content.split('\n');
    let inBlock = false;
    let blockType: DiagramType | null = null;
    let blockStart = 0;
    let blockCode: string[] = [];
    let blockId = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 检测块开始：[plantuml], [graphviz], [d2], etc.
        const blockMatch = line.match(/^\[(\w+)\]$/);
        if (blockMatch && !inBlock) {
            const potentialType = blockMatch[1].toLowerCase() as DiagramType;
            if (DIAGRAM_PATTERNS[potentialType]) {
                blockType = potentialType;
            }
            continue;
        }

        // 检测代码块标记
        if (line.trim() === '----' || line.trim() === '....') {
            if (inBlock && blockType) {
                // 块结束
                blocks.push({
                    id: `diagram-${blockId++}`,
                    type: blockType,
                    code: blockCode.join('\n'),
                    startLine: blockStart,
                    endLine: i,
                });
                inBlock = false;
                blockType = null;
                blockCode = [];
            } else if (blockType) {
                // 块开始
                inBlock = true;
                blockStart = i;
            }
            continue;
        }

        // 收集块内容
        if (inBlock) {
            blockCode.push(line);
        }
    }

    return blocks;
};

/**
 * 在 HTML 中渲染所有图表占位符
 */
export const renderDiagramsInHtml = async (html: string, content: string): Promise<string> => {
    const blocks = extractDiagramBlocks(content);

    if (blocks.length === 0) {
        return html;
    }

    const rendered = await renderDiagrams(blocks);

    let result = html;

    // 替换占位符（如果存在）
    for (const [id, svg] of rendered) {
        const placeholder = `<!-- ${id} -->`;
        if (result.includes(placeholder)) {
            result = result.replace(placeholder, svg);
        }
    }

    return result;
};

export default {
    detectDiagramType,
    getKrokiUrl,
    renderDiagram,
    renderDiagrams,
    extractDiagramBlocks,
    renderDiagramsInHtml,
};
