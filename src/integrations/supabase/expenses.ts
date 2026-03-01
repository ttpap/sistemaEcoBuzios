import { supabase } from "@/integrations/supabase/client";
import type { Expense } from "@/types/expense";

function mapRow(row: any): Expense {
  return {
    id: row.id,
    budgetItem: row.budget_item,
    companyName: row.company_name,
    cnpj: row.cnpj,
    paymentMethod: row.payment_method,
    date: row.date,
    docNumber: row.doc_number,
    dueDate: row.due_date,
    amount: Number(row.amount),
    attachment: row.attachment ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
  };
}

export async function fetchExpensesRemote(projectId: string) {
  if (!supabase) return [] as Expense[];
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function upsertExpenseRemote(projectId: string, e: Expense) {
  if (!supabase) return;
  const row = {
    id: e.id,
    project_id: projectId,
    budget_item: e.budgetItem,
    company_name: e.companyName,
    cnpj: e.cnpj,
    payment_method: e.paymentMethod,
    date: e.date,
    doc_number: e.docNumber,
    due_date: e.dueDate,
    amount: e.amount,
    attachment: e.attachment ?? null,
    attachment_name: e.attachmentName ?? null,
  };
  const { error } = await supabase.from("expenses").upsert(row);
  if (error) throw error;
}

export async function deleteExpenseRemote(expenseId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw error;
}
