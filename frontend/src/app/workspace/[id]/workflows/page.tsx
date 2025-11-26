"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Workflow, Sparkles, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TemplateCard from "@/components/workflow/TemplateCard";
import LaunchWorkflowModal from "@/components/workflow/LaunchWorkflowModal";
import api from "@/lib/api";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  is_system: boolean;
  usage_count: number;
  nodes_json: any[];
  edges_json: any[];
  default_params_json: Record<string, any>;
  created_at: string;
}

export default function WorkflowsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const projectIdFromQuery = searchParams.get("projectId");

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(projectIdFromQuery);

  useEffect(() => {
    fetchTemplates();
    if (!projectIdFromQuery) {
      fetchFirstProject();
    }
  }, [workspaceId, projectIdFromQuery]);

  const fetchFirstProject = async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/projects`);
      if (response.data && response.data.length > 0) {
        setProjectId(response.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const handleTemplateClick = (template: WorkflowTemplate) => {
    if (!projectId) {
      alert("No project found. Please create a project first to launch workflows.");
      return;
    }
    setSelectedTemplate(template);
    setLaunchModalOpen(true);
  };

  const handleTemplateEdit = (template: WorkflowTemplate) => {
    router.push(`/workspace/${workspaceId}/workflows/builder/${template.id}`);
  };

  const handleCreateNew = () => {
    router.push(`/workspace/${workspaceId}/workflows/builder/new`);
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get("/workflows/", {
        params: {
          workspace_id: workspaceId,
        },
      });
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: null, label: "All Templates" },
    { value: "social_media", label: "Social Media" },
    { value: "paid_ads", label: "Paid Ads" },
    { value: "blog", label: "Blog Content" },
    { value: "email", label: "Email Campaigns" },
    { value: "seo", label: "SEO" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#0A0E14] dark:to-[#0A0E14] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#5B8DEF] to-[#4A7AD9] shadow-lg">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Workflow Templates
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-600 dark:text-gray-400">
                Launch automated marketing workflows with AI
              </p>
              {projectId && (
                <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-medium">
                  Project Ready
                </span>
              )}
              {!projectId && !loading && (
                <span className="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-xs font-medium">
                  No Project
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200 dark:border-gray-800"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.value || "all"}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.value
                    ? "bg-[#5B8DEF] text-white shadow-lg"
                    : "bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 backdrop-blur-xl"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="p-12 text-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "No workflow templates available yet"}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => handleTemplateClick(template)}
                onEdit={() => handleTemplateEdit(template)}
              />
            ))}
          </div>
        )}

        {/* Launch Modal */}
        <LaunchWorkflowModal
          template={selectedTemplate}
          open={launchModalOpen}
          onClose={() => setLaunchModalOpen(false)}
          workspaceId={workspaceId}
          projectId={projectId || undefined}
        />
      </div>
    </div>
  );
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    social_media: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    paid_ads: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    blog: "bg-green-500/10 text-green-600 border-green-500/20",
    email: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    seo: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  };
  return colors[category] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
};
