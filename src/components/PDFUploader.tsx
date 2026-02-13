"use client";

import React, { useState } from 'react';
import { FileUp, Loader2, AlertCircle } from "lucide-react";
import { extractDataFromPDF, ExtractedData } from '@/utils/pdf-extractor';
import { showSuccess, showError } from '@/utils/toast';

interface PDFUploaderProps {
  onDataExtracted: (data: ExtractedData) => void;
}

const PDFUploader = ({ onDataExtracted }: PDFUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);

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
      onDataExtracted(data);
      showSuccess("Dados extraídos com sucesso! Verifique os campos abaixo.");
    } catch (error: any) {
      console.error("Erro ao processar PDF:", error);
      showError("Erro ao ler o PDF. O arquivo pode estar protegido ou ser uma imagem.");
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
              <p className="text-sm text-primary font-semibold">Analisando documento...</p>
              <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
            </>
          ) : (
            <>
              <div className="bg-primary/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <FileUp className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-primary">Clique para importar PDF</span> ou arraste o arquivo
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 bg-white/50 px-2 py-1 rounded border">
                Extração automática de CNPJ, Datas e Valores
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