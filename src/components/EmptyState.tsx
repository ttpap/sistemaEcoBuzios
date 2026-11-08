import React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Botão/link de ação (ex.: "Cadastrar aluno"). */
  action?: React.ReactNode;
  className?: string;
};

/** Estado vazio padronizado: ícone + título + texto de apoio + ação opcional. */
export default function EmptyState({ icon: Icon = Inbox, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-12", className)}>
      <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-base font-black text-slate-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
