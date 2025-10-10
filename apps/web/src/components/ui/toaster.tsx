'use client';

import { useToast } from '@/components/ui/toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastAction,
} from '@/components/ui/toast';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastIcon = ({ variant }: { variant?: string }) => {
  const iconMap = {
    success: CheckCircle,
    destructive: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    default: Info,
  };

  const Icon = iconMap[variant as keyof typeof iconMap] || iconMap.default;
  return <Icon className="h-5 w-5 shrink-0" />;
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start space-x-3">
              <ToastIcon variant={variant} />
              <div className="flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action && <ToastAction altText="Action">{action}</ToastAction>}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}