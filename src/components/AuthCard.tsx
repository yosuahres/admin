import type { ReactNode } from "react";

/** Centered card shared by the auth screens: brand row, then the panel. */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          {/* Literal brand blue: it must not flip with the theme. */}
          <span className="grid size-8 place-items-center overflow-hidden rounded-lg bg-[#0081c3]">
            {/* biome-ignore lint/performance/noImgElement: tiny static asset */}
            <img
              src="/assets/ifgf-logo2.png"
              alt=""
              className="size-full scale-125 object-contain"
            />
          </span>
          <span className="text-base font-medium text-neutral-900">
            IFGF Dashboard
          </span>
        </div>

        <div className="rounded-2xl border border-black/8 bg-white px-6 py-7 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {title}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
