import { BrandMark } from "@/components/Brand";

export default function ResumeLoading() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <BrandMark size={48} />
      <h1 className="mt-4 text-xl font-bold">Getting your answer ready…</h1>
      <p className="mt-2 text-sm text-muted">Amia is reviewing your question. This takes just a few seconds.</p>
    </div>
  );
}
