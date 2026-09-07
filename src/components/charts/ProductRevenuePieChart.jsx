import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
} from "recharts";
import { formatCurrency } from "../../utils/formatters";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "../../utils/chartTheme";

const MAX_SLICES = 6;

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, totalRevenue }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const pct = totalRevenue > 0 ? ((entry.value / totalRevenue) * 100).toFixed(1) : "0.0";
  return (
    <div style={CHART_TOOLTIP_STYLE.contentStyle} className="bg-white px-3 py-2">
      <div style={CHART_TOOLTIP_STYLE.labelStyle}>{entry.name}</div>
      <div className="text-sm font-semibold text-brand-900">
        {formatCurrency(entry.value)}
      </div>
      <div className="text-xs text-gray-500">{pct}% of revenue</div>
    </div>
  );
};

export const ProductRevenuePieChart = ({ productSales }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const { data, total } = useMemo(() => {
    const sorted = [...productSales].sort((a, b) => b.revenue - a.revenue);
    const top = sorted.slice(0, MAX_SLICES);
    const rest = sorted.slice(MAX_SLICES);
    const restRevenue = rest.reduce((s, p) => s + Number(p.revenue || 0), 0);

    const slices = top.map((p) => ({ name: p.name, value: Number(p.revenue || 0) }));
    if (restRevenue > 0) {
      slices.push({ name: `Others (${rest.length})`, value: restRevenue });
    }

    const totalValue = slices.reduce((s, d) => s + d.value, 0);
    return { data: slices, total: totalValue };
  }, [productSales]);

  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-gray-400">
        No product sales data
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-[260px] h-[260px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, idx) => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip totalRevenue={total} />} />
        </PieChart>
      </ResponsiveContainer>
      </div>

      <div className="flex-1 w-full space-y-1.5">
        {data.map((entry, idx) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
          return (
            <button
              key={entry.name}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                activeIndex === idx ? "bg-brand-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                />
                <span className="truncate text-gray-700">{entry.name}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-gray-400 text-xs">{pct}%</span>
                <span className="font-medium text-brand-900 tabular-nums">
                  {formatCurrency(entry.value)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
