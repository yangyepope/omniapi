import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary",
        success:
          "bg-secondary-container/30 text-secondary-fixed",
        danger:
          "bg-tertiary/10 text-tertiary",
        warning:
          "bg-tertiary-container/10 text-tertiary-container",
        outline:
          "text-on-surface-variant border border-outline-variant/30",
        neutral:
          "bg-surface-container-highest text-on-surface-variant",
        secondary:
          "bg-secondary-fixed/10 text-secondary-fixed",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
