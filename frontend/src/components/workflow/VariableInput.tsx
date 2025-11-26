"use client";

/**
 * Variable Input Component
 *
 * Enhanced textarea with variable syntax highlighting and autocomplete.
 * Supports {{node_name.field_name}} syntax for variable references.
 *
 * Features:
 * - Syntax highlighting for {{variables}}
 * - Autocomplete dropdown for available variables
 * - Real-time validation
 * - Preview tooltips on hover
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, AlertCircle, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface VariableOption {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  fields: string[];
}

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  availableVariables?: VariableOption[];
  className?: string;
  rows?: number;
  disabled?: boolean;
}

interface ParsedVariable {
  full: string;
  nodeId: string;
  field: string;
  start: number;
  end: number;
  valid: boolean;
}

export default function VariableInput({
  value,
  onChange,
  placeholder = "Enter your prompt...",
  availableVariables = [],
  className = "",
  rows = 4,
  disabled = false,
}: VariableInputProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse variables from text
  const parsedVariables = useMemo((): ParsedVariable[] => {
    const regex = /\{\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_]+)\}\}/g;
    const variables: ParsedVariable[] = [];
    let match;

    while ((match = regex.exec(value)) !== null) {
      const [full, nodeId, field] = match;
      const isValid = availableVariables.some(
        (v) => v.nodeId === nodeId && v.fields.includes(field)
      );

      variables.push({
        full,
        nodeId,
        field,
        start: match.index,
        end: match.index + full.length,
        valid: isValid,
      });
    }

    return variables;
  }, [value, availableVariables]);

  // Get filtered autocomplete options
  const autocompleteOptions = useMemo(() => {
    if (!autocompleteFilter) return [];

    const lowerFilter = autocompleteFilter.toLowerCase();
    const options: Array<{ nodeId: string; nodeName: string; field: string }> = [];

    availableVariables.forEach((node) => {
      node.fields.forEach((field) => {
        const fullVar = `${node.nodeId}.${field}`;
        if (
          fullVar.toLowerCase().includes(lowerFilter) ||
          node.nodeName.toLowerCase().includes(lowerFilter)
        ) {
          options.push({
            nodeId: node.nodeId,
            nodeName: node.nodeName,
            field,
          });
        }
      });
    });

    return options.slice(0, 10); // Limit to 10 results
  }, [autocompleteFilter, availableVariables]);

  // Handle textarea changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart;

    onChange(newValue);
    setCursorPosition(cursor);

    // Check if we're typing a variable (after {{)
    const beforeCursor = newValue.substring(0, cursor);
    const lastOpenBrace = beforeCursor.lastIndexOf("{{");
    const lastCloseBrace = beforeCursor.lastIndexOf("}}");

    if (lastOpenBrace > lastCloseBrace) {
      // We're inside a variable
      const variableStart = lastOpenBrace + 2;
      const partialVar = beforeCursor.substring(variableStart);
      setAutocompleteFilter(partialVar);
      setShowAutocomplete(true);
      setSelectedIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  };

  // Handle autocomplete selection
  const selectOption = (option: { nodeId: string; field: string }) => {
    if (!textareaRef.current) return;

    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    const lastOpenBrace = beforeCursor.lastIndexOf("{{");

    if (lastOpenBrace === -1) return;

    const variableStart = lastOpenBrace + 2;
    const before = value.substring(0, variableStart);
    const variableText = `${option.nodeId}.${option.field}}}`;
    const newValue = before + variableText + afterCursor;
    const newCursor = variableStart + variableText.length;

    onChange(newValue);
    setShowAutocomplete(false);

    // Restore focus and cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete || autocompleteOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < autocompleteOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (autocompleteOptions[selectedIndex]) {
        e.preventDefault();
        selectOption(autocompleteOptions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowAutocomplete(false);
    }
  };

  // Syntax highlighted display
  const renderHighlightedText = () => {
    if (!value) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    parsedVariables.forEach((variable, index) => {
      // Add text before variable
      if (variable.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {value.substring(lastIndex, variable.start)}
          </span>
        );
      }

      // Add variable with styling
      parts.push(
        <span
          key={`var-${index}`}
          className={`font-mono px-1 rounded ${
            variable.valid
              ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
              : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
          }`}
          title={
            variable.valid
              ? `Variable: ${variable.nodeId}.${variable.field}`
              : `Invalid variable: ${variable.full}`
          }
        >
          {variable.full}
        </span>
      );

      lastIndex = variable.end;
    });

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(<span key="text-end">{value.substring(lastIndex)}</span>);
    }

    return parts;
  };

  // Count validation stats
  const validVariables = parsedVariables.filter((v) => v.valid).length;
  const invalidVariables = parsedVariables.filter((v) => !v.valid).length;

  return (
    <div className="relative">
      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`font-mono text-sm ${className}`}
      />

      {/* Autocomplete Dropdown */}
      {showAutocomplete && autocompleteOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-w-md backdrop-blur-2xl bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {autocompleteOptions.map((option, index) => (
            <button
              key={`${option.nodeId}-${option.field}`}
              onClick={() => selectOption(option)}
              className={`w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center justify-between ${
                index === selectedIndex
                  ? "bg-blue-100 dark:bg-blue-950"
                  : ""
              }`}
            >
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {option.nodeName}
                </div>
                <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                  {option.nodeId}.{option.field}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
            </button>
          ))}
        </div>
      )}

      {/* Validation Status */}
      {parsedVariables.length > 0 && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          {validVariables > 0 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Check className="w-3 h-3" />
              <span>{validVariables} valid variable(s)</span>
            </div>
          )}
          {invalidVariables > 0 && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3" />
              <span>{invalidVariables} invalid variable(s)</span>
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Type <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{"{{"}</span> to insert a variable
      </div>
    </div>
  );
}
