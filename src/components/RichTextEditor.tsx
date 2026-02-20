"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Eraser,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function exec(cmd: string, arg?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = document;
  d.execCommand(cmd, false, arg);
}

export default function RichTextEditor({ value, onChange, placeholder, className, disabled }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const safeValue = useMemo(() => value || "", [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isFocused) return;
    if (el.innerHTML !== safeValue) el.innerHTML = safeValue;
  }, [safeValue, isFocused]);

  const apply = (fn: () => void) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    fn();
    onChange(el.innerHTML);
  };

  return (
    <div className={cn("rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 px-2 py-2 bg-slate-50 border-b border-slate-200",
          disabled && "opacity-70",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 bg-white font-extrabold"
              disabled={disabled}
            >
              Formatos <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => apply(() => exec("formatBlock", "P"))}>
              Parágrafo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => apply(() => exec("formatBlock", "H2"))}>
              Título
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => apply(() => exec("formatBlock", "H3"))}>
              Subtítulo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button type="button" variant="ghost" size="icon" className="rounded-xl" disabled={disabled} onClick={() => apply(() => exec("bold"))}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="rounded-xl" disabled={disabled} onClick={() => apply(() => exec("italic"))}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="rounded-xl" disabled={disabled} onClick={() => apply(() => exec("underline"))}>
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button type="button" variant="ghost" size="icon" className="rounded-xl" disabled={disabled} onClick={() => apply(() => exec("insertUnorderedList"))}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="rounded-xl" disabled={disabled} onClick={() => apply(() => exec("insertOrderedList"))}>
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button type="button" variant="ghost" size="icon" className="rounded-xl" disabled={disabled} onClick={() => apply(() => exec("justifyLeft"))}>
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="rounded-xl" disabled={disabled} onClick={() => apply(() => exec("justifyCenter"))}>
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="rounded-xl" disabled={disabled} onClick={() => apply(() => exec("justifyRight"))}>
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-xl font-extrabold text-slate-600"
          disabled={disabled}
          onClick={() =>
            apply(() => {
              exec("selectAll");
              exec("removeFormat");
              exec("formatBlock", "P");
            })
          }
        >
          <Eraser className="h-4 w-4 mr-2" /> Limpar
        </Button>
      </div>

      <div
        ref={ref}
        contentEditable={!disabled}
        role="textbox"
        aria-multiline
        className={cn(
          "min-h-[140px] p-4 text-sm leading-6 outline-none",
          "prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700",
          "prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700",
          disabled ? "bg-slate-50 text-slate-600" : "bg-white",
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onChange(ref.current?.innerHTML || "");
        }}
        onInput={() => onChange(ref.current?.innerHTML || "")}
        data-placeholder={placeholder || ""}
        suppressContentEditableWarning
        style={{
          // basic placeholder for contentEditable
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any}
      />

      <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
