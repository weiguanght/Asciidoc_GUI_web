/**
 * AsciiDoc 转换工具
 * 使用 asciidoctor.js 实现完整语法支持
 */

import { AsciiDocNode } from '../types';
import { adocToHtml } from './asciidoctor-renderer';
import { tiptapToAsciidoc, TiptapDocument } from './ast-visitor';

// 导出新的渲染函数
export { adocToHtml };

// 保留简化版本作为后备 (用于 Tiptap JSON -> AsciiDoc)
export const simpleAdocToHtml = adocToHtml;

/**
 * 将 Tiptap JSON 转换为 AsciiDoc 源码
 * 使用 Visitor 模式的 AST 转换器
 * @param json Tiptap 编辑器的 JSON 内容
 * @returns AsciiDoc 源码
 */
export const jsonToAdoc = (json: { type: string, content?: AsciiDocNode[] }): string => {
  if (!json || !json.content) return '';

  // 使用 Visitor 模式转换器
  return tiptapToAsciidoc(json as TiptapDocument);
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
