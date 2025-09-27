"use client";

import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type LearningJourney = {
  name: string;
  url: string;
  icon: LucideIcon;
  level: string;
  description: string;
  progress: string;
};

export function NavProjects({ projects }: { projects: LearningJourney[] }) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
        Learning journeys
      </SidebarGroupLabel>
      <SidebarMenu className="gap-3">
        {projects.map((item) => (
          <SidebarMenuItem
            key={item.name}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur"
          >
            <SidebarMenuButton
              asChild
              className="h-auto flex-col items-start gap-3 rounded-2xl border-none bg-transparent p-4 text-left text-slate-200 transition hover:bg-white/5"
            >
              <a href={item.url}>
                <div className="flex w-full items-center justify-between text-[0.7rem] uppercase tracking-[0.18em] text-slate-400">
                  <span>{item.level}</span>
                  <item.icon className="size-4 text-slate-200" />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-100">{item.name}</p>
                  <p className="text-xs leading-snug text-slate-400">{item.description}</p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex size-1.5 rounded-full bg-emerald-400/80" />
                  <span>{item.progress}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
