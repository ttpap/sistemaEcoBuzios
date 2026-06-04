"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

// Converte ISO (yyyy-mm-dd) -> exibição BR (dd/mm/aaaa)
function isoToBr(iso?: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// Converte BR completo (dd/mm/aaaa) -> ISO (yyyy-mm-dd); "" se incompleto/invalido
function brToIso(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return "";
  const [, d, mo, y] = m;
  const day = Number(d);
  const month = Number(mo);
  const year = Number(y);
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > 31) return "";
  if (year < 1900 || year > 2100) return "";
  return `${y}-${mo}-${d}`;
}

// Aplica mascara dd/mm/aaaa enquanto digita
function maskBr(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("/");
}

interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string; // ISO yyyy-mm-dd
  onChange?: (iso: string) => void;
}

// Campo de data que o usuario digita (dd/mm/aaaa), guardando ISO internamente.
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, onBlur, ...props }, ref) => {
    const [text, setText] = React.useState<string>(isoToBr(value));

    // Sincroniza quando o valor externo muda (ex.: edicao carregada),
    // sem atrapalhar a digitacao parcial.
    React.useEffect(() => {
      if (brToIso(text) !== (value || "")) {
        setText(isoToBr(value));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        value={text}
        onChange={(e) => {
          const masked = maskBr(e.target.value);
          setText(masked);
          onChange?.(brToIso(masked));
        }}
        onBlur={onBlur}
        {...props}
      />
    );
  },
);
DateInput.displayName = "DateInput";
