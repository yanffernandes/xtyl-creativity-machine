"use client";

import { useState, useRef, useEffect } from "react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVariableAutocomplete, VariableOption } from "@/hooks/useVariableAutocomplete";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    const variables = useVariableAutocomplete(nodeId);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const newValue = e.target.value;
        const newCursorPosition = e.target.selectionStart || 0;

        onChange(newValue);
        setCursorPosition(newCursorPosition);

        // Check if we just typed "{{"
        if (newValue.slice(newCursorPosition - 2, newCursorPosition) === "{{") {
            setOpen(true);
        } else if (!newValue.includes("{{")) {
            setOpen(false);
        }
    };

    const handleSelectVariable = (variable: VariableOption) => {
        // Find the last "{{" before cursor
        const beforeCursor = value.slice(0, cursorPosition);
        const lastDoubleBrace = beforeCursor.lastIndexOf("{{");

        if (lastDoubleBrace !== -1) {
            const prefix = value.slice(0, lastDoubleBrace);
            const suffix = value.slice(cursorPosition);
            const newValue = `${prefix}${variable.value}${suffix}`;
            onChange(newValue);
            setOpen(false);

            // Restore focus
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
    };

    const InputComponent = multiline ? Textarea : Input;

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="w-full">
                        <InputComponent
                            ref={inputRef as any}
                            value={value}
                            onChange={handleInputChange}
                            placeholder={placeholder}
                            className={cn("w-full font-mono text-sm", className)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setOpen(false);
                            }}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    className="p-0 w-[300px]"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <Command>
                        <CommandList>
                            <CommandGroup heading="Available Variables">
                                {variables.length === 0 ? (
                                    <div className="p-2 text-sm text-gray-500">No upstream variables found</div>
                                ) : (
                                    variables.map((variable) => (
                                        <CommandItem
                                            key={variable.value}
                                            onSelect={() => handleSelectVariable(variable)}
                                            className="flex flex-col items-start gap-1 cursor-pointer"
                                        >
                                            <div className="font-medium">{variable.label}</div>
                                            <div className="text-xs text-gray-500 font-mono">{variable.value}</div>
                                        </CommandItem>
                                    ))
                                )}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
