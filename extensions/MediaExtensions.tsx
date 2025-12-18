import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { VideoNodeView, AudioNodeView, FileNodeView } from './MediaViews';

export const Video = Node.create({
    name: 'video',
    group: 'block',
    draggable: true,

    addAttributes() {
        return {
            id: {
                default: null,
            },
            src: {
                default: null,
            },
            width: {
                default: null,
            },
            height: {
                default: null,
            },
            title: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'video',
            },
            {
                tag: 'div.videoblock video',
                getAttrs: (node) => ({
                    src: (node as HTMLElement).getAttribute('src'),
                }),
            },
            {
                tag: 'iframe[src*="youtube"]',
                getAttrs: (node) => ({
                    src: (node as HTMLElement).getAttribute('src'),
                }),
            },
            {
                tag: 'div.videoblock iframe',
                getAttrs: (node) => ({
                    src: (node as HTMLElement).getAttribute('src'),
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(VideoNodeView);
    },
});

export const Audio = Node.create({
    name: 'audio',
    group: 'block',
    draggable: true,

    addAttributes() {
        return {
            id: {
                default: null,
            },
            src: {
                default: null,
            },
            title: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'audio',
            },
            {
                tag: 'div.audioblock audio',
                getAttrs: (node) => ({
                    src: (node as HTMLElement).getAttribute('src'),
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'audio' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AudioNodeView);
    },
});

export const FileBlock = Node.create({
    name: 'fileBlock',
    group: 'block',
    draggable: true,

    addAttributes() {
        return {
            id: {
                default: null,
            },
            src: {
                default: null,
            },
            title: {
                default: null,
            },
            size: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="fileBlock"]',
            },
            {
                // Import strategy: Support blocks with specific role
                tag: 'div.file-attachment',
                getAttrs: (node) => ({
                    src: (node as HTMLElement).getAttribute('data-src'),
                    title: (node as HTMLElement).getAttribute('data-title'),
                    size: (node as HTMLElement).getAttribute('data-size'),
                }),
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'fileBlock' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(FileNodeView);
    },
});
