import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Iqra School Office" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold">Iqra School Office</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to manage student fees.</p>
        <LoginForm />
      </div>
    </main>
  );
}
