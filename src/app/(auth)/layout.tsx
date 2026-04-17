"use client";

import { useEffect } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-slate-200/50 to-transparent blur-3xl" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-slate-200/30 to-transparent blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              BASTISTIL MINI MART
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Inventory Management System
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
