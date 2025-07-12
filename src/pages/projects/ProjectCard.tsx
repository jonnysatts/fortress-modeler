import { memo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building, Edit, Share2, Globe, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Project } from "@/lib/db";
import { ShareProjectModal } from "@/components/projects/ShareProjectModal";
import { formatDateRange } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);

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
              {project.is_public && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Globe className="h-3 w-3" />
                  Public
                </Badge>
              )}
              {project.shared_by && project.permission !== 'owner' && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  Shared
                </Badge>
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
        {project.event_date && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <Calendar className="h-3 w-3" />
            {formatDateRange(project.event_date, project.event_end_date)}
          </p>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            {(!project.permission || project.permission === 'owner') && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareModalOpen(true);
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
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
              </>
            )}
          </div>
        </div>
      </CardContent>
      
      <ShareProjectModal 
        project={project}
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
      />
    </Card>
  );
};

export default memo(ProjectCard);