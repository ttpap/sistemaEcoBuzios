"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/**
 * Substituto visual de window.confirm().
 *
 * Uso (dentro de função async):
 *   if (!(await confirmDialog({ title: "Excluir aluno?", destructive: true }))) return;
 *
 * Requer <ConfirmDialogHost /> montado uma vez no App.
 */
export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Botão vermelho + ícone de alerta (exclusões e ações irreversíveis). */
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let pushRequest: ((req: Pending) => void) | null = null;

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushRequest) {
      // Host não montado: cai no confirm nativo para não bloquear a ação.
      const text = [options.title, typeof options.description === "string" ? options.description : ""]
        .filter(Boolean)
        .join("\n\n");
      resolve(window.confirm(text));
      return;
    }
    pushRequest({ ...options, resolve });
  });
}

export function ConfirmDialogHost() {
  const [current, setCurrent] = React.useState<Pending | null>(null);

  React.useEffect(() => {
    pushRequest = (req) => {
      setCurrent((prev) => {
        // Se já havia um pedido aberto, cancela o anterior.
        prev?.resolve(false);
        return req;
      });
    };
    return () => {
      pushRequest = null;
    };
  }, []);

  const close = (ok: boolean) => {
    current?.resolve(ok);
    setCurrent(null);
  };

  const destructive = Boolean(current?.destructive);
  const Icon = destructive ? AlertTriangle : Info;

  return (
    <AlertDialog open={Boolean(current)} onOpenChange={(open) => !open && close(false)}>
      <AlertDialogContent className="rounded-[2rem] max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center",
                destructive ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1.5 text-left">
              <AlertDialogTitle className="text-lg font-black text-slate-900">
                {current?.title}
              </AlertDialogTitle>
              {current?.description ? (
                <AlertDialogDescription className="text-sm text-slate-600 whitespace-pre-line">
                  {current.description}
                </AlertDialogDescription>
              ) : null}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-2xl font-bold" onClick={() => close(false)}>
            {current?.cancelText ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "rounded-2xl font-bold",
              destructive && "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
            )}
            onClick={() => close(true)}
          >
            {current?.confirmText ?? (destructive ? "Excluir" : "Confirmar")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
