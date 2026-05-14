import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export const metadata = {
  title: "About · CafeConnect",
};

export default function AboutPage() {
  return (
    <div className="space-y-8 p-8 animate-fade-up">
      <header className="cc-card relative overflow-hidden p-8">
        <div
          className="cc-bean"
          style={{ width: 240, height: 160, top: -50, right: -40, opacity: 0.08 }}
        />
        <div className="flex flex-wrap items-center gap-5">
          <BrandLogo size={88} />
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
              About the System
            </p>
            <h1 className="font-display mt-1 text-3xl font-bold text-[var(--color-primary)]">
              CafeConnect
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Online Ordering &amp; Management System for Hebrews Kape ·
              Capstone Project, PHINMA Araullo University
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip>v1.0</Chip>
              <Chip>Next.js 16 · App Router</Chip>
              <Chip>Supabase Postgres</Chip>
              <Chip>Tailwind v4</Chip>
              <Chip>Claude Haiku 4.5</Chip>
            </div>
          </div>
        </div>
      </header>

      {/* MODULES */}
      <section>
        <h2 className="font-display mb-3 text-2xl font-bold text-[var(--color-primary)]">
          <i className="fa-solid fa-cubes mr-2" />
          Five core modules
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ModuleCard
            icon="fa-utensils"
            title="Online Ordering"
            body="Customer-facing menu, cart, checkout, order tracking. Real-time status updates."
          />
          <ModuleCard
            icon="fa-cash-register"
            title="Sales & Transactions"
            body="Cash, GCash, Maya, card. Recorded against orders, surfaced in receipts and reports."
          />
          <ModuleCard
            icon="fa-boxes-stacked"
            title="Real-time Inventory"
            body="Stock levels, restock/wastage/adjustment movements, optional recipe-based auto-deduction."
          />
          <ModuleCard
            icon="fa-users"
            title="Customer Records"
            body="Auto-created from every order. Searchable by name / phone / email. Spend + last order tracked."
          />
          <ModuleCard
            icon="fa-chart-line"
            title="Financial Reporting"
            body="Daily revenue, payment-method breakdown, category & top-item ranking, CSV / PDF export."
          />
          <ModuleCard
            icon="fa-shield-halved"
            title="Audit Trail (bonus)"
            body="Every staff action — status change, payment, menu edit, inventory move — logged with who / when."
          />
        </div>
      </section>

      {/* TECH STACK */}
      <section className="cc-card overflow-hidden">
        <header className="border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-layer-group" />
            Architecture
          </h2>
        </header>
        <div className="p-6">
          <ArchDiagram />
        </div>
      </section>

      {/* ER DIAGRAM */}
      <section className="cc-card overflow-hidden">
        <header className="border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-diagram-project" />
            Entity-Relationship Diagram
          </h2>
        </header>
        <div className="overflow-x-auto p-6">
          <ERDiagram />
        </div>
      </section>

      {/* DATA FLOW */}
      <section className="cc-card overflow-hidden">
        <header className="border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[var(--color-primary)]">
            <i className="fa-solid fa-route" />
            Order placement &amp; fulfillment flow
          </h2>
        </header>
        <div className="overflow-x-auto p-6">
          <OrderFlowDiagram />
        </div>
      </section>

      {/* AUTHORS */}
      <section className="cc-card p-6">
        <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[var(--color-primary)]">
          <i className="fa-solid fa-user-graduate" /> Authors
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Alfonso, Elrich Mikko F. · Elisterio, Mark Erin A.
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          BSIT Capstone · PHINMA Araullo University, College of Information
          Technology
        </p>
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          See <Link href="/admin/dev" className="underline">Dev Tools</Link>{" "}
          to populate demo data, or{" "}
          <Link href="/admin/dashboard" className="underline">
            Dashboard
          </Link>{" "}
          for the live overview.
        </p>
      </section>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="chip bg-[var(--color-primary-50)] text-[var(--color-primary)]">
      {children}
    </span>
  );
}

function ModuleCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="cc-card cc-card-hover p-5">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
        <i className={`fa-solid ${icon}`} />
      </span>
      <h3 className="font-display mt-3 text-base font-bold text-[var(--color-primary)]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{body}</p>
    </div>
  );
}

function ArchDiagram() {
  return (
    <svg viewBox="0 0 800 360" className="w-full max-w-3xl mx-auto block" aria-hidden>
      <defs>
        <marker
          id="arr"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="var(--color-primary)" />
        </marker>
      </defs>
      {/* clients */}
      <g>
        <Box x={40} y={30} w={140} h={70} label="Customer" sub="browser / mobile" tint="accent" />
        <Box x={40} y={140} w={140} h={70} label="Staff" sub="admin browser" tint="accent" />
        <Box x={40} y={250} w={140} h={70} label="Café Owner" sub="reports" tint="accent" />
      </g>
      {/* Next.js */}
      <Box
        x={260}
        y={120}
        w={220}
        h={120}
        label="Next.js 16"
        sub="App Router · Server Actions · API routes"
        tint="primary"
      />
      {/* Supabase */}
      <g>
        <Box x={560} y={30} w={200} h={70} label="Supabase Auth" sub="email/password" />
        <Box x={560} y={130} w={200} h={70} label="Postgres" sub="RLS · RPCs · triggers" />
        <Box x={560} y={230} w={200} h={70} label="Realtime" sub="postgres_changes" />
      </g>
      {/* Resend + Claude (right side, off-canvas in design but inline) */}
      <Box x={260} y={20} w={220} h={70} label="Resend" sub="email notifications" tint="muted" />
      <Box x={260} y={270} w={220} h={70} label="Claude Haiku 4.5" sub="CafeBot chat support" tint="muted" />
      {/* arrows */}
      <Arrow x1={180} y1={65}  x2={260} y2={150} />
      <Arrow x1={180} y1={175} x2={260} y2={175} />
      <Arrow x1={180} y1={285} x2={260} y2={210} />
      <Arrow x1={480} y1={140} x2={560} y2={65}  />
      <Arrow x1={480} y1={180} x2={560} y2={165} />
      <Arrow x1={480} y1={220} x2={560} y2={265} />
      <Arrow x1={370} y1={120} x2={370} y2={90}  />
      <Arrow x1={370} y1={240} x2={370} y2={270} />
    </svg>
  );
}

function ERDiagram() {
  return (
    <svg viewBox="0 0 980 540" className="w-full block min-w-[760px]" aria-hidden>
      <defs>
        <marker
          id="er-arr"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="var(--color-muted)" />
        </marker>
      </defs>
      <EREntity x={20}  y={20}  title="profiles"           fields={["id", "full_name", "role", "phone"]} />
      <EREntity x={20}  y={160} title="categories"         fields={["id", "name", "sort_order", "is_active"]} />
      <EREntity x={20}  y={300} title="menu_items"         fields={["id", "category_id", "name", "price", "image_url", "is_available"]} />
      <EREntity x={260} y={20}  title="customers"          fields={["id", "user_id", "full_name", "phone", "email"]} />
      <EREntity x={260} y={160} title="orders"             fields={["id", "order_number", "customer_id", "status", "order_type", "subtotal", "total", "discount_code", "discount_id"]} />
      <EREntity x={260} y={360} title="order_items"        fields={["id", "order_id", "menu_item_id", "item_name", "quantity", "unit_price", "line_total"]} />
      <EREntity x={540} y={20}  title="transactions"       fields={["id", "order_id", "payment_method", "amount", "status", "reference_number"]} />
      <EREntity x={540} y={160} title="inventory_items"    fields={["id", "name", "unit", "stock_quantity", "reorder_level", "cost_per_unit"]} />
      <EREntity x={540} y={320} title="inventory_movements" fields={["id", "inventory_item_id", "change_amount", "reason", "reference_id"]} />
      <EREntity x={780} y={20}  title="discounts"          fields={["id", "code", "kind", "amount", "min_order_total"]} />
      <EREntity x={780} y={160} title="menu_item_ingredients" fields={["id", "menu_item_id", "inventory_item_id", "quantity"]} />
      <EREntity x={780} y={320} title="audit_logs"         fields={["id", "actor_id", "action", "entity_type", "entity_id", "metadata"]} />
      {/* relationships */}
      <ERLink x1={140} y1={300} x2={260} y2={195} />
      <ERLink x1={140} y1={185} x2={260} y2={195} />
      <ERLink x1={380} y1={20}  x2={380} y2={160} reverse />
      <ERLink x1={400} y1={260} x2={400} y2={360} reverse />
      <ERLink x1={500} y1={40}  x2={540} y2={40}  />
      <ERLink x1={500} y1={385} x2={540} y2={185} />
      <ERLink x1={660} y1={300} x2={660} y2={320} />
      <ERLink x1={780} y1={185} x2={140} y2={350} />
    </svg>
  );
}

function OrderFlowDiagram() {
  return (
    <svg viewBox="0 0 900 240" className="w-full max-w-4xl mx-auto block" aria-hidden>
      <defs>
        <marker
          id="of-arr"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="var(--color-primary)" />
        </marker>
      </defs>
      <Step x={20}   y={90} title="Browse menu"     icon="🍽" />
      <Step x={160}  y={90} title="Add to cart"     icon="🛒" />
      <Step x={300}  y={90} title="Checkout"        icon="💳" />
      <Step x={440}  y={90} title="Pending"         icon="📋" />
      <Step x={580}  y={90} title="Preparing"       icon="☕" />
      <Step x={720}  y={90} title="Ready"           icon="🔔" />
      <Step x={860 - 80}  y={210} title="Completed" icon="✅" small />
      {/* arrows along the top */}
      <Arrow x1={120}  y1={120} x2={160}  y2={120} />
      <Arrow x1={260}  y1={120} x2={300}  y2={120} />
      <Arrow x1={400}  y1={120} x2={440}  y2={120} />
      <Arrow x1={540}  y1={120} x2={580}  y2={120} />
      <Arrow x1={680}  y1={120} x2={720}  y2={120} />
      <Arrow x1={820}  y1={120} x2={820}  y2={200} />
      <text x={460} y={70} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
        place_order RPC · email customer · admin bell
      </text>
      <text x={650} y={70} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
        staff advances status · email customer
      </text>
      <text x={820} y={200} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
        payment + recipe-deduct
      </text>
    </svg>
  );
}

function Box({
  x,
  y,
  w,
  h,
  label,
  sub,
  tint = "primary",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  tint?: "primary" | "accent" | "muted";
}) {
  const fill =
    tint === "accent"
      ? "var(--color-accent-50)"
      : tint === "muted"
        ? "var(--color-bg)"
        : "var(--color-primary-50)";
  const stroke =
    tint === "accent"
      ? "var(--color-accent)"
      : tint === "muted"
        ? "var(--color-line)"
        : "var(--color-primary)";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <text
        x={x + w / 2}
        y={y + (sub ? 28 : 40)}
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="var(--color-primary)"
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + 48}
          textAnchor="middle"
          fontSize="10"
          fill="var(--color-muted)"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="var(--color-primary)"
      strokeWidth="1.5"
      markerEnd="url(#arr)"
    />
  );
}

function EREntity({
  x,
  y,
  title,
  fields,
}: {
  x: number;
  y: number;
  title: string;
  fields: string[];
}) {
  const W = 180;
  const HEAD = 26;
  const ROW = 16;
  const H = HEAD + fields.length * ROW + 8;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={W}
        height={H}
        rx={6}
        fill="white"
        stroke="var(--color-primary)"
        strokeWidth="1.2"
      />
      <rect
        x={x}
        y={y}
        width={W}
        height={HEAD}
        rx={6}
        fill="var(--color-primary)"
      />
      <text
        x={x + W / 2}
        y={y + 17}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="white"
      >
        {title}
      </text>
      {fields.map((f, i) => (
        <text
          key={i}
          x={x + 10}
          y={y + HEAD + 14 + i * ROW}
          fontSize="10"
          fill="var(--color-text)"
          fontFamily="ui-monospace, monospace"
        >
          {i === 0 ? `🔑 ${f}` : f.endsWith("_id") ? `🔗 ${f}` : `· ${f}`}
        </text>
      ))}
    </g>
  );
}

function ERLink({
  x1,
  y1,
  x2,
  y2,
  reverse,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  reverse?: boolean;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="var(--color-muted)"
      strokeDasharray="3 3"
      strokeWidth="1"
      markerEnd={reverse ? undefined : "url(#er-arr)"}
      markerStart={reverse ? "url(#er-arr)" : undefined}
    />
  );
}

function Step({
  x,
  y,
  title,
  icon,
  small,
}: {
  x: number;
  y: number;
  title: string;
  icon: string;
  small?: boolean;
}) {
  const W = small ? 80 : 100;
  const H = 60;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={W}
        height={H}
        rx={10}
        fill="white"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
      />
      <text
        x={x + W / 2}
        y={y + 25}
        textAnchor="middle"
        fontSize="18"
      >
        {icon}
      </text>
      <text
        x={x + W / 2}
        y={y + 47}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="var(--color-primary)"
      >
        {title}
      </text>
    </g>
  );
}
