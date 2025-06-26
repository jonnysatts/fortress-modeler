import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { FinancialModel, db } from "@/lib/db";
import useStore from "@/store/useStore";
import EventModelForm from "./components/EventModelForm";

const EditFinancialModel = () => {
  const { projectId, modelId } = useParams<{ projectId: string; modelId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<FinancialModel | null>(null);
  const { loadProjectById, currentProject } = useStore();

  useEffect(() => {
    const loadData = async () => {
      if (!projectId || !modelId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Missing project or model ID",
        });
        navigate("/projects");
        return;
      }

      setLoading(true);
      try {
        // Load the project if it's not already loaded
        if (!currentProject || currentProject.uuid !== projectId) {
          const project = await loadProjectById(projectId);
          if (!project) {
            toast({
              variant: "destructive",
              title: "Project not found",
              description: "The requested project could not be found.",
            });
            navigate("/projects");
            return;
          }
        }

        // Load the financial model
        const financialModel = await db.financialModels.get(parseInt(modelId));
        if (financialModel) {
          // Ensure proper formatting of model metadata
          if (financialModel.assumptions.metadata?.type === "WeeklyEvent") {
            // Ensure costs object exists
            if (!financialModel.assumptions.metadata.costs) {
              financialModel.assumptions.metadata.costs = {
                setupCosts: 0,
                spreadSetupCosts: false,
                fbCOGSPercent: 30,
                staffCount: 0,
                staffCostPerPerson: 0,
                managementCosts: 0
              };
            }
            
            // Ensure spreadSetupCosts is a boolean
            financialModel.assumptions.metadata.costs.spreadSetupCosts = 
              !!financialModel.assumptions.metadata.costs.spreadSetupCosts;
          }
          
          setModel(financialModel);
        } else {
          toast({
            variant: "destructive",
            title: "Model not found",
            description: "The requested financial model could not be found.",
          });
          navigate(`/projects/${projectId}`);
        }
      } catch (error) {
        console.error("Error loading financial model:", error);
        toast({
          variant: "destructive",
          title: "Error loading model",
          description: "There was an error loading the financial model.",
        });
        navigate(`/projects/${projectId}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, modelId, navigate, currentProject, loadProjectById]);

  if (loading || !model || !currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (model.assumptions.metadata?.type === "WeeklyEvent") {
    return (
      <EventModelForm 
        projectId={Number(projectId)}
        projectName={currentProject.name}
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
            Edit financial model for {currentProject.name}
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
