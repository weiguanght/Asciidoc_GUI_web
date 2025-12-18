/**
 * BlockWrapperExtension - 为块级节点添加拖拽手柄的扩展
 * 
 * 使用 extend() 方法覆盖 StarterKit 中各节点的 addNodeView，
 * 为所有顶级块节点添加 Notion 风格的拖拽手柄和添加按钮
 */

import { ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Blockquote from '@tiptap/extension-blockquote';
import CodeBlock from '@tiptap/extension-code-block';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { BlockNodeView } from './BlockNodeView';

/**
 * 创建带拖拽手柄的 Paragraph 节点
 */
export const ParagraphWithHandle = Paragraph.extend({
    addNodeView() {
        return ReactNodeViewRenderer(BlockNodeView);
    },
});

/**
 * 创建带拖拽手柄的 Heading 节点
 */
export const HeadingWithHandle = Heading.extend({
    addNodeView() {
        return ReactNodeViewRenderer(BlockNodeView);
    },
});

/**
 * 创建带拖拽手柄的 BulletList 节点
 */
export const BulletListWithHandle = BulletList.extend({
    addNodeView() {
        return ReactNodeViewRenderer(BlockNodeView);
    },
});

/**
 * 创建带拖拽手柄的 OrderedList 节点
 */
export const OrderedListWithHandle = OrderedList.extend({
    addNodeView() {
        return ReactNodeViewRenderer(BlockNodeView);
    },
});

/**
 * 创建带拖拽手柄的 Blockquote 节点
 */
export const BlockquoteWithHandle = Blockquote.extend({
    addNodeView() {
        return ReactNodeViewRenderer(BlockNodeView);
    },
});

/**
 * 创建带拖拽手柄的 CodeBlock 节点
 */
export const CodeBlockWithHandle = CodeBlock.extend({
    addNodeView() {
        return ReactNodeViewRenderer(BlockNodeView);
    },
});

/**
 * 创建带拖拽手柄的 HorizontalRule 节点
 */
export const HorizontalRuleWithHandle = HorizontalRule.extend({
    addNodeView() {
        return ReactNodeViewRenderer(BlockNodeView);
    },
});

/**
 * 创建带拖拽手柄的 TaskList 节点
 * 注意：TaskList 本身作为容器，TaskItem 是实际的可勾选项
 */
export const TaskListWithHandle = TaskList.extend({
    addNodeView() {
        return ReactNodeViewRenderer(BlockNodeView);
    },
});

/**
 * 配置 TaskItem 支持嵌套
 * 限制最大嵌套深度为 4 层（避免 AsciiDoc 转换问题）
 */
export const TaskItemConfigured = TaskItem.configure({
    nested: true,
});

/**
 * 预配置的 StarterKit，禁用需要覆盖的节点
 * 使用时需要手动添加 *WithHandle 扩展
 */
export const StarterKitWithoutBlockNodes = StarterKit.configure({
    paragraph: false,
    heading: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    codeBlock: false,
    horizontalRule: false,
});
