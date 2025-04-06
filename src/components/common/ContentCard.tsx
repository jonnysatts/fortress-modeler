import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  allowOverflow?: boolean;
}

const ContentCard: React.FC<ContentCardProps> = ({
  title,
  description,
  children,
  footer,
  className,
  headerClassName,
  contentClassName,
  footerClassName,
  allowOverflow = false,
}) => {
  return (
    <Card className={cn(allowOverflow ? "overflow-visible" : "overflow-hidden", className)}>
      {(title || description) && (
        <CardHeader className={headerClassName}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn("p-6", allowOverflow ? "overflow-visible" : "", contentClassName)} style={allowOverflow ? { overflow: 'visible' } : {}}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className={cn("bg-muted/20 px-6 py-4", footerClassName)}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};

export default ContentCard;
