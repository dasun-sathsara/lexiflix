"use client";

import {
  BarChart3,
  Briefcase,
  Clapperboard,
  Command,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Settings2,
  Sparkles,
  Timer,
} from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const data = {
  user: {
    name: "Ava Learner",
    email: "ava@lexiflix.app",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      description: "Track milestones and unlock your next goals.",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
        {
          title: "Milestones",
          url: "/dashboard/milestones",
        },
        {
          title: "Coach notes",
          url: "/dashboard/coach",
        },
      ],
    },
    {
      title: "Library",
      description: "Browse scenes tailored to your CEFR level.",
      url: "/library",
      icon: Clapperboard,
      items: [
        {
          title: "Films",
          url: "/library/films",
        },
        {
          title: "Series",
          url: "/library/series",
        },
        {
          title: "Short clips",
          url: "/library/clips",
        },
      ],
    },
    {
      title: "Flashcards",
      description: "Review curated decks and save tricky phrases.",
      url: "/flashcards",
      icon: Sparkles,
      items: [
        {
          title: "Active decks",
          url: "/flashcards/active",
        },
        {
          title: "Saved words",
          url: "/flashcards/saved",
        },
        {
          title: "Create deck",
          url: "/flashcards/new",
        },
      ],
    },
    {
      title: "Insights",
      description: "Measure fluency gains and celebrate streaks.",
      url: "/insights",
      icon: BarChart3,
      items: [
        {
          title: "Progress",
          url: "/insights/progress",
        },
        {
          title: "Streaks",
          url: "/insights/streaks",
        },
        {
          title: "Achievements",
          url: "/insights/achievements",
        },
      ],
    },
  ],
  quickLinks: [
    {
      title: "Placement test",
      description: "Calibrate your CEFR level in 8 minutes.",
      url: "/assessment",
      icon: GraduationCap,
    },
    {
      title: "Daily warm-up",
      description: "Three clips to prime your listening muscle.",
      url: "/warm-up",
      icon: Timer,
    },
  ],
  projects: [
    {
      name: "Travel stories",
      level: "B1 journey",
      description: "Master conversational phrases for your next trip.",
      progress: "68% complete",
      url: "/paths/travel-stories",
      icon: Globe2,
    },
    {
      name: "Career English",
      level: "B2 focus",
      description: "Present confidently and decode workplace slang.",
      progress: "45% complete",
      url: "/paths/career-english",
      icon: Briefcase,
    },
    {
      name: "Exam sprint",
      level: "C1 mastery",
      description: "Sharpen listening skills for IELTS & TOEFL.",
      progress: "82% complete",
      url: "/paths/exam-sprint",
      icon: Command,
    },
  ],
  navSecondary: [
    {
      title: "Help center",
      url: "/support",
      icon: LifeBuoy,
    },
    {
      title: "Community",
      url: "/community",
      icon: MessageCircle,
    },
    {
      title: "Account settings",
      url: "/settings",
      icon: Settings2,
    },
  ],
};

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      variant="inset"
      {...props}
      className={cn(
        "bg-gradient-to-b from-slate-950 via-[#1b1633] to-slate-950 text-slate-100",
        "border-r border-white/10",
        className,
      )}
    >
      <SidebarHeader className="gap-3 p-4 pb-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="group h-auto rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-slate-100 transition hover:border-white/20 hover:bg-white/10"
            >
              <a href="/dashboard">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-slate-100 transition group-hover:bg-white/15">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight text-slate-200">
                  <span className="truncate font-semibold tracking-tight">LexiFlix</span>
                  <span className="truncate text-xs text-slate-400">Learn through stories</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-7 px-2 pb-6">
        <NavMain items={data.navMain} />
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
            Quick access
          </SidebarGroupLabel>
          <SidebarMenu className="gap-3">
            {data.quickLinks.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className="h-auto items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                >
                  <a href={item.url}>
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-slate-100">
                        <item.icon className="size-4" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-sm font-semibold tracking-tight text-slate-100">
                          {item.title}
                        </span>
                        <span className="text-xs leading-snug text-slate-400">
                          {item.description}
                        </span>
                      </span>
                    </div>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-white/10 px-2 pt-4">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
