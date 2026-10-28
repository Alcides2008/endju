"use client";

import { useState } from "react";
import { SECTORS, type ProjectBase } from "@/lib/domain/content";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./project-card";

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="mr-2 w-16 eyebrow text-ink-3">{label}</span>
      {[{ value: null, label: "Todos" }, ...options].map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm transition-colors",
            value === option.value
              ? "border-ink bg-ink text-paper"
              : "border-line text-ink-2 hover:border-ink/40 hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PortfolioGrid({
  projects: all,
  serviceNames,
}: {
  projects: ProjectBase[];
  serviceNames: Record<string, string>;
}) {
  // Só aparecem nos filtros as categorias e setores que têm trabalhos
  const categories = Object.keys(serviceNames).filter((slug) => all.some((p) => p.serviceSlugs.includes(slug)));
  const usedSectors = SECTORS.filter((sector) => all.some((p) => p.sector === sector));
  const [category, setCategory] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const projects = all.filter(
    (p) => (!category || p.serviceSlugs.includes(category)) && (!sector || p.sector === sector),
  );

  return (
    <>
      <div className="mb-14 space-y-4 border-y border-line py-6">
        <FilterGroup
          label="Serviço"
          options={categories.map((slug) => ({ value: slug, label: serviceNames[slug] }))}
          value={category}
          onChange={setCategory}
        />
        <FilterGroup
          label="Setor"
          options={usedSectors.map((s) => ({ value: s, label: s }))}
          value={sector}
          onChange={setSector}
        />
      </div>

      <p aria-live="polite" className="mb-8 text-sm text-ink-3">
        {projects.length === 1 ? "1 trabalho" : `${projects.length} trabalhos`}
      </p>

      {projects.length > 0 ? (
        <ul className="grid gap-x-8 gap-y-16 md:grid-cols-2">
          {projects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} sizes="(min-width: 768px) 50vw, 100vw" serviceNames={serviceNames} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-sm border border-dashed border-line px-6 py-16 text-center">
          <p className="text-ink-2">Ainda não publicámos trabalhos com esta combinação.</p>
          <button
            type="button"
            onClick={() => {
              setCategory(null);
              setSector(null);
            }}
            className="mt-4 text-sm font-medium text-ink underline decoration-brand decoration-2 underline-offset-4"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </>
  );
}
