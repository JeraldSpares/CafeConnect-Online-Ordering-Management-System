import { loadSettings } from "@/lib/app-settings";

export async function DemoBanner() {
  const s = await loadSettings();
  if (!s.demo_mode) return null;
  return (
    <div className="no-print border-b border-[var(--color-accent)] bg-[var(--color-accent)] py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
      <i className="fa-solid fa-vial mr-1" />
      Demo Mode — orders placed here are for demonstration only
    </div>
  );
}
