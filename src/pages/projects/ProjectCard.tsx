import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building, Edit, Globe, Lock, Share2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Project } from "@/types/models";

interface ProjectCardProps {
  project: Project;
  onShareClick?: (project: Project) => void;
  onToggleVisibility?: (project: Project) => void;
  permission?: 'view' | 'edit';
}

export const ProjectCard = ({ 
  project, 
  onShareClick, 
  onToggleVisibility,
  permission = 'edit'
}: ProjectCardProps) => {
  const navigate = useNavigate();

  const handleProjectClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer border-fortress-grey-light hover:border-fortress-blue-light"
      onClick={handleProjectClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={project.avatarImage} alt={project.name} />
            <AvatarFallback>
              {project.name.substring(0, 2).toUpperCase() || <Building size={20} />}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {project.productType}
              </Badge>
              {project.isPublic && (
                <Globe className="h-3 w-3 text-muted-foreground" />
              )}
              {project.shared_by && (
                <Users className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {project.description && (
          <CardDescription className="mb-4 line-clamp-2">
            {project.description}
          </CardDescription>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            {permission === 'edit' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${project.id}/edit`);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {onToggleVisibility && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(project);
                    }}
                  >
                    {project.isPublic ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                  </Button>
                )}
                {onShareClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareClick(project);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {project.shared_by && (
          <p className="text-xs text-muted-foreground mt-2">
            Shared by {project.shared_by}
          </p>
        )}
      </CardContent>
    </Card>
  );
};