export default function BrandMark({ variant = "light" }) {
  const color = variant === "light" ? "text-white" : "text-gd-blue";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gd-yellow font-heading text-lg font-extrabold text-gd-blue">
        GD
      </div>
      <div className={`font-heading text-sm font-bold leading-tight ${color}`}>
        GONNIN-DURIS
        <div className="text-[10px] font-medium opacity-70">Prospection</div>
      </div>
    </div>
  );
}
