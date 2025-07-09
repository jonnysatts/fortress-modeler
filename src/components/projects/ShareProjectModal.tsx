import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Globe, Lock, CheckCircle } from "lucide-react";
import { Project } from "@/lib/db";
import { useUpdateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface ShareProjectModalProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareProjectModal = ({ project, open, onOpenChange }: ShareProjectModalProps) => {
  const [isPublic, setIsPublic] = useState(project.is_public || false);
  const [copied, setCopied] = useState(false);
  const updateProject = useUpdateProject();

  const projectUrl = `${window.location.origin}/projects/${project.id}`;

  const handleTogglePublic = async () => {
    const newPublicState = !isPublic;
    setIsPublic(newPublicState);

    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: { is_public: newPublicState }
      });
    } catch (error) {
      setIsPublic(!newPublicState);
      console.error("Failed to update project visibility:", error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(projectUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Manage who can access and view your project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-fortress-emerald" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <Label htmlFor="public-toggle" className="flex flex-col">
                <span className="text-sm font-medium">
                  {isPublic ? "Public Project" : "Private Project"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isPublic 
                    ? "Anyone with the link can view this project" 
                    : "Only you can access this project"}
                </span>
              </Label>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={updateProject.isPending}
            />
          </div>

          {isPublic && (
            <>
              <div className="border-t pt-4">
                <Label htmlFor="share-link" className="text-sm font-medium mb-2 block">
                  Share Link
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="share-link"
                    value={projectUrl}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  Public projects can be viewed by anyone with the link. They will appear in the public projects directory.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};