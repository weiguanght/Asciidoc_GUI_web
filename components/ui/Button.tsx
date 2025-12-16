import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'toolbar';
  active?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className = '',
  variant = 'secondary',
  active = false,
  ...props
}, ref) => {
  const darkMode = useEditorStore((state) => state.darkMode);

  const baseStyles = "inline-flex items-center justify-center rounded transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium shadow-sm";
      case 'secondary':
        return darkMode
          ? "bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600 px-3 py-2 text-sm font-medium"
          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-2 text-sm font-medium";
      case 'ghost':
        return darkMode
          ? "text-slate-300 hover:bg-slate-700 px-2 py-1.5 rounded-md"
          : "text-gray-600 hover:bg-gray-100 px-2 py-1.5 rounded-md";
      case 'toolbar':
        if (active) {
          return "p-2 rounded bg-blue-100 text-blue-600 hover:bg-blue-200";
        }
        return darkMode
          ? "p-2 rounded hover:bg-slate-700 text-blue-400"
          : "p-2 rounded hover:bg-gray-100 text-gray-600";
      default:
        return "";
    }
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${getVariantStyles()} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";