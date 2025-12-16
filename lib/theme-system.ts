/**
 * 主题系统
 * 支持预设主题和自定义 CSS
 */

export interface Theme {
    id: string;
    name: string;
    colors: {
        // 编辑器
        editorBg: string;
        editorText: string;
        editorLineNumber: string;
        editorSelection: string;
        editorCursor: string;

        // 预览
        previewBg: string;
        previewText: string;
        previewHeading: string;
        previewLink: string;
        previewCode: string;
        previewCodeBg: string;

        // UI
        sidebarBg: string;
        sidebarText: string;
        toolbarBg: string;
        toolbarText: string;
        border: string;
        accent: string;
        accentHover: string;
    };
    fonts: {
        editor: string;
        preview: string;
        ui: string;
    };
}

// 预设主题
export const THEMES: Record<string, Theme> = {
    light: {
        id: 'light',
        name: 'Light',
        colors: {
            editorBg: '#1e1e1e',
            editorText: '#d4d4d4',
            editorLineNumber: '#6b7280',
            editorSelection: 'rgba(59, 130, 246, 0.3)',
            editorCursor: '#ffffff',
            previewBg: '#ffffff',
            previewText: '#1f2937',
            previewHeading: '#111827',
            previewLink: '#3b82f6',
            previewCode: '#1e1e1e',
            previewCodeBg: '#f3f4f6',
            sidebarBg: '#f9fafb',
            sidebarText: '#374151',
            toolbarBg: '#ffffff',
            toolbarText: '#374151',
            border: '#e5e7eb',
            accent: '#3b82f6',
            accentHover: '#2563eb',
        },
        fonts: {
            editor: "'JetBrains Mono', monospace",
            preview: "'Inter', sans-serif",
            ui: "'Inter', sans-serif",
        },
    },
    dark: {
        id: 'dark',
        name: 'Dark',
        colors: {
            editorBg: '#1e1e1e',
            editorText: '#d4d4d4',
            editorLineNumber: '#6b7280',
            editorSelection: 'rgba(59, 130, 246, 0.3)',
            editorCursor: '#ffffff',
            previewBg: '#1e293b',
            previewText: '#e2e8f0',
            previewHeading: '#f1f5f9',
            previewLink: '#60a5fa',
            previewCode: '#f1f5f9',
            previewCodeBg: '#0f172a',
            sidebarBg: '#1e293b',
            sidebarText: '#cbd5e1',
            toolbarBg: '#0f172a',
            toolbarText: '#e2e8f0',
            border: '#334155',
            accent: '#3b82f6',
            accentHover: '#60a5fa',
        },
        fonts: {
            editor: "'JetBrains Mono', monospace",
            preview: "'Inter', sans-serif",
            ui: "'Inter', sans-serif",
        },
    },
    sepia: {
        id: 'sepia',
        name: 'Sepia',
        colors: {
            editorBg: '#3d3229',
            editorText: '#d4c4a8',
            editorLineNumber: '#8b7355',
            editorSelection: 'rgba(210, 180, 140, 0.3)',
            editorCursor: '#f5deb3',
            previewBg: '#f5f0e6',
            previewText: '#4a3f35',
            previewHeading: '#2d2418',
            previewLink: '#8b4513',
            previewCode: '#3d3229',
            previewCodeBg: '#ede4d4',
            sidebarBg: '#e8dfd0',
            sidebarText: '#5d4e3a',
            toolbarBg: '#f5f0e6',
            toolbarText: '#4a3f35',
            border: '#d4c4a8',
            accent: '#b8860b',
            accentHover: '#cd950c',
        },
        fonts: {
            editor: "'JetBrains Mono', monospace",
            preview: "'Georgia', serif",
            ui: "'Inter', sans-serif",
        },
    },
    monokai: {
        id: 'monokai',
        name: 'Monokai',
        colors: {
            editorBg: '#272822',
            editorText: '#f8f8f2',
            editorLineNumber: '#75715e',
            editorSelection: 'rgba(73, 72, 62, 0.5)',
            editorCursor: '#f8f8f2',
            previewBg: '#272822',
            previewText: '#f8f8f2',
            previewHeading: '#a6e22e',
            previewLink: '#66d9ef',
            previewCode: '#f92672',
            previewCodeBg: '#3e3d32',
            sidebarBg: '#1e1f1c',
            sidebarText: '#cfcfc2',
            toolbarBg: '#272822',
            toolbarText: '#f8f8f2',
            border: '#3e3d32',
            accent: '#a6e22e',
            accentHover: '#e6db74',
        },
        fonts: {
            editor: "'Fira Code', monospace",
            preview: "'Inter', sans-serif",
            ui: "'Inter', sans-serif",
        },
    },
    nord: {
        id: 'nord',
        name: 'Nord',
        colors: {
            editorBg: '#2e3440',
            editorText: '#d8dee9',
            editorLineNumber: '#616e88',
            editorSelection: 'rgba(136, 192, 208, 0.3)',
            editorCursor: '#d8dee9',
            previewBg: '#eceff4',
            previewText: '#2e3440',
            previewHeading: '#3b4252',
            previewLink: '#5e81ac',
            previewCode: '#bf616a',
            previewCodeBg: '#e5e9f0',
            sidebarBg: '#3b4252',
            sidebarText: '#d8dee9',
            toolbarBg: '#2e3440',
            toolbarText: '#eceff4',
            border: '#4c566a',
            accent: '#88c0d0',
            accentHover: '#8fbcbb',
        },
        fonts: {
            editor: "'JetBrains Mono', monospace",
            preview: "'Inter', sans-serif",
            ui: "'Inter', sans-serif",
        },
    },
};

// 自定义 CSS 存储键
const CUSTOM_CSS_KEY = 'asciidoc-custom-css';
const ACTIVE_THEME_KEY = 'asciidoc-active-theme';

/**
 * 获取当前激活的主题
 */
export const getActiveTheme = (): Theme => {
    try {
        const themeId = localStorage.getItem(ACTIVE_THEME_KEY) || 'light';
        return THEMES[themeId] || THEMES.light;
    } catch {
        return THEMES.light;
    }
};

/**
 * 设置激活的主题
 */
export const setActiveTheme = (themeId: string): void => {
    localStorage.setItem(ACTIVE_THEME_KEY, themeId);
    applyTheme(THEMES[themeId] || THEMES.light);
};

/**
 * 获取自定义 CSS
 */
export const getCustomCSS = (): string => {
    try {
        return localStorage.getItem(CUSTOM_CSS_KEY) || '';
    } catch {
        return '';
    }
};

/**
 * 保存自定义 CSS
 */
export const setCustomCSS = (css: string): void => {
    localStorage.setItem(CUSTOM_CSS_KEY, css);
    applyCustomCSS(css);
};

/**
 * 应用主题到文档
 */
export const applyTheme = (theme: Theme): void => {
    const root = document.documentElement;

    // 设置 CSS 变量
    root.style.setProperty('--editor-bg', theme.colors.editorBg);
    root.style.setProperty('--editor-text', theme.colors.editorText);
    root.style.setProperty('--editor-line-number', theme.colors.editorLineNumber);
    root.style.setProperty('--editor-selection', theme.colors.editorSelection);
    root.style.setProperty('--editor-cursor', theme.colors.editorCursor);

    root.style.setProperty('--preview-bg', theme.colors.previewBg);
    root.style.setProperty('--preview-text', theme.colors.previewText);
    root.style.setProperty('--preview-heading', theme.colors.previewHeading);
    root.style.setProperty('--preview-link', theme.colors.previewLink);
    root.style.setProperty('--preview-code', theme.colors.previewCode);
    root.style.setProperty('--preview-code-bg', theme.colors.previewCodeBg);

    root.style.setProperty('--sidebar-bg', theme.colors.sidebarBg);
    root.style.setProperty('--sidebar-text', theme.colors.sidebarText);
    root.style.setProperty('--toolbar-bg', theme.colors.toolbarBg);
    root.style.setProperty('--toolbar-text', theme.colors.toolbarText);
    root.style.setProperty('--border', theme.colors.border);
    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--accent-hover', theme.colors.accentHover);

    root.style.setProperty('--font-editor', theme.fonts.editor);
    root.style.setProperty('--font-preview', theme.fonts.preview);
    root.style.setProperty('--font-ui', theme.fonts.ui);
};

/**
 * 应用自定义 CSS
 */
export const applyCustomCSS = (css: string): void => {
    const existingStyle = document.getElementById('asciidoc-custom-css');
    if (existingStyle) {
        existingStyle.remove();
    }

    if (css.trim()) {
        const style = document.createElement('style');
        style.id = 'asciidoc-custom-css';
        style.textContent = css;
        document.head.appendChild(style);
    }
};

/**
 * 初始化主题系统
 */
export const initThemeSystem = (): void => {
    const theme = getActiveTheme();
    applyTheme(theme);

    const customCSS = getCustomCSS();
    if (customCSS) {
        applyCustomCSS(customCSS);
    }
};

/**
 * 生成主题的 CSS 字符串（用于导出）
 */
export const exportThemeCSS = (theme: Theme): string => {
    return `:root {
  /* Editor */
  --editor-bg: ${theme.colors.editorBg};
  --editor-text: ${theme.colors.editorText};
  --editor-line-number: ${theme.colors.editorLineNumber};
  --editor-selection: ${theme.colors.editorSelection};
  --editor-cursor: ${theme.colors.editorCursor};
  
  /* Preview */
  --preview-bg: ${theme.colors.previewBg};
  --preview-text: ${theme.colors.previewText};
  --preview-heading: ${theme.colors.previewHeading};
  --preview-link: ${theme.colors.previewLink};
  --preview-code: ${theme.colors.previewCode};
  --preview-code-bg: ${theme.colors.previewCodeBg};
  
  /* UI */
  --sidebar-bg: ${theme.colors.sidebarBg};
  --sidebar-text: ${theme.colors.sidebarText};
  --toolbar-bg: ${theme.colors.toolbarBg};
  --toolbar-text: ${theme.colors.toolbarText};
  --border: ${theme.colors.border};
  --accent: ${theme.colors.accent};
  --accent-hover: ${theme.colors.accentHover};
  
  /* Fonts */
  --font-editor: ${theme.fonts.editor};
  --font-preview: ${theme.fonts.preview};
  --font-ui: ${theme.fonts.ui};
}`;
};
