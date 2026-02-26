import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-base",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-muted-foreground",
                    "hover:border-accent-primary/30 hover:bg-surface-tertiary",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/20 focus-visible:ring-offset-0 focus-visible:border-accent-primary/50 focus-visible:bg-surface-tertiary",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
