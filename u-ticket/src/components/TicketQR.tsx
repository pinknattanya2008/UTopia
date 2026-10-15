/**
 * QR จำลองจากรหัสบัตร (deterministic, ไม่ได้สแกนได้จริง) — ไม่ต้องเพิ่ม dependency
 */
export default function TicketQR({ value, size = 96 }: { value: string; size?: number }) {
  const N = 21;
  let h = 2166136261;
  const bits: boolean[] = [];
  for (let i = 0; i < N * N; i++) {
    h = Math.imul(h ^ value.charCodeAt(i % value.length) ^ i, 16777619);
    bits.push(((h >>> 13) & 1) === 1);
  }
  const finder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    for (const [r0, c0] of [
      [0, 0],
      [0, N - 7],
      [N - 7, 0],
    ]) {
      if (inBox(r0, c0)) {
        const dr = Math.min(r - r0, r0 + 6 - r);
        const dc = Math.min(c - c0, c0 + 6 - c);
        const d = Math.min(dr, dc);
        return d === 0 || d >= 2;
      }
    }
    return null;
  };
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const f = finder(r, c);
      if (f ?? bits[r * N + c]) cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} />);
    }
  }
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} width={size} height={size} className="rounded-md bg-white" aria-label={`QR ${value}`}>
      <g fill="#000">{cells}</g>
    </svg>
  );
}
