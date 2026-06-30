"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useI18n } from "@/i18n/I18nProvider";

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function AdminLogin() {
  const { isAdmin, login, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {t("admin_active")}
        </span>
        <button
          onClick={logout}
          className="text-sm text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          {t("admin_logout")}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-700 active:scale-95"
      >
        <LockIcon />
        {t("admin_login")}
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const ok = await login(code);
    setLoading(false);
    if (ok) {
      setOpen(false);
      setCode("");
    } else {
      setError(true);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center justify-end gap-2"
    >
      <input
        type="password"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("admin_enter_code")}
        className="w-40 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      />
      <button
        type="submit"
        disabled={loading || code.length === 0}
        className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 active:scale-95 disabled:opacity-40"
      >
        {t("admin_validate")}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(false);
          setCode("");
        }}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        {t("cancel")}
      </button>
      {error && (
        <span className="w-full text-end text-sm text-red-600">
          {t("admin_wrong")}
        </span>
      )}
    </form>
  );
}
