"use client";

import React, { useState, useEffect } from 'react';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import ExpenseSummary from '@/components/ExpenseSummary';
import PDFUploader from '@/components/PDFUploader';
import BatchReviewDialog from '@/components/BatchReviewDialog';
import EditExpenseDialog from '@/components/EditExpenseDialog';
import { Expense } from '@/types/expense';
import { ExtractedData } from '@/utils/pdf-extractor';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Printer } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { printExpenseReport } from '@/utils/print-report';
import { toast } from 'sonner';

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
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

  const isDuplicate = (data: ExtractedData | Expense, excludeId?: string) => {
    return expenses.some(exp => 
      exp.id !== excludeId &&
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

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    showSuccess("Lançamento atualizado!");
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
    <div className="min-h-screen bg-[#f0f7f4] pb-20">
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-emerald-100/50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between relative">
          {/* Lado Esquerdo: Título */}
          <div className="flex-1">
            <h1 className="text-xl font-black text-emerald-900 tracking-tight">Balanço</h1>
            <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-[0.2em]">EcoBúzios Financeiro</p>
          </div>

          {/* Centro: Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img 
              src="https://dyad.sh/api/v1/projects/current/files/pasted-image-2026-02-13T13-43-11-149Z.png" 
              alt="EcoBúzios Logo" 
              className="h-14 w-auto object-contain drop-shadow-sm"
            />
          </div>
          
          {/* Lado Direito: Ações */}
          <div className="flex-1 flex justify-end items-center gap-3">
            {expenses.length > 0 && (
              <Button 
                onClick={() => printExpenseReport(expenses)}
                variant="outline"
                className="rounded-full px-6 border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold transition-all active:scale-95 shadow-sm"
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
              <h2 className="text-xs font-bold text-emerald-800/40 uppercase tracking-widest mb-4 ml-1">Importação em Lote</h2>
              <PDFUploader onDataExtracted={handleDataExtracted} />
            </div>

            <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
              <h2 className="text-xs font-bold text-emerald-800/40 uppercase tracking-widest mb-4 ml-1">Ajuste Manual</h2>
              <ExpenseForm 
                onAddExpense={handleAddExpense} 
                initialData={extractedData} 
                attachment={currentAttachment}
              />
            </div>
          </div>

          <div className="lg:col-span-7 animate-in fade-in slide-in-from-right-4 duration-700 delay-500">
            <h2 className="text-xs font-bold text-emerald-800/40 uppercase tracking-widest mb-4 ml-1">Fluxo de Caixa</h2>
            <ExpenseList 
              expenses={expenses} 
              onDeleteExpense={(id) => setExpenses(prev => prev.filter(e => e.id !== id))} 
              onEditExpense={(exp) => { setEditingExpense(exp); setIsEditOpen(true); }}
            />
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

      <EditExpenseDialog 
        isOpen={isEditOpen}
        expense={editingExpense}
        onClose={() => { setIsEditOpen(false); setEditingExpense(null); }}
        onSave={handleUpdateExpense}
      />

      <footer className="mt-20 opacity-50 hover:opacity-100 transition-opacity">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;