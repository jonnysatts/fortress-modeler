import { Badge } from '@/components/ui/badge';
import { Globe, Users, User, Eye, Edit, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  id?: string | number;
  is_public?: boolean;
  shared_by?: string;
  share_count?: number;
}

interface ShareStatusBadgeProps {
  project: Project;
  permission?: 'owner' | 'view' | 'edit';
  size?: 'sm' | 'md';
  className?: string;
}

interface ShareCountBadgeProps {
  shareCount?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function ShareStatusBadge({ 
  project, 
  permission = 'owner', 
  size = 'md',
  className 
}: ShareStatusBadgeProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  
  // If project is shared by someone else
  if (project.shared_by && permission !== 'owner') {
    return (
      <Badge variant="secondary" className={cn('flex items-center gap-1', textSize, className)}>
        {permission === 'view' ? (
          <Eye className={iconSize} />
        ) : (
          <Edit className={iconSize} />
        )}
        {permission === 'view' ? 'View Only' : 'Can Edit'}
      </Badge>
    );
  }

  // If project is public
  if (project.is_public) {
    return (
      <Badge variant="outline" className={cn('flex items-center gap-1 text-blue-600 border-blue-200', textSize, className)}>
        <Globe className={iconSize} />
        Public
      </Badge>
    );
  }

  // If user is owner
  if (permission === 'owner') {
    return (
      <Badge variant="outline" className={cn('flex items-center gap-1', textSize, className)}>
        <Crown className={iconSize} />
        Owner
      </Badge>
    );
  }

  // Default private project
  return (
    <Badge variant="secondary" className={cn('flex items-center gap-1', textSize, className)}>
      <User className={iconSize} />
      Private
    </Badge>
  );
}

export function ShareCountBadge({ 
  shareCount = 0, 
  size = 'md',
  className 
}: ShareCountBadgeProps) {
  if (shareCount === 0) return null;

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', textSize, className)}>
      <Users className={iconSize} />
      {shareCount} shared
    </Badge>
  );
}