import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, CheckCircle2, KeyRound, Loader2, X } from "lucide-react";
import { useResetPassword } from "@workspace/api-client-react";
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

const passwordRequirements = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One number", test: (value: string) => /[0-9]/.test(value) },
  { label: "One special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  {
    label: "At most 72 UTF-8 bytes",
    test: (value: string) =>
      value.length > 0 && new TextEncoder().encode(value).length <= 72,
  },
] as const;

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .refine(
        (value) => new TextEncoder().encode(value).length <= 72,
        "Password must be at most 72 bytes when UTF-8 encoded.",
      )
      .refine((value) => /[A-Z]/.test(value), "Add an uppercase letter.")
      .refine((value) => /[a-z]/.test(value), "Add a lowercase letter.")
      .refine((value) => /[0-9]/.test(value), "Add a number.")
      .refine((value) => /[^A-Za-z0-9]/.test(value), "Add a special character."),
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Passwords do not match.",
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [successMessage, setSuccessMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token")?.trim() ?? "",
    [],
  );
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });
  const newPassword = form.watch("newPassword");
  const requirementResults = passwordRequirements.map((requirement) => ({
    ...requirement,
    met: requirement.test(newPassword),
  }));
  const strength = requirementResults.filter((requirement) => requirement.met).length;
  const strengthLabel =
    strength === 0 ? "Not started" : strength <= 2 ? "Weak" : strength < 6 ? "Almost there" : "Strong";

  const resetMutation = useResetPassword({
    mutation: {
      onSuccess: (data) => {
        setServerError("");
        setSuccessMessage(data.message);
        form.reset();
      },
      onError: (error: any) => {
        setServerError(
          error.message || "This reset link is invalid or expired. Request a new one.",
        );
      },
    },
  });

  const submit = (values: ResetPasswordValues) => {
    setServerError("");
    resetMutation.mutate({
      data: {
        token,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      },
    });
  };

  return (
    <div className="login-page relative min-h-[100dvh] overflow-hidden bg-[#020606] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#0d4d82]/25 blur-[130px]" />
        <div className="absolute -bottom-52 -right-40 h-[560px] w-[560px] rounded-full bg-[#0b6c35]/20 blur-[150px]" />
      </div>
      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-12">
        <section className="w-full max-w-[430px] rounded-xl border border-white/[0.08] bg-[#191a1f] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <img src={aegisLogo} alt="Aegis Rise" className="mx-auto mb-7 h-auto w-full max-w-[240px]" />

          {successMessage ? (
            <div className="text-center" role="status" data-testid="reset-password-success">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0b6c35]/25">
                <CheckCircle2 className="h-7 w-7 text-[#4fd47c]" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold">Password updated</h1>
              <p className="mt-3 text-sm text-[#aeb8b8]">{successMessage}</p>
              <Button
                className="mt-7 h-10 w-full bg-[#168cf0] text-white hover:bg-[#0879d8]"
                onClick={() => setLocation("/login")}
                data-testid="button-login-after-reset"
              >
                Continue to Login
              </Button>
            </div>
          ) : !token ? (
            <div className="text-center" role="alert" data-testid="reset-password-invalid-link">
              <X className="mx-auto h-10 w-10 text-red-400" />
              <h1 className="mt-4 text-2xl font-semibold">Reset link unavailable</h1>
              <p className="mt-3 text-sm leading-6 text-[#aeb8b8]">
                This reset link is invalid or incomplete. Request a new one to continue.
              </p>
              <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium text-[#00bfd3] hover:text-white">
                Request a new reset link
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#168cf0]/15">
                  <KeyRound className="h-5 w-5 text-[#41a5fb]" />
                </div>
                <h1 className="text-2xl font-semibold">Create a new password</h1>
                <p className="mt-2 text-sm text-[#8e949c]">Choose a strong password for your account.</p>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
                  <input
                    type="email"
                    name="username"
                    autoComplete="username"
                    value=""
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                  />
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-[#d7d9dc]">New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            className="mt-1.5 h-10 border-white/[0.06] bg-[#242731] text-sm text-white"
                            data-testid="input-new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-lg border border-white/[0.07] bg-black/15 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-[#9ba4aa]">Password strength</span>
                      <span className={strength === 6 ? "text-[#4fd47c]" : "text-[#d7d9dc]"}>{strengthLabel}</span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-white/10"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={passwordRequirements.length}
                      aria-valuenow={strength}
                      aria-valuetext={strengthLabel}
                    >
                      <div
                        className={`h-full transition-all ${strength <= 2 ? "bg-red-400" : strength < 6 ? "bg-amber-400" : "bg-[#4fd47c]"}`}
                        style={{ width: `${(strength / passwordRequirements.length) * 100}%` }}
                      />
                    </div>
                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {requirementResults.map((requirement) => (
                        <li key={requirement.label} className={`flex items-center text-[11px] ${requirement.met ? "text-[#7fd99a]" : "text-[#808990]"}`}>
                          {requirement.met ? <Check className="mr-1.5 h-3 w-3" /> : <X className="mr-1.5 h-3 w-3" />}
                          {requirement.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <FormField
                    control={form.control}
                    name="confirmNewPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-[#d7d9dc]">Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            className="mt-1.5 h-10 border-white/[0.06] bg-[#242731] text-sm text-white"
                            data-testid="input-confirm-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {serverError && (
                    <p className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300" role="alert" data-testid="reset-password-error">
                      {serverError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="h-10 w-full bg-[#168cf0] text-sm text-white hover:bg-[#0879d8]"
                    disabled={!form.formState.isValid || strength !== 6 || resetMutation.isPending}
                    data-testid="button-reset-password"
                  >
                    {resetMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}