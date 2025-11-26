"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Rocket, AlertCircle } from "lucide-react";
import api from "@/lib/api";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  default_params_json: Record<string, any>;
  nodes_json: any[];
}

interface LaunchWorkflowModalProps {
  template: WorkflowTemplate | null;
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId?: string;
}

export default function LaunchWorkflowModal({
  template,
  open,
  onClose,
  workspaceId,
  projectId,
}: LaunchWorkflowModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});

  // Initialize params when template changes
  useEffect(() => {
    if (template?.default_params_json) {
      setParams(template.default_params_json);
    }
  }, [template]);

  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLaunch = async () => {
    if (!template || !projectId) {
      setError("Project ID is required to launch workflow");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post("/workflows/executions/", {
        template_id: template.id,
        project_id: projectId,
        config_json: params,
      });

      const execution = response.data;

      // Redirect to execution monitor
      router.push(
        `/workspace/${workspaceId}/workflows/executions/${execution.id}`
      );

      onClose();
    } catch (err: any) {
      console.error("Error launching workflow:", err);
      setError(err.message || "Failed to launch workflow");
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;

  const paramKeys = Object.keys(template.default_params_json || {});

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#5B8DEF] to-[#4A7AD9]">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            Launch {template.name}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Workflow Info */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Steps</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {template.nodes_json?.length || 0} nodes
              </span>
            </div>
          </div>

          {/* Configuration Parameters */}
          {paramKeys.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Configuration Parameters
              </h3>

              {paramKeys.map((key) => {
                const value = params[key] || template.default_params_json[key];
                const isLongText = typeof value === "string" && value.length > 50;

                return (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {key.replace(/_/g, " ")}
                    </label>
                    {isLongText ? (
                      <Textarea
                        value={params[key] || value}
                        onChange={(e) => handleParamChange(key, e.target.value)}
                        placeholder={value}
                        rows={3}
                        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-700"
                      />
                    ) : (
                      <Input
                        value={params[key] || value}
                        onChange={(e) => handleParamChange(key, e.target.value)}
                        placeholder={value}
                        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-700"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-200">
                  Launch Failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-gray-300 dark:border-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLaunch}
            disabled={loading || !projectId}
            className="bg-gradient-to-r from-[#5B8DEF] to-[#4A7AD9] text-white hover:shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Launch Workflow
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
