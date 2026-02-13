"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, ReceiptText } from "lucide-react";

interface StatsSummaryProps {
  expenses: Array<{ value: string }>;
}

const StatsSummary = ({ expenses }: StatsSummaryProps) => {
  const total = expenses.reduce((acc, curr) => acc + parseFloat(curr.value || "0"), 0);
  const count = expenses.length;
  const average = count > 0 ? total / count : 0;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-indigo-600 text-white border-none shadow-lg overflow-hidden relative">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Total Acumulado</p>
              <h2 className="text-3xl font-bold mt-1">{formatCurrency(total)}</h2>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <Wallet className="w-24 h-24" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-emerald-500 text-white border-none shadow-lg overflow-hidden relative">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Média por Recibo</p>
              <h2 className="text-3xl font-bold mt-1">{formatCurrency(average)}</h2>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <TrendingUp className="w-24 h-24" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-500 text-white border-none shadow-lg overflow-hidden relative">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 text-sm font-medium">Total de Recibos</p>
              <h2 className="text-3xl font-bold mt-1">{count}</h2>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <ReceiptText className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <ReceiptText className="w-24 h-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsSummary;