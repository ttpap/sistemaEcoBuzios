"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

type Props = {
  sidebar: (props: { mode: "desktop" | "mobile"; onNavigate?: () => void }) => React.ReactNode;
  title?: string;
  children: React.ReactNode;
};

/**
 * Shell responsivo: sidebar fixa no desktop e menu lateral (Sheet) no mobile.
 */
export default function AppShell({ sidebar, title, children }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] flex flex-col">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-2xl border-slate-200 bg-white"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-[380px] p-0">
              {sidebar({
                mode: "mobile",
                onNavigate: () => setOpen(false),
              })}
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <div className="h-7 w-[140px]">
              <Logo className="h-full w-auto" />
            </div>
            {title ? (
              <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-500 truncate">
                {title}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Desktop + content */}
      <div className="flex flex-1 min-h-0">
        <div className="hidden md:block shrink-0">{sidebar({ mode: "desktop" })}</div>
        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}