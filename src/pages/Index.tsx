"use client";

import React, { useState, useEffect } from 'react';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import ExpenseSummary from '@/components/ExpenseSummary';
import PDFUploader from '@/components/PDFUploader';
import BatchReviewDialog from '@/components/BatchReviewDialog';
import { Expense } from '@/types/expense';
import { ExtractedData } from '@/utils/pdf-extractor';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Printer, LayoutDashboard, AlertCircle } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { printExpenseReport } from '@/utils/print-report';
import { toast } from 'sonner';

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  // Para o formulário manual
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
      showError("Limite de armazenamento atingido.");
    }
  }, [expenses]);

  const isDuplicate = (data: ExtractedData | Expense) => {
    return expenses.some(exp => 
      exp.cnpj === data.cnpj && 
      exp.docNumber === data.docNumber && 
      exp.amount === data.amount
    );
  };

  const handleAddExpense = (newExpense: Expense) => {
    if (isDuplicate(newExpense)) {
      toast.error("Esta nota já foi registrada.");
      return;
    }
    setExpenses(prev => [newExpense, ...prev]);
    setExtractedData(null);
    setCurrentAttachment(null);
  };

  const handleDataExtracted = (data: ExtractedData, base64: string, fileName: string) => {
    if (isDuplicate(data)) {
      toast.warning(`Nota duplicada ignorada: ${fileName}`);
      return;
    }

    const newPending: Expense = {
      id: crypto.randomUUID(),
      budgetItem: "Pendente",
      companyName: data.companyName || "Não identificado",
      cnpj: data.cnpj || "00.000.000/0000-00",
      paymentMethod: "A definir",
      date: data.date || new Date().toISOString().split('T')[0],
      docNumber: data.docNumber || "S/N",
      dueDate: data.dueDate || data.date || new Date().toISOString().split('T')[0],
      amount: data.amount || 0,
      attachment: base64,
      attachmentName: fileName,
    };

    setPendingExpenses(prev => [...prev, newPending]);
    setIsReviewOpen(true);
  };

  const handleConfirmBatch = (confirmed: Expense[]) => {
    setExpenses(prev => [...confirmed, ...prev]);
    setPendingExpenses([]);
    setIsReviewOpen(false);
    showSuccess(`${confirmed.length} notas salvas com sucesso!`);
  };

  const handleRemovePending = (id: string) => {
    setPendingExpenses(prev => prev.filter(exp => exp.id !== id));
    if (pendingExpenses.length <= 1) setIsReviewOpen(false);
  };

  const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
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
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <ExpenseSummary totalAmount={totalAmount} count={expenses.length} />
        </section>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-8">
            <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Importação em Lote</h2>
              <PDFUploader onDataExtracted={handleDataExtracted} />
            </div>

            <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Ajuste Manual</h2>
              <ExpenseForm 
                onAddExpense={handleAddExpense} 
                initialData={extractedData} 
                attachment={currentAttachment}
              />
            </div>
          </div>

          <div className="lg:col-span-7 animate-in fade-in slide-in-from-right-4 duration-700 delay-500">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Fluxo de Caixa</h2>
            <ExpenseList expenses={expenses} onDeleteExpense={(id) => setExpenses(prev => prev.filter(e => e.id !== id))} />
          </div>
        </div>
      </main>

      <BatchReviewDialog 
        isOpen={isReviewOpen}
        pendingExpenses={pendingExpenses}
        onConfirm={handleConfirmBatch}
        onCancel={() => { setPendingExpenses([]); setIsReviewOpen(false); }}
        onRemoveItem={handleRemovePending}
      />

      <footer className="mt-20 opacity-50 hover:opacity-100 transition-opacity">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;