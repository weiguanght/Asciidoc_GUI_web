import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'toolbar';
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'secondary', 
  active = false,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-2 text-sm font-medium",
    ghost: "text-gray-600 hover:bg-gray-100 px-2 py-1.5 rounded-md",
    toolbar: `p-2 rounded hover:bg-gray-100 ${active ? 'bg-gray-100 text-blue-600' : 'text-gray-600'}`
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};