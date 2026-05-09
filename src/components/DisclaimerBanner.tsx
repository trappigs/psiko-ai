import { DISCLAIMER_BANNER } from '@/lib/disclaimer';

export function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 p-3 text-sm text-amber-900 text-center">
      {DISCLAIMER_BANNER}
    </div>
  );
}
