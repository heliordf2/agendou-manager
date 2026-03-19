"use client";

import {
  ArrowUpDown,
  Copy,
  ExternalLink,
  Files,
  ImageOff,
  LayoutGrid,
  List,
  Pencil,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StorageFileItem = {
  fileKey: string;
  url: string;
  name: string;
  extension: string;
  size: number;
  uploadedAt: string;
  status: string;
  existsInDatabase: boolean;
};

type FilesResponse = {
  files: StorageFileItem[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function ImageThumbnail({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-[#d7c7b1] bg-[#f7f0e6]">
        <ImageOff className="h-5 w-5 text-[#8a7358]" />
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="group relative block h-28 w-full overflow-hidden rounded-xl border border-[#d7c7b1] bg-[#f7f0e6]"
      title="Abrir imagem"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        onError={() => setHasError(true)}
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
        <ExternalLink className="h-4 w-4 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
    </a>
  );
}

export default function StorageDashboard() {
  const [files, setFiles] = useState<StorageFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dbFilter, setDbFilter] = useState<"all" | "true" | "false">("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "existsInDatabase">(
    "name",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingFile, setEditingFile] = useState<StorageFileItem | null>(null);
  const [newFileName, setNewFileName] = useState("");

  const loadFiles = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/storage/files");
      if (!response.ok) {
        throw new Error("Não foi possível carregar as imagens");
      }

      const payload = (await response.json()) as FilesResponse;
      setFiles(payload.files);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar storage",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = files.filter((file) => {
      const matchesQuery =
        !normalized || file.name.toLowerCase().includes(normalized);

      const matchesDbFilter =
        dbFilter === "all" ||
        (dbFilter === "true" && file.existsInDatabase) ||
        (dbFilter === "false" && !file.existsInDatabase);

      return matchesQuery && matchesDbFilter;
    });

    const sorted = [...filtered].sort((a, b) => {
      let result = 0;

      if (sortBy === "name") {
        result = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      } else if (sortBy === "size") {
        result = a.size - b.size;
      } else {
        // false=0, true=1 -> asc mostra órfãos primeiro, desc mostra usados primeiro.
        result = Number(a.existsInDatabase) - Number(b.existsInDatabase);
      }

      const ordered = sortDirection === "asc" ? result : -result;
      if (ordered !== 0) {
        return ordered;
      }

      // Desempate consistente por nome.
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    });

    return sorted;
  }, [dbFilter, files, query, sortBy, sortDirection]);

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch {
      toast.error("Não foi possível copiar a URL");
    }
  };

  const handleDelete = async (file: StorageFileItem) => {
    const confirmation = window.confirm(
      `Excluir ${file.name}?\n\nSe esta imagem estiver sendo usada no banco, você pode quebrar a visualização em telas existentes.`,
    );

    if (!confirmation) {
      return;
    }

    try {
      const response = await fetch("/api/storage/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileKey: file.fileKey }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível excluir a imagem");
      }

      toast.success("Imagem excluída com sucesso");
      await loadFiles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir imagem",
      );
    }
  };

  const openEdit = (file: StorageFileItem) => {
    setEditingFile(file);
    setNewFileName(file.name);
  };

  const handleRename = async () => {
    if (!editingFile || !newFileName.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/storage/files", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileKey: editingFile.fileKey,
          newName: newFileName,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível renomear a imagem");
      }

      toast.success("Imagem renomeada com sucesso");
      setEditingFile(null);
      await loadFiles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao renomear imagem",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e7_0%,#f4ecde_40%,#efe3d0_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="border-[#ddcdb6] bg-white/90 shadow-[0_14px_42px_rgba(84,55,23,0.12)] backdrop-blur">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#3b2f2f]">
                <Files className="h-5 w-5" />
                Storage - Agendou
              </CardTitle>
              <p className="mt-1 text-sm text-[#6a5c52]">
                Olá, Administrador. Visualize arquivos, valide no banco e
                gerencie o storage.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={loadFiles}
              >
                <RefreshCcw className="h-4 w-4" /> Atualizar
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-[#ddcdb6] bg-white/95 shadow-[0_10px_26px_rgba(84,55,23,0.08)]">
          <CardHeader>
            <CardTitle className="text-base text-[#3b2f2f]">
              Arquivos de imagem
            </CardTitle>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8f7a67]">
                  Buscar
                </p>
                <div className="relative lg:max-w-2xl">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f7a67]" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por nome"
                    className="h-10 pl-11 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8f7a67]">
                    Filtro
                  </p>
                  <Select
                    value={dbFilter}
                    onValueChange={(value: "all" | "true" | "false") =>
                      setDbFilter(value)
                    }
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Filtro banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="true">Somente true</SelectItem>
                      <SelectItem value="false">Somente false</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8f7a67]">
                    Ordenar
                  </p>
                  <div className="flex gap-2">
                    <Select
                      value={sortBy}
                      onValueChange={(
                        value: "name" | "size" | "existsInDatabase",
                      ) => {
                        setSortBy(value);

                        if (value === "existsInDatabase") {
                          setSortDirection("desc");
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 min-w-0 flex-1 text-xs sm:text-sm">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nome</SelectItem>
                        <SelectItem value="size">Tamanho</SelectItem>
                        <SelectItem value="existsInDatabase">
                          Existe no banco
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0 px-3"
                      onClick={() =>
                        setSortDirection((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        )
                      }
                      title="Alternar direção"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {sortDirection === "asc" ? "ASC" : "DESC"}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-[#6a5c52]">
              Total: {filteredFiles.length} arquivo(s). Campo{" "}
              <strong>Existe no banco</strong>: true/false.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "outline"}
                className="h-9"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" /> Grade
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "outline"}
                className="h-9"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" /> Lista
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-[#e5d6c3] bg-white p-6 text-center text-[#6a5c52]">
                Carregando imagens...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="rounded-xl border border-[#e5d6c3] bg-white p-6 text-center text-[#6a5c52]">
                Nenhuma imagem encontrada.
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file.fileKey}
                    className="rounded-2xl border border-[#e5d6c3] bg-white p-3 shadow-[0_8px_20px_rgba(84,55,23,0.06)] transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <ImageThumbnail src={file.url} alt={file.name} />
                    <div className="mt-3 space-y-1.5">
                      <p
                        className="truncate text-sm font-semibold text-[#3b2f2f]"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p className="text-xs text-[#7a6756]">
                        Tamanho: {formatBytes(file.size)}
                      </p>
                      <p className="text-xs text-[#7a6756]">
                        Upload:{" "}
                        {new Date(file.uploadedAt).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-[#7a6756]">
                        Existe no banco:{" "}
                        <span
                          className={
                            file.existsInDatabase
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                              : "rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                          }
                        >
                          {file.existsInDatabase
                            ? "true (em uso)"
                            : "false (órfã)"}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => openEdit(file)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCopyUrl(file.url)}
                        title="Copiar URL"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        asChild
                      >
                        <a href={file.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <div
                    key={file.fileKey}
                    className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-xl border border-[#e5d6c3] bg-white p-2 sm:grid-cols-[96px_minmax(0,1fr)_220px]"
                  >
                    <div className="h-[72px] w-[72px] sm:h-[96px] sm:w-[96px]">
                      <ImageThumbnail src={file.url} alt={file.name} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p
                        className="truncate text-sm font-semibold text-[#3b2f2f]"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p className="text-xs text-[#7a6756]">
                        Tamanho: {formatBytes(file.size)}
                      </p>
                      <p className="text-xs text-[#7a6756]">
                        Upload:{" "}
                        {new Date(file.uploadedAt).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-[#7a6756]">
                        Existe no banco:{" "}
                        <span
                          className={
                            file.existsInDatabase
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                              : "rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                          }
                        >
                          {file.existsInDatabase
                            ? "true (em uso)"
                            : "false (órfã)"}
                        </span>
                      </p>
                    </div>

                    <div className="col-span-2 grid grid-cols-4 gap-2 sm:col-span-1 sm:grid-cols-2 sm:content-start">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => openEdit(file)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCopyUrl(file.url)}
                        title="Copiar URL"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        asChild
                      >
                        <a href={file.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(editingFile)}
        onOpenChange={(open) => !open && setEditingFile(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear imagem</DialogTitle>
            <DialogDescription>
              Altere o nome do arquivo. Se a URL estiver usada no banco, talvez
              você precise atualizar o campo correspondente após renomear.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-[#6a5c52]">
              Nome atual: {editingFile?.name}
            </p>
            <Input
              value={newFileName}
              onChange={(event) => setNewFileName(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
