"use client";

import React, { useState, useEffect } from 'react';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import ExpenseSummary from '@/components/ExpenseSummary';
import PDFUploader from '@/components/PDFUploader';
import { Expense } from '@/types/expense';
import { ExtractedData } from '@/utils/pdf-extractor';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Wallet } from 'lucide-react';

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [currentAttachment, setCurrentAttachment] = useState<{ base64: string; name: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('financial-expenses');
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('financial-expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleAddExpense = (newExpense: Expense) => {
    setExpenses(prev => [newExpense, ...prev]);
    setExtractedData(null);
    setCurrentAttachment(null);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const handleDataExtracted = (data: ExtractedData, base64: string, fileName: string) => {
    setExtractedData(data);
    setCurrentAttachment({ base64, name: fileName });
  };

  const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <header className="bg-white border-b mb-8">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Finanças Pro</h1>
              <p className="text-sm text-muted-foreground">Prestação de Contas Inteligente</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-6xl">
        <ExpenseSummary totalAmount={totalAmount} count={expenses.length} />
        
        <div className="grid gap-6">
          <div className="grid gap-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Importação Automática</h2>
            <PDFUploader onDataExtracted={handleDataExtracted} />
          </div>

          <div className="grid gap-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados do Registro</h2>
            <ExpenseForm 
              onAddExpense={handleAddExpense} 
              initialData={extractedData} 
              attachment={currentAttachment}
            />
          </div>

          <div className="grid gap-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Histórico de Lançamentos</h2>
            <ExpenseList expenses={expenses} onDeleteExpense={handleDeleteExpense} />
          </div>
        </div>
      </main>

      <footer className="mt-12">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;