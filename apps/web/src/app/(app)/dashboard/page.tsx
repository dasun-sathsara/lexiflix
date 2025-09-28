import { AppTopbar } from "@/features/sidebar/components/app-sidebar";

export default function DashboardPage() {
  return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6"></div>
    </>
  );
}
