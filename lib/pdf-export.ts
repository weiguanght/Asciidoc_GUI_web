/**
 * PDF 导出功能
 * 使用 Paged.js 将 AsciiDoc 渲染结果转换为分页 PDF
 */

import { adocToHtml } from './asciidoc';

// Paged.js CDN URL
const PAGED_JS_CDN = 'https://unpkg.com/pagedjs@0.4.3/dist/paged.polyfill.js';

// PDF 导出选项
export interface PdfExportOptions {
    title?: string;
    author?: string;
    pageSize?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
    margins?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };
    headerTemplate?: string;
    footerTemplate?: string;
    includeStyles?: boolean;
}

// 默认样式
const DEFAULT_PDF_STYLES = `
@page {
  size: A4;
  margin: 2.5cm 2cm;
  
  @top-center {
    content: string(doctitle);
  }
  
  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-size: 10pt;
    color: #666;
  }
}

@page :first {
  @top-center {
    content: none;
  }
}

h1 {
  string-set: doctitle content(text);
  page-break-before: always;
}

h1:first-of-type {
  page-break-before: avoid;
}

h2, h3 {
  page-break-after: avoid;
}

pre, table, figure {
  page-break-inside: avoid;
}

body {
  font-family: 'Noto Sans', 'Source Han Sans', sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #333;
}

h1 { font-size: 24pt; margin-top: 0; }
h2 { font-size: 18pt; }
h3 { font-size: 14pt; }
h4 { font-size: 12pt; }

code, pre {
  font-family: 'JetBrains Mono', 'Source Code Pro', monospace;
  font-size: 9pt;
}

pre {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}

th {
  background: #f0f0f0;
  font-weight: bold;
}

blockquote {
  border-left: 3px solid #3b82f6;
  padding-left: 1em;
  margin-left: 0;
  color: #555;
  font-style: italic;
}

img {
  max-width: 100%;
  height: auto;
}

a {
  color: #3b82f6;
  text-decoration: none;
}

.admonitionblock {
  margin: 1em 0;
  padding: 1em;
  border-radius: 4px;
  page-break-inside: avoid;
}

.admonitionblock.note {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
}

.admonitionblock.tip {
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
}

.admonitionblock.warning {
  background: #fff3e0;
  border-left: 4px solid #ff9800;
}

.admonitionblock.caution {
  background: #fbe9e7;
  border-left: 4px solid #ff5722;
}

.admonitionblock.important {
  background: #fce4ec;
  border-left: 4px solid #e91e63;
}
`;

/**
 * 动态加载 Paged.js
 */
const loadPagedJs = async (): Promise<void> => {
    if ((window as any).PagedPolyfill) {
        return;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PAGED_JS_CDN;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Paged.js'));
        document.head.appendChild(script);
    });
};

/**
 * 生成 PDF 预览 HTML
 */
export const generatePdfHtml = (
    content: string,
    options: PdfExportOptions = {}
): string => {
    const html = adocToHtml(content);

    const pageStyles = `
    @page {
      size: ${options.pageSize || 'A4'} ${options.orientation || 'portrait'};
      margin: ${options.margins?.top || '2.5cm'} ${options.margins?.right || '2cm'} ${options.margins?.bottom || '2.5cm'} ${options.margins?.left || '2cm'};
    }
  `;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title || 'AsciiDoc Document'}</title>
  ${options.author ? `<meta name="author" content="${options.author}">` : ''}
  <style>
    ${DEFAULT_PDF_STYLES}
    ${pageStyles}
  </style>
  <script src="${PAGED_JS_CDN}"></script>
</head>
<body>
  ${html}
</body>
</html>
`;
};

/**
 * 在新窗口中打开 PDF 预览（触发浏览器打印）
 */
export const openPdfPreview = async (
    content: string,
    options: PdfExportOptions = {}
): Promise<void> => {
    const html = generatePdfHtml(content, options);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        throw new Error('Failed to open print window. Please allow popups.');
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // 等待 Paged.js 加载和渲染
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
        }, 1000);
    };
};

/**
 * 通过 iframe 打印（不打开新窗口）
 */
export const printToPdf = async (
    content: string,
    options: PdfExportOptions = {}
): Promise<void> => {
    const html = generatePdfHtml(content, options);

    // 创建隐藏的 iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Failed to create print iframe');
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // 等待内容加载
    await new Promise<void>((resolve) => {
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow?.print();
                // 打印后移除 iframe
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    resolve();
                }, 100);
            }, 1500);
        };
    });
};

/**
 * 导出为 PDF（使用浏览器原生打印）
 */
export const exportToPdf = async (
    content: string,
    filename: string = 'document.pdf',
    options: PdfExportOptions = {}
): Promise<void> => {
    // 提示用户使用"另存为 PDF"
    console.log('[PDF Export] Opening print dialog. Please select "Save as PDF" in your browser.');
    await openPdfPreview(content, {
        ...options,
        title: filename.replace('.pdf', ''),
    });
};

/**
 * 检查 PDF 导出是否可用
 */
export const isPdfExportSupported = (): boolean => {
    return typeof window !== 'undefined' && typeof window.print === 'function';
};

export default {
    generatePdfHtml,
    openPdfPreview,
    printToPdf,
    exportToPdf,
    isPdfExportSupported,
};
