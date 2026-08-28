export function PlaceholderPage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm text-slate-500">{hint}</p>
      </div>
    </div>
  )
}