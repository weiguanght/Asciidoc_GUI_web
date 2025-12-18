/**
 * useTranslation Hook - 便捷的翻译 Hook
 */

import { useMemo } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { t, TranslationKey } from '../lib/i18n';

/**
 * 使用翻译的 Hook
 * @returns 翻译函数和当前语言
 */
export function useTranslation() {
    const language = useEditorStore((state) => state.language);

    const translate = useMemo(() => {
        return (key: TranslationKey) => t(key, language);
    }, [language]);

    return {
        t: translate,
        language,
    };
}

export default useTranslation;
