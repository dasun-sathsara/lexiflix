"use client";

import Image from "next/image";
import Link from "next/link";
import { type MouseEvent, useState } from "react";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavBody,
  Navbar,
  NavItems,
} from "@/components/common/resizable-navbar";
import { ElegantButton } from "@/components/ui/button";

const navItems = [
  {
    name: "Features",
    link: "/#features",
  },
  {
    name: "How It Works",
    link: "/#cta",
  },
  {
    name: "FAQ",
    link: "/#faq",
  },
  {
    name: "About",
    link: "/about",
  },
];

interface MarketingNavbarProps {
  isLoggedIn?: boolean;
}

export function MarketingNavbar({ isLoggedIn = false }: MarketingNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCloseMobileMenu = () => setIsMobileMenuOpen(false);

  const handleNavItemClick = (
    event: MouseEvent<HTMLAnchorElement>,
    item: (typeof navItems)[number],
  ) => {
    // Section links use a "/#id" form so they work from any page. When the
    // target section is present on the current page, intercept and smooth-scroll
    // instead of triggering a full navigation. Otherwise let the browser follow
    // the link (e.g. from /about back to a section on the landing page).
    const hashIndex = item.link.indexOf("#");
    if (hashIndex !== -1) {
      const hash = item.link.slice(hashIndex);
      const target = document.querySelector(hash);

      if (target) {
        event.preventDefault();
        const navbar = document.querySelector<HTMLElement>("[data-marketing-navbar]");
        const offset = navbar?.getBoundingClientRect().height ?? 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - (offset + 16);

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
            <Image src="/logo.png" alt="LexiFlix logo" width={32} height={32} className="size-10" />
            <span>LexiFlix</span>
          </Link>
          <NavItems items={navItems} onItemClick={handleNavItemClick} />
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <ElegantButton asChild size="elegant" variant="elegant">
                <Link href="/dashboard">Dashboard</Link>
              </ElegantButton>
            ) : (
              <>
                <ElegantButton asChild size="elegant" variant="elegantSecondary">
                  <Link href="/login">Sign In</Link>
                </ElegantButton>
                <ElegantButton asChild size="elegant" variant="elegant">
                  <Link href="/signup">Sign Up</Link>
                </ElegantButton>
              </>
            )}
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <Link
              href="/"
              className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-medium text-foreground"
            >
              <Image
                src="/logo.png"
                alt="LexiFlix logo"
                width={32}
                height={32}
                className="size-8"
              />
              <span>LexiFlix</span>
            </Link>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            />
          </MobileNavHeader>

          <MobileNavMenu isOpen={isMobileMenuOpen} onClose={handleCloseMobileMenu}>
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
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
