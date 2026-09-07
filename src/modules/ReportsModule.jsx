// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 10: REPORTS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Tabs } from "../components/ui/Tabs";
import { Icons } from "../components/ui/Icons";
import { SalesTrendChart } from "../components/charts/SalesTrendChart";
import { ProductRevenuePieChart } from "../components/charts/ProductRevenuePieChart";

const parseDateSafe = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const startOfWeek = (d) => {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfWeek = (d) => {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
};

const startOfMonth = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfMonth = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
};

const percentTrend = (current, previous) => {
  if (!previous || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
};

const TrendText = ({ value }) => {
  if (value === null || Number.isNaN(value)) {
    return <span className="text-xs text-gray-400">No previous data</span>;
  }

  const positive = value >= 0;
  return (
    <span
      className={`text-xs font-medium ${
        positive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
};

const MetricCard = ({ label, value, icon, sub, trend }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-2 text-xl font-semibold text-brand-900">{value}</p>
        <div className="mt-2 flex items-center gap-2">
          <TrendText value={trend} />
          {sub ? <span className="text-xs text-gray-400">{sub}</span> : null}
        </div>
      </div>
      <div className="rounded-lg bg-brand-50 p-2 text-brand-700">{icon}</div>
    </div>
  </div>
);

const StyledTable = ({ columns, data, emptyMsg = "No data available" }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-brand-50/60 border-b border-gray-200">
            {columns.map((col, idx) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-semibold text-brand-800 border-b border-gray-200 ${
                  idx !== columns.length - 1 ? "border-r border-gray-200" : ""
                } ${col.align === "right" ? "text-right" : ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500"
              >
                {emptyMsg}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={
                  row.id ||
                  row.invoiceNo ||
                  row.purchaseNo ||
                  row.name ||
                  row.date ||
                  rowIndex
                }
                className="bg-white hover:bg-brand-50/40"
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 border-b border-gray-100 ${
                      colIndex !== columns.length - 1
                        ? "border-r border-gray-100"
                        : ""
                    } ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export const ReportsModule = ({ invoices, products, purchases, customers = [] }) => {
  const [tab, setTab] = useState("sales");
  const [range, setRange] = useState("this_month");

  const now = new Date();

  const ranges = useMemo(() => {
    const current = {};
    const previous = {};

    if (range === "today") {
      current.start = startOfDay(now);
      current.end = endOfDay(now);

      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      previous.start = startOfDay(y);
      previous.end = endOfDay(y);
    } else if (range === "this_week") {
      current.start = startOfWeek(now);
      current.end = endOfWeek(now);

      const prevWeekDate = new Date(now);
      prevWeekDate.setDate(prevWeekDate.getDate() - 7);
      previous.start = startOfWeek(prevWeekDate);
      previous.end = endOfWeek(prevWeekDate);
    } else if (range === "this_month") {
      current.start = startOfMonth(now);
      current.end = endOfMonth(now);

      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previous.start = startOfMonth(prevMonthDate);
      previous.end = endOfMonth(prevMonthDate);
    } else {
      current.start = null;
      current.end = null;
      previous.start = null;
      previous.end = null;
    }

    return { current, previous };
  }, [range, now]);

  const inRange = (dateValue, start, end) => {
    const d = parseDateSafe(dateValue);
    if (!d) return false;
    if (!start || !end) return true;
    return d >= start && d <= end;
  };

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((i) => inRange(i.date, ranges.current.start, ranges.current.end))
      .sort((a, b) => {
        const bd = parseDateSafe(b.date)?.getTime() || 0;
        const ad = parseDateSafe(a.date)?.getTime() || 0;
        return bd - ad;
      });
  }, [invoices, ranges]);

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => inRange(p.date, ranges.current.start, ranges.current.end))
      .sort((a, b) => {
        const bd = parseDateSafe(b.date)?.getTime() || 0;
        const ad = parseDateSafe(a.date)?.getTime() || 0;
        return bd - ad;
      });
  }, [purchases, ranges]);

  const previousInvoices = useMemo(() => {
    if (!ranges.previous.start || !ranges.previous.end) return [];
    return invoices.filter((i) =>
      inRange(i.date, ranges.previous.start, ranges.previous.end)
    );
  }, [invoices, ranges]);

  const previousPurchases = useMemo(() => {
    if (!ranges.previous.start || !ranges.previous.end) return [];
    return purchases.filter((p) =>
      inRange(p.date, ranges.previous.start, ranges.previous.end)
    );
  }, [purchases, ranges]);

  const totalSales = filteredInvoices.reduce(
    (s, i) => s + Number(i.total || 0),
    0
  );
  const totalPurchases = filteredPurchases.reduce(
    (s, i) => s + Number(i.total || 0),
    0
  );
  const totalTax = filteredInvoices.reduce(
    (s, i) => s + Number(i.totalTax || 0),
    0
  );
  const avgInvoice = filteredInvoices.length
    ? totalSales / filteredInvoices.length
    : 0;

  const previousSales = previousInvoices.reduce(
    (s, i) => s + Number(i.total || 0),
    0
  );
  const previousGross =
    previousInvoices.reduce((s, i) => s + Number(i.total || 0), 0) -
    previousPurchases.reduce((s, i) => s + Number(i.total || 0), 0);

  const salesTrend = percentTrend(totalSales, previousSales);
  const grossProfit = totalSales - totalPurchases;
  const grossTrend = percentTrend(grossProfit, previousGross);

  const productSales = useMemo(() => {
    const map = {};

    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        if (!map[item.productId || item.name]) {
          const prod = products.find((p) => p.id === item.productId);
          map[item.productId || item.name] = {
            id: item.productId || item.name,
            name: item.name,
            category: prod?.category || "—",
            qtySold: 0,
            revenue: 0,
            currentStock: prod?.stock ?? 0,
            unit: item.unit || prod?.unit || "",
          };
        }

        map[item.productId || item.name].qtySold += Number(item.qty || 0);
        map[item.productId || item.name].revenue += Number(item.amount || 0);
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices, products]);

  const totalProductSalesRevenue = productSales.reduce(
    (sum, p) => sum + Number(p.revenue || 0),
    0
  );

  const totalProductQtySold = productSales.reduce(
    (sum, p) => sum + Number(p.qtySold || 0),
    0
  );

  const purchaseByProduct = useMemo(() => {
    const map = {};
    filteredPurchases.forEach((pur) => {
      (pur.items || []).forEach((item) => {
        const key = item.productId || item.name;
        map[key] = (map[key] || 0) + Number(item.qty || 0);
      });
    });
    return map;
  }, [filteredPurchases]);

  const soldByProduct = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const key = item.productId || item.name;
        map[key] = (map[key] || 0) + Number(item.qty || 0);
      });
    });
    return map;
  }, [filteredInvoices]);

  const stockRows = useMemo(() => {
    return products.map((p) => ({
      ...p,
      purchasedQty: purchaseByProduct[p.id] || 0,
      soldQty: soldByProduct[p.id] || 0,
    }));
  }, [products, purchaseByProduct, soldByProduct]);

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const topProduct = productSales[0] || null;

  const customerSalesMap = {};
  filteredInvoices.forEach((inv) => {
    const key = inv.customerId || "unknown";
    customerSalesMap[key] =
      (customerSalesMap[key] || 0) + Number(inv.total || 0);
  });

  const topCustomerAmount = Math.max(0, ...Object.values(customerSalesMap));
  const topCustomerEntry = Object.entries(customerSalesMap).find(
    ([, value]) => value === topCustomerAmount
  );
  const topCustomerName = topCustomerEntry
    ? customers.find((c) => c.id === topCustomerEntry[0])?.name || "Unknown Customer"
    : null;

  const dailySalesRows = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((inv) => {
      const key = inv.date;
      if (!map[key]) {
        map[key] = {
          date: inv.date,
          invoiceCount: 0,
          taxable: 0,
          tax: 0,
          total: 0,
        };
      }
      map[key].invoiceCount += 1;
      map[key].taxable += Number(inv.subtotal || 0);
      map[key].tax += Number(inv.totalTax || 0);
      map[key].total += Number(inv.total || 0);
    });

    return Object.values(map).sort((a, b) => {
      const bd = parseDateSafe(b.date)?.getTime() || 0;
      const ad = parseDateSafe(a.date)?.getTime() || 0;
      return bd - ad;
    });
  }, [filteredInvoices]);

  const rangeLabel =
    range === "today"
      ? "vs yesterday"
      : range === "this_week"
      ? "vs last week"
      : range === "this_month"
      ? "vs last month"
      : "";

  return (
    <div>
      <Tabs
        tabs={[
          { key: "sales", label: "Sales" },
          { key: "product", label: "Product Sales" },
          { key: "stock", label: "Stock Status" },
          { key: "profit", label: "Profit Analysis" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4 mb-4 flex flex-wrap items-center gap-2">
        {[
          { key: "today", label: "Today" },
          { key: "this_week", label: "This Week" },
          { key: "this_month", label: "This Month" },
          { key: "all", label: "All Time" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              range === opt.key
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "sales" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                label="Total Sales"
                value={formatCurrency(totalSales)}
                icon={<Icons.chart size={16} />}
                trend={salesTrend}
                sub={rangeLabel}
              />
              <MetricCard
                label="Invoices"
                value={filteredInvoices.length}
                icon={<Icons.receipt size={16} />}
                trend={null}
                sub="Selected period"
              />
              <MetricCard
                label="Avg Invoice"
                value={formatCurrency(avgInvoice)}
                icon={<Icons.receipt size={16} />}
                trend={null}
                sub="Selected period"
              />
              <MetricCard
                label="Tax Collected"
                value={formatCurrency(totalTax)}
                icon={<Icons.percent size={16} />}
                trend={null}
                sub="Selected period"
              />
            </div>

            <Card title="Sales Trend">
              <div className="p-4">
                <SalesTrendChart rows={dailySalesRows} />
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card title="Top Insight">
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-brand-50/50 p-3">
                    <div className="text-xs text-gray-500">Top Product</div>
                    <div className="mt-1 font-semibold text-brand-900">
                      {topProduct?.name || "—"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {topProduct
                        ? `${topProduct.qtySold.toFixed(2)} sold · ${formatCurrency(
                            topProduct.revenue
                          )}`
                        : "No sales yet"}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-brand-50/50 p-3">
                    <div className="text-xs text-gray-500">Top Customer</div>
                    <div className="mt-1 font-semibold text-brand-900">
                      {topCustomerName || "—"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {topCustomerEntry
                        ? formatCurrency(topCustomerEntry[1])
                        : "No invoice data"}
                    </div>
                  </div>
                </div>
              </Card>

              <div className="lg:col-span-2">
                <Card title="Daily Sales Summary">
                  <StyledTable
                    columns={[
                      {
                        key: "date",
                        label: "Date",
                        render: (r) => formatDate(r.date),
                      },
                      {
                        key: "invoiceCount",
                        label: "Invoices",
                        align: "right",
                      },
                      {
                        key: "taxable",
                        label: "Taxable",
                        align: "right",
                        render: (r) => formatCurrency(r.taxable),
                      },
                      {
                        key: "tax",
                        label: "Tax",
                        align: "right",
                        render: (r) => formatCurrency(r.tax),
                      },
                      {
                        key: "total",
                        label: "Total",
                        align: "right",
                        render: (r) => (
                          <span className="font-semibold">
                            {formatCurrency(r.total)}
                          </span>
                        ),
                      },
                    ]}
                    data={dailySalesRows}
                    emptyMsg="No sales in selected period"
                  />
                </Card>
              </div>
            </div>

            <Card title="Invoice Sales List">
              <StyledTable
                columns={[
                  {
                    key: "invoiceNo",
                    label: "Invoice #",
                    render: (r) => (
                      <span className="font-mono font-medium">{r.invoiceNo}</span>
                    ),
                  },
                  {
                    key: "date",
                    label: "Date",
                    render: (r) => formatDate(r.date),
                  },
                  {
                    key: "subtotal",
                    label: "Taxable",
                    align: "right",
                    render: (r) => formatCurrency(r.subtotal),
                  },
                  {
                    key: "totalTax",
                    label: "Tax",
                    align: "right",
                    render: (r) => formatCurrency(r.totalTax),
                  },
                  {
                    key: "total",
                    label: "Total",
                    align: "right",
                    render: (r) => (
                      <span className="font-semibold">
                        {formatCurrency(r.total)}
                      </span>
                    ),
                  },
                ]}
                data={filteredInvoices}
                emptyMsg="No invoices in selected period"
              />
            </Card>
          </div>
        )}

        {tab === "product" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                label="Products Sold"
                value={productSales.length}
                icon={<Icons.box size={16} />}
                trend={null}
                sub="Distinct products"
              />
              <MetricCard
                label="Total Product Sales"
                value={formatCurrency(totalProductSalesRevenue)}
                icon={<Icons.chart size={16} />}
                trend={null}
                sub="Selected period"
              />
              <MetricCard
                label="Total Quantity Sold"
                value={totalProductQtySold.toFixed(2)}
                icon={<Icons.box size={16} />}
                trend={null}
                sub="All sold items"
              />
              <MetricCard
                label="Top Product"
                value={topProduct ? formatCurrency(topProduct.revenue) : "—"}
                icon={<Icons.chart size={16} />}
                trend={null}
                sub={topProduct ? topProduct.name : "No data"}
              />
            </div>

            <Card title="Revenue Share by Product">
              <div className="p-4">
                <ProductRevenuePieChart productSales={productSales} />
              </div>
            </Card>

            <Card title="Product-wise Sales">
              <StyledTable
                columns={[
                  { key: "name", label: "Product" },
                  { key: "category", label: "Category" },
                  {
                    key: "qtySold",
                    label: "Qty Sold",
                    align: "right",
                    render: (r) => r.qtySold.toFixed(2),
                  },
                  {
                    key: "currentStock",
                    label: "Current Stock",
                    align: "right",
                    render: (r) => `${r.currentStock} ${r.unit || ""}`,
                  },
                  {
                    key: "revenue",
                    label: "Revenue",
                    align: "right",
                    render: (r) => (
                      <span className="font-semibold">
                        {formatCurrency(r.revenue)}
                      </span>
                    ),
                  },
                ]}
                data={productSales}
                emptyMsg="No product sales data"
              />
            </Card>
          </div>
        )}

        {tab === "stock" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Low Stock Items"
                value={lowStockCount}
                icon={<Icons.alert size={16} />}
                trend={null}
                sub="Need attention"
              />
              <MetricCard
                label="Products Tracked"
                value={products.length}
                icon={<Icons.box size={16} />}
                trend={null}
                sub="Inventory items"
              />
              <MetricCard
                label="Purchased Items"
                value={filteredPurchases.length}
                icon={<Icons.cart size={16} />}
                trend={null}
                sub="Purchase entries"
              />
            </div>

            <Card title="Stock Status & Movement">
              <StyledTable
                columns={[
                  { key: "name", label: "Product" },
                  { key: "category", label: "Category" },
                  {
                    key: "purchasedQty",
                    label: "Purchased",
                    align: "right",
                    render: (r) =>
                      `${Number(r.purchasedQty || 0).toFixed(2)} ${r.unit}`,
                  },
                  {
                    key: "soldQty",
                    label: "Sold",
                    align: "right",
                    render: (r) =>
                      `${Number(r.soldQty || 0).toFixed(2)} ${r.unit}`,
                  },
                  {
                    key: "stock",
                    label: "Current Stock",
                    align: "right",
                    render: (r) => (
                      <span
                        className={
                          r.stock <= r.minStock
                            ? "text-red-600 font-bold"
                            : "font-medium text-gray-800"
                        }
                      >
                        {r.stock} {r.unit}
                      </span>
                    ),
                  },
                  {
                    key: "minStock",
                    label: "Min Stock",
                    align: "right",
                    render: (r) => `${r.minStock} ${r.unit}`,
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (r) =>
                      r.stock <= r.minStock ? (
                        <Badge variant="danger">Low</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      ),
                  },
                ]}
                data={stockRows}
                emptyMsg="No stock data"
              />
            </Card>
          </div>
        )}

        {tab === "profit" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                label="Total Revenue"
                value={formatCurrency(totalSales)}
                icon={<Icons.chart size={16} />}
                trend={salesTrend}
                sub={rangeLabel}
              />
              <MetricCard
                label="Total Purchases"
                value={formatCurrency(totalPurchases)}
                icon={<Icons.cart size={16} />}
                trend={null}
                sub="Selected period"
              />
              <MetricCard
                label="Approx Gross Margin"
                value={formatCurrency(grossProfit)}
                icon={<Icons.chart size={16} />}
                trend={grossTrend}
                sub={rangeLabel}
              />
              <MetricCard
                label="Low Stock Items"
                value={lowStockCount}
                icon={<Icons.alert size={16} />}
                trend={null}
                sub="Need attention"
              />
            </div>

            <Card title="Purchase Report">
              <StyledTable
                columns={[
                  {
                    key: "purchaseNo",
                    label: "Purchase #",
                    render: (r) => (
                      <span className="font-mono font-medium">{r.purchaseNo}</span>
                    ),
                  },
                  {
                    key: "date",
                    label: "Date",
                    render: (r) => formatDate(r.date),
                  },
                  { key: "supplierName", label: "Supplier" },
                  {
                    key: "items",
                    label: "Items",
                    align: "right",
                    render: (r) => `${(r.items || []).length} item(s)`,
                  },
                  {
                    key: "total",
                    label: "Amount",
                    align: "right",
                    render: (r) => formatCurrency(r.total),
                  },
                ]}
                data={filteredPurchases}
                emptyMsg="No purchases in selected period"
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};