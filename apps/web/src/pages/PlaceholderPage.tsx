export function PlaceholderPage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold dark:text-slate-100">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
    </div>
  )
}