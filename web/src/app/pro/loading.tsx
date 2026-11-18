export default function ProfessionalLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
      <div className="h-24 animate-pulse rounded-2xl border border-[#DCE8E0] bg-white p-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl border border-[#DCE8E0] bg-white p-5"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-[#DCE8E0] bg-white p-6" />
    </div>
  );
}
