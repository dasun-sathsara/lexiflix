import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavSecondary({
  items,
  title = "Support",
  className,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
  title?: string;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup
      {...props}
      className={cn(
        "group-data-[collapsible=icon]:hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3",
        className,
      )}
    >
      <SidebarGroupLabel className="mb-2 text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-2">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size="sm"
                className="h-auto items-center gap-3 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
              >
                <a href={item.url} className="flex w-full items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-slate-100">
                    <item.icon className="size-3.5" />
                  </span>
                  <span className="truncate">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
