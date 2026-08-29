import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useForgotPassword } from "@workspace/api-client-react";
import { aegisLogo } from "@/lib/brand";
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

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [confirmation, setConfirmation] = useState("");
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const forgotPasswordMutation = useForgotPassword({
    mutation: {
      onSuccess: (data) => {
        setConfirmation(data.message);
        form.reset();
      },
      onError: () => {
        form.setError("email", {
          message: "Unable to submit your request. Please try again.",
        });
      },
    },
  });

  return (
    <div className="login-page relative min-h-[100dvh] overflow-hidden bg-[#020606] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#0d4d82]/25 blur-[130px]" />
        <div className="absolute -bottom-52 -right-40 h-[560px] w-[560px] rounded-full bg-[#0b6c35]/20 blur-[150px]" />
      </div>
      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-12">
        <section className="w-full max-w-[390px] rounded-xl border border-white/[0.08] bg-[#191a1f] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <img
            src={aegisLogo}
            alt="Aegis Rise"
            className="mx-auto mb-7 h-auto w-full max-w-[240px] object-contain"
          />

          {confirmation ? (
            <div className="text-center" role="status" data-testid="forgot-password-confirmation">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0b6c35]/25">
                <CheckCircle2 className="h-7 w-7 text-[#4fd47c]" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold">Check your inbox</h1>
              <p className="mt-3 text-sm leading-6 text-[#aeb8b8]">
                {confirmation}
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7f8b8b]">
                If an account exists for that address, the link will arrive shortly and remain valid for one hour.
              </p>
              <Link
                href="/login"
                className="mt-7 inline-flex items-center text-sm font-medium text-[#00bfd3] hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#168cf0]/15">
                  <Mail className="h-5 w-5 text-[#41a5fb]" />
                </div>
                <h1 className="text-2xl font-semibold">Reset your password</h1>
                <p className="mt-2 text-sm leading-6 text-[#8e949c]">
                  Enter your member email and we’ll send you a secure reset link.
                </p>
              </div>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) =>
                    forgotPasswordMutation.mutate({ data }),
                  )}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-[#d7d9dc]">Email address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            className="mt-1.5 h-10 border-white/[0.06] bg-[#242731] text-sm text-white placeholder:text-[#737984]"
                            data-testid="input-reset-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="h-10 w-full bg-[#168cf0] text-sm text-white hover:bg-[#0879d8]"
                    disabled={forgotPasswordMutation.isPending}
                    data-testid="button-send-reset-link"
                  >
                    {forgotPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </Form>
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs font-medium text-[#00bfd3] hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                  Back to secure login
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}