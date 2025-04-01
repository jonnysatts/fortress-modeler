
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FinancialModel, db } from "@/lib/db";
import useStore from "@/store/useStore";
import { toast } from "@/hooks/use-toast";
import ModelProjections from "@/components/models/ModelProjections";

const FinancialModelDetail = () => {
  const { projectId, modelId } = useParams<{ projectId: string; modelId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<FinancialModel | null>(null);
  const { currentProject } = useStore();

  useEffect(() => {
    const loadModel = async () => {
      if (!projectId || !modelId) return;

      try {
        const financialModel = await db.financialModels.get(parseInt(modelId));
        if (financialModel) {
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
      } finally {
        setLoading(false);
      }
    };

    loadModel();
  }, [projectId, modelId, navigate]);

  const handleDeleteModel = async () => {
    if (!modelId) return;

    try {
      await db.financialModels.delete(parseInt(modelId));
      toast({
        title: "Model deleted",
        description: "The financial model has been successfully deleted.",
      });
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error deleting model:", error);
      toast({
        variant: "destructive",
        title: "Error deleting model",
        description: "There was an error deleting the financial model.",
      });
    }
  };

  if (loading || !model || !currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-fortress-blue">{model.name}</h1>
            <p className="text-muted-foreground">
              Created on {formatDate(model.createdAt)} • Last updated on{" "}
              {formatDate(model.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}/models/${modelId}/edit`)}
          >
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  financial model and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteModel}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Growth Model</h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className="capitalize">
                      {model.assumptions.growthModel.type}
                    </Badge>
                    <span className="ml-2">
                      Rate: {model.assumptions.growthModel.rate * 100}%
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Revenue Streams</h3>
                  <p className="mt-1">{model.assumptions.revenue.length} streams</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Cost Categories</h3>
                  <p className="mt-1">{model.assumptions.costs.length} categories</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Key Metrics</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      $
                      {model.assumptions.revenue
                        .reduce((sum, item) => sum + item.value, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Costs</p>
                    <p className="text-2xl font-bold">
                      $
                      {model.assumptions.costs
                        .reduce((sum, item) => sum + item.value, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Assumptions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {model.assumptions.revenue.map((revenue, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{revenue.name}</TableCell>
                      <TableCell>${revenue.value.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{revenue.type}</TableCell>
                      <TableCell className="capitalize">{revenue.frequency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>Cost Assumptions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {model.assumptions.costs.map((cost, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{cost.name}</TableCell>
                      <TableCell>${cost.value.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{cost.type}</TableCell>
                      <TableCell className="capitalize">{cost.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Financial Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelProjections model={model} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialModelDetail;
