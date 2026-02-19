import { useState, useCallback } from "react";
import type { ReconImport, ImportSourceType } from "@0x0-gen/sdk";
import { useReconProject } from "./useReconProject.js";

export interface ImportFile {
  file: File;
  name: string;
  size: number;
  detectedSource: string | null;
}

export interface ImportOptions {
  deduplicate: boolean;
  createRelationships: boolean;
}

export interface ImportProgress {
  active: boolean;
  currentFile: string;
  processed: number;
  total: number;
  percent: number;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const LARGE_IMPORT_THRESHOLD = 10000;

export function useImport() {
  const { activeProject, gateway } = useReconProject();
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [pasteContent, setPasteContent] = useState("");
  const [selectedSource, setSelectedSource] = useState<ImportSourceType | null>(null);
  const [autoDetectedSource, setAutoDetectedSource] = useState<string | null>(null);
  const [options, setOptions] = useState<ImportOptions>({ deduplicate: true, createRelationships: true });
  const [progress, setProgress] = useState<ImportProgress>({ active: false, currentFile: "", processed: 0, total: 0, percent: 0 });
  const [result, setResult] = useState<ReconImport | null>(null);
  const [imports, setImports] = useState<ReconImport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [largeImportWarning, setLargeImportWarning] = useState(false);

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      const validFiles: ImportFile[] = [];
      for (const file of newFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`File "${file.name}" exceeds 100MB limit`);
          continue;
        }
        let detectedSource: string | null = null;
        try {
          const preview = await file.slice(0, 4096).text();
          const detection = await gateway.detectReconFormat(preview, file.name);
          detectedSource = detection.source;
        } catch {
          // auto-detection failed, user will pick manually
        }
        validFiles.push({ file, name: file.name, size: file.size, detectedSource });
      }
      setFiles((prev) => [...prev, ...validFiles]);
      if (validFiles.length > 0 && validFiles[0].detectedSource) {
        setAutoDetectedSource(validFiles[0].detectedSource);
      }
    },
    [gateway],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const detectPasteFormat = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      try {
        const detection = await gateway.detectReconFormat(content.slice(0, 4096));
        setAutoDetectedSource(detection.source);
      } catch {
        // ignore
      }
    },
    [gateway],
  );

  const importFiles = useCallback(async () => {
    if (!activeProject || files.length === 0) return;
    setProgress({ active: true, currentFile: "", processed: 0, total: files.length, percent: 0 });
    setError(null);
    setResult(null);

    try {
      let lastImport: ReconImport | null = null;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress({ active: true, currentFile: f.name, processed: i, total: files.length, percent: Math.round((i / files.length) * 100) });
        const content = await f.file.text();
        const source = (selectedSource ?? f.detectedSource ?? undefined) as ImportSourceType | undefined;
        lastImport = await gateway.importReconText(activeProject.id, content, source, f.name);

        if (lastImport.stats.total > LARGE_IMPORT_THRESHOLD) {
          setLargeImportWarning(true);
        }
      }
      setProgress({ active: false, currentFile: "", processed: files.length, total: files.length, percent: 100 });
      setResult(lastImport);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setProgress((prev) => ({ ...prev, active: false }));
    }
  }, [activeProject, files, selectedSource, gateway]);

  const importText = useCallback(async () => {
    if (!activeProject || !pasteContent.trim()) return;
    setProgress({ active: true, currentFile: "pasted text", processed: 0, total: 1, percent: 0 });
    setError(null);
    setResult(null);

    try {
      const source = (selectedSource ?? autoDetectedSource ?? undefined) as ImportSourceType | undefined;
      const imported = await gateway.importReconText(activeProject.id, pasteContent, source, "paste.txt");

      if (imported.stats.total > LARGE_IMPORT_THRESHOLD) {
        setLargeImportWarning(true);
      }

      setProgress({ active: false, currentFile: "", processed: 1, total: 1, percent: 100 });
      setResult(imported);
      setPasteContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setProgress((prev) => ({ ...prev, active: false }));
    }
  }, [activeProject, pasteContent, selectedSource, autoDetectedSource, gateway]);

  const loadImports = useCallback(async () => {
    if (!activeProject) return;
    try {
      const list = await gateway.listReconImports(activeProject.id);
      setImports(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load imports");
    }
  }, [activeProject, gateway]);

  const reset = useCallback(() => {
    setFiles([]);
    setPasteContent("");
    setSelectedSource(null);
    setAutoDetectedSource(null);
    setResult(null);
    setError(null);
    setLargeImportWarning(false);
    setProgress({ active: false, currentFile: "", processed: 0, total: 0, percent: 0 });
  }, []);

  return {
    files,
    pasteContent,
    selectedSource,
    autoDetectedSource,
    options,
    progress,
    result,
    imports,
    error,
    largeImportWarning,
    addFiles,
    removeFile,
    setPasteContent,
    setSelectedSource,
    detectPasteFormat,
    setOptions,
    importFiles,
    importText,
    loadImports,
    reset,
  };
}
