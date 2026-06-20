"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sleep } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  company: z.string().optional(),
  message: z.string().min(10, "Tell us a little more (10+ characters)"),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    await sleep(900); // simulate Resend email dispatch
    toast.success("Message sent", {
      description: `Thanks ${values.name.split(" ")[0]} — we'll reply shortly.`,
    });
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.name?.message}>
          <Input placeholder="Jane Cooper" {...register("name")} />
        </Field>
        <Field label="Work email" error={errors.email?.message}>
          <Input type="email" placeholder="jane@company.com" {...register("email")} />
        </Field>
      </div>
      <Field label="Company" optional>
        <Input placeholder="Acme Inc." {...register("company")} />
      </Field>
      <Field label="How can we help?" error={errors.message?.message}>
        <textarea
          rows={4}
          placeholder="Tell us about your business…"
          className="flex w-full rounded-xl border border-input bg-background/60 px-3.5 py-2.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/40"
          {...register("message")}
        />
      </Field>
      <Button type="submit" size="lg" variant="accent" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send message"}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  optional,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="flex items-center gap-1.5">
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            optional
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
