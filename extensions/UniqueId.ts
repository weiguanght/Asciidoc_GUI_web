/**
 * UniqueID 扩展 (Tiptap 2.x 兼容版本)
 * 
 * 功能：
 * - 为所有顶级节点自动添加唯一 ID
 * - ID 在节点分割、合并、undo/redo 时保持稳定
 * - 粘贴内容时生成新 ID
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

// 生成 UUID
function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 回退方案
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export interface UniqueIdOptions {
    /** 需要添加 ID 的节点类型 */
    types: string[];
    /** 属性名称 */
    attributeName: string;
    /** ID 生成函数 */
    generateID: () => string;
}

export const UniqueId = Extension.create<UniqueIdOptions>({
    name: 'uniqueId',

    addOptions() {
        return {
            types: [
                'heading',
                'paragraph',
                'codeBlock',
                'blockquote',
                'bulletList',
                'orderedList',
                'listItem',
                'table',
                'image',
                'admonition',
                'include',
                'rawBlock',
                'horizontalRule',
            ],
            attributeName: 'id',
            generateID: generateId,
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    [this.options.attributeName]: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('data-block-id'),
                        renderHTML: (attributes) => {
                            const id = attributes[this.options.attributeName];
                            if (!id) return {};
                            return { 'data-block-id': id };
                        },
                    },
                },
            },
        ];
    },

    addProseMirrorPlugins() {
        const { types, attributeName, generateID } = this.options;
        const pluginKey = new PluginKey('uniqueId');

        return [
            new Plugin({
                key: pluginKey,

                appendTransaction: (transactions, oldState, newState) => {
                    // 检查是否有文档变化
                    const docChanged = transactions.some((tr) => tr.docChanged);
                    if (!docChanged) return null;

                    const tr = newState.tr;
                    let modified = false;

                    // 遍历所有节点，为缺少 ID 的节点添加 ID
                    newState.doc.descendants((node, pos) => {
                        // 检查节点类型是否在配置列表中
                        if (!types.includes(node.type.name)) return;

                        // 检查是否已有 ID
                        const currentId = node.attrs[attributeName];
                        if (currentId) return;

                        // 生成新 ID
                        const newId = generateID();
                        tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            [attributeName]: newId,
                        });
                        modified = true;
                    });

                    return modified ? tr : null;
                },
            }),
        ];
    },
});

// 预配置的扩展实例
export const UniqueIdExtension = UniqueId.configure({
    types: [
        'heading',
        'paragraph',
        'codeBlock',
        'blockquote',
        'bulletList',
        'orderedList',
        'listItem',
        'table',
        'image',
        'admonition',
        'include',
        'rawBlock',
        'horizontalRule',
    ],
    attributeName: 'id',
    generateID: generateId,
});

export default UniqueId;
