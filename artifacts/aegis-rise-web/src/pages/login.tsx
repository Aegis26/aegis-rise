import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { aegisLogo } from "@/lib/brand";
import { Shield, Loader2, ArrowRight } from "lucide-react";

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
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Brand Side */}
      <div className="hidden md:flex md:w-1/2 bg-card border-r border-border p-12 flex-col justify-between relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute top-[40%] left-[20%] w-px h-[40%] bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
          <div className="absolute top-[30%] left-[60%] w-px h-[50%] bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-primary font-display font-bold text-3xl tracking-tight">
            <img src={aegisLogo} alt="Aegis Rise" className="h-10 w-auto" />
            <span>AEGIS RISE</span>
          </div>
        </div>
        
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-display font-bold leading-tight mb-6">
            Connect.<br />
            Collaborate.<br />
            <span className="text-primary">Grow.</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            The exclusive professional network for active chapter members. Discover fellow members, share useful work, and steward a trusted community.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Aegis Rise. All rights reserved.
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2 text-primary font-display font-bold text-2xl tracking-tight mb-8">
            <img src={aegisLogo} alt="Aegis Rise" className="h-8 w-auto" />
            <span>AEGIS RISE</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-display font-bold mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to your member account.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="email"
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
                      <FormLabel>Password</FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
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
                className="w-full h-12 text-md font-medium"
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

          <div className="mt-10 pt-6 border-t border-border text-center">
            <p className="text-muted-foreground">
              Not a member yet?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium font-display tracking-wide" data-testid="link-signup">
                Apply for Chapter Access
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
