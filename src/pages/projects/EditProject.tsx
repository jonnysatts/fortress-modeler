import { useState, useEffect, ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import useStore from "@/store/useStore";
import { Label } from "@/components/ui/label";
import { getProject, updateProject } from "@/lib/db"; // Import get/update project functions

// Schema likely same as NewProject
const formSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  productType: z.string().min(1, "Please select a product type"),
  targetAudience: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const productTypes = [
  { value: "WeeklyEvent", label: "Weekly Event" },
  { value: "Merchandise", label: "Merchandise" },
  { value: "CalendarEvent", label: "Calendar Event" },
];

const EditProject = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { // Default values will be loaded from the project
      name: "",
      description: "",
      productType: "",
      targetAudience: "",
      startDate: new Date(),
    },
  });

  // Load existing project data
  useEffect(() => {
    if (!projectId) {
      navigate("/projects");
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      try {
        const project = await getProject(parseInt(projectId));
        if (project) {
          form.reset({
            name: project.name,
            description: project.description || "",
            productType: project.productType,
            targetAudience: project.targetAudience || "",
            startDate: project.timeline?.startDate ? new Date(project.timeline.startDate) : new Date(),
            endDate: project.timeline?.endDate ? new Date(project.timeline.endDate) : undefined,
          });
          if (project.avatarImage) {
            setAvatarPreview(project.avatarImage);
            setAvatarDataUrl(project.avatarImage);
          }
        } else {
          toast({ variant: "destructive", title: "Project not found" });
          navigate("/projects");
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error loading project" });
        navigate("/projects");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [projectId, navigate, form]);

  // Avatar handling (same as NewProject)
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.'});
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
         toast({ variant: 'destructive', title: 'File Too Large', description: 'Image size should not exceed 2MB.'});
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setAvatarDataUrl(result);
      };
      reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Error Reading File', description: 'Could not read the selected image.'});
        setAvatarPreview(null);
        setAvatarDataUrl(undefined);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit handler (uses updateProject)
  const onSubmit = async (data: FormValues) => {
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      await updateProject(parseInt(projectId), {
        name: data.name,
        description: data.description,
        productType: data.productType,
        targetAudience: data.targetAudience,
        timeline: {
          startDate: data.startDate,
          endDate: data.endDate,
        },
        avatarImage: avatarDataUrl, // Include avatar data
      });
      toast({
        title: "Project updated!",
        description: `${data.name} has been updated successfully.`,
      });
      navigate(`/projects/${projectId}/summary`); // Navigate back to project summary
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        variant: "destructive",
        title: "Failed to update project",
        description: "There was an error updating your project. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">
             <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
           </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-fortress-blue">Edit Project</h1>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Project Details</CardTitle>
          <CardDescription>
            Update the information for your project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name..." {...field} />
                    </FormControl>
                    <FormDescription>This is how your project will be identified.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter a brief description..." className="resize-none h-20" {...field} />
                    </FormControl>
                    <FormDescription>Provide context about the project.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select product type" /></SelectTrigger></FormControl>
                      <SelectContent>{productTypes.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormDescription>The type determines relevant metrics.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Small businesses..." {...field} />
                    </FormControl>
                    <FormDescription>Define who the product is for.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className={cn("p-3 pointer-events-auto")} /></PopoverContent>
                      </Popover>
                      <FormDescription>Project start date.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={(date) => date < form.getValues("startDate")} initialFocus className={cn("p-3 pointer-events-auto")} /></PopoverContent>
                      </Popover>
                      <FormDescription>Project end date.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                 <Label htmlFor="avatar-upload">Project Avatar (Optional)</Label>
                 <Input id="avatar-upload" type="file" accept="image/*" onChange={handleImageChange} className="mt-1" />
                 {avatarPreview && (
                    <div className="mt-4">
                      <Label>Preview:</Label>
                      <img src={avatarPreview} alt="Avatar Preview" className="mt-2 w-24 h-24 object-cover rounded-md border" />
                      <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { /* ... remove image logic ... */ }}>
                        Remove Image
                      </Button>
                    </div>
                 )}
                 <p className="text-xs text-muted-foreground mt-1">Max 2MB. Recommended square aspect ratio.</p>
              </div>

              <CardFooter className="flex justify-between px-0 pb-0">
                <Button type="button" variant="outline" onClick={() => navigate(`/projects/${projectId}`)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-fortress-emerald hover:bg-fortress-emerald/90">
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProject;