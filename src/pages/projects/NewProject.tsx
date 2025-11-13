import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useImageUpload } from "@/hooks/useImageUpload";
import { productTypes } from "@/lib/constants";
import { useCreateProject } from "@/hooks/useProjects";
import { useActiveEventTypes } from "@/hooks/useCategories";

const formSchema = z
  .object({
    name: z.string().min(3, "Project name must be at least 3 characters"),
    description: z.string().optional(),
    productType: z.string().min(1, "Please select a product type"),
    targetAudience: z.string().optional(),
    startDate: z.date(),
    endDate: z.date().optional(),
    eventType: z.enum(["weekly", "special"]).default("weekly"),
    eventDate: z.date().optional(),
    eventEndDate: z.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.eventType === "special" && !data.eventDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventDate"],
        message: "Event date is required for special events",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const NewProject = () => {
  const navigate = useNavigate();
  const createProjectMutation = useCreateProject();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { preview: avatarPreview, dataUrl: avatarDataUrl, handleImageChange, removeImage } = useImageUpload();
  const { data: eventTypes = [], isLoading: eventTypesLoading } = useActiveEventTypes();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      productType: "",
      targetAudience: "",
      startDate: new Date(),
      eventType: "weekly",
    },
  });

  const eventType = form.watch("eventType");

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const createdProject = await createProjectMutation.mutateAsync({
        name: data.name,
        description: data.description,
        productType: data.productType,
        targetAudience: data.targetAudience,
        timeline: {
          startDate: data.startDate,
          endDate: data.endDate,
        },
        avatarImage: avatarDataUrl,
        event_type: data.eventType,
        event_date: data.eventDate,
        event_end_date: data.eventEndDate,
      });
      
      if (createdProject && createdProject.id) {
        navigate(`/projects/${createdProject.id}`);
      } else {
        // If creation failed or didn't return an ID, go back to the list.
        navigate('/projects');
      }
    } catch (error) {
      console.error("Error creating project:", error);
      // The useCreateProject hook already shows toast messages, but we'll add a fallback
      if (!createProjectMutation.isError) {
        toast.error("Failed to create project", {
          description: "There was an error creating your project. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-fortress-blue">New Project</h1>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Create a New Project</CardTitle>
          <CardDescription>
            Enter the details for your new financial modeling project.
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
                    <FormDescription>
                      This is how your project will be identified in the dashboard.
                    </FormDescription>
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
                      <Textarea 
                        placeholder="Enter a brief description of your project..." 
                        className="resize-none h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide context about the purpose and goals of this project.
                    </FormDescription>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The type of product will determine relevant financial metrics and KPIs.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={eventTypesLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={eventTypesLoading ? "Loading event types..." : "Select event type"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose "Special Event" for one-off events with unique dates.
                    </FormDescription>
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
                      <Input placeholder="e.g., Small businesses with 10-50 employees" {...field} />
                    </FormControl>
                    <FormDescription>
                      Define who your product or service is designed for.
                    </FormDescription>
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
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When does this project begin?
                      </FormDescription>
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
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < form.getValues("startDate")}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When is this project expected to end?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {eventType === "special" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Event Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Date of the special event.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="eventEndDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Event End Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < (form.getValues("eventDate") || new Date(0))}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Optional end date if the event spans multiple days.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="avatar-upload">Project Avatar (Optional)</Label>
                <Input 
                  id="avatar-upload"
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="mt-1"
                />
                {avatarPreview && (
                  <div className="mt-4">
                    <Label>Preview:</Label>
                    <img src={avatarPreview} alt="Avatar Preview" className="mt-2 w-24 h-24 object-cover rounded-md border" />
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={removeImage}>
                      Remove Image
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Max 2MB. Recommended square aspect ratio.</p>
              </div>

              <CardFooter className="flex justify-between px-0 pb-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/projects")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || createProjectMutation.isPending}
                  className="bg-fortress-emerald hover:bg-fortress-emerald/90"
                >
                  {(isSubmitting || createProjectMutation.isPending) ? (
                    <span className="flex items-center gap-1">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Create Project
                    </span>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewProject;
