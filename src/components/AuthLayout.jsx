import React from "react";
import BrandMark from "@/components/BrandMark";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gd-ice px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandMark variant="dark" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gd-mist/50 p-8">
          <div className="text-center mb-8">
            {Icon && (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gd-blue mb-4">
                <Icon className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
            )}
            <h1 className="gd-title text-2xl text-gd-blue">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
