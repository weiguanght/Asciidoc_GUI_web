/**
 * Include 指令预处理器
 * 解析 AsciiDoc 的 include::filename.adoc[] 指令
 * 从 store 中查找对应文件内容并替换
 */

import { FileItem } from '../types';

// 最大嵌套深度（防止循环引用）
const MAX_INCLUDE_DEPTH = 5;

// Include 指令正则表达式
const INCLUDE_PATTERN = /^include::([^\[]+)\[\]$/gm;

/**
 * 预处理 Include 指令
 * @param content 主文档内容
 * @param files 所有文件列表
 * @param currentFileName 当前文件名（用于检测循环引用）
 * @param depth 当前嵌套深度
 * @returns 处理后的内容
 */
export const processIncludes = (
    content: string,
    files: FileItem[],
    currentFileName: string = '',
    depth: number = 0
): string => {
    // 检查最大深度
    if (depth >= MAX_INCLUDE_DEPTH) {
        console.warn(`Include depth exceeded (max: ${MAX_INCLUDE_DEPTH})`);
        return content;
    }

    // 替换所有 include 指令
    return content.replace(INCLUDE_PATTERN, (match, filename) => {
        const trimmedFilename = filename.trim();

        // 检测循环引用
        if (trimmedFilename === currentFileName) {
            return `// WARNING: Circular include detected: ${trimmedFilename}`;
        }

        // 查找文件
        const file = files.find(f =>
            f.name === trimmedFilename ||
            f.name === trimmedFilename + '.adoc' ||
            f.name.toLowerCase() === trimmedFilename.toLowerCase() ||
            f.name.toLowerCase() === (trimmedFilename + '.adoc').toLowerCase()
        );

        if (!file) {
            return `// WARNING: Include file not found: ${trimmedFilename}`;
        }

        // 递归处理嵌套的 include
        const processedContent = processIncludes(
            file.content,
            files,
            file.name,
            depth + 1
        );

        // 添加注释标记便于调试
        return `// === START INCLUDE: ${file.name} ===\n${processedContent}\n// === END INCLUDE: ${file.name} ===`;
    });
};

/**
 * 检查内容是否包含 Include 指令
 * @param content 文档内容
 * @returns 是否包含 include 指令
 */
export const hasIncludes = (content: string): boolean => {
    return INCLUDE_PATTERN.test(content);
};

/**
 * 提取所有 Include 的文件名
 * @param content 文档内容
 * @returns 文件名列表
 */
export const extractIncludeFilenames = (content: string): string[] => {
    const filenames: string[] = [];
    const regex = /^include::([^\[]+)\[\]$/gm;
    let match;

    while ((match = regex.exec(content)) !== null) {
        filenames.push(match[1].trim());
    }

    return filenames;
};
