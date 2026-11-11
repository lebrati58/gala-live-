'use client';
// Briques visuelles du thème « Qui veut gagner des millions ».
export const LETTERS = ['A', 'B', 'C', 'D'];

export function MilLogo({ size }: { size: number }) {
  return <span className="mil-logo" style={{ width: size, height: size }}><img src="/logo-ee-israel.svg" alt="EE Israël" /></span>;
}

type LozState = '' | 'locked' | 'correct' | 'dim';
export function Lozenge({ children, state = '', onClick, disabled, question = false, tip, className = '', label }: {
  children: React.ReactNode; state?: LozState; onClick?: () => void; disabled?: boolean; question?: boolean; tip?: number; className?: string; label?: string;
}) {
  const cls = `mil-loz ${question ? 'q' : ''} ${state} ${className}`;
  const style = tip ? ({ ['--tip' as string]: tip + 'px' } as React.CSSProperties) : undefined;
  if (onClick) return <button type="button" className={cls} style={style} onClick={onClick} disabled={disabled} aria-label={label}><span className="mil-in">{children}</span></button>;
  return <div className={cls} style={style}><div className="mil-in">{children}</div></div>;
}

export function Ring({ remaining, total, size }: { remaining: number; total: number; size: number }) {
  const r = 42, c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const state = remaining <= 5 ? 'danger' : remaining <= 10 ? 'warn' : '';
  return (
    <div className={'mil-ring ' + state} style={{ width: size, height: size }} role="timer" aria-label={`${remaining} s`}>
      <svg viewBox="0 0 100 100" aria-hidden><circle className="track" cx="50" cy="50" r={r} /><circle className="prog" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - frac)} /></svg>
      <b style={{ fontSize: size * 0.4 }}>{remaining}</b>
    </div>
  );
}
