import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
          <p>Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
