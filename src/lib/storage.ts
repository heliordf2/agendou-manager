import { Prisma } from "@prisma/client";
import { UTApi } from "uploadthing/server";

import { getUploadthingKeyFromUrl, isRemoteUploadthingUrl } from "@/lib/uploadthing-server";
import { db } from "@/lib/prisma";

const IMAGE_FIELD_NAME_REGEX = /(image|imagem|avatar|cover|logo|photo|foto|banner|thumb)/i;
const utapi = new UTApi();

type DmmfModel = (typeof Prisma.dmmf.datamodel.models)[number];

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

function sanitizeSqlIdentifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Identificador SQL inválido: ${value}`);
  }
  return value;
}

async function getDatabaseUploadthingKeySet(): Promise<Set<string>> {
  const models = Prisma.dmmf.datamodel.models;
  const keys = new Set<string>();

  for (const model of models) {
    const fields = model.fields.filter(
      (field) =>
        field.kind === "scalar" &&
        field.type === "String" &&
        IMAGE_FIELD_NAME_REGEX.test(field.name)
    );

    if (!fields.length) {
      continue;
    }

    const tableName = sanitizeSqlIdentifier(model.dbName ?? model.name);

    for (const field of fields) {
      const fieldName = sanitizeSqlIdentifier(field.name);
      const query = `
        SELECT DISTINCT "${fieldName}" AS value
        FROM "${tableName}"
        WHERE "${fieldName}" IS NOT NULL
          AND "${fieldName}" <> '';
      `;

      const result = await db.$queryRawUnsafe<Array<{ value: string }>>(query);
      result.forEach((row) => {
        if (!row.value) {
          return;
        }

        const key = getUploadthingKeyFromUrl(row.value);
        if (key) {
          keys.add(key);
        }
      });
    }
  }

  return keys;
}

async function listAllUploadthingFiles() {
  const files: Array<{
    name: string;
    size: number;
    customId: string | null;
    key: string;
    id: string;
    status: "Deletion Pending" | "Failed" | "Uploaded" | "Uploading";
    uploadedAt: number;
  }> = [];

  let offset = 0;
  const limit = 250;

  while (true) {
    const result = await utapi.listFiles({ limit, offset });
    files.push(...result.files);

    if (!result.hasMore) {
      break;
    }

    offset += limit;
  }

  return files;
}

async function getUploadthingUrlsByKeys(keys: string[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const chunkSize = 100;

  for (let index = 0; index < keys.length; index += chunkSize) {
    const chunk = keys.slice(index, index + chunkSize);
    if (!chunk.length) {
      continue;
    }

    const result = await utapi.getFileUrls(chunk);
    result.data.forEach((item) => {
      urlMap.set(item.key, item.url);
    });
  }

  return urlMap;
}

export async function listStorageImages(): Promise<StorageFileItem[]> {
  const [uploadthingFiles, dbKeys] = await Promise.all([
    listAllUploadthingFiles(),
    getDatabaseUploadthingKeySet(),
  ]);

  const filesWithStatus = uploadthingFiles.filter((file) => file.status === "Uploaded");
  const keys = filesWithStatus.map((file) => file.key);
  const urlMap = await getUploadthingUrlsByKeys(keys);

  const mapped = filesWithStatus.map((file) => {
    const url =
      urlMap.get(file.key) ??
      `https://uploadthing.com/f/${file.key}`;

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() ?? ""
      : "";

    return {
      fileKey: file.key,
      url,
      name: file.name,
      extension,
      size: file.size,
      uploadedAt: new Date(file.uploadedAt).toISOString(),
      status: file.status,
      existsInDatabase: dbKeys.has(file.key),
    };
  });

  return mapped.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function deleteStorageImage(fileKey: string): Promise<void> {
  const key = fileKey.trim();
  if (!key) {
    throw new Error("fileKey inválida");
  }

  await utapi.deleteFiles(key);
}

export async function renameStorageImage(
  fileKey: string,
  newName: string
): Promise<void> {
  const key = fileKey.trim();
  if (!key) {
    throw new Error("fileKey inválida");
  }

  const sanitizedBaseName = newName.trim().replace(/[\\/:*?"<>|]/g, "-");
  if (!sanitizedBaseName) {
    throw new Error("Novo nome inválido");
  }

  await utapi.renameFiles({
    fileKey: key,
    newName: sanitizedBaseName,
  });
}

export type { StorageFileItem };
