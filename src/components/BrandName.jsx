const COLORS = {
  patna: 'text-[#E59700]',       // gold
  business: 'text-[#304878]',    // navy
  directory: 'text-[#D64545]',   // red
  bihar: 'text-[#168A63]',       // green
};

export default function BrandName({ variant = 'stacked', className = '' }) {
  if (variant === 'inline') {
    return (
      <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
        <span className={`font-extrabold ${COLORS.patna}`}>Patna</span>
        <span className={`font-extrabold ${COLORS.business}`}>Business</span>
        <span className={`font-extrabold ${COLORS.directory}`}>Directory</span>
        <span className={`font-semibold ${COLORS.bihar}`}>• Bihar</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span className="whitespace-nowrap text-sm font-extrabold tracking-tight md:text-[15px]">
        <span className={COLORS.patna}>Patna</span>{' '}
        <span className={COLORS.business}>Business</span>
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
        <span className={COLORS.directory}>Directory</span>
        <span className="px-1 text-[#E59700]/60">•</span>
        <span className={COLORS.bihar}>Bihar</span>
      </span>
    </span>
  );
}
