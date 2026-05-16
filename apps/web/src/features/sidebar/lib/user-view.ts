export interface SessionUser {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
}

export interface SidebarUser {
  name: string;
  email: string;
  avatar?: string;
  role: "learner" | "admin";
}

/**
 * Maps a session user shape to the user prop shape required by the AppSidebar.
 */
export function mapToSidebarUser(user: SessionUser): SidebarUser {
  return {
    name: user.name,
    email: user.email,
    avatar: user.image ?? undefined,
    role: user.role === "admin" ? "admin" : "learner",
  };
}
