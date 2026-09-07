import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency, formatDate } from "../../utils/formatters";
import {
  CHART_GRID_COLOR,
  CHART_AXIS_COLOR,
  CHART_TOOLTIP_STYLE,
} from "../../utils/chartTheme";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={CHART_TOOLTIP_STYLE.contentStyle}
      className="bg-white px-3 py-2"
    >
      <div style={CHART_TOOLTIP_STYLE.labelStyle}>{formatDate(label)}</div>
      <div className="text-xs text-gray-600 mt-1">
        {payload[0].payload.invoiceCount} invoice(s)
      </div>
      <div className="text-sm font-semibold text-brand-900">
        {formatCurrency(payload[0].value)}
      </div>
    </div>
  );
};

export const SalesTrendChart = ({ rows }) => {
  const [chartType, setChartType] = useState("bar");

  const data = useMemo(() => [...rows].reverse(), [rows]);

  return (
    <div>
      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-xs">
          <button
            onClick={() => setChartType("bar")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              chartType === "bar"
                ? "bg-brand-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`px-3 py-1.5 font-medium border-l border-gray-200 transition-colors ${
              chartType === "line"
                ? "bg-brand-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Line
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          No sales in selected period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatDate(d)}
                tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
                axisLine={{ stroke: CHART_GRID_COLOR }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, "")}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(14,27,44,0.05)" }} />
              <Bar dataKey="total" fill="#223a54" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatDate(d)}
                tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
                axisLine={{ stroke: CHART_GRID_COLOR }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, "")}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#c9a04a"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#c9a04a" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
};
