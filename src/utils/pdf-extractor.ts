import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ExtractedData {
  companyName?: string;
  cnpj?: string;
  amount?: number;
  date?: string;
  docNumber?: string;
  dueDate?: string;
  isInvoice?: boolean;
}

export const extractDataFromPDF = async (file: File): Promise<ExtractedData> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: true,
      isEvalSupported: false,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + ' ';
    }

    // Validação: Verificar se o texto contém termos de Nota Fiscal
    const invoiceKeywords = [/NFS-e/i, /Nota Fiscal/i, /PREFEITURA/i, /TOMADOR/i, /PRESTADOR/i];
    const isInvoice = invoiceKeywords.some(regex => regex.test(fullText));

    if (!isInvoice) {
      throw new Error("O documento não parece ser uma Nota Fiscal de Serviço (NFS-e).");
    }

    const data: ExtractedData = { isInvoice: true };

    // CNPJ
    const cnpjRegex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
    const cnpjMatch = fullText.match(cnpjRegex);
    if (cnpjMatch) data.cnpj = cnpjMatch[0];

    // Datas
    const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
    const dateMatches = fullText.match(dateRegex);
    if (dateMatches && dateMatches.length > 0) {
      const convertDate = (d: string) => {
        const [day, month, year] = d.split('/');
        return `${year}-${month}-${day}`;
      };
      data.date = convertDate(dateMatches[0]);
      if (dateMatches.length > 1) data.dueDate = convertDate(dateMatches[1]);
    }

    // Valor
    const amountRegex = /(?:Valor Líquido da NFS-e|Valor do Serviço|R\$)\s*[:\s]*([\d.]+,\d{2})/i;
    const amountMatch = fullText.match(amountRegex);
    if (amountMatch) {
      const valueStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
      data.amount = parseFloat(valueStr);
    }

    // Número
    const nfsRegex = /Número\s+da\s+NFS-e\s*[:\s]*(\d+)/i;
    const nfsMatch = fullText.match(nfsRegex);
    if (nfsMatch) data.docNumber = nfsMatch[1];

    // Nome do Credor
    const nameSectionRegex = /Nome\s*\/\s*Nome\s*Empresarial\s*[:\s]*(.*?)(?=Endereço|E-mail|Inscrição|CNPJ|$)/i;
    const nameMatch = fullText.match(nameSectionRegex);
    if (nameMatch && nameMatch[1]) {
      data.companyName = nameMatch[1].trim().replace(/^[\d.\s/-]+/, '').trim();
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || "Falha ao processar o arquivo PDF.");
  }
};