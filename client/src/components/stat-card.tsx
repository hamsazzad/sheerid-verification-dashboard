import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  accentColor?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, accentColor = "hsl(var(--primary))" }: StatCardProps) {
  return (
    <Card className="relative p-5 group hover-elevate" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1.5 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
              <span>{trend.positive ? '+' : ''}{trend.value}%</span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          )}
        </div>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-md shrink-0"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
