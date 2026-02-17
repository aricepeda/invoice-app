import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Invoices from "@/pages/invoices";
import CreateInvoice from "@/pages/invoices/create";
import ViewInvoice from "@/pages/invoices/view";
import EditInvoice from "@/pages/invoices/edit";
import InvoicePayments from "@/pages/invoices/payments";
import PaymentReceipt from "@/pages/payments/receipt";
import Products from "@/pages/products";
import Sellers from "@/pages/sellers";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Suppliers from "@/pages/suppliers";
import PurchaseInvoices from "@/pages/purchase-invoices";
import PurchaseInvoicePayments from "@/pages/purchase-invoices/payments";
import NewSupplierPayment from "@/pages/supplier-payments/new";
import SupplierPaymentsPage from "@/pages/supplier-payments/index";
import NewCustomerPayment from "@/pages/customer-payments/new";
import CustomerPaymentsPage from "@/pages/customer-payments/index";
import ExpenseCategories from "@/pages/expense-categories";
import DGIIReports from "@/pages/dgii-reports";
import SalesReports from "@/pages/sales-reports";
import FinanceReports from "@/pages/finance-reports";
import PurchaseReports from "@/pages/purchase-reports";
import ReceivablesPayables from "@/pages/receivables-payables";
import InventoryReports from "@/pages/inventory-reports";
import Conduces from "@/pages/conduces";
import AdvancesPage from "@/pages/advances/index";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function RestrictedRoute({ component: Component, allowedRoles }: { component: React.ComponentType; allowedRoles: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!allowedRoles.includes(user?.role || "")) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Invoices} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/customers" component={() => <ProtectedRoute component={Customers} />} />
      <Route path="/invoices" component={() => <ProtectedRoute component={Invoices} />} />
      <Route path="/invoices/create" component={() => <ProtectedRoute component={CreateInvoice} />} />
      <Route path="/invoices/:id/edit" component={() => <ProtectedRoute component={EditInvoice} />} />
      <Route path="/invoices/:id/payments" component={() => <ProtectedRoute component={InvoicePayments} />} />
      <Route path="/invoices/:id" component={() => <ProtectedRoute component={ViewInvoice} />} />
      <Route path="/payments/:id/receipt" component={() => <ProtectedRoute component={PaymentReceipt} />} />
      <Route path="/customer-payments" component={() => <ProtectedRoute component={CustomerPaymentsPage} />} />
      <Route path="/customer-payments/new" component={() => <ProtectedRoute component={NewCustomerPayment} />} />
      <Route path="/advances" component={() => <ProtectedRoute component={AdvancesPage} />} />
      <Route path="/suppliers" component={() => <ProtectedRoute component={Suppliers} />} />
      <Route path="/purchase-invoices" component={() => <ProtectedRoute component={PurchaseInvoices} />} />
      <Route path="/purchase-invoices/:id/payments" component={() => <ProtectedRoute component={PurchaseInvoicePayments} />} />
      <Route path="/supplier-payments" component={() => <ProtectedRoute component={SupplierPaymentsPage} />} />
      <Route path="/supplier-payments/new" component={() => <ProtectedRoute component={NewSupplierPayment} />} />
      <Route path="/expense-categories" component={() => <ProtectedRoute component={ExpenseCategories} />} />
      <Route path="/products" component={() => <ProtectedRoute component={Products} />} />
      <Route path="/sellers" component={() => <ProtectedRoute component={Sellers} />} />
      <Route path="/reports" component={() => <RestrictedRoute component={Reports} allowedRoles={["admin", "contador"]} />} />
      <Route path="/dgii-reports" component={() => <RestrictedRoute component={DGIIReports} allowedRoles={["admin", "contador"]} />} />
      <Route path="/sales-reports" component={() => <RestrictedRoute component={SalesReports} allowedRoles={["admin", "contador"]} />} />
      <Route path="/finance-reports" component={() => <RestrictedRoute component={FinanceReports} allowedRoles={["admin", "contador"]} />} />
      <Route path="/purchase-reports" component={() => <RestrictedRoute component={PurchaseReports} allowedRoles={["admin", "contador"]} />} />
      <Route path="/receivables-payables" component={() => <RestrictedRoute component={ReceivablesPayables} allowedRoles={["admin", "contador"]} />} />
      <Route path="/inventory-reports" component={() => <RestrictedRoute component={InventoryReports} allowedRoles={["admin", "contador"]} />} />
      <Route path="/conduces" component={() => <ProtectedRoute component={Conduces} />} />
      <Route path="/settings" component={() => <RestrictedRoute component={Settings} allowedRoles={["admin", "contador"]} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
