import { UTApi } from "uploadthing/server";

import { logger } from "@/lib/logger";

const utapi = new UTApi();

export const isRemoteUploadthingUrl = (url?: string | null) => {
  if (!url) return false;
  if (url.startsWith("/")) return false;
  return url.includes("/f/");
};

export const getUploadthingKeyFromUrl = (url?: string | null) => {
  if (!url || !isRemoteUploadthingUrl(url)) return null;
  const marker = "/f/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;
  const keyPart = url.slice(markerIndex + marker.length);
  if (!keyPart) return null;
  return keyPart.split("?")[0];
};

export const deleteUploadthingFileByUrl = async (url?: string | null) => {
  const key = getUploadthingKeyFromUrl(url);
  if (!key) return;

  try {
    await utapi.deleteFiles(key);
  } catch (error) {
    logger.warn("Falha ao remover arquivo do Uploadthing", { url, error });
  }
};
