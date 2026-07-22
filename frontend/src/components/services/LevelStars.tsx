import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface LevelStarsProps {
  level?: string | null
  className?: string
}

export const getLevelActiveCount = (level?: string | null) => {
  const val = (level || "p3").toLowerCase()
  if (val === "p0") return 4
  if (val === "p1") return 3
  if (val === "p2") return 2
  return 1
}

export const LevelStars = ({ level, className }: LevelStarsProps) => {
  const active = getLevelActiveCount(level)
  return (
    <div className={cn("flex gap-0.5 text-[#00f1fe]", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3 w-3",
            star <= active ? "fill-current" : "opacity-20",
          )}
        />
      ))}
    </div>
  )
}
