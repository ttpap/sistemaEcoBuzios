"use client";

import React, { useState } from 'react';
import { FileUp, Loader2 } from "lucide-react";
import { extractDataFromPDF, ExtractedData } from '@/utils/pdf-extractor';
import { showSuccess, showError } from '@/utils/toast';

interface PDFUploaderProps {
  onDataExtracted: (data: ExtractedData, fileBase64: string, fileName: string) => void;
}

const PDFUploader = ({ onDataExtracted }: PDFUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showError("Por favor, selecione apenas arquivos PDF.");
      return;
    }

    setIsUploading(true);
    try {
      const data = await extractDataFromPDF(file);
      const base64 = await fileToBase64(file);
      onDataExtracted(data, base64, file.name);
      showSuccess("Dados extraídos e arquivo anexado!");
    } catch (error: any) {
      console.error("Erro ao processar PDF:", error);
      showError("Erro ao ler o PDF.");
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="mb-6">
      <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group overflow-hidden">
        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
          {isUploading ? (
            <>
              <Loader2 className="w-10 h-10 mb-3 text-primary animate-spin" />
              <p className="text-sm text-primary font-semibold">Processando documento...</p>
            </>
          ) : (
            <>
              <div className="bg-primary/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <FileUp className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-primary">Importar PDF</span> para preencher e anexar
              </p>
            </>
          )}
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="application/pdf" 
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>
    </div>
  );
};

export default PDFUploader;