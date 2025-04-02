import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  description,
  error,
  children,
  className,
  required = false,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <Label 
        htmlFor={id}
        className={cn(error && "text-destructive")}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {description && !error && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
