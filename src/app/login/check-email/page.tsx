import { BrandMark } from "@/components/Brand";

export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <BrandMark size={48} />
      <h1 className="mt-4 text-2xl font-extrabold">Check your email</h1>
      <p className="mt-2 text-muted">
        We sent you a magic sign-in link. Open it on this device to continue, and we&apos;ll pick up right where you
        left off.
      </p>
    </div>
  );
}
