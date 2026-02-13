"use client";

import React, { useState, useEffect } from 'react';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import ExpenseSummary from '@/components/ExpenseSummary';
import PDFUploader from '@/components/PDFUploader';
import { Expense } from '@/types/expense';
import { ExtractedData } from '@/utils/pdf-extractor';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Wallet, Printer, LayoutDashboard } from 'lucide-react';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { printExpenseReport } from '@/utils/print-report';

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
    try {
      localStorage.setItem('financial-expenses', JSON.stringify(expenses));
    } catch (e) {
      console.error("Erro ao salvar no localStorage:", e);
      showError("Limite de armazenamento atingido. Tente remover registros antigos.");
    }
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
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Header Elegante */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-2xl shadow-lg shadow-slate-900/20">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Finanças Pro</h1>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">Enterprise Edition</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {expenses.length > 0 && (
              <Button 
                onClick={() => printExpenseReport(expenses)}
                variant="outline"
                className="rounded-full px-6 border-slate-200 hover:bg-slate-50 text-slate-600 font-medium transition-all active:scale-95"
              >
                <Printer className="h-4 w-4 mr-2" />
                Relatório
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-6xl mt-10">
        {/* Resumo com Cards Arrojados */}
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <ExpenseSummary totalAmount={totalAmount} count={expenses.length} />
        </section>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Lateral: Upload e Formulário */}
          <div className="lg:col-span-5 space-y-8">
            <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Importação Inteligente</h2>
              <PDFUploader onDataExtracted={handleDataExtracted} />
            </div>

            <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Novo Lançamento</h2>
              <ExpenseForm 
                onAddExpense={handleAddExpense} 
                initialData={extractedData} 
                attachment={currentAttachment}
              />
            </div>
          </div>

          {/* Coluna Principal: Lista */}
          <div className="lg:col-span-7 animate-in fade-in slide-in-from-right-4 duration-700 delay-500">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Fluxo de Caixa</h2>
            <ExpenseList expenses={expenses} onDeleteExpense={handleDeleteExpense} />
          </div>
        </div>
      </main>

      <footer className="mt-20 opacity-50 hover:opacity-100 transition-opacity">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;