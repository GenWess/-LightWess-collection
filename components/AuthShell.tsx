import Link from "next/link";
import { Logo } from "./Logo";

export default function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <Link href="/" aria-label="Accueil Lightwess Collection"><Logo /></Link>
      <div className="flex flex-1 flex-col justify-center py-10 fade-up">
        <h1 className="text-[34px] font-bold leading-tight">{title}</h1>
        <p className="mt-2 text-mute">{sub}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
