"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Plus, ArrowLeft, Home, FolderOpen, Layers } from "lucide-react";
import { WorkflowList } from "@/components/workflow/WorkflowList";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import { Workflow } from "lucide-react";

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_system: boolean;
  is_recommended?: boolean;
  usage_count?: number;
  created_at: string;
  updated_at?: string;
}

export default function ProjectWorkflowsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;

  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  const { token } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [token, projectId, router]);

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

      // Fetch workflows for this project (non-system templates associated with project)
      const workflowsRes = await api.get(`/workflows/`, {
        params: {
          project_id: projectId,
          is_system: false,
        },
      });
      setWorkflows(workflowsRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar workflows",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    router.push(`/workspace/${workspaceId}/project/${projectId}/workflows/new`);
  };

  const handleEditWorkflow = (workflowId: string) => {
    router.push(`/workspace/${workspaceId}/project/${projectId}/workflows/${workflowId}`);
  };

  const handleDuplicateWorkflow = async (workflowId: string) => {
    try {
      await api.post(`/workflows/${workflowId}/duplicate`, null, {
        params: {
          workspace_id: workspaceId,
          project_id: projectId,
        },
      });
      toast({
        title: "Sucesso",
        description: "Workflow duplicado com sucesso",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to duplicate workflow", error);
      toast({
        title: "Erro",
        description: "Falha ao duplicar workflow",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm("Tem certeza que deseja excluir este workflow?")) return;

    try {
      await api.delete(`/workflows/${workflowId}`);
      toast({
        title: "Sucesso",
        description: "Workflow excluído com sucesso",
      });
      fetchData();
    } catch (error: any) {
      console.error("Failed to delete workflow", error);
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Falha ao excluir workflow",
        variant: "destructive",
      });
    }
  };

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      await api.post(`/workflows/${workflowId}/execute`, {
        project_id: projectId,
      });
      toast({
        title: "Execução iniciada",
        description: "O workflow está sendo executado",
      });
    } catch (error) {
      console.error("Failed to run workflow", error);
      toast({
        title: "Erro",
        description: "Falha ao executar workflow",
        variant: "destructive",
      });
    }
  };

  const breadcrumbItems = [
    { label: "Home", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
    { label: workspaceName || "Workspace", href: `/workspace/${workspaceId}`, icon: <FolderOpen className="h-3.5 w-3.5" /> },
    { label: projectName || "Projeto", href: `/workspace/${workspaceId}/project/${projectId}`, icon: <FolderOpen className="h-3.5 w-3.5" /> },
    { label: "Workflows", icon: <Workflow className="h-3.5 w-3.5" /> },
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/workspace/${workspaceId}/project/${projectId}`)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">
                Workflows
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/workspace/${workspaceId}/workflows`)}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Ver Templates
              </Button>
              <Button onClick={handleCreateWorkflow} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Workflow
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <LoadingSkeleton type="card" count={6} />
          ) : workflows.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title="Nenhum workflow ainda"
              description="Crie seu primeiro workflow para automatizar tarefas de criação de conteúdo"
              action={{
                label: "Novo Workflow",
                onClick: handleCreateWorkflow,
              }}
            />
          ) : (
            <WorkflowList
              workflows={workflows}
              onEdit={handleEditWorkflow}
              onDuplicate={handleDuplicateWorkflow}
              onDelete={handleDeleteWorkflow}
              onRun={handleRunWorkflow}
            />
          )}
        </div>
      </div>
    </div>
  );
}
