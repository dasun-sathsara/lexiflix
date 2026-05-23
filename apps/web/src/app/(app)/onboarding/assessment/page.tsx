import { AssessmentFlow } from "@/features/assessment/components/assessment-flow";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";

export default function AssessmentPage() {
  return (
    <>
      <AppTopbar title="Discover Your Level" />
      <AssessmentFlow />
    </>
  );
}
