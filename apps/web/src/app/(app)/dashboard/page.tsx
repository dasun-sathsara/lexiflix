import { BadgeCheck, Calendar, Mail, User as UserIcon } from "lucide-react";
import { headers } from "next/headers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  // Generate initials from name
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Format the creation date
  const createdAt = user.createdAt ? new Date(user.createdAt) : null;
  const formattedDate = createdAt
    ? new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(createdAt)
    : "N/A";

  return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>Here's your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20 rounded-xl">
                {user.image && <AvatarImage src={user.image} alt={user.name} className="size-full object-cover" />}
                <AvatarFallback className="rounded-xl text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">{user.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email Status</p>
                    <p className="font-medium">
                      {user.emailVerified ? (
                        <span className="text-green-600 dark:text-green-400">Verified</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Not verified</span>
                      )}
                    </p>
                  </div>
                </div>
                {createdAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Member Since</p>
                      <p className="font-medium">{formattedDate}</p>
                    </div>
                  </div>
                )}
                {user.role && (
                  <div className="flex items-center gap-3 text-sm">
                    <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Account Role</p>
                      <p className="font-medium capitalize">{user.role}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
