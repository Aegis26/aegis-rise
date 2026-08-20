import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { aegisLogo } from "@/lib/brand";
import { Loader2, ArrowRight } from "lucide-react";

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
    <div className="login-page min-h-[100dvh] flex flex-col md:flex-row bg-[#0a1428]">
      {/* Brand Side */}
      <div className="flex w-full md:w-[40%] min-h-[430px] md:min-h-[100dvh] bg-[#0a1428] border-b md:border-b-0 md:border-r border-white/10 p-8 sm:p-12 lg:p-14 flex-col justify-between relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute top-[40%] left-[20%] w-px h-[40%] bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
          <div className="absolute top-[30%] left-[60%] w-px h-[50%] bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white font-bold text-2xl tracking-[0.08em]">
            <img src={aegisLogo} alt="Aegis Rise" className="h-[60px] w-[60px] object-contain" />
            <span>AEGIS RISE</span>
          </div>
        </div>
        
        <div className="relative z-10 max-w-[400px] py-10 md:py-0">
          <h1 className="text-[clamp(2.75rem,5vw,3rem)] font-bold leading-[1.08] tracking-[-0.04em] mb-6 text-white">
            Connect. Collaborate. <span className="text-[#00bfd3]">Grow.</span>
          </h1>
          <p className="text-[#b8c3d1] text-lg leading-relaxed">
            The exclusive professional network for active chapter members. Discover fellow members, share useful work, and steward a trusted community.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-[#8e9bad] tracking-wide">
          Institutional-grade security &amp; precision
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-[60%] flex-1 flex flex-col justify-center bg-[#2a2a2a] px-6 py-12 sm:px-12 lg:px-20 xl:px-28">
        <div className="mx-auto w-full max-w-[460px]">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2 text-white font-bold text-xl tracking-[0.08em] mb-10">
            <img src={aegisLogo} alt="Aegis Rise" className="h-10 w-10 object-contain" />
            <span>AEGIS RISE</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-white mb-3">Welcome Back</h2>
            <p className="text-[#b8b8b8] text-base">Sign in to your member account.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#ededed]">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="email"
                        className="h-12 bg-[#333333] border-white/10 text-white placeholder:text-[#858585] focus-visible:border-[#007bff] focus-visible:ring-[#007bff]/30"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-[#ededed]">Password</FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                         className="h-12 bg-[#333333] border-white/10 text-white placeholder:text-[#858585] focus-visible:border-[#007bff] focus-visible:ring-[#007bff]/30"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-md font-medium rounded-md bg-[#007bff] hover:bg-[#006de0] text-white transition-colors"
                disabled={loginMutation.isPending}
                data-testid="button-login-submit"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-10 pt-6 border-t border-white/10 text-center">
            <p className="text-[#b8b8b8]">
              Not a member yet?{" "}
              <Link href="/signup" className="text-[#00bfd3] hover:text-white hover:underline font-medium tracking-wide transition-colors" data-testid="link-signup">
                Apply for Chapter Access
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
