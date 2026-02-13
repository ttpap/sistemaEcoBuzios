export interface Expense {
  id: string;
  companyName: string;
  cnpj: string;
  paymentMethod: string;
  date: string;
  docNumber: string;
  dueDate: string;
  amount: number;
  attachment?: string; // Base64 do PDF
  attachmentName?: string;
}