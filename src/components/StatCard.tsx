import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "teal" | "blue" | "amber" | "emerald" | "rose" | "slate";
  trend?: string;
}

const colorMap = {
  teal: { bg: "bg-teal-50", text: "text-teal-600", ring: "ring-teal-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-100" },
  slate: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200" },
};

export default function StatCard({ label, value, icon: Icon, color = "teal", trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="card p-5 transition-all hover:shadow-md animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-slate-400 mt-1">{trend}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center ring-4 ${c.ring}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
    </div>
  );
}
