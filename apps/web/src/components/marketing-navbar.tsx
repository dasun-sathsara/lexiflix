"use client";

import Link from "next/link";
import { type MouseEvent, useState } from "react";

import { ElegantButton } from "@/components/ui/button";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavBody,
  Navbar,
  NavItems,
} from "@/components/ui/resizable-navbar";

const navItems = [
  {
    name: "Features",
    link: "#features",
  },
  {
    name: "How It Works",
    link: "#cta",
  },
  {
    name: "FAQ",
    link: "#faq",
  },
  {
    name: "Contact",
    link: "#contact",
  },
];

export function MarketingNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCloseMobileMenu = () => setIsMobileMenuOpen(false);

  const handleNavItemClick = (
    event: MouseEvent<HTMLAnchorElement>,
    item: (typeof navItems)[number],
  ) => {
    if (item.link.startsWith("#")) {
      event.preventDefault();
      const target = document.querySelector(item.link);
      const navbar = document.querySelector<HTMLElement>(
        "[data-marketing-navbar]",
      );
      const offset = navbar?.getBoundingClientRect().height ?? 0;

      if (target) {
        const targetPosition =
          target.getBoundingClientRect().top + window.scrollY - (offset + 16);

        window.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: "smooth",
        });
      }
    }

    handleCloseMobileMenu();
  };

  return (
    <div className="relative w-full">
      <Navbar data-marketing-navbar>
        <NavBody>
          <Link
            href="/"
            className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-medium text-foreground"
          >
            <span
              className="size-8 rounded-full bg-indigo-500/10"
              aria-hidden="true"
            />
            <span>LexiFlix</span>
          </Link>
          <NavItems items={navItems} onItemClick={handleNavItemClick} />
          <div className="flex items-center gap-4">
            <ElegantButton asChild size="elegant" variant="elegantSecondary">
              <Link href="/login">Login</Link>
            </ElegantButton>
            <ElegantButton asChild size="elegant" variant="elegant">
              <Link href="/signup">Sign Up</Link>
            </ElegantButton>
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <Link
              href="/"
              className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-medium text-foreground"
            >
              <span
                className="size-8 rounded-full bg-indigo-500/10"
                aria-hidden="true"
              />
              <span>LexiFlix</span>
            </Link>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={handleCloseMobileMenu}
          >
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.link}
                onClick={(event) => handleNavItemClick(event, item)}
                className="relative text-base text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
              >
                <span className="block">{item.name}</span>
              </Link>
            ))}
            <div className="flex w-full flex-col gap-4">
              <ElegantButton
                asChild
                size="elegant"
                variant="elegantSecondary"
                className="w-full"
                onClick={handleCloseMobileMenu}
              >
                <Link href="/login">Login</Link>
              </ElegantButton>
              <ElegantButton
                asChild
                size="elegant"
                variant="elegant"
                className="w-full"
                onClick={handleCloseMobileMenu}
              >
                <Link href="/signup">Sign Up</Link>
              </ElegantButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
