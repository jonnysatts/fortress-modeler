import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FinancialModel } from "@/lib/db";
import EventModelForm from "./components/EventModelForm";
import { useProject } from "@/hooks/useProjects";
import { useModel } from "@/hooks/useModels";

const EditFinancialModel = () => {
  const { projectId, modelId } = useParams<{ projectId: string; modelId: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<FinancialModel | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: fetchedModel, isLoading: modelLoading } = useModel(modelId);

  useEffect(() => {
    if (project) {
      setProjectName(project.name);
    }
  }, [project]);

  useEffect(() => {
    if (fetchedModel) {
      const fm = { ...fetchedModel };
      if (fm.assumptions.metadata?.type === "WeeklyEvent") {
        if (!fm.assumptions.metadata.costs) {
          fm.assumptions.metadata.costs = {
            setupCosts: 0,
            spreadSetupCosts: false,
            fbCOGSPercent: 30,
            staffCount: 0,
            staffCostPerPerson: 0,
            managementCosts: 0,
          };
        }
        fm.assumptions.metadata.costs.spreadSetupCosts = !!fm.assumptions.metadata.costs.spreadSetupCosts;
      }
      setModel(fm);
    }
  }, [fetchedModel]);

  const loading = projectLoading || modelLoading || !model;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (model.assumptions.metadata?.type === "WeeklyEvent") {
    return (
      <EventModelForm
        projectId={projectId!}
        projectName={projectName}
        existingModel={model}
        onCancel={() => navigate(`/projects/${projectId}/models/${modelId}`)}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/projects/${projectId}/models/${modelId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-fortress-blue">
            Edit: {model.name}
          </h1>
          <p className="text-muted-foreground">
            Edit financial model for {projectName}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Model</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6">
            Editor for standard financial models is under development. 
            Please return to the model view.
          </p>
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => navigate(`/projects/${projectId}/models/${modelId}`)}
            >
              Return to Model
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditFinancialModel;
