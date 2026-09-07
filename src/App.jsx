import { useState, useCallback, useEffect } from "react";

import { COMPANY } from "./constants";

// Supabase
import { supabase } from "./lib/supabase";

// Supabase services
import * as productsService from "./services/products";
import * as customersService from "./services/customers";
import * as suppliersService from "./services/suppliers";
import * as transportersService from "./services/transporters";
import * as invoicesService from "./services/invoices";
import * as purchasesService from "./services/purchases";
import * as dispatchesService from "./services/dispatches";
// Pages
import { LoginPage } from "./pages/LoginPage";

// UI
import { Icons } from "./components/ui/Icons";
import { Toast } from "./components/ui/Toast";

// Modules
import { Dashboard } from "./modules/DashBoard";
import { CustomerModule } from "./modules/CustomerModule";
import { TransporterModule } from "./modules/TransporterModule";
import { ReportsModule } from "./modules/ReportsModule";
import { PurchaseModule } from "./modules/PurchaseModule";
import { InventoryModule } from "./modules/InventoryModule";
import { RetailInvoiceModule } from "./modules/RetailInvoiceModule";
import { AdvanceModule } from "./modules/AdvanceModule";
import { DispatchModule } from "./modules/DispatchModule";
// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: Icons.home },
  { key: "retail", label: "Retail Invoice", icon: Icons.receipt },
  { key: "advance", label: "Advance", icon: Icons.receipt },
  { key: "inventory", label: "Inventory", icon: Icons.box },
  { key: "purchase", label: "Purchase", icon: Icons.cart },
  { key: "customers", label: "Parties", icon: Icons.users },
  { key: "dispatch", label: "Dispatch", icon: Icons.truck },
  { key: "transporters", label: "Transporters", icon: Icons.truck },
  { key: "reports", label: "Reports", icon: Icons.chart },
];

export default function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App state
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State
  const [products, _setProducts] = useState([]);
  const [customers, _setCustomers] = useState([]);
  const [suppliers, _setSuppliers] = useState([]);
  const [transporters, _setTransporters] = useState([]);
  const [invoices, _setInvoices] = useState([]);
  const [purchases, _setPurchases] = useState([]);
  const [_gspConfig, _setGspConfig] = useState(null);
  const [dispatches, _setDispatches] = useState([]);

  //toast state
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "info",
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [prods, custs, supps, trans, invs, purs, disps] = await Promise.all([
          productsService.getAll(),
          customersService.getAll(),
          suppliersService.getAll(),
          transportersService.getAll(),
          invoicesService.getAll(),
          purchasesService.getAll(),
          dispatchesService.getAll(),
        ]);

        _setProducts(prods);
        _setCustomers(custs);
        _setSuppliers(supps);
        _setTransporters(trans);
        _setInvoices(invs);
        _setDispatches(disps);
        _setPurchases(purs);
        _setGspConfig({
          apiKey: "",
          apiSecret: "",
          gstin: COMPANY.gstin,
          ewbUsername: "",
          ewbPassword: "",
          environment: "sandbox",
          backendUrl: "",
        });
      } catch (err) {
        console.error("Failed to load data:", err);
        setError(err.message || "Failed to load data from database");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Persisted setters: wrap real state with Supabase sync
  const setProducts = async (updater) => {
    const prev = products;
    const rawNext = typeof updater === "function" ? updater(prev) : updater;

    const skipIds = new Set(
      rawNext.filter((item) => item?.__skipSync).map((item) => item.id)
    );

    const next = rawNext.map((item) => {
      const { __skipSync, ...clean } = item;
      return clean;
    });

    const prevMap = Object.fromEntries(prev.map((i) => [i.id, i]));
    const nextMap = Object.fromEntries(next.map((i) => [i.id, i]));

    try {
      for (const item of next) {
        if (skipIds.has(item.id)) continue;

        if (!prevMap[item.id]) {
          await productsService.create(item);
        } else if (JSON.stringify(item) !== JSON.stringify(prevMap[item.id])) {
          await productsService.update(item.id, item);
        }
      }

      for (const item of prev) {
        if (!nextMap[item.id]) {
          await productsService.delete_(item.id);
        }
      }
    } catch (err) {
      console.error("Product save error:", err);
      setError(err.message);
      return;
    }

    _setProducts(next);
  };

  const setCustomers = async (updater) => {
    const prev = customers;
    const next = typeof updater === "function" ? updater(prev) : updater;

    const prevMap = Object.fromEntries(prev.map((i) => [i.id, i]));
    const nextMap = Object.fromEntries(next.map((i) => [i.id, i]));

    try {
      for (const item of next) {
        if (!prevMap[item.id]) {
          await customersService.create(item);
        } else if (JSON.stringify(item) !== JSON.stringify(prevMap[item.id])) {
          await customersService.update(item.id, item);
        }
      }

      for (const item of prev) {
        if (!nextMap[item.id]) {
          await customersService.delete_(item.id);
        }
      }
    } catch (err) {
      console.error("Customer save error:", err);
      setError(err.message);
      return;
    }

    _setCustomers(next);
  };

  const setSuppliers = async (updater) => {
    const prev = suppliers;
    const next = typeof updater === "function" ? updater(prev) : updater;

    const prevMap = Object.fromEntries(prev.map((i) => [i.id, i]));
    const nextMap = Object.fromEntries(next.map((i) => [i.id, i]));

    try {
      for (const item of next) {
        if (!prevMap[item.id]) {
          await suppliersService.create(item);
        } else if (JSON.stringify(item) !== JSON.stringify(prevMap[item.id])) {
          await suppliersService.update(item.id, item);
        }
      }

      for (const item of prev) {
        if (!nextMap[item.id]) {
          await suppliersService.delete_(item.id);
        }
      }
    } catch (err) {
      console.error("Supplier save error:", err);
      setError(err.message);
      return;
    }

    _setSuppliers(next);
  };

  const setTransporters = async (updater) => {
    const prev = transporters;
    const next = typeof updater === "function" ? updater(prev) : updater;

    const prevMap = Object.fromEntries(prev.map((i) => [i.id, i]));
    const nextMap = Object.fromEntries(next.map((i) => [i.id, i]));

    try {
      for (const item of next) {
        if (!prevMap[item.id]) {
          await transportersService.create(item);
        } else if (JSON.stringify(item) !== JSON.stringify(prevMap[item.id])) {
          await transportersService.update(item.id, item);
        }
      }

      for (const item of prev) {
        if (!nextMap[item.id]) {
          await transportersService.delete_(item.id);
        }
      }
    } catch (err) {
      console.error("Transporter save error:", err);
      setError(err.message);
      return;
    }

    _setTransporters(next);
  };

  const setInvoices = async (updater) => {
  const prev = invoices;
  const rawNext = typeof updater === "function" ? updater(prev) : updater;

  const skipIds = new Set(
    rawNext.filter((item) => item?.__skipSync).map((item) => item.id)
  );

  const next = rawNext.map((item) => {
    const { __skipSync, ...clean } = item;
    return clean;
  });

  const prevMap = Object.fromEntries(prev.map((i) => [i.id, i]));
  const nextMap = Object.fromEntries(next.map((i) => [i.id, i]));

  try {
    for (const item of next) {
      if (skipIds.has(item.id)) continue;

      if (!prevMap[item.id]) {
        await invoicesService.create(item);
      } else if (JSON.stringify(item) !== JSON.stringify(prevMap[item.id])) {
        const changes = {};

        if (item.irn !== prevMap[item.id].irn) {
          changes.irn = item.irn;
          changes.ackNo = item.ackNo;
          changes.ackDate = item.ackDate;
          changes.signedInvoice = item.signedInvoice;
          changes.signedQRCode = item.signedQRCode;
          changes.jsonSigned = item.jsonSigned;
          await invoicesService.updateIRN(item.id, changes);
        } else if (item.ewayBillId !== prevMap[item.id].ewayBillId) {
          await invoicesService.updateEWB(item.id, item);
        } else {
          await invoicesService.update(item.id, item);
        }
      }
    }
  } catch (err) {
    console.error("Invoice save error:", err);
    setError(err.message);
    return;
  }

  _setInvoices(next);
};

  const setDispatches = async (updater) => {
    const prev = dispatches;
    const next = typeof updater === "function" ? updater(prev) : updater;

    const prevMap = Object.fromEntries(prev.map((i) => [i.id, i]));
    const nextMap = Object.fromEntries(next.map((i) => [i.id, i]));

    try {
      for (const item of next) {
        if (!prevMap[item.id]) {
          const created = await dispatchesService.create(item);
          item.id = created.id;
        } else if (JSON.stringify(item) !== JSON.stringify(prevMap[item.id])) {
          await dispatchesService.update(item.id, item);
        }
      }

      for (const item of prev) {
        if (!nextMap[item.id]) {
          await dispatchesService.delete_(item.id);
        }
      }
    } catch (err) {
      console.error("Dispatch save error:", err);
      setError(err.message);
      return;
    }

    _setDispatches(next);
  };

  const setPurchases = async (updater) => {
    const prev = purchases;
    const next = typeof updater === "function" ? updater(prev) : updater;

    const prevMap = Object.fromEntries(prev.map((i) => [i.id, i]));
    const nextMap = Object.fromEntries(next.map((i) => [i.id, i]));

    try {
      for (const item of next) {
        if (!prevMap[item.id]) {
          await purchasesService.create(item);
        } else if (JSON.stringify(item) !== JSON.stringify(prevMap[item.id])) {
          await purchasesService.update(item.id, item);
        }
      }

      for (const item of prev) {
        if (!nextMap[item.id]) {
          await purchasesService.delete_(item.id);
        }
      }
    } catch (err) {
      console.error("Purchase save error:", err);
      setError(err.message);
      return;
    }

    _setPurchases(next);
  };

  // Authentication handlers
  const handleLogin = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.user) {
        setUser(data.user);
      }
    } catch (err) {
      throw new Error(err.message || "Login failed");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      _setProducts([]);
      _setCustomers([]);
      _setSuppliers([]);
      _setTransporters([]);
      _setInvoices([]);
      _setDispatches([]);
      _setPurchases([]);
      setPage("dashboard");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navigate = useCallback((p) => {
    setPage(p);
    setSidebarOpen(false);
  }, []);

  //toast
  const showToast = useCallback((message, type = "info") => {
    setToast({
      open: true,
      message,
      type,
    });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  const currentNav = NAV_ITEMS.find((n) => n.key === page);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  if (authLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} isLoading={false} />;
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            invoices={invoices}
            products={products}
            purchases={purchases}
          />
        );

      case "retail":
        return (
          <RetailInvoiceModule
            products={products}
            setProducts={setProducts}
            customers={customers}
            setCustomers={setCustomers}
            invoices={invoices}
            showToast={showToast}
            setInvoices={setInvoices}
            company={COMPANY}
          />
        );

      case "advance":
        return (
          <AdvanceModule
            invoices={invoices}
            customers={customers}
            setInvoices={setInvoices}
            showToast={showToast}
          />
        );

      

      case "inventory":
        return <InventoryModule products={products} showToast={showToast} setProducts={setProducts} />;

      case "purchase":
        return (
          <PurchaseModule
            products={products}
            setProducts={setProducts}
            showToast={showToast}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            purchases={purchases}
            setPurchases={setPurchases}
          />
        );

      case "customers":
        return (
          <CustomerModule
            customers={customers}
            setCustomers={setCustomers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            showToast={showToast}
            invoices={invoices}
          />
        );

      case "dispatch":
        return (
          <DispatchModule
            invoices={invoices.filter((i) => i.invoiceType === "retail")}
            dispatches={dispatches}
            setDispatches={setDispatches}
            transporters={transporters}
            showToast={showToast}
          />
        );
      case "transporters":
        return (
          <TransporterModule
            transporters={transporters}
            showToast={showToast}
            setTransporters={setTransporters}
          />
        );

      case "reports":
        return (
          <ReportsModule
            invoices={invoices}
            products={products}
            purchases={purchases}
            customers={customers}
          />
        );

      default:
        return (
          <Dashboard
            invoices={invoices}
            products={products}
            purchases={purchases}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading POS System...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-brand-900 mb-2">
            Connection Error
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Check your Supabase credentials in the .env file
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-brand-900 text-white rounded-md hover:bg-brand-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-brand-900 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <div className="px-4 py-5 border-b border-white/10">
          <div className="text-[13px] font-semibold text-white tracking-wide leading-snug">
            RUDRA GRANITES
          </div>
          <div className="text-[13px] font-semibold text-accent-400 tracking-wide leading-snug">
            POS SYSTEM
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const IconComp = item.icon;
              const isActive = page === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-all border-l-2 ${isActive
                    ? "bg-white/10 text-white font-semibold border-accent-500"
                    : "text-brand-200 border-transparent hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <IconComp
                    size={16}
                    className={isActive ? "text-accent-400" : "text-brand-300"}
                  />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.key === "inventory" && lowStockCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      {lowStockCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Icons.menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-brand-900">
                {currentNav?.label || "Dashboard"}
              </h1>
              <p className="text-xs text-gray-400">{COMPANY.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-brand-900">
                {user?.email?.split("@")[0]}
              </p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-brand-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{renderPage()}</main>
        <Toast
          open={toast.open}
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      </div>
    </div>
  );
}