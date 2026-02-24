import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useState, useId } from "react";
import { toast } from "sonner";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/projects/new")({
  component: NewProjectPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function NewProjectPage() {
  const navigate = useNavigate();
  const { createProject, creating } = useProjects();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("NGN");

  const nameId = useId();
  const descriptionId = useId();
  const budgetId = useId();
  const currencyId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    try {
      const result = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        budget: budget ? Number.parseFloat(budget) : undefined,
        currency,
      });

      if (result.data?.createProject) {
        toast.success("Project created successfully");
        navigate({
          to: "/projects/$projectId",
          params: { projectId: result.data.createProject.id },
        });
      } else {
        throw new Error("Failed to create project");
      }
    } catch (error) {
      toast.error("Failed to create project");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/projects" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground">Set up a new project to track funds and expenses.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor={nameId}>
                Project Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id={nameId}
                placeholder="e.g., Kitchen Renovation, Community Fundraiser"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={descriptionId}>Description (Optional)</Label>
              <Textarea
                id={descriptionId}
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={budgetId}>Budget (Optional)</Label>
                <Input
                  id={budgetId}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={currencyId}>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id={currencyId}>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                    <SelectItem value="SAR">SAR (ر.س)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/projects" })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="flex-1">
                {creating ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
