/**
 * SettingsModal - 设置模态框
 * 包含外观设置（主题、自定义 CSS）和编辑器设置
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { useEditorStore } from '../store/useEditorStore';
import {
    THEMES,
    getActiveTheme,
    setActiveTheme,
    getCustomCSS,
    setCustomCSS,
    applyTheme,
    applyCustomCSS,
    Theme,
} from '../lib/theme-system';
import { Palette, Code, Check, Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

type SettingsTab = 'appearance' | 'editor';

export const SettingsModal: React.FC = () => {
    const { isSettingsModalOpen, closeSettingsModal, darkMode, toggleDarkMode, language, setLanguage } = useEditorStore();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
    const [currentTheme, setCurrentTheme] = useState<Theme>(getActiveTheme());
    const [customCss, setCustomCssState] = useState<string>(getCustomCSS());
    const [showCustomCss, setShowCustomCss] = useState(false);

    // 加载当前设置
    useEffect(() => {
        if (isSettingsModalOpen) {
            setCurrentTheme(getActiveTheme());
            setCustomCssState(getCustomCSS());
        }
    }, [isSettingsModalOpen]);

    // 应用主题
    const handleThemeChange = useCallback((themeId: string) => {
        const theme = THEMES[themeId];
        if (theme) {
            setCurrentTheme(theme);
            setActiveTheme(themeId);
            applyTheme(theme);
        }
    }, []);

    // 应用自定义 CSS（实时预览）
    const handleCustomCssChange = useCallback((css: string) => {
        setCustomCssState(css);
        applyCustomCSS(css);
    }, []);

    // 保存自定义 CSS
    const saveCustomCss = useCallback(() => {
        setCustomCSS(customCss);
    }, [customCss]);

    // 主题卡片
    const themeCards = Object.values(THEMES);

    return (
        <Modal
            isOpen={isSettingsModalOpen}
            onClose={closeSettingsModal}
            title={t('settings.title')}
            size="lg"
        >
            <div className="flex h-[500px]">
                {/* 左侧 Tab 导航 */}
                <div
                    className={`w-48 border-r shrink-0 py-2 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
                        }`}
                >
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === 'appearance'
                            ? darkMode
                                ? 'bg-slate-700 text-slate-100'
                                : 'bg-white text-gray-900 shadow-sm'
                            : darkMode
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                    >
                        <Palette size={16} />
                        {t('settings.appearance')}
                    </button>
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === 'editor'
                            ? darkMode
                                ? 'bg-slate-700 text-slate-100'
                                : 'bg-white text-gray-900 shadow-sm'
                            : darkMode
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                    >
                        <Code size={16} />
                        {t('settings.editor')}
                    </button>
                </div>

                {/* 右侧内容 */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            {/* 深色模式切换 */}
                            <div>
                                <h3
                                    className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-200' : 'text-gray-900'
                                        }`}
                                >
                                    {t('settings.colorMode')}
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => !darkMode && toggleDarkMode()}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${!darkMode
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : darkMode
                                                ? 'border-slate-600 text-slate-400 hover:border-slate-500'
                                                : 'border-gray-300 text-gray-600 hover:border-gray-400'
                                            }`}
                                    >
                                        <Sun size={16} />
                                        {t('settings.light')}
                                    </button>
                                    <button
                                        onClick={() => darkMode || toggleDarkMode()}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${darkMode
                                            ? 'border-blue-500 bg-blue-900/30 text-blue-400'
                                            : 'border-gray-300 text-gray-600 hover:border-gray-400'
                                            }`}
                                    >
                                        <Moon size={16} />
                                        {t('settings.dark')}
                                    </button>
                                </div>
                            </div>

                            {/* 主题选择 */}
                            <div>
                                <h3
                                    className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-200' : 'text-gray-900'
                                        }`}
                                >
                                    {t('settings.theme')}
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {themeCards.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => handleThemeChange(theme.id)}
                                            className={`relative p-3 rounded-lg border-2 transition-all ${currentTheme.id === theme.id
                                                ? 'border-blue-500 ring-2 ring-blue-500/20'
                                                : darkMode
                                                    ? 'border-slate-600 hover:border-slate-500'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {/* 主题预览 */}
                                            <div
                                                className="h-12 rounded-md mb-2"
                                                style={{
                                                    background: `linear-gradient(135deg, ${theme.colors.editorBg} 50%, ${theme.colors.previewBg} 50%)`,
                                                }}
                                            />
                                            <span
                                                className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'
                                                    }`}
                                            >
                                                {theme.name}
                                            </span>
                                            {currentTheme.id === theme.id && (
                                                <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 自定义 CSS */}
                            <div>
                                <button
                                    onClick={() => setShowCustomCss(!showCustomCss)}
                                    className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-gray-900'
                                        }`}
                                >
                                    <Code size={14} />
                                    {t('settings.customCss')}
                                    <span
                                        className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                                            }`}
                                    >
                                        {t('settings.advanced')}
                                    </span>
                                </button>

                                {showCustomCss && (
                                    <div className="mt-3 space-y-3">
                                        <textarea
                                            value={customCss}
                                            onChange={(e) => handleCustomCssChange(e.target.value)}
                                            placeholder="/* Add your custom CSS here */&#10;.asciidoc-preview {&#10;  font-family: 'Georgia', serif;&#10;}"
                                            className={`w-full h-32 p-3 font-mono text-xs rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                                                ? 'bg-slate-900 border-slate-600 text-slate-300 placeholder-slate-600'
                                                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                                                }`}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setCustomCssState('');
                                                    applyCustomCSS('');
                                                    setCustomCSS('');
                                                }}
                                                className={`px-3 py-1.5 text-xs rounded-md ${darkMode
                                                    ? 'text-slate-400 hover:bg-slate-700'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {t('settings.clear')}
                                            </button>
                                            <button
                                                onClick={saveCustomCss}
                                                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                            >
                                                {t('settings.saveCss')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div className="space-y-6">
                            {/* 语言设置 */}
                            <div>
                                <h3
                                    className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-200' : 'text-gray-900'
                                        }`}
                                >
                                    {t('settings.language')}
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setLanguage('zh')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${language === 'zh'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : darkMode
                                                ? 'border-slate-600 text-slate-400 hover:border-slate-500'
                                                : 'border-gray-300 text-gray-600 hover:border-gray-400'
                                            }`}
                                    >
                                        🇨🇳 中文
                                    </button>
                                    <button
                                        onClick={() => setLanguage('en')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${language === 'en'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : darkMode
                                                ? 'border-slate-600 text-slate-400 hover:border-slate-500'
                                                : 'border-gray-300 text-gray-600 hover:border-gray-400'
                                            }`}
                                    >
                                        🇺🇸 English
                                    </button>
                                </div>
                            </div>

                            {/* 其他编辑器设置 - 占位 */}
                            <div>
                                <h3
                                    className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-200' : 'text-gray-900'
                                        }`}
                                >
                                    {t('settings.editorSettings')}
                                </h3>
                                <div
                                    className={`p-4 rounded-lg border-2 border-dashed ${darkMode ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'
                                        }`}
                                >
                                    <p className="text-sm">
                                        {t('settings.comingSoon')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;
