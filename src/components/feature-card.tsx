import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-colors hover:border-primary/40",
        className
      )}
    >
      <CardContent className="p-6">
        <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary transition-colors group-hover:bg-accent">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mb-2 text-base font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
