export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{message}</div>;
}
