export default function PageTitle({ children, subtitle }) {
  return (
    <div className="bg-gd-blue px-4 py-5 lg:px-8 lg:py-6">
      <h1 className="gd-title gd-brush text-xl text-white lg:text-2xl">{children}</h1>
      {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
    </div>
  );
}