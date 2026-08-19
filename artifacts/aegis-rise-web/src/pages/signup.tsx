import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignup } from "@workspace/api-client-react";
import { aegisLogo } from "@/lib/brand";
import { Shield, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const signupSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  title: z.string().min(2, "Professional title is required"),
  company: z.string().min(2, "Company/Organization is required"),
  chapter: z.string().min(2, "Chapter name is required"),
  bio: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      title: "",
      company: "",
      chapter: "",
      bio: "",
    },
  });

  const signupMutation = useSignup({
    mutation: {
      onSuccess: (data) => {
        setIsSuccess(true);
        toast({
          title: "Application Submitted",
          description: data.message || "Your application is pending admin approval.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Application failed",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (data: SignupFormValues) => {
    signupMutation.mutate({ data });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Brand Side */}
      <div className="hidden md:flex md:w-5/12 bg-card border-r border-border p-12 flex-col justify-between relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px]" />
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
            Join a network of verified professionals. Apply for chapter access to share resources and build meaningful connections.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Aegis Rise. All rights reserved.
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-lg">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2 text-primary font-display font-bold text-2xl tracking-tight mb-8">
            <img src={aegisLogo} alt="Aegis Rise" className="h-8 w-auto" />
            <span>AEGIS RISE</span>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-display font-bold">Application Received</h2>
              <p className="text-muted-foreground text-lg max-w-md">
                Thank you for applying to Aegis Rise. Your chapter application is currently pending review by an administrator. You will be notified once your account is approved.
              </p>
              <Button onClick={() => setLocation("/login")} className="mt-8" size="lg" data-testid="button-return-login">
                Return to Login
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <h2 className="text-3xl font-display font-bold mb-2">Apply for Access</h2>
                <p className="text-muted-foreground">Submit your chapter application.</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" data-testid="input-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" type="email" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" type="password" data-testid="input-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chapter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chapter Code/Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., NY-01" data-testid="input-chapter" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Software Engineer" data-testid="input-title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corp" data-testid="input-company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brief Bio (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us a bit about yourself..." 
                            className="resize-none"
                            data-testid="input-bio"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 text-md font-medium mt-6"
                    disabled={signupMutation.isPending}
                    data-testid="button-signup-submit"
                  >
                    {signupMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-8 pt-6 border-t border-border text-center">
                <p className="text-muted-foreground">
                  Already a member?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium font-display tracking-wide" data-testid="link-login">
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
