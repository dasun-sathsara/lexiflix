"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    description?: string;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
        Workspace
      </SidebarGroupLabel>
      <SidebarMenu className="gap-3">
        {items.map((item) => (
          <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
            <SidebarMenuItem className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all hover:border-white/20">
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={item.isActive}
                className="h-auto items-start gap-3 rounded-2xl border-none bg-transparent px-3 py-3 text-slate-200 transition hover:bg-white/5 data-[active=true]:bg-white/10 data-[active=true]:text-white"
              >
                <a href={item.url} className="flex w-full items-start gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-slate-100">
                    <item.icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-semibold tracking-tight text-slate-100">
                      {item.title}
                    </span>
                    {item.description ? (
                      <span className="text-xs leading-snug text-slate-400">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </a>
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="text-slate-300 transition hover:bg-white/5 hover:text-white data-[state=open]:rotate-90">
                      <ChevronRight className="size-4" />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-11 mt-2 border-l border-white/10 pl-3">
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className="h-7 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                          >
                            <a href={subItem.url} className="flex items-center gap-2">
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
