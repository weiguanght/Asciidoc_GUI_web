/**
 * AST Visitor 单元测试
 * 测试 Tiptap JSON -> AsciiDoc 转换的各种场景
 */

import { describe, it, expect } from 'vitest';
import { TiptapJSONVisitor, TiptapDocument, tiptapToAsciidoc } from '../lib/ast-visitor';

describe('TiptapJSONVisitor', () => {
    // ============ 基础节点测试 ============

    describe('Basic Nodes', () => {
        it('should convert empty document', () => {
            const doc: TiptapDocument = { type: 'doc', content: [] };
            expect(tiptapToAsciidoc(doc)).toBe('');
        });

        it('should convert simple paragraph', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Hello World' }]
                }]
            };
            expect(tiptapToAsciidoc(doc)).toBe('Hello World');
        });

        it('should convert heading levels 1-6', () => {
            for (let level = 1; level <= 6; level++) {
                const doc: TiptapDocument = {
                    type: 'doc',
                    content: [{
                        type: 'heading',
                        attrs: { level },
                        content: [{ type: 'text', text: `Heading ${level}` }]
                    }]
                };
                const expected = '='.repeat(level + 1) + ` Heading ${level}`;
                expect(tiptapToAsciidoc(doc)).toBe(expected);
            }
        });

        it('should convert horizontal rule', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{ type: 'horizontalRule' }]
            };
            expect(tiptapToAsciidoc(doc)).toBe("'''");
        });
    });

    // ============ Marks 测试（关键）============

    describe('Inline Marks', () => {
        it('should convert bold text', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: 'bold',
                        marks: [{ type: 'bold' }]
                    }]
                }]
            };
            expect(tiptapToAsciidoc(doc)).toBe('*bold*');
        });

        it('should convert italic text', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: 'italic',
                        marks: [{ type: 'italic' }]
                    }]
                }]
            };
            expect(tiptapToAsciidoc(doc)).toBe('_italic_');
        });

        it('should convert inline code', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: 'code',
                        marks: [{ type: 'code' }]
                    }]
                }]
            };
            expect(tiptapToAsciidoc(doc)).toBe('`code`');
        });

        it('should handle nested marks with correct priority (bold + italic)', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: 'text',
                        marks: [
                            { type: 'bold' },
                            { type: 'italic' }
                        ]
                    }]
                }]
            };
            // 根据优先级：bold 在 italic 外层
            const result = tiptapToAsciidoc(doc);
            expect(result).toMatch(/\*.*_text_.*\*/);
        });

        it('should convert links', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: 'Click here',
                        marks: [{ type: 'link', attrs: { href: 'https://example.com' } }]
                    }]
                }]
            };
            expect(tiptapToAsciidoc(doc)).toBe('https://example.com[Click here]');
        });
    });

    // ============ 列表测试 ============

    describe('Lists', () => {
        it('should convert simple bullet list', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'bulletList',
                    content: [
                        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] },
                        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }] }
                    ]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('* Item 1');
            expect(result).toContain('* Item 2');
        });

        it('should convert ordered list', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'orderedList',
                    content: [
                        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
                        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] }
                    ]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('. First');
            expect(result).toContain('. Second');
        });

        it('should convert nested lists', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'bulletList',
                    content: [{
                        type: 'listItem',
                        content: [
                            { type: 'paragraph', content: [{ type: 'text', text: 'Parent' }] },
                            {
                                type: 'bulletList',
                                content: [{
                                    type: 'listItem',
                                    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Child' }] }]
                                }]
                            }
                        ]
                    }]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('* Parent');
            expect(result).toContain('** Child');
        });
    });

    // ============ 代码块测试 ============

    describe('Code Blocks', () => {
        it('should convert code block without language', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'codeBlock',
                    content: [{ type: 'text', text: 'const x = 1;' }]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('----');
            expect(result).toContain('const x = 1;');
        });

        it('should convert code block with language', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'codeBlock',
                    attrs: { language: 'javascript' },
                    content: [{ type: 'text', text: 'const x = 1;' }]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('[source,javascript]');
            expect(result).toContain('----');
        });
    });

    // ============ 引用块测试 ============

    describe('Blockquotes', () => {
        it('should convert simple blockquote', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'blockquote',
                    content: [{
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Quote text' }]
                    }]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('[quote]');
            expect(result).toContain('____');
            expect(result).toContain('Quote text');
        });
    });

    // ============ 表格测试 ============

    describe('Tables', () => {
        it('should convert simple table', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'table',
                    content: [{
                        type: 'tableRow',
                        content: [
                            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Header' }] }] }
                        ]
                    }, {
                        type: 'tableRow',
                        content: [
                            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cell' }] }] }
                        ]
                    }]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('|===');
            expect(result).toContain('| Header');
            expect(result).toContain('| Cell');
        });
    });

    // ============ 告示块测试 ============

    describe('Admonitions', () => {
        it('should convert NOTE admonition', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'admonition',
                    attrs: { type: 'NOTE' },
                    content: [{
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Note content' }]
                    }]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('[NOTE]');
            expect(result).toContain('====');
            expect(result).toContain('Note content');
        });

        it('should convert WARNING admonition', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'admonition',
                    attrs: { type: 'WARNING' },
                    content: [{
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Warning content' }]
                    }]
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('[WARNING]');
        });
    });

    // ============ 图片测试 ============

    describe('Images', () => {
        it('should convert image with alt text', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'image',
                    attrs: { src: 'image.png', alt: 'Alt text' }
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toBe('image::image.png[Alt text]');
        });

        it('should convert image with title', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'image',
                    attrs: { src: 'image.png', alt: 'Alt', title: 'Figure 1' }
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('.Figure 1');
            expect(result).toContain('image::image.png[Alt]');
        });
    });

    // ============ Include 指令测试 ============

    describe('Include Directives', () => {
        it('should convert include without attributes', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'include',
                    attrs: { path: 'chapter.adoc' }
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toBe('include::chapter.adoc[]');
        });

        it('should convert include with leveloffset', () => {
            const doc: TiptapDocument = {
                type: 'doc',
                content: [{
                    type: 'include',
                    attrs: { path: 'chapter.adoc', leveloffset: '+1' }
                }]
            };
            const result = tiptapToAsciidoc(doc);
            expect(result).toContain('leveloffset=+1');
        });
    });
});
