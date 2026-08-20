import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { aegisLogo } from "@/lib/brand";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setAuth(data.token, data.member);
        toast({
          title: "Welcome back",
          description: "You have successfully logged in.",
        });
        setLocation("/feed");
      },
      onError: (error: any) => {
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data });
  };

  return (
    <div className="login-page relative min-h-[100dvh] overflow-hidden bg-[#020606] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#0d4d82]/25 blur-[130px]" />
        <div className="absolute -bottom-52 -right-40 h-[560px] w-[560px] rounded-full bg-[#0b6c35]/20 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-12 sm:px-10">
        <div className="flex w-full max-w-[780px] flex-col items-center justify-center gap-12 md:flex-row md:items-center md:gap-20 lg:gap-28">
          <section className="w-full max-w-[350px] shrink-0 text-center md:text-left">
            <img src={aegisLogo} alt="Aegis Rise" className="mx-auto mb-8 h-[190px] w-[190px] object-contain md:mx-0" />
            <h1 className="text-[42px] font-bold leading-[1.08] tracking-[-0.045em]">
              Connect. Collaborate. <span className="text-[#00bfd3]">Grow.</span>
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-[#aeb8b8]">
              The exclusive professional network for active chapter members.
            </p>
            <p className="mt-2 text-[16px] text-[#7f8b8b]">
              Connection. Collaboration. Growth.
            </p>
            <div className="mt-9 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#101918]/80 px-4 py-2 text-[13px] text-[#9eaaa5]">
              <ShieldCheck className="h-4 w-4 text-[#4fd47c]" />
              Institutional-grade security &amp; precision
            </div>
          </section>

          <section className="w-full max-w-[360px] rounded-xl border border-white/[0.08] bg-[#191a1f] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-6">
              <h2 className="text-[20px] font-semibold tracking-tight text-[#f3f4f4]">Secure Login</h2>
              <p className="mt-1.5 text-[12px] text-[#8e949c]">Authenticate to access your chapter workspace.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[12px] font-medium text-[#d7d9dc]">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@example.com"
                          type="email"
                          autoComplete="email"
                          className="mt-1.5 h-10 rounded-md border-white/[0.06] bg-[#242731] px-3 text-[13px] text-white placeholder:text-[#737984] focus-visible:border-[#007bff] focus-visible:ring-1 focus-visible:ring-[#007bff]/40"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[12px] font-medium text-[#d7d9dc]">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          className="mt-1.5 h-10 rounded-md border-white/[0.06] bg-[#242731] px-3 text-[13px] text-white focus-visible:border-[#007bff] focus-visible:ring-1 focus-visible:ring-[#007bff]/40"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="h-10 w-full rounded-md bg-[#168cf0] text-[13px] font-medium text-white shadow-[0_0_12px_rgba(22,140,240,0.2)] transition-colors hover:bg-[#0879d8]"
                  disabled={loginMutation.isPending}
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Authenticate
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 border-t border-white/[0.07] pt-4 text-center">
              <p className="text-[12px] leading-relaxed text-[#8e949c]">
                Access is invite-only.{" "}
                <Link href="/signup" className="text-[#00bfd3] transition-colors hover:text-white hover:underline" data-testid="link-signup">
                  Apply for Chapter Access
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
