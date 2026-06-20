export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-1.5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
