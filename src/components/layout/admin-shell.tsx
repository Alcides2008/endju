"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { collection, onSnapshot, query, where, type Timestamp } from "firebase/firestore";
import { Dialog, Popover } from "radix-ui";
import { Bell, ChevronsLeft, ChevronsRight, Menu, Search, X } from "lucide-react";
import { adminSearch, markNotificationsRead, myAccess, type SearchResult } from "@/features/admin/actions";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { formatDateTime } from "@/lib/dates";
import { can, ROLE_LABELS, type Matrix, type RoleId } from "@/lib/domain/permissions";

type Access = { role: RoleId; perms?: Matrix };
import { getClientDb } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./admin-nav";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/**
 * Papel e permissões de quem está no painel, pedidos ao servidor (as permissões editam-se em Equipa → Papéis).
 * Só servem para mostrar o menu: a autorização real é feita no servidor em cada página e ação.
 */
function useStaffAccess(): Access | null {
  const user = useAuthUser();
  const [access, setAccess] = useState<Access | null>(null);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void myAccess().then((result) => alive && setAccess(result));
    return () => {
      alive = false;
    };
  }, [user]);
  return user ? access : null;
}

const COLLAPSED_KEY = "endju.painel.recolhido";
const collapsedStore = {
  subscribe(listener: () => void) {
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  },
  get() {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  },
  set(value: boolean) {
    try {
      localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
      window.dispatchEvent(new StorageEvent("storage", { key: COLLAPSED_KEY }));
    } catch {
      // sem armazenamento: fica como está
    }
  },
};

function NavLinks({
  access,
  collapsed,
  onNavigate,
}: {
  access: Access | null;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = access ? ADMIN_NAV.filter((item) => can(access, item.module, "view")) : [];
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                active ? "bg-ink text-paper" : "text-ink-2 hover:bg-ink/[0.06] hover:text-ink",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className="size-[1.125rem] shrink-0" aria-hidden />
              {!collapsed && item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Ctrl+K: pesquisa pedidos, clientes e orçamentos por número, nome, telefone ou NIF. */
function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      void adminSearch(q).then((r) => {
        if (!alive) return;
        setResults(r);
        setActive(0);
      });
    }, 220);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  const shown = q.trim().length < 2 ? [] : results;
  const go = (result: SearchResult) => {
    setOpen(false);
    setQ("");
    router.push(result.href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="flex h-9 w-full max-w-sm items-center gap-2 rounded-full border border-line bg-paper px-3 text-sm text-ink-3 hover:border-ink/30">
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Pesquisar…</span>
        <kbd className="hidden rounded-xs border border-line px-1.5 font-mono text-[0.625rem] sm:inline">Ctrl K</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-md border border-line bg-card shadow-lift data-[state=open]:animate-pop-in">
          <Dialog.Title className="sr-only">Pesquisa global</Dialog.Title>
          <Dialog.Description className="sr-only">Procura pedidos, clientes e orçamentos</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 text-ink-3" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, shown.length - 1));
                if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
                if (e.key === "Enter" && shown[active]) go(shown[active]);
              }}
              placeholder="Número do pedido, nome, telefone, NIF…"
              aria-label="Pesquisar"
              role="combobox"
              aria-expanded={shown.length > 0}
              aria-controls="resultados-pesquisa"
              className="h-14 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <ul id="resultados-pesquisa" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {q.trim().length >= 2 && shown.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-3">Sem resultados.</li>
            )}
            {shown.map((result, i) => (
              <li key={result.href} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(result)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left",
                    i === active && "bg-paper-2",
                  )}
                >
                  <span className="w-20 shrink-0 eyebrow text-ink-3">{result.type}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{result.label}</span>
                    <span className="block truncate text-xs text-ink-3">{result.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type Notice = { id: string; title: string; body: string; link: string; at: Date | null };

/** Sino com as notificações por ler, em tempo real (regras: só as do próprio utilizador). */
function NotificationsBell() {
  const user = useAuthUser();
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(
        collection(getClientDb(), "notifications"),
        where("recipientId", "==", user.uid),
        where("read", "==", false),
      ),
      (snap) =>
        setNotices(
          snap.docs
            .map((d) => ({
              id: d.id,
              title: d.get("title"),
              body: d.get("body"),
              link: d.get("link"),
              at: (d.get("createdAt") as Timestamp | null)?.toDate() ?? null,
            }))
            .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0)),
        ),
      (error) => console.warn("[notificações] sem tempo real:", error.message),
    );
  }, [user]);

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={notices.length ? `Notificações, ${notices.length} por ler` : "Notificações"}
        className="relative grid size-10 place-items-center rounded-full hover:bg-ink/[0.06]"
      >
        <Bell className="size-[1.125rem]" aria-hidden />
        {notices.length > 0 && (
          <span className="absolute top-1 right-1 grid min-w-4.5 place-items-center rounded-full bg-brand px-1 font-mono text-[0.625rem] leading-[1.125rem] text-brand-fg">
            {notices.length > 9 ? "9+" : notices.length}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-line bg-card shadow-lift"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notificações</p>
            {notices.length > 0 && (
              <button
                type="button"
                className="text-xs text-ink-3 hover:text-ink"
                onClick={() => void markNotificationsRead(notices.map((n) => n.id))}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {notices.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-3">Tudo em dia.</li>}
            {notices.map((notice) => (
              <li key={notice.id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  onClick={() => {
                    void markNotificationsRead([notice.id]);
                    router.push(notice.link);
                  }}
                  className="block w-full px-4 py-3 text-left hover:bg-paper-2"
                >
                  <span className="block text-sm font-medium">{notice.title}</span>
                  <span className="block text-xs text-ink-2">{notice.body}</span>
                  <span className="mt-1 block text-[0.6875rem] text-ink-3">{formatDateTime(notice.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Moldura do painel: sidebar recolhível (desktop), menu em gaveta (telemóvel), pesquisa e notificações. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const access = useStaffAccess();
  const collapsed = useSyncExternalStore(collapsedStore.subscribe, collapsedStore.get, () => false);
  const [menuOpen, setMenuOpen] = useState(false);
  const roleLabel = access ? ROLE_LABELS[access.role] : "";

  return (
    <div className="flex min-h-dvh bg-paper">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-card transition-[width] duration-300 lg:flex print:hidden",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-line", collapsed ? "justify-center" : "px-4")}>
          <Link href="/admin" aria-label="Painel">
            {collapsed ? (
              <span className="font-display text-lg font-extrabold text-brand">e</span>
            ) : (
              <Logo className="h-8" />
            )}
          </Link>
        </div>
        <nav aria-label="Painel" className="flex-1 overflow-y-auto p-3">
          {/* A navegação lê o endereço: em Suspense para as páginas com [id] poderem ser pré-renderizadas */}
          <Suspense fallback={null}>
            <NavLinks access={access} collapsed={collapsed} />
          </Suspense>
        </nav>
        <button
          type="button"
          onClick={() => collapsedStore.set(!collapsed)}
          className="flex h-11 items-center justify-center gap-2 border-t border-line text-xs text-ink-3 hover:text-ink"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" /> Recolher
            </>
          )}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-card/90 px-3 backdrop-blur sm:px-5 print:hidden">
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger
              className="grid size-10 place-items-center rounded-full hover:bg-ink/[0.06] lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card shadow-lift data-[state=open]:animate-drawer-in">
                <Dialog.Title className="sr-only">Menu do painel</Dialog.Title>
                <Dialog.Description className="sr-only">Módulos do painel</Dialog.Description>
                <div className="flex h-14 items-center justify-between border-b border-line px-4">
                  <Logo className="h-8" />
                  <Dialog.Close
                    className="grid size-10 place-items-center rounded-full hover:bg-ink/[0.06]"
                    aria-label="Fechar menu"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <nav aria-label="Painel" className="flex-1 overflow-y-auto p-3">
                  <Suspense fallback={null}>
                    <NavLinks access={access} collapsed={false} onNavigate={() => setMenuOpen(false)} />
                  </Suspense>
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="min-w-0 flex-1">
            <CommandPalette />
          </div>
          {roleLabel && <span className="hidden eyebrow text-ink-3 md:inline">{roleLabel}</span>}
          <NotificationsBell />
          <ThemeToggle />
          <LogoutButton />
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
