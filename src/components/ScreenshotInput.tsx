"use client";

import { UploadCloud } from "lucide-react";
import { useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { isSupabaseStorageUri, uploadTradeScreenshot } from "@/lib/storage";

export function ScreenshotInput({
  label,
  value,
  onChange,
  kind
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: "before" | "after";
}) {
  const { user, isCloudSync } = useAppData();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setMessage("");

    try {
      const storageUri = await uploadTradeScreenshot(user.id, file, kind);
      onChange(storageUri);
      setMessage("Uploaded to Supabase Storage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        <input value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1`} placeholder="Paste image link or upload to Supabase" />
      </label>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="focus-within:ring-2 focus-within:ring-slate-950/10 dark:focus-within:ring-slate-200/20 inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <UploadCloud className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload to Supabase"}
          <input type="file" accept="image/*" className="sr-only" disabled={!isCloudSync || uploading} onChange={(event) => void handleFileChange(event)} />
        </label>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {isCloudSync ? "Stores image in your private cloud bucket." : "Add Supabase env vars to enable cloud uploads."}
        </span>
      </div>

      {message ? (
        <p className={`mt-2 text-xs ${message.includes("Uploaded") ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>{message}</p>
      ) : null}
      {isSupabaseStorageUri(value) ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Cloud storage file selected.</p> : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-200";
