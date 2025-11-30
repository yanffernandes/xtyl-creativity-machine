"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, Edit } from "lucide-react";

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

interface TemplateCardProps {
  template: WorkflowTemplate;
  onClick: () => void;
  onEdit: () => void;
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

const getCategoryIcon = (category: string) => {
  // You can add specific icons per category later
  return <Sparkles className="w-4 h-4" />;
};

export default function TemplateCard({ template, onClick, onEdit }: TemplateCardProps) {
  return (
    <Card
      className="group relative p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200 dark:border-gray-800 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden"
    >
      {/* Gradient hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#5B8DEF]/5 to-[#7AA5F5]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-[#5B8DEF] transition-colors">
              {template.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                template.category
              )}`}
            >
              {getCategoryIcon(template.category)}
              {template.category.replace("_", " ").toUpperCase()}
            </span>
          </div>

          {template.is_system && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-500/20">
              <Sparkles className="w-3 h-3" />
              System
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
          {template.description}
        </p>

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {template.nodes_json?.length || 0}
              </span>{" "}
              steps
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {template.usage_count}
              </span>{" "}
              uses
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="border-[#5B8DEF] text-[#5B8DEF] hover:bg-[#5B8DEF]/10"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="bg-gradient-to-r from-[#5B8DEF] to-[#4A7AD9] text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Launch
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
