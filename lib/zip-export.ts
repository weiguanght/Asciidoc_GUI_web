/**
 * ZIP 导出工具
 * 将 AsciiDoc 文档和图片资源打包为 ZIP 文件
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// 从 localStorage 获取图片数据的接口
interface ImageItem {
    id: string;
    name: string;
    dataUrl: string;
    size: number;
    type: string;
    createdAt: number;
}

const IMAGES_STORAGE_KEY = 'asciidoc-images';

/**
 * 获取存储的图片列表
 */
const getStoredImages = (): ImageItem[] => {
    try {
        return JSON.parse(localStorage.getItem(IMAGES_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

/**
 * 将 Data URL 转换为 Blob
 */
const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

/**
 * 处理文档中的图片引用，将 Data URL 替换为相对路径
 * @param content 文档内容
 * @param images 图片列表
 * @returns 处理后的内容和需要打包的图片
 */
const processImageReferences = (
    content: string,
    images: ImageItem[]
): { processedContent: string; imagesToExport: Map<string, ImageItem> } => {
    const imagesToExport = new Map<string, ImageItem>();
    let processedContent = content;

    // 匹配 image:: 和 image: 指令中的 Data URL
    // 格式: image::data:image/png;base64,...[alt text] 或 image:data:...
    // Data URL 可能很长，需要非贪婪匹配到 [
    const dataUrlPattern = /image:(:{1,2})(data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+)\[([^\]]*)\]/g;

    let match;
    let lastIndex = 0;
    let result = '';

    while ((match = dataUrlPattern.exec(content)) !== null) {
        const [fullMatch, colons, dataUrl, altText] = match;

        // 添加匹配前的内容
        result += content.slice(lastIndex, match.index);

        // 查找对应的图片
        const image = images.find(img => img.dataUrl === dataUrl);

        if (image) {
            imagesToExport.set(image.id, image);
            const relativePath = `images/${image.name}`;
            result += `image:${colons}${relativePath}[${altText}]`;
        } else {
            // 如果找不到对应图片，生成一个唯一名称
            const timestamp = Date.now() + Math.random().toString(36).substr(2, 9);
            const extMatch = dataUrl.match(/data:image\/([a-zA-Z0-9+]+);/);
            const ext = extMatch ? extMatch[1].replace('+xml', '') : 'png';
            const generatedName = `image_${timestamp}.${ext === 'jpeg' ? 'jpg' : ext}`;

            // 创建临时图片项
            const tempImage: ImageItem = {
                id: `temp-${timestamp}`,
                name: generatedName,
                dataUrl: dataUrl,
                size: 0,
                type: `image/${ext}`,
                createdAt: Date.now()
            };
            imagesToExport.set(tempImage.id, tempImage);

            result += `image:${colons}images/${generatedName}[${altText}]`;
        }

        lastIndex = match.index + fullMatch.length;
    }

    // 添加剩余内容
    result += content.slice(lastIndex);
    processedContent = result || content;

    return { processedContent, imagesToExport };
};

/**
 * 导出文档为 ZIP 文件
 * @param fileName 文件名（不含扩展名）
 * @param content 文档内容
 */
export const exportAsZip = async (fileName: string, content: string): Promise<void> => {
    const zip = new JSZip();
    const images = getStoredImages();

    // 处理图片引用
    const { processedContent, imagesToExport } = processImageReferences(content, images);

    // 添加 .adoc 文件到 ZIP 根目录
    const adocFileName = fileName.endsWith('.adoc') ? fileName : `${fileName}.adoc`;
    zip.file(adocFileName, processedContent);

    // 如果有图片，创建 images 文件夹并添加图片
    if (imagesToExport.size > 0) {
        const imagesFolder = zip.folder('images');

        if (imagesFolder) {
            for (const [, image] of imagesToExport) {
                const blob = dataUrlToBlob(image.dataUrl);
                imagesFolder.file(image.name, blob);
            }
        }
    }

    // 生成并下载 ZIP 文件
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFileName = fileName.replace(/\.adoc$/, '') + '.zip';
    saveAs(zipBlob, zipFileName);
};

/**
 * 检查文档是否包含需要导出的图片
 */
export const hasEmbeddedImages = (content: string): boolean => {
    return /image::data:image\//.test(content);
};
