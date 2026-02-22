import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const Sparkline = ({ points }: { points: number[] }) => (
  <div className="mt-3 flex h-11 items-end gap-1">
    {points.map((point, index) => (
      <div key={`${index}-${point}`} className="w-4 rounded-sm bg-brand/35" style={{ height: `${point}%` }} />
    ))}
  </div>
);

export const MarketCard = ({
  id,
  title,
  provider,
  category,
  price,
  metric
}: {
  id: string;
  title: string;
  provider: string;
  category: string;
  price: number;
  metric: string;
}) => (
  <Card className="panel-hover p-4">
    <div className="flex items-center justify-between">
      <Badge variant="info">{category}</Badge>
      <span className="text-xs text-textMuted">7d {metric}</span>
    </div>
    <Link
      href={`/datasets/${id}`}
      className="mt-3 block text-[28px] leading-8 font-semibold tracking-[-0.01em] hover:text-brand"
    >
      {title}
    </Link>
    <p className="mt-2 text-sm text-textMuted">{provider}</p>
    <Sparkline points={[30, 45, 40, 60, 55, 72, 78]} />
    <p className="mt-3 text-base font-semibold">{formatCurrency(price)} / yr</p>
  </Card>
);
