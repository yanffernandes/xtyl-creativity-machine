"use client"

import { GripVertical } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  orientation = "horizontal",
  ...props
}: ComponentProps<typeof Group> & { direction?: "horizontal" | "vertical" }) => {
  // Map direction prop to orientation for backwards compatibility
  const resolvedOrientation = props.direction || orientation
  return (
    <Group
      className={cn(
        "flex h-full w-full",
        resolvedOrientation === "vertical" ? "flex-col" : "flex-row",
        className
      )}
      orientation={resolvedOrientation}
      {...props}
    />
  )
}

const ResizablePanel = Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) => (
  <Separator
    className={cn(
      "relative flex items-center justify-center bg-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
      // Horizontal orientation (panels stacked vertically)
      "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=horizontal]:cursor-row-resize",
      // Vertical orientation (panels side by side)
      "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px data-[orientation=vertical]:cursor-col-resize",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border data-[orientation=horizontal]:rotate-90">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
