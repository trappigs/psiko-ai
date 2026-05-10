export function DisclaimerBanner() {
  return (
    <div className="bg-paper-deep border-b border-rule">
      <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center gap-2 text-[11px] tracking-wide text-muted">
        <span aria-hidden className="font-mono text-warn">※</span>
        <span>
          Yalnızca eğitim ve pratik amaçlıdır. AI danışan gerçek bir kişi değildir; üretilenler profesyonel süpervizyonun yerini tutmaz.
        </span>
      </div>
    </div>
  );
}
