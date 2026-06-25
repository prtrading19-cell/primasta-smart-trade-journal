import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const SCREENSHOT_BUCKET = "trade-screenshots";
const STORAGE_URI_PREFIX = `supabase-storage://${SCREENSHOT_BUCKET}/`;

export function isSupabaseStorageUri(value?: string) {
  return Boolean(value?.startsWith(STORAGE_URI_PREFIX));
}

export async function uploadTradeScreenshot(userId: string, file: File, kind: "before" | "after") {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Add Supabase env vars before uploading screenshots.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Screenshot must be 5 MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "png";
  const path = `${userId}/${kind}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type
  });

  if (error) throw error;

  return `${STORAGE_URI_PREFIX}${path}`;
}

export async function getScreenshotDisplayUrl(value?: string) {
  if (!value) return "";

  if (!isSupabaseStorageUri(value)) {
    return value;
  }

  if (!isSupabaseConfigured || !supabase) {
    return "";
  }

  const path = value.replace(STORAGE_URI_PREFIX, "");
  const { data, error } = await supabase.storage.from(SCREENSHOT_BUCKET).createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}
