export type AdminUserStatus = "all" | "active" | "suspended";

export type AdminUsersQueryState = {
  query: string;
  status: AdminUserStatus;
  page: number;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: "learner" | "admin";
  banned: boolean;
  banReason: string | null;
  createdAt: string;
  generationLimit: number | null;
  generationCount: number;
  completedGenerationCount: number;
  failedGenerationCount: number;
  lastGenerationAt: string | null;
};

export type AdminUsersView = {
  users: AdminUserRow[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalGenerations: number;
  };
  pagination: {
    page: number;
    totalPages: number;
    totalResults: number;
  };
};
