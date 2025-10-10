import { type InputHTMLAttributes, forwardRef } from 'react';

export type InputProps = {
  label?: string;
  error?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const baseStyles = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
    const errorStyles = error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : '';
    const combinedClassName = `${baseStyles} ${errorStyles} ${className}`.trim();

    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input ref={ref} className={combinedClassName} {...props} />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';