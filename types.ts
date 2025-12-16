export interface FileItem {
  id: string;
  name: string;
  content: string;
  lastModified: number;
  parentId: string | null;  // 父文件夹 ID，null 表示根目录
  type: 'file' | 'folder';  // 类型：文件或文件夹
}

export enum ViewMode {
  EDITOR_ONLY = 'EDITOR_ONLY',
  SPLIT = 'SPLIT',
  SOURCE_ONLY = 'SOURCE_ONLY'
}

export interface AsciiDocNode {
  type: string;
  content?: AsciiDocNode[];
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
}