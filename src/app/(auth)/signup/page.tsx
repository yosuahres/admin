"use client";
import AuthCard from "@/components/AuthCard";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <AuthCard title="Sign Up" subtitle="Sign in to your account to continue">
      <AuthForm />
    </AuthCard>
  );
}
