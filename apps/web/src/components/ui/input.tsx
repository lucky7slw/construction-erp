import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        filled: 'bg-muted border-0',
        flushed: 'border-0 border-b-2 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary',
      },
      size: {
        default: 'h-10',
        sm: 'h-9 text-xs',
        lg: 'h-11',
        xl: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  error?: boolean;
  helperText?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    type,
    icon,
    iconPosition = 'left',
    error = false,
    helperText,
    label,
    id,
    ...props
  }, ref) => {
    const inputId = id || React.useId();

    const inputElement = (
      <input
        type={type}
        className={cn(
          inputVariants({ variant, size }),
          error && 'border-destructive focus-visible:ring-destructive',
          icon && iconPosition === 'left' && 'pl-10',
          icon && iconPosition === 'right' && 'pr-10',
          className
        )}
        ref={ref}
        id={inputId}
        {...props}
      />
    );

    if (icon || label || helperText) {
      return (
        <div className="w-full">
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                error && 'text-destructive'
              )}
            >
              {label}
            </label>
          )}
          <div className={cn('relative', label && 'mt-2')}>
            {icon && (
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 text-muted-foreground',
                  iconPosition === 'left' ? 'left-3' : 'right-3'
                )}
              >
                {icon}
              </div>
            )}
            {inputElement}
          </div>
          {helperText && (
            <p
              className={cn(
                'text-sm mt-2',
                error ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {helperText}
            </p>
          )}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };