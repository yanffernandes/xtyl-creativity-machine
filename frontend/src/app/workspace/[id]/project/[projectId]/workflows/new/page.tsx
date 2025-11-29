"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Home, FolderOpen, Workflow, FileText, Zap } from "lucide-react";
import { WorkflowCard } from "@/components/workflow/WorkflowCard";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { glassCardClasses } from "@/lib/glass-utils";

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_system: boolean;
  is_recommended?: boolean;
  usage_count?: number;
  nodes_json?: any[];
  edges_json?: any[];
}

const WORKFLOW_CATEGORIES = [
  { id: "social_media", name: "Social Media" },
  { id: "paid_ads", name: "Paid Advertising" },
  { id: "blog", name: "Blog Content" },
  { id: "email", name: "Email Marketing" },
  { id: "seo", name: "SEO" },
  { id: "creative", name: "Creative" },
];

export default function NewWorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New workflow form state
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
  const [newWorkflowCategory, setNewWorkflowCategory] = useState("creative");

  const { session, isLoading: authLoading } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [session, authLoading, projectId, router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch project info
      const projectRes = await api.get(`/workspaces/${workspaceId}/projects`);
      const projects = projectRes.data;
      const currentProject = projects.find((p: any) => p.id === projectId);
      if (currentProject) {
        setProjectName(currentProject.name);
      }

      // Fetch workspace info
      const workspaceRes = await api.get(`/workspaces/`);
      const workspaces = workspaceRes.data;
      const currentWorkspace = workspaces.find((w: any) => w.id === workspaceId);
      if (currentWorkspace) {
        setWorkspaceName(currentWorkspace.name);
      }

      // Fetch system templates
      const templatesRes = await api.get(`/workflows/`, {
        params: {
          is_system: true,
        },
      });
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setNewWorkflowName(`${template.name} (Copy)`);
    setNewWorkflowDescription(template.description || "");
    setNewWorkflowCategory(template.category || "creative");
    setShowCreateDialog(true);
  };

  const handleCreateBlank = () => {
    setSelectedTemplate(null);
    setNewWorkflowName("Novo Workflow");
    setNewWorkflowDescription("");
    setNewWorkflowCategory("creative");
    setShowCreateDialog(true);
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do workflow é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      let newWorkflow;

      if (selectedTemplate) {
        // Duplicate from template
        const response = await api.post(
          `/workflows/${selectedTemplate.id}/duplicate`,
          null,
          {
            params: {
              workspace_id: workspaceId,
              project_id: projectId,
              name: newWorkflowName.trim(),
            },
          }
        );
        newWorkflow = response.data;

        // Update description and category if different
        if (
          newWorkflowDescription !== selectedTemplate.description ||
          newWorkflowCategory !== selectedTemplate.category
        ) {
          await api.put(`/workflows/${newWorkflow.id}`, {
            description: newWorkflowDescription,
            category: newWorkflowCategory,
          });
        }
      } else {
        // Create blank workflow with start and finish nodes
        const response = await api.post(`/workflows/`, {
          workspace_id: workspaceId,
          project_id: projectId,
          name: newWorkflowName.trim(),
          description: newWorkflowDescription,
          category: newWorkflowCategory,
          nodes: [
            {
              id: "start-1",
              type: "start",
              position: { x: 100, y: 200 },
              data: { label: "Start" },
            },
            {
              id: "finish-1",
              type: "finish",
              position: { x: 500, y: 200 },
              data: { label: "Finish" },
            },
          ],
          edges: [],
        });
        newWorkflow = response.data;
      }

      toast({
        title: "Sucesso",
        description: "Workflow criado com sucesso",
      });

      // Navigate to editor
      router.push(
        `/workspace/${workspaceId}/project/${projectId}/workflows/${newWorkflow.id}`
      );
    } catch (error: any) {
      console.error("Failed to create workflow", error);
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Falha ao criar workflow",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const recommendedTemplates = templates.filter((t) => t.is_recommended);
  const allTemplates = templates;

  const breadcrumbItems = [
    { label: "Home", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
    { label: workspaceName || "Workspace", href: `/workspace/${workspaceId}`, icon: <FolderOpen className="h-3.5 w-3.5" /> },
    { label: projectName || "Projeto", href: `/workspace/${workspaceId}/project/${projectId}`, icon: <FolderOpen className="h-3.5 w-3.5" /> },
    { label: "Workflows", href: `/workspace/${workspaceId}/project/${projectId}/workflows`, icon: <Workflow className="h-3.5 w-3.5" /> },
    { label: "Novo Workflow" },
  ];

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Floating sidebar container */}
      <div className="p-3 pr-0">
        <WorkspaceSidebar className="h-[calc(100vh-24px)]" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Breadcrumbs */}
        <div className="px-6 py-6 border-b border-white/10">
          <Breadcrumbs items={breadcrumbItems} className="mb-3" />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                router.push(`/workspace/${workspaceId}/project/${projectId}/workflows`)
              }
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Novo Workflow</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <LoadingSkeleton type="card" count={6} />
          ) : (
            <div className="space-y-8">
              {/* Create Blank Option */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Começar do Zero</h2>
                <div
                  className={cn(
                    glassCardClasses,
                    "p-6 cursor-pointer transition-all hover:scale-[1.02]",
                    "hover:shadow-lg hover:border-primary/30",
                    "flex items-center gap-4"
                  )}
                  onClick={handleCreateBlank}
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Workflow em Branco</h3>
                    <p className="text-sm text-muted-foreground">
                      Crie um workflow do zero com total flexibilidade
                    </p>
                  </div>
                </div>
              </div>

              {/* Templates */}
              <Tabs defaultValue="recommended" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Usar Template</h2>
                  <TabsList>
                    <TabsTrigger value="recommended">
                      <Zap className="h-4 w-4 mr-2" />
                      Recomendados
                    </TabsTrigger>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="recommended" className="space-y-4">
                  {recommendedTemplates.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum template recomendado disponível
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendedTemplates.map((template) => (
                        <WorkflowCard
                          key={template.id}
                          id={template.id}
                          name={template.name}
                          description={template.description}
                          category={template.category}
                          isSystem={template.is_system}
                          isRecommended={template.is_recommended}
                          usageCount={template.usage_count}
                          onEdit={() => handleSelectTemplate(template)}
                          onDuplicate={() => handleSelectTemplate(template)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="all" className="space-y-4">
                  {allTemplates.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum template disponível
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allTemplates.map((template) => (
                        <WorkflowCard
                          key={template.id}
                          id={template.id}
                          name={template.name}
                          description={template.description}
                          category={template.category}
                          isSystem={template.is_system}
                          isRecommended={template.is_recommended}
                          usageCount={template.usage_count}
                          onEdit={() => handleSelectTemplate(template)}
                          onDuplicate={() => handleSelectTemplate(template)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Criar a partir do Template" : "Criar Workflow"}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? `Baseado no template "${selectedTemplate.name}"`
                : "Configure seu novo workflow"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Nome do workflow"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                placeholder="Descrição do workflow"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={newWorkflowCategory} onValueChange={setNewWorkflowCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkflow} disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
