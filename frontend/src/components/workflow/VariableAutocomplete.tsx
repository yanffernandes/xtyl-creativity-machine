"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVariableAutocomplete, VariableOption } from "@/hooks/useVariableAutocomplete";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Variable, ChevronRight } from "lucide-react";

interface VariableAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    nodeId: string;
    placeholder?: string;
    className?: string;
    multiline?: boolean;
}

export default function VariableAutocomplete({
    value,
    onChange,
    nodeId,
    placeholder,
    className,
    multiline = false,
}: VariableAutocompleteProps) {
    const [open, setOpen] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const variables = useVariableAutocomplete(nodeId);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const newValue = e.target.value;
        const newCursorPosition = e.target.selectionStart || 0;

        onChange(newValue);
        setCursorPosition(newCursorPosition);

        // Check if we just typed "{{"
        if (newValue.slice(newCursorPosition - 2, newCursorPosition) === "{{") {
            setOpen(true);
        } else if (!newValue.includes("{{") || newValue.slice(newCursorPosition - 2, newCursorPosition) === "}}") {
            setOpen(false);
        }
    };

    const handleSelectVariable = useCallback((variable: VariableOption) => {
        // Find the last "{{" before cursor
        const beforeCursor = value.slice(0, cursorPosition);
        const lastDoubleBrace = beforeCursor.lastIndexOf("{{");

        if (lastDoubleBrace !== -1) {
            const prefix = value.slice(0, lastDoubleBrace);
            const suffix = value.slice(cursorPosition);
            const newValue = `${prefix}${variable.value}${suffix}`;
            onChange(newValue);
        } else {
            // If no {{ found, just append the variable
            onChange(value + variable.value);
        }

        setOpen(false);

        // Restore focus
        setTimeout(() => {
            inputRef.current?.focus();
        }, 10);
    }, [value, cursorPosition, onChange]);

    const InputComponent = multiline ? Textarea : Input;

    return (
        <div className="relative w-full">
            <InputComponent
                ref={inputRef as any}
                value={value}
                onChange={handleInputChange}
                placeholder={placeholder}
                className={cn("w-full font-mono text-sm", className)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                }}
                onFocus={(e) => {
                    setCursorPosition(e.target.selectionStart || 0);
                }}
                onClick={(e) => {
                    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
                    setCursorPosition(target.selectionStart || 0);
                }}
            />

            {/* Variable Dropdown */}
            {open && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-full max-w-[350px] rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden"
                >
                    <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/50">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Variable className="w-3 h-3" />
                            <span>Variáveis Disponíveis</span>
                        </div>
                    </div>

                    <div className="max-h-[250px] overflow-y-auto">
                        {variables.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 text-center">
                                <p>Nenhuma variável disponível</p>
                                <p className="text-xs mt-1">Conecte nós anteriores para usar suas saídas</p>
                            </div>
                        ) : (
                            <div className="py-1">
                                {variables.map((variable) => (
                                    <button
                                        key={variable.value}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSelectVariable(variable);
                                        }}
                                        className="w-full px-3 py-2 text-left hover:bg-gray-800 transition-colors flex items-center gap-2 group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-gray-200 truncate">
                                                {variable.label}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono truncate">
                                                {variable.value}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
