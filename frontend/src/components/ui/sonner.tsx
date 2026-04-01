"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast !rounded-[2.5rem] !bg-surface-container-low/95 !backdrop-blur-xl !text-on-surface !border !border-outline-variant/15 !shadow-2xl !p-6 !min-w-[350px] transition-all duration-500",
          description: "!text-on-surface-variant font-medium text-xs leading-relaxed mt-1",
          actionButton: "!bg-primary-fixed !text-on-primary font-bold !rounded-xl",
          cancelButton: "!bg-surface-container-high !text-on-surface-variant font-bold !rounded-xl",
          success: "!border-secondary/30 !bg-secondary/15 !text-secondary !shadow-secondary/20",
          error: "!border-tertiary/30 !bg-tertiary/15 !text-tertiary !shadow-tertiary/20",
          warning: "!border-warning/30 !bg-warning/15 !text-warning !shadow-warning/20",
          info: "!border-primary-fixed/30 !bg-primary-fixed/15 !text-primary-fixed !shadow-primary-fixed/20",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-6 text-secondary animate-in fade-in zoom-in duration-300" />,
        info: <InfoIcon className="size-6 text-primary-fixed animate-in fade-in zoom-in duration-300" />,
        warning: <TriangleAlertIcon className="size-6 text-warning animate-in fade-in zoom-in duration-300" />,
        error: <OctagonXIcon className="size-6 text-tertiary animate-in fade-in zoom-in duration-300" />,
        loading: <Loader2Icon className="size-6 text-primary-fixed animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
