export function PickStatus({ submitted, label }: { submitted: boolean; label?: string }) {
  return <span className="font-semibold">{label ?? (submitted ? "Pick Submitted" : "No Pick Yet")}</span>;
}
