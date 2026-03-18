"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Create user profile via server API (bypasses RLS)
    if (data.user) {
      try {
        await fetch("/api/auth/create-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: data.user.id,
            email,
            display_name: displayName,
          }),
        });
      } catch (err) {
        console.error("Failed to create profile:", err);
      }
    }

    toast.success("Account created! The Oracle welcomes you.");
    router.push("/");
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-sm bg-slate-900/80 border-slate-800/50">
        <CardHeader className="text-center">
          <div className="text-3xl mb-2">✦</div>
          <CardTitle className="text-xl text-amber-400">
            Join the Oracle
          </CardTitle>
          <CardDescription className="text-slate-400">
            Begin your journey as a prediction oracle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
            <Input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold"
            >
              {loading ? "Summoning..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already an Oracle?{" "}
            <Link href="/login" className="text-amber-400 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
