/**
 * AsciiDoc 转换工具
 * 使用 asciidoctor.js 实现完整语法支持
 */

import { AsciiDocNode } from '../types';
import { adocToHtml } from './asciidoctor-renderer';

// 导出新的渲染函数
export { adocToHtml };

// 保留简化版本作为后备 (用于 Tiptap JSON -> AsciiDoc)
export const simpleAdocToHtml = adocToHtml;

/**
 * 将 Tiptap JSON 转换为 AsciiDoc 源码
 * @param json Tiptap 编辑器的 JSON 内容
 * @returns AsciiDoc 源码
 */
export const jsonToAdoc = (json: { type: string, content?: AsciiDocNode[] }): string => {
  if (!json || !json.content) return '';

  return json.content.map(node => {
    switch (node.type) {
      case 'heading':
        const level = node.attrs?.level || 1;
        const text = renderTextContent(node.content);
        return `${'='.repeat(level)} ${text}\n\n`;

      case 'paragraph':
        if (!node.content) return '\n';
        return renderTextContent(node.content) + '\n\n';

      case 'codeBlock':
        const lang = node.attrs?.language || '';
        const code = node.content?.map(c => c.text).join('') || '';
        if (lang) {
          return `[source,${lang}]\n----\n${code}\n----\n\n`;
        }
        return `----\n${code}\n----\n\n`;

      case 'bulletList':
        return (node.content?.map(li => {
          const liText = li.content?.map((p: any) =>
            renderTextContent(p.content)
          ).join('') || '';
          return `* ${liText}`;
        }).join('\n') || '') + '\n\n';

      case 'orderedList':
        return (node.content?.map(li => {
          const liText = li.content?.map((p: any) =>
            renderTextContent(p.content)
          ).join('') || '';
          return `. ${liText}`;
        }).join('\n') || '') + '\n\n';

      case 'blockquote':
        const quoteText = node.content?.map((p: any) =>
          renderTextContent(p.content)
        ).join('\n') || '';
        return `____\n${quoteText}\n____\n\n`;

      case 'image':
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        return `image::${src}[${alt}]\n\n`;

      case 'table':
        return renderTable(node);

      case 'horizontalRule':
        return "'''\n\n";

      default:
        return '';
    }
  }).join('');
};

/**
 * 渲染文本内容（包含格式标记）
 */
const renderTextContent = (content?: AsciiDocNode[]): string => {
  if (!content) return '';

  return content.map(c => {
    let t = c.text || '';

    if (c.marks) {
      c.marks.forEach((mark: any) => {
        if (mark.type === 'bold') t = `*${t}*`;
        if (mark.type === 'italic') t = `_${t}_`;
        if (mark.type === 'code') t = `\`${t}\``;
        if (mark.type === 'underline') t = `[.underline]#${t}#`;
        if (mark.type === 'strike') t = `[.line-through]#${t}#`;

        if (mark.type === 'textStyle' && mark.attrs) {
          if (mark.attrs.color) {
            // 使用标准 AsciiDoc 颜色语法
            const colorName = hexToColorName(mark.attrs.color);
            if (colorName) {
              t = `[${colorName}]#${t}#`;
            } else {
              t = `[#${mark.attrs.color.replace('#', '')}]#${t}#`;
            }
          }
          if (mark.attrs.fontSize) {
            t = `[size=${mark.attrs.fontSize}]#${t}#`;
          }
        }

        if (mark.type === 'highlight') {
          if (mark.attrs?.color) {
            t = `[${hexToColorName(mark.attrs.color) || 'yellow'}-background]#${t}#`;
          } else {
            t = `[yellow-background]#${t}#`;
          }
        }

        if (mark.type === 'link' && mark.attrs?.href) {
          t = `link:${mark.attrs.href}[${t}]`;
        }
      });
    }
    return t;
  }).join('');
};

/**
 * 渲染表格（支持合并单元格和表格标题）
 */
const renderTable = (node: AsciiDocNode): string => {
  if (!node.content || node.content.length === 0) return '';

  // 检查是否有表格标题 (tableCaption)
  let captionText = '';
  const filteredContent = node.content.filter((child) => {
    if (child.type === 'tableCaption') {
      captionText = renderTextContent(child.content);
      return false;
    }
    return true;
  });

  // 收集所有行的数据，包括合并信息
  interface CellData {
    text: string;
    colspan: number;
    rowspan: number;
  }

  const rows: CellData[][] = [];
  let maxCols = 0;

  filteredContent.forEach((row) => {
    if (row.type === 'tableRow' && row.content) {
      const rowCells: CellData[] = [];
      let colCount = 0;

      row.content.forEach((cell) => {
        const cellText = cell.content?.map((p: any) =>
          renderTextContent(p.content)
        ).join(' ') || '';

        const colspan = cell.attrs?.colspan || 1;
        const rowspan = cell.attrs?.rowspan || 1;

        rowCells.push({
          text: cellText,
          colspan,
          rowspan
        });

        colCount += colspan;
      });

      rows.push(rowCells);
      maxCols = Math.max(maxCols, colCount);
    }
  });

  if (rows.length === 0) return '';

  // 生成列定义
  const colDef = Array(maxCols).fill('1').join(',');

  // 生成表格内容
  let tableOutput = '';
  rows.forEach((row, rowIndex) => {
    tableOutput += '\n';

    row.forEach((cell) => {
      // 构建合并单元格前缀
      // AsciiDoc 语法: colspan.rowspan+| (例如 2.3+| 表示横跨2列、纵跨3行)
      let prefix = '';

      if (cell.colspan > 1 && cell.rowspan > 1) {
        // 同时有 colspan 和 rowspan
        prefix = `${cell.colspan}.${cell.rowspan}+`;
      } else if (cell.colspan > 1) {
        // 只有 colspan
        prefix = `${cell.colspan}+`;
      } else if (cell.rowspan > 1) {
        // 只有 rowspan
        prefix = `.${cell.rowspan}+`;
      }

      tableOutput += `${prefix}| ${cell.text} `;
    });

    // 标题行后添加空行（AsciiDoc 语法要求）
    if (rowIndex === 0) {
      tableOutput += '\n';
    }
  });

  // 生成 AsciiDoc 表格
  const captionLine = captionText ? `.${captionText}\n` : '';
  return `${captionLine}[cols="${colDef}", options="header"]\n|===${tableOutput}\n|===\n\n`;
};

/**
 * 十六进制颜色转颜色名
 */
const hexToColorName = (hex: string): string | null => {
  const colorMap: Record<string, string> = {
    '#ff0000': 'red',
    '#00ff00': 'green',
    '#0000ff': 'blue',
    '#ffff00': 'yellow',
    '#ff00ff': 'purple',
    '#00ffff': 'aqua',
    '#000000': 'black',
    '#ffffff': 'white',
    '#808080': 'gray',
    '#ffa500': 'orange',
    '#ef4444': 'red',
    '#3b82f6': 'blue',
    '#22c55e': 'green',
    '#eab308': 'yellow',
  };

  return colorMap[hex.toLowerCase()] || null;
};

// 示例内容
export const INITIAL_CONTENT = `= Welcome to AsciiDoc WYSIWYG

This is a *modern editor* that supports _full AsciiDoc syntax_.

== Features

* Real-time synchronization
* [red]#Colored text# support
* [yellow-background]#Highlight# styles
* Code syntax highlighting
* Tables with merge support

== Code Example

[source,javascript]
----
function hello() {
  console.log("Hello, AsciiDoc!");
  return true;
}
----

== Table Example

[cols="1,2,2", options="header"]
|===
| Type | Example A | Example B

| Text Colors
| [red]#Red text# +
[blue]#Blue text#
| [green]#Green text#

| Highlights
| [yellow-background]#Yellow highlight#
| [aqua-background]#Cyan highlight#
|===

== Image Example

image::https://via.placeholder.com/400x200[Sample Image]

'''

Enjoy writing documentation!`;
