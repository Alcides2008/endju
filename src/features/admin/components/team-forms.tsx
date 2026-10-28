"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { endSession } from "@/features/auth/client";
import {
  ACTIONS,
  MODULES,
  ROLE_LABELS,
  type Action,
  type Matrix,
  type Module,
  type RoleId,
} from "@/lib/domain/permissions";
import {
  acceptInvite,
  createInvite,
  resetRoleMatrix,
  revokeInvite,
  saveRoleMatrix,
  setMemberActive,
  setMemberRole,
} from "../team-actions";
import { useRun } from "./order-admin-panel";

const STAFF_ROLES = ["admin", "gestor", "designer", "operador", "financeiro", "atendimento"] as const;
const ROLE_OPTIONS = STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export function MemberControls({
  uid,
  role,
  active,
  self,
}: {
  uid: string;
  role: RoleId;
  active: boolean;
  self: boolean;
}) {
  const { pending, run } = useRun();
  if (self) return <span className="text-xs text-ink-3">És tu</span>;
  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        className="h-9 w-44 text-sm"
        aria-label="Papel"
        options={ROLE_OPTIONS}
        value={role}
        disabled={pending || !active}
        onValueChange={(next) =>
          run(
            () => setMemberRole(uid, next),
            `Papel mudado para ${ROLE_LABELS[next as RoleId]}. A pessoa volta a entrar.`,
          )
        }
      />
      <Button
        size="sm"
        variant="ghost"
        loading={pending}
        onClick={() =>
          (active ? window.confirm("Desativar? A pessoa deixa de conseguir entrar.") : true) &&
          run(() => setMemberActive(uid, !active), active ? "Conta desativada." : "Conta reativada.")
        }
      >
        {active ? "Desativar" : "Reativar"}
      </Button>
    </div>
  );
}

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("atendimento");
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLink(null);
      }}
      title="Convidar para a equipa"
      description="A pessoa entra (ou cria conta) com este email e aceita o convite. Válido 7 dias, uma só vez."
      trigger={
        <Button>
          <Plus aria-hidden /> Convidar
        </Button>
      }
      footer={
        !link && (
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await createInvite({ email, role: role as "atendimento" });
                if (!result.ok) return void toast.error(result.message);
                setLink(result.link);
                toast.success(result.emailed ? "Convite enviado por email." : "Convite criado: envia o link à pessoa.");
                router.refresh();
              })
            }
          >
            Criar convite
          </Button>
        )
      }
    >
      {link ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">
            Envia este link por WhatsApp ou email. Só funciona com a conta de {email}.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link do convite" />
            <Button
              variant="outline"
              className="h-12 shrink-0"
              onClick={() => {
                void navigator.clipboard?.writeText(link);
                toast.success("Link copiado.");
              }}
            >
              <Copy aria-hidden /> Copiar
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Papel">
            <Select options={ROLE_OPTIONS} value={role} onValueChange={setRole} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

export function RevokeInviteButton({ id }: { id: string }) {
  const { pending, run } = useRun();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      onClick={() => run(() => revokeInvite(id), "Convite revogado.")}
    >
      Revogar
    </Button>
  );
}

const ACTION_SHORT: Record<Action, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Apagar",
  approve: "Aprovar",
  export: "Exportar",
};
const ACTION_LETTER: Record<Action, string> = {
  view: "V",
  create: "C",
  edit: "E",
  delete: "X",
  approve: "A",
  export: "D",
};

/** Matriz módulo × ação de um papel; "Ver" é obrigatório para as outras ações contarem. */
export function RoleMatrixEditor({
  role,
  matrix,
  labels,
  customized,
}: {
  role: Exclude<RoleId, "admin" | "cliente">;
  matrix: Matrix;
  labels: Record<Module, string>;
  customized: boolean;
}) {
  const [m, setM] = useState<Matrix>(matrix);
  const { pending, run } = useRun();
  const has = (module: Module, action: Action) => (m[module] ?? "").includes(ACTION_LETTER[action]);
  const toggle = (module: Module, action: Action) => {
    const letter = ACTION_LETTER[action];
    const current = m[module] ?? "";
    const next = current.includes(letter) ? current.replace(letter, "") : current + letter;
    setM({
      ...m,
      [module]: action === "view" && !next.includes("V") ? "" : next.includes("V") || !next ? next : `V${next}`,
    });
  };
  const dirty = JSON.stringify(m) !== JSON.stringify(matrix);
  return (
    <section className="space-y-3 rounded-sm border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          {ROLE_LABELS[role]} {customized && <span className="text-xs font-normal text-ink-3">· alterado</span>}
        </h2>
        <div className="flex gap-2">
          {customized && (
            <Button
              size="sm"
              variant="ghost"
              loading={pending}
              onClick={() => run(() => resetRoleMatrix(role), "Permissões iniciais repostas.")}
            >
              Repor iniciais
            </Button>
          )}
          <Button
            size="sm"
            loading={pending}
            disabled={!dirty}
            onClick={() =>
              run(
                () => saveRoleMatrix(role, m),
                "Permissões guardadas. Valem a partir da próxima página que a equipa abrir.",
              )
            }
          >
            Guardar
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-3">
              <th className="py-1.5 pr-3 font-medium">Módulo</th>
              {ACTIONS.map((a) => (
                <th key={a} className="px-2 py-1.5 text-center font-medium">
                  {ACTION_SHORT[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MODULES.map((module) => (
              <tr key={module}>
                <td className="py-1.5 pr-3 whitespace-nowrap">{labels[module]}</td>
                {ACTIONS.map((a) => (
                  <td key={a} className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer accent-brand disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`${labels[module]}: ${ACTION_SHORT[a]}`}
                      checked={has(module, a)}
                      disabled={module === "team" && a !== "view"}
                      onChange={() => toggle(module, a)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="lg"
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await acceptInvite(token);
          if (!result.ok) return void toast.error(result.message);
          toast.success("Bem-vindo à equipa! Entra outra vez para abrir o painel.");
          await endSession();
          router.push("/entrar?voltar=%2Fadmin");
        })
      }
    >
      Aceitar o convite
    </Button>
  );
}
