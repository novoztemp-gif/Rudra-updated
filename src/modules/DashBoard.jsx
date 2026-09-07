// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

import { formatCurrency, formatDate } from "../utils/formatters";
import { Stat } from "../components/ui/Stat";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Icons } from "../components/ui/Icons";

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
                key={row.id || row.invoiceNo || row.name || rowIndex}
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
                    {col.render ? col.render(row, rowIndex) : row[col.key]}
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

export const Dashboard = ({ invoices, products, purchases, dispatches = [] }) => {
  const totalSales = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalTax = invoices.reduce((s, i) => s + Number(i.totalTax || 0), 0);
  const totalPurchases = purchases.reduce((s, i) => s + Number(i.total || 0), 0);
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const grossMargin = totalSales - totalPurchases;
  const pendingDispatches = dispatches.filter(
    (d) => d.status !== "delivered"
  ).length;

  const recentInvoices = [...invoices]
    .sort((a, b) => {
      const bNo = Number(b.invoiceNo || 0);
      const aNo = Number(a.invoiceNo || 0);
      if (bNo !== aNo) return bNo - aNo;

      const bd = new Date(b.date || 0).getTime();
      const ad = new Date(a.date || 0).getTime();
      return bd - ad;
    })
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Total Sales"
          value={formatCurrency(totalSales)}
          icon={<Icons.chart size={16} />}
          sub="All invoices"
        />
        <Stat
          label="Invoices"
          value={invoices.length}
          icon={<Icons.receipt size={16} />}
          sub="Generated"
        />
        <Stat
          label="Low Stock"
          value={lowStock.length}
          icon={<Icons.alert size={16} />}
          sub="Below minimum"
        />
        <Stat
          label="Pending Dispatches"
          value={pendingDispatches}
          icon={<Icons.truck size={16} />}
          sub="Not delivered"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Tax Collected"
          value={formatCurrency(totalTax)}
          icon={<Icons.percent size={16} />}
          sub="Invoice tax"
        />
        <Stat
          label="Purchases"
          value={formatCurrency(totalPurchases)}
          icon={<Icons.cart size={16} />}
          sub="All purchases"
        />
        <Stat
          label="Products"
          value={products.length}
          icon={<Icons.box size={16} />}
          sub="Inventory items"
        />
        <Stat
          label="Approx Margin"
          value={formatCurrency(grossMargin)}
          icon={<Icons.chart size={16} />}
          sub="Sales - purchases"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Recent Invoices" actions={<Badge>{invoices.length} total</Badge>}>
          <StyledTable
            columns={[
              {
                key: "invoiceNo",
                label: "Invoice #",
                render: (r) => (
                  <span className="font-mono text-xs font-medium">{r.invoiceNo}</span>
                ),
              },
              {
                key: "date",
                label: "Date",
                render: (r) => formatDate(r.date),
              },
              {
                key: "total",
                label: "Amount",
                align: "right",
                render: (r) => (
                  <span className="font-semibold">{formatCurrency(r.total)}</span>
                ),
              },
            ]}
            data={recentInvoices}
            emptyMsg="No invoices yet"
          />
        </Card>

        <Card
          title="Stock Alerts"
          actions={
            <Badge variant={lowStock.length > 0 ? "danger" : "success"}>
              {lowStock.length} alerts
            </Badge>
          }
        >
          {lowStock.length === 0 ? (
            <EmptyState
              icon={<Icons.check size={32} />}
              title="All stocks healthy"
              description="No products below minimum level"
            />
          ) : (
            <StyledTable
              columns={[
                { key: "name", label: "Product" },
                {
                  key: "stock",
                  label: "Stock",
                  align: "right",
                  render: (r) => (
                    <span className="text-red-600 font-bold">
                      {r.stock} {r.unit}
                    </span>
                  ),
                },
                {
                  key: "minStock",
                  label: "Min",
                  align: "right",
                  render: (r) => `${r.minStock} ${r.unit}`,
                },
              ]}
              data={lowStock.slice(0, 5)}
              emptyMsg="No stock alerts"
            />
          )}
        </Card>
      </div>
    </div>
  );
};