/** Squelette affiché pendant le chargement d'une page. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="skeleton h-4 w-40 rounded-full" />
      <div className="skeleton mt-3 h-10 w-72 rounded-2xl" />
      <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[3/4] rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
            <div className="skeleton mt-2 h-3 w-3/4 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
