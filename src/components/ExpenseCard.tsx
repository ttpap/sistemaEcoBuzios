"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calendar, CreditCard, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface ExpenseCardProps {
  expense: {
    id: string;
    companyName: string;
    cnpj: string;
    value: string;
    date: Date;
  };
  onDelete: (id: string) => void;
}

const ExpenseCard = ({ expense, onDelete }: ExpenseCardProps) => {
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(parseFloat(expense.value));

  return (
    <Card className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className="w-2 bg-indigo-500 group-hover:bg-indigo-600 transition-colors" />
          <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-gray-800">{expense.companyName}</h3>
              </div>
              <p className="text-xs text-gray-500 font-mono">CNPJ: {expense.cnpj}</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-gray-600 text-sm">
                  <Calendar className="w-3 h-3" />
                  {format(expense.date, "dd/MM/yyyy", { locale: ptBR })}
                </div>
                <div className="flex items-center gap-1 text-indigo-700 font-bold text-lg">
                  <CreditCard className="w-4 h-4" />
                  {formattedValue}
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(expense.id)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseCard;