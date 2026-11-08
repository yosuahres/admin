//(auth)/login/page.tsx
"use client";
import AuthCard from "@/components/AuthCard";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <AuthForm />
    </AuthCard>
  );
}
