"use client";

import React, { useState } from 'react';
import { FileUp, Loader2, Sparkles } from "lucide-react";
import { extractDataFromPDF, ExtractedData } from '@/utils/pdf-extractor';
import { showSuccess, showError } from '@/utils/toast';

interface PDFUploaderProps {
  onDataExtracted: (data: ExtractedData, fileBase64: string, fileName: string) => void;
}

const PDFUploader = ({ onDataExtracted }: PDFUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      showError("Por favor, selecione apenas arquivos PDF.");
      return;
    }

    setIsUploading(true);
    setProgress({ current: 0, total: pdfFiles.length });

    let successCount = 0;

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        const data = await extractDataFromPDF(file);
        const base64 = await fileToBase64(file);
        onDataExtracted(data, base64, file.name);
        successCount++;
      } catch (error: any) {
        console.error(`Erro ao processar ${file.name}:`, error);
        showError(`Erro ao ler o arquivo: ${file.name}`);
      }
    }

    if (successCount > 0) {
      showSuccess(`${successCount} documento(s) processado(s) com sucesso!`);
    }

    setIsUploading(false);
    event.target.value = '';
  };

  return (
    <div className="group">
      <label className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-500 cursor-pointer overflow-hidden shadow-sm hover:shadow-md">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          {isUploading ? (
            <div className="space-y-3">
              <Loader2 className="w-10 h-10 text-slate-900 animate-spin mx-auto" />
              <p className="text-sm text-slate-900 font-bold tracking-tight">
                Processando {progress.current} de {progress.total}...
              </p>
            </div>
          ) : (
            <>
              <div className="bg-slate-900 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-slate-900/20">
                <FileUp className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">Importar múltiplas notas</p>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Detecção de duplicatas ativa
                </div>
              </div>
            </>
          )}
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="application/pdf" 
          onChange={handleFileChange}
          disabled={isUploading}
          multiple
        />
      </label>
    </div>
  );
};

export default PDFUploader;