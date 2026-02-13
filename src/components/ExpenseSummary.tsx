"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Receipt, TrendingUp } from "lucide-react";

interface ExpenseSummaryProps {
  totalAmount: number;
  count: number;
}

const ExpenseSummary = ({ totalAmount, count }: ExpenseSummaryProps) => {
  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(totalAmount);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="relative overflow-hidden border-none shadow-2xl shadow-slate-200/50 bg-slate-900 text-white rounded-3xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <DollarSign size={80} />
        </div>
        <CardContent className="p-8">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Total Acumulado</p>
          <div className="text-4xl font-black tracking-tighter">{formattedTotal}</div>
          <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Consolidado em tempo real</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl">
        <CardContent className="p-8">
          <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <Receipt className="h-6 w-6 text-slate-600" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Documentos</p>
          <div className="text-3xl font-bold text-slate-900">{count}</div>
          <p className="text-slate-400 text-[10px] mt-1">Notas processadas</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl hidden md:block">
        <CardContent className="p-8">
          <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="h-6 w-6 text-slate-600" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Média por Nota</p>
          <div className="text-3xl font-bold text-slate-900">
            {count > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount / count) : 'R$ 0,00'}
          </div>
          <p className="text-slate-400 text-[10px] mt-1">Valor médio unitário</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSummary;