import { type HTMLAttributes, type ReactNode } from 'react';

export type CardProps = {
  children: ReactNode;
  title?: string;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Card({ children, title, className = '', ...props }: CardProps) {
  const baseStyles = 'bg-white rounded-lg shadow-md border border-gray-200';
  const combinedClassName = `${baseStyles} ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}