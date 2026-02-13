import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker para o pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedData {
  companyName?: string;
  cnpj?: string;
  amount?: number;
  date?: string;
  docNumber?: string;
}

export const extractDataFromPDF = async (file: File): Promise<ExtractedData> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + ' ';
  }

  const data: ExtractedData = {};

  // Regex para CNPJ (00.000.000/0000-00)
  const cnpjRegex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
  const cnpjMatch = fullText.match(cnpjRegex);
  if (cnpjMatch) data.cnpj = cnpjMatch[0];

  // Regex para Data (DD/MM/YYYY)
  const dateRegex = /\d{2}\/\d{2}\/\d{4}/g;
  const dateMatches = fullText.match(dateRegex);
  if (dateMatches && dateMatches.length > 0) {
    // Tenta pegar a primeira data encontrada como data de pagamento/emissão
    const [day, month, year] = dateMatches[0].split('/');
    data.date = `${year}-${month}-${day}`;
    
    if (dateMatches.length > 1) {
      const [dDay, dMonth, dYear] = dateMatches[1].split('/');
      data.dueDate = `${dYear}-${dMonth}-${dDay}`;
    }
  }

  // Regex para Valor (R$ 0.000,00 ou apenas 0.000,00)
  // Procura por padrões comuns de valores monetários brasileiros
  const amountRegex = /(?:R\$|VALOR|TOTAL|PAGAR)\s*[:\s]*([\d.]+,\d{2})/i;
  const amountMatch = fullText.match(amountRegex);
  if (amountMatch) {
    const valueStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
    data.amount = parseFloat(valueStr);
  }

  // Nome da empresa: Geralmente está no início do documento ou perto do CNPJ
  // Esta é uma aproximação simples
  const lines = fullText.split('  ').filter(l => l.trim().length > 5);
  if (lines.length > 0) {
    data.companyName = lines[0].trim().substring(0, 50);
  }

  return data;
};