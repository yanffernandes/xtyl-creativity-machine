"use client";

import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValidationIssue {
    type: "error" | "warning";
    message: string;
    nodeId?: string;
}

interface WorkflowValidatorProps {
    issues: ValidationIssue[];
    onClose: () => void;
    onFix?: (issue: ValidationIssue) => void;
}

export default function WorkflowValidator({
    issues,
    onClose,
    onFix,
}: WorkflowValidatorProps) {
    if (issues.length === 0) return null;

    const errors = issues.filter((i) => i.type === "error");
    const warnings = issues.filter((i) => i.type === "warning");

    return (
        <Card className="absolute bottom-4 right-4 w-80 max-h-96 flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-gray-800 shadow-2xl z-50 animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    {errors.length > 0 ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                    )}
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {errors.length > 0 ? "Validation Errors" : "Warnings"}
                    </h3>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onClose}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {errors.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-medium text-red-500 uppercase tracking-wider">
                                Errors ({errors.length})
                            </h4>
                            {errors.map((error, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300"
                                >
                                    {error.message}
                                </div>
                            ))}
                        </div>
                    )}

                    {warnings.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-medium text-orange-500 uppercase tracking-wider">
                                Warnings ({warnings.length})
                            </h4>
                            {warnings.map((warning, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 text-sm text-orange-700 dark:text-orange-300"
                                >
                                    {warning.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </Card>
    );
}
