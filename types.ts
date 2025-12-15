export interface FileItem {
  id: string;
  name: string;
  content: string;
  lastModified: number;
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