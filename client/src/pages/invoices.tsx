import { Layout } from "@/components/layout";
import { cn, getLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Plus, 
  Download, 
  FileText, 
  Trash2, 
  Wallet, 
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  XCircle,
  Calendar,
  Pencil,
  Check,
  ChevronsUpDown,
  PackagePlus
} from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Link, useLocation } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import type { Invoice, Customer, Payment, Product, TaxSettings, Seller } from "@shared/schema";

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  overdue: "bg-rose-100 text-rose-700 hover:bg-rose-100",
  cancelled: "bg-gray-100 text-gray-500 hover:bg-gray-100",
};

const statusLabels = {
  paid: "Pagada",
  pending: "Pendiente",
  overdue: "Vencida",
  cancelled: "Anulada",
};

type StatusFilter = "pending" | "paid" | "cancelled" | "overdue";

const statusFilterLabels: Record<StatusFilter, string> = {
  pending: "Pendientes",
  paid: "Pagadas",
  cancelled: "Anuladas",
  overdue: "Vencidas",
};

interface InvoiceRowProps {
  invoice: Invoice;
  getCustomerName: (customerId: number) => string;
  formatDate: (date: string) => string;
  balance: string;
  handleQuickPayment: (invoice: Invoice, balance: number) => void;
  handleCancelInvoice: (invoiceId: number) => void;
  handleCancelPayment: (payment: Payment) => void;
}

function InvoiceRow({ invoice, getCustomerName, formatDate, balance, handleQuickPayment, handleCancelInvoice, handleCancelPayment }: InvoiceRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["invoicePayments", invoice.id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoice.id}/payments`);
      if (!response.ok) return [];
      return response.json() as Promise<Payment[]>;
    },
  });

  const balanceValue = parseFloat(balance || String(invoice.total));
  const hasPayments = payments.length > 0;

  const formatPaymentDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'transferencia': return 'Transferencia';
      case 'cheque': return 'Cheque';
      case 'tarjeta': return 'Tarjeta de Crédito';
      default: return method;
    }
  };

  const getDisplayBadge = () => {
    if (invoice.status === 'cancelled') {
      return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 font-medium border-none rounded-lg px-3">Anulada</Badge>;
    }
    if (balanceValue <= 0) {
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-medium border-none rounded-lg px-3">Pagada</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-medium border-none rounded-lg px-3">Pendiente</Badge>;
  };

  return (
    <>
      <TableRow
        className={`group cursor-pointer hover:bg-secondary/20 transition-colors ${invoice.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}
        data-testid={`row-invoice-${invoice.id}`}
        onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}
      >
        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
          {hasPayments ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`button-expand-${invoice.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-blue-600" />
              )}
            </Button>
          ) : (
            <div className="w-6 h-6" />
          )}
        </TableCell>
        <TableCell className="text-center font-medium">
          {invoice.invoiceNumber}
        </TableCell>
        <TableCell className="text-center">{getCustomerName(invoice.customerId)}</TableCell>
        <TableCell className="text-center">{formatDate(invoice.date)}</TableCell>
        <TableCell className="text-center">
          {invoice.ncf || "—"}
        </TableCell>
        <TableCell className="text-center">
          RD$ {parseFloat(String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="text-center">
          RD$ {balanceValue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="text-center">
          {getDisplayBadge()}
        </TableCell>
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                invoice.status !== 'cancelled' && balanceValue > 0
                  ? 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              onClick={() => {
                if (invoice.status !== 'cancelled' && balanceValue > 0) {
                  handleQuickPayment(invoice, balanceValue);
                }
              }}
              disabled={invoice.status === 'cancelled' || balanceValue <= 0}
              title={invoice.status === 'cancelled' ? 'Factura anulada' : balanceValue <= 0 ? 'Factura pagada' : 'Registrar pago'}
              data-testid={`button-quick-payment-${invoice.id}`}
            >
              <Wallet className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                invoice.status !== 'cancelled'
                  ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              onClick={() => {
                if (invoice.status !== 'cancelled') {
                  handleCancelInvoice(invoice.id);
                }
              }}
              disabled={invoice.status === 'cancelled'}
              title={invoice.status === 'cancelled' ? 'Factura ya anulada' : 'Anular factura'}
              data-testid={`button-cancel-invoice-${invoice.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && hasPayments && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={9} className="p-0">
            <div className="px-8 py-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Historial de Pagos ({payments.length})
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs">
                    <TableHead className="h-8 text-xs text-center">No. Recibo</TableHead>
                    <TableHead className="h-8 text-xs text-center">Fecha</TableHead>
                    <TableHead className="h-8 text-xs text-center">Método</TableHead>
                    <TableHead className="h-8 text-xs text-center">Referencia</TableHead>
                    <TableHead className="h-8 text-xs text-center">Monto</TableHead>
                    <TableHead className="h-8 text-xs text-center w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="text-xs group" data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="py-2 text-center font-medium">{payment.receiptNumber || `#${payment.id}`}</TableCell>
                      <TableCell className="py-2 text-center">{formatPaymentDate(payment.date)}</TableCell>
                      <TableCell className="py-2 text-center">{getPaymentMethodLabel(payment.method || 'efectivo')}</TableCell>
                      <TableCell className="py-2 text-center">{payment.reference || "—"}</TableCell>
                      <TableCell className="py-2 text-center font-medium text-emerald-600">
                        RD$ {parseFloat(String(payment.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleCancelPayment(payment)}
                          title="Anular pago"
                          data-testid={`button-cancel-payment-${payment.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

interface QuickInvoiceItem {
  productId: number | null;
  description: string;
  quantity: number;
  price: number;
  tax: number;
}

export default function Invoices() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [balances, setBalances] = useState<{ [invoiceId: number]: string }>({});
  const [selectedStatuses, setSelectedStatuses] = useState<StatusFilter[]>(["pending", "paid"]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  
  // Quick payment state
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [quickPaymentInvoice, setQuickPaymentInvoice] = useState<Invoice | null>(null);
  const [quickPaymentBalance, setQuickPaymentBalance] = useState(0);
  const [quickPaymentData, setQuickPaymentData] = useState({
    amount: "",
    method: "efectivo",
    reference: "",
    date: getLocalDateString(new Date()),
    dateDisplay: "",
  });

  const [quickInvoiceOpen, setQuickInvoiceOpen] = useState(false);
  const [quickInvoiceDate, setQuickInvoiceDate] = useState(getLocalDateString());
  const [quickInvoiceDateDisplay, setQuickInvoiceDateDisplay] = useState("");
  const [quickInvoiceCustomerId, setQuickInvoiceCustomerId] = useState<number | null>(null);
  const [quickInvoiceCustomerPopoverOpen, setQuickInvoiceCustomerPopoverOpen] = useState(false);
  const [quickInvoiceNcfType, setQuickInvoiceNcfType] = useState<string>("");
  const [quickInvoiceItems, setQuickInvoiceItems] = useState<QuickInvoiceItem[]>([]);
  const [quickInvoiceEditingIndex, setQuickInvoiceEditingIndex] = useState<number | null>(null);
  const [quickInvoiceNotes, setQuickInvoiceNotes] = useState("");
  const [quickInvoiceSellerId, setQuickInvoiceSellerId] = useState<number | null>(null);
  const [quickInvoiceSellerPopoverOpen, setQuickInvoiceSellerPopoverOpen] = useState(false);
  const [quickInvoiceCustomerBoxOpen, setQuickInvoiceCustomerBoxOpen] = useState(true);
  const [quickInvoiceProductSearchOpen, setQuickInvoiceProductSearchOpen] = useState(false);
  const [quickInvoiceNewRowSearch, setQuickInvoiceNewRowSearch] = useState("");
  const quickInvoiceDescriptionRef = useRef<HTMLInputElement>(null);
  const quickInvoiceNewRowRef = useRef<HTMLInputElement>(null);
  const quickInvoiceQuantityRef = useRef<HTMLInputElement>(null);
  const quickInvoiceDropdownInteracting = useRef(false);
  const quickInvoiceDialogRef = useRef<HTMLDivElement>(null);
  const [quickInvoiceCloseConfirmOpen, setQuickInvoiceCloseConfirmOpen] = useState(false);
  const [quickInvoiceDiscountType, setQuickInvoiceDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [quickInvoiceDiscountValue, setQuickInvoiceDiscountValue] = useState("");
  const [quickInvoiceDiscountConfirmed, setQuickInvoiceDiscountConfirmed] = useState(false);

  const toDisplayDate = (isoDate: string) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  };

  const toISODate = (displayDate: string) => {
    const parts = displayDate.split("/");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;
    const d = parseInt(day), m = parseInt(month), y = parseInt(year);
    if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12) return null;
    return `${year}-${month}-${day}`;
  };

  const formatDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length === 8) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      const d = parseInt(day), m = parseInt(month), y = parseInt(year);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${day}/${month}/${year}`;
      }
    }
    return digits;
  };

  const [startDateDisplay, setStartDateDisplay] = useState(toDisplayDate(customStartDate) || "");
  const [endDateDisplay, setEndDateDisplay] = useState(toDisplayDate(customEndDate) || "");

  const toggleStatusFilter = (status: StatusFilter) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const response = await fetch("/api/invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json() as Promise<Product[]>;
    },
  });

  const { data: taxSettings } = useQuery({
    queryKey: ["taxSettings"],
    queryFn: async () => {
      const response = await fetch("/api/tax-settings");
      if (!response.ok) throw new Error("Failed to fetch tax settings");
      return response.json() as Promise<TaxSettings | null>;
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers"],
    queryFn: async () => {
      const response = await fetch("/api/sellers");
      if (!response.ok) return [];
      return response.json() as Promise<Seller[]>;
    },
  });

  const { data: ncfSequences = [] } = useQuery({
    queryKey: ["ncfSequences"],
    queryFn: async () => {
      const response = await fetch("/api/ncf-sequences");
      if (!response.ok) return [];
      return response.json() as Promise<Array<{ id: number; type: string; prefix: string; label?: string; status: string; currentNumber: number }>>;
    },
  });

  const { data: nextInvoiceNumber } = useQuery({
    queryKey: ["nextInvoiceNumber"],
    queryFn: async () => {
      const response = await fetch("/api/next-invoice-number");
      if (!response.ok) throw new Error("Failed to fetch next invoice number");
      return response.json() as Promise<{ nextNumber: number }>;
    },
  });

  const useNcf = !!quickInvoiceNcfType;
  const defaultTaxRate = taxSettings?.rate ? parseFloat(String(taxSettings.rate)) : 18;

  const quickInvoiceTotalTax = useNcf ? quickInvoiceItems.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price;
    if (taxSettings?.isInclusive) {
      return sum + (itemTotal * item.tax) / (100 + item.tax);
    } else {
      return sum + (itemTotal * (item.tax / 100));
    }
  }, 0) : 0;

  const quickInvoiceSubtotal = quickInvoiceItems.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price;
    if (!useNcf) return sum + itemTotal;
    if (taxSettings?.isInclusive) {
      const itemTax = (itemTotal * item.tax) / (100 + item.tax);
      return sum + (itemTotal - itemTax);
    } else {
      return sum + itemTotal;
    }
  }, 0);

  const quickInvoiceDiscountAmount = (() => {
    if (!quickInvoiceDiscountConfirmed) return 0;
    const val = parseFloat(quickInvoiceDiscountValue) || 0;
    if (quickInvoiceDiscountType === "percentage") {
      return (quickInvoiceSubtotal * val) / 100;
    } else if (quickInvoiceDiscountType === "fixed") {
      return val;
    }
    return 0;
  })();

  const quickInvoiceTotal = quickInvoiceSubtotal - quickInvoiceDiscountAmount + quickInvoiceTotalTax;

  const resetQuickInvoice = () => {
    setQuickInvoiceOpen(false);
    setQuickInvoiceCustomerId(null);
    setQuickInvoiceSellerId(null);
    setQuickInvoiceDate(getLocalDateString());
    setQuickInvoiceDateDisplay(toDisplayDate(getLocalDateString()));
    setQuickInvoiceNcfType("");
    setQuickInvoiceItems([]);
    setQuickInvoiceEditingIndex(null);
    setQuickInvoiceNotes("");
    setQuickInvoiceNewRowSearch("");
    setQuickInvoiceDiscountType("none");
    setQuickInvoiceDiscountValue("");
    setQuickInvoiceDiscountConfirmed(false);
  };

  const selectedQuickInvoiceCustomer = customers.find((c: Customer) => c.id === quickInvoiceCustomerId);

  const createQuickInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      const audio = new Audio("/sounds/success.mp3");
      audio.play().catch(() => {});
      showSuccess("Factura creada exitosamente", "");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["nextInvoiceNumber"] });
      resetQuickInvoice();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleQuickInvoiceSubmit = () => {
    if (!quickInvoiceCustomerId) {
      showError("Error", "Seleccione un cliente");
      return;
    }
    if (quickInvoiceItems.filter(item => item.productId).length === 0) {
      showError("Error", "Agregue al menos un producto");
      return;
    }
    createQuickInvoiceMutation.mutate({
      customerId: quickInvoiceCustomerId,
      customerRnc: selectedQuickInvoiceCustomer?.rnc || (quickInvoiceNcfType === "B02" ? "000000000" : null),
      date: quickInvoiceDate,
      dueDate: null,
      paymentTermsDays: 0,
      sellerId: quickInvoiceSellerId,
      subtotal: String(quickInvoiceSubtotal.toFixed(2)),
      itbis: String(quickInvoiceTotalTax.toFixed(2)),
      discountType: quickInvoiceDiscountType,
      discountValue: String(quickInvoiceDiscountAmount.toFixed(2)),
      total: String(quickInvoiceTotal.toFixed(2)),
      ncf: quickInvoiceNcfType || null,
      status: "pending",
      notes: quickInvoiceNotes || null,
      items: quickInvoiceItems
        .filter(item => item.productId)
        .map(item => ({
          productId: item.productId,
          description: item.description || "",
          quantity: item.quantity,
          unitPrice: String(item.price.toFixed(2)),
        })),
    });
  };

  useEffect(() => {
    // Clear old balances and reload fresh ones when invoices change
    const loadBalances = async () => {
      const newBalances: { [invoiceId: number]: string } = {};
      
      await Promise.all(
        invoices.map(async (invoice: Invoice) => {
          if (invoice.status !== 'cancelled') {
            try {
              const response = await fetch(`/api/invoices/${invoice.id}/balance`);
              if (response.ok) {
                const data = await response.json();
                newBalances[invoice.id] = data.balance;
              }
            } catch (error) {
              console.error(`Failed to fetch balance for invoice ${invoice.id}:`, error);
            }
          }
        })
      );
      
      setBalances(newBalances);
    };
    
    if (invoices.length > 0) {
      loadBalances();
    }
  }, [invoices]);

  const cancelInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel invoice");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setBalances(prev => ({ ...prev, [data.id]: "0.00" }));
      queryClient.setQueryData(["invoices"], (oldData: any) =>
        oldData?.map((inv: any) => inv.id === data.id ? data : inv)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setConfirmDialogOpen(false);
      setSuccessDialogOpen(true);
      setTimeout(() => setSuccessDialogOpen(false), 3000);
    },
    onError: (error) => {
      showError("No se puede anular", error instanceof Error ? error.message : "No se pudo anular la factura.");
    },
  });

  const handleCancelInvoice = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setConfirmDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (selectedInvoiceId !== null) {
      cancelInvoiceMutation.mutate(selectedInvoiceId);
    }
  };

  // Quick payment functions
  const handleQuickPayment = (invoice: Invoice, balance: number) => {
    setQuickPaymentInvoice(invoice);
    setQuickPaymentBalance(balance);
    // Use the invoice date as default payment date
    const invoiceDate = invoice.date;
    setQuickPaymentData({
      amount: balance.toFixed(2),
      method: "efectivo",
      reference: "",
      date: invoiceDate,
      dateDisplay: toDisplayDate(invoiceDate),
    });
    setQuickPaymentOpen(true);
  };

  const quickPaymentMutation = useMutation({
    mutationFn: async (data: { invoiceId: number; customerId: number; amount: string; date: string; method: string; reference: string }) => {
      const response = await fetch("/api/customer-payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: data.customerId,
          amount: data.amount,
          date: data.date,
          method: data.method,
          reference: data.reference || null,
          notes: null,
          paymentAccountId: null,
          allocations: [
            { invoiceId: data.invoiceId, amount: data.amount }
          ],
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al registrar pago");
      }
      return { ...(await response.json()), invoiceId: data.invoiceId, paidAmount: parseFloat(data.amount) };
    },
    onSuccess: (data) => {
      showSuccess("Pago Registrado", "El pago se ha registrado correctamente");
      setQuickPaymentOpen(false);
      setQuickPaymentInvoice(null);
      // Optimistically update the specific invoice's balance immediately
      const newBalance = Math.max(0, quickPaymentBalance - data.paidAmount);
      setBalances(prev => ({ ...prev, [data.invoiceId]: newBalance.toFixed(2) }));
      // Then invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customerPayments"] });
      queryClient.invalidateQueries({ queryKey: ["customerBalances"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleQuickPaymentSubmit = () => {
    if (!quickPaymentInvoice) return;
    
    const amount = parseFloat(quickPaymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      showError("Monto Inválido", "Por favor ingrese un monto válido mayor a cero");
      return;
    }
    if (amount > quickPaymentBalance) {
      showError("Monto Excede Balance", `El monto no puede ser mayor al balance pendiente (RD$ ${quickPaymentBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })})`);
      return;
    }
    
    quickPaymentMutation.mutate({
      invoiceId: quickPaymentInvoice.id,
      customerId: quickPaymentInvoice.customerId,
      amount: quickPaymentData.amount,
      date: quickPaymentData.date,
      method: quickPaymentData.method,
      reference: quickPaymentData.reference,
    });
  };

  // Payment cancellation state and mutation
  const [cancelPaymentOpen, setCancelPaymentOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<Payment | null>(null);

  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al anular pago");
      }
      return paymentId;
    },
    onSuccess: (paymentId) => {
      showSuccess("Pago Anulado", "El pago ha sido anulado correctamente");
      setCancelPaymentOpen(false);
      setPaymentToCancel(null);
      queryClient.invalidateQueries({ queryKey: ["invoicePayments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customerPayments"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleCancelPayment = (payment: Payment) => {
    setPaymentToCancel(payment);
    setCancelPaymentOpen(true);
  };

  const confirmCancelPayment = () => {
    if (paymentToCancel) {
      cancelPaymentMutation.mutate(paymentToCancel.id);
    }
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer?.name || "Cliente desconocido";
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const getDateRange = (): { start: Date; end: Date } | null => {
    if (customStartDate && customEndDate && customStartDate.trim() !== "" && customEndDate.trim() !== "") {
      const start = new Date(customStartDate + "T00:00:00");
      const end = new Date(customEndDate + "T23:59:59.999");
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return { start, end };
      }
    }
    return null;
  };

  const referenceDate = customEndDate || new Date().toISOString().split('T')[0];
  
  const getEffectiveDueDate = (inv: Invoice): string | null => {
    if (inv.dueDate) return inv.dueDate;
    if (inv.date && inv.paymentTermsDays) {
      const invoiceDate = new Date(inv.date + 'T00:00:00');
      invoiceDate.setDate(invoiceDate.getDate() + inv.paymentTermsDays);
      return invoiceDate.toISOString().split('T')[0];
    }
    return null;
  };

  const getInvoiceBalance = (inv: Invoice): number => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return 0;
    if (balances[inv.id] !== undefined) {
      return parseFloat(balances[inv.id]);
    }
    return parseFloat(String(inv.total));
  };

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const dateRange = getDateRange();
    if (dateRange) {
      const invoiceDate = new Date(invoice.date + "T00:00:00");
      if (invoiceDate < dateRange.start || invoiceDate > dateRange.end) {
        return false;
      }
    }

    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(invoice.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.ncf && invoice.ncf.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedStatuses.length === 0) return true;

    if (invoice.status === 'cancelled') {
      return selectedStatuses.includes('cancelled');
    }

    const isPaid = invoice.status === 'paid' || getInvoiceBalance(invoice) === 0;
    const isPending = !isPaid && invoice.status !== 'cancelled';
    
    // Check if invoice is overdue (has due date in the past and has balance)
    const dueDate = getEffectiveDueDate(invoice);
    const isOverdue = isPending && dueDate && dueDate <= referenceDate && getInvoiceBalance(invoice) > 0;

    if (isPaid && selectedStatuses.includes('paid')) return true;
    if (isOverdue && selectedStatuses.includes('overdue')) return true;
    if (isPending && !isOverdue && selectedStatuses.includes('pending')) return true;
    // Also show overdue invoices when pending is selected (overdue is a subset of pending)
    if (isPending && selectedStatuses.includes('pending') && !selectedStatuses.includes('overdue')) return true;

    return false;
  });

  const filteredTotalFacturado = filteredInvoices
    .filter((inv: Invoice) => inv.status !== 'cancelled')
    .reduce((sum: number, inv: Invoice) => sum + parseFloat(String(inv.total)), 0);

  const filteredTotalPaid = filteredInvoices
    .filter((inv: Invoice) => inv.status !== 'cancelled')
    .reduce((sum: number, inv: Invoice) => {
      const total = parseFloat(String(inv.total));
      const balance = getInvoiceBalance(inv);
      return sum + (total - balance);
    }, 0);

  const filteredTotalPending = filteredInvoices
    .filter((inv: Invoice) => inv.status !== 'cancelled')
    .reduce((sum: number, inv: Invoice) => getInvoiceBalance(inv) + sum, 0);

  const filteredTotalOverdue = filteredInvoices
    .filter((inv: Invoice) => {
      if (inv.status === 'cancelled' || inv.status === 'paid') return false;
      const balance = getInvoiceBalance(inv);
      if (balance <= 0) return false;
      const dueDate = getEffectiveDueDate(inv);
      return dueDate && dueDate <= referenceDate;
    })
    .reduce((sum: number, inv: Invoice) => getInvoiceBalance(inv) + sum, 0);

  return (
    <Layout>
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular factura?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea anular esta factura? La factura será marcada como anulada y su balance será puesto en cero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel className="rounded-xl" data-testid="button-cancel-dialog">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              data-testid="button-confirm-cancel"
            >
              Anular Factura
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <AlertDialogTitle>Factura Anulada</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                La factura ha sido marcada como anulada exitosamente.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
            <p className="text-muted-foreground mt-1">Gestiona tus facturas y cobros.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl h-11">
              <Download className="w-4 h-4 mr-2" />
              Reporte
            </Button>
            <Button variant="outline" className="rounded-xl h-11" onClick={() => { setQuickInvoiceDateDisplay(toDisplayDate(getLocalDateString())); setQuickInvoiceOpen(true); }} data-testid="button-quick-invoice">
              <Plus className="w-4 h-4 mr-2" />
              Factura Rápida
            </Button>
            <Link href="/invoices/create">
              <Button className="rounded-xl h-11 gradient-primary border-0 shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Factura
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="card-shadow border-0">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="stat-icon stat-icon-primary mb-2">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Total Facturado</p>
                <p className="text-lg font-bold mt-1">
                  RD$ {filteredTotalFacturado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="stat-icon stat-icon-success mb-2">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Total Pagado</p>
                <p className="text-lg font-bold mt-1">
                  RD$ {filteredTotalPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="stat-icon stat-icon-warning mb-2">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Total Pendiente</p>
                <p className="text-lg font-bold mt-1">
                  RD$ {filteredTotalPending.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="stat-icon stat-icon-danger mb-2">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Total Vencido</p>
                <p className="text-lg font-bold mt-1">
                  RD$ {filteredTotalOverdue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice List */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar facturas..."
                    className="pl-10 bg-secondary/50 border-none rounded-xl h-11"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-invoices"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Desde:</span>
                  <div className="flex items-center">
                    <Input
                      type="text"
                      value={startDateDisplay}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value);
                        setStartDateDisplay(formatted);
                        const iso = toISODate(formatted);
                        if (iso) {
                          setCustomStartDate(iso);
                        }
                      }}
                      placeholder="ddmmyyyy"
                      className="w-[120px] rounded-r-none border-r-0"
                      data-testid="input-custom-start-date"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-l-none">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customStartDate ? new Date(customStartDate + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const localDate = getLocalDateString(date);
                              setCustomStartDate(localDate);
                              setStartDateDisplay(toDisplayDate(localDate));
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <span className="text-sm font-medium">Hasta:</span>
                  <div className="flex items-center">
                    <Input
                      type="text"
                      value={endDateDisplay}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value);
                        setEndDateDisplay(formatted);
                        const iso = toISODate(formatted);
                        if (iso) {
                          setCustomEndDate(iso);
                        }
                      }}
                      placeholder="ddmmyyyy"
                      className="w-[120px] rounded-r-none border-r-0"
                      data-testid="input-custom-end-date"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-l-none">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customEndDate ? new Date(customEndDate + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const localDate = getLocalDateString(date);
                              setCustomEndDate(localDate);
                              setEndDateDisplay(toDisplayDate(localDate));
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {(customStartDate || customEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCustomStartDate(""); setCustomEndDate(""); setStartDateDisplay(""); setEndDateDisplay(""); }}
                      className="text-muted-foreground hover:text-foreground"
                      data-testid="button-clear-dates"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-11 rounded-xl bg-secondary/50 border-none min-w-[180px] justify-between"
                      data-testid="button-status-filter"
                    >
                      <span className="text-sm">
                        {selectedStatuses.length === 0 
                          ? "Todos los estados" 
                          : selectedStatuses.length === 4 
                            ? "Todos los estados"
                            : selectedStatuses.map(s => statusFilterLabels[s]).join(", ")}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2" align="start">
                    <div className="space-y-2">
                      {(["pending", "paid", "overdue", "cancelled"] as StatusFilter[]).map((status) => (
                        <div 
                          key={status} 
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
                          onClick={() => toggleStatusFilter(status)}
                          data-testid={`checkbox-filter-${status}`}
                        >
                          <Checkbox 
                            checked={selectedStatuses.includes(status)}
                            onCheckedChange={() => toggleStatusFilter(status)}
                          />
                          <span className="text-sm">{statusFilterLabels[status]}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-center">Factura</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Fecha</TableHead>
                  <TableHead className="text-center">NCF</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Balance</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice: Invoice) => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      getCustomerName={getCustomerName}
                      formatDate={formatDate}
                      balance={balances[invoice.id] || String(invoice.total)}
                      handleQuickPayment={handleQuickPayment}
                      handleCancelInvoice={handleCancelInvoice}
                      handleCancelPayment={handleCancelPayment}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">No hay facturas</p>
                          <p className="text-sm text-muted-foreground mt-1">Crea tu primera factura para comenzar</p>
                        </div>
                        <Link href="/invoices/create">
                          <Button className="mt-2 rounded-xl gradient-primary border-0">
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Factura
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {/* Quick Payment Dialog */}
      <Dialog open={quickPaymentOpen} onOpenChange={setQuickPaymentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Pago Rápido</DialogTitle>
            <DialogDescription>
              {quickPaymentInvoice && (
                <>
                  Factura <span className="font-medium">{quickPaymentInvoice.invoiceNumber}</span> - 
                  Cliente: <span className="font-medium">{getCustomerName(quickPaymentInvoice.customerId)}</span>
                  <br />
                  Balance pendiente: <span className="font-bold text-red-600">
                    RD$ {quickPaymentBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quickPaymentAmount">Monto a Pagar</Label>
              <Input
                id="quickPaymentAmount"
                type="number"
                step="0.01"
                value={quickPaymentData.amount}
                onChange={(e) => setQuickPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                data-testid="input-quick-payment-amount"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quickPaymentMethod">Método de Pago</Label>
              <Select
                value={quickPaymentData.method}
                onValueChange={(value) => setQuickPaymentData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger data-testid="select-quick-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quickPaymentReference">Referencia (opcional)</Label>
              <Input
                id="quickPaymentReference"
                value={quickPaymentData.reference}
                onChange={(e) => setQuickPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="No. de cheque, transferencia, etc."
                data-testid="input-quick-payment-reference"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quickPaymentDate">Fecha del Pago</Label>
              <div className="flex items-center">
                <Input
                  id="quickPaymentDate"
                  type="text"
                  value={quickPaymentData.dateDisplay}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    const iso = toISODate(formatted);
                    setQuickPaymentData(prev => ({ 
                      ...prev, 
                      dateDisplay: formatted,
                      date: iso || prev.date
                    }));
                  }}
                  placeholder="dd/mm/yyyy"
                  className="rounded-r-none border-r-0"
                  data-testid="input-quick-payment-date"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-l-none" type="button">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={quickPaymentData.date ? new Date(quickPaymentData.date + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const localDate = getLocalDateString(date);
                          setQuickPaymentData(prev => ({
                            ...prev,
                            date: localDate,
                            dateDisplay: toDisplayDate(localDate),
                          }));
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickPaymentOpen(false)}
              data-testid="button-cancel-quick-payment"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleQuickPaymentSubmit}
              disabled={quickPaymentMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-submit-quick-payment"
            >
              {quickPaymentMutation.isPending ? "Guardando..." : "Registrar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Invoice Dialog */}
      <Dialog open={quickInvoiceOpen} onOpenChange={(open) => { if (!open) setQuickInvoiceCloseConfirmOpen(true); }}>
        <DialogContent ref={quickInvoiceDialogRef} className="max-w-5xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { e.preventDefault(); setQuickInvoiceCloseConfirmOpen(true); }} onEscapeKeyDown={(e) => { e.preventDefault(); setQuickInvoiceCloseConfirmOpen(true); }}>
          <div className="flex justify-center px-2 pt-4 border-b pb-4">
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1 items-center">
                  <Label className="text-xs text-center w-full">Tipo NCF</Label>
                  <Select value={quickInvoiceNcfType || "none"} onValueChange={(val) => setQuickInvoiceNcfType(val === "none" ? "" : val)}>
                    <SelectTrigger className="w-[180px] h-8 text-center text-sm" data-testid="select-quick-invoice-ncf-type">
                      <SelectValue placeholder="Sin NCF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin NCF</SelectItem>
                      {ncfSequences
                        .filter((seq: any) => seq.status === 'active')
                        .map((seq: any) => (
                          <SelectItem key={seq.id} value={seq.type} data-testid={`quick-invoice-ncf-${seq.type}`}>
                            {seq.type}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {quickInvoiceNcfType && quickInvoiceNcfType !== "none" && (
                  <div className="flex flex-col gap-1 items-center">
                    <Label className="text-xs text-center w-full">NCF</Label>
                    <Input
                      value={(() => {
                        const activeSeq = ncfSequences.find((seq: any) => seq.type === quickInvoiceNcfType && seq.status === 'active');
                        if (!activeSeq) return "";
                        return `${activeSeq.prefix}${String(activeSeq.currentNumber).padStart(8, '0')}`;
                      })()}
                      readOnly
                      className="bg-muted/50 h-8 w-[180px] text-center font-mono text-sm"
                      data-testid="input-quick-invoice-ncf-number"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1 items-center">
                  <Label className="text-xs text-center w-full">Fecha</Label>
                  <div className="flex items-center">
                    <Input
                      type="text"
                      value={quickInvoiceDateDisplay}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value);
                        setQuickInvoiceDateDisplay(formatted);
                        const iso = toISODate(formatted);
                        if (iso) {
                          setQuickInvoiceDate(iso);
                        }
                      }}
                      placeholder="ddmmyyyy"
                      className="w-[110px] h-8 rounded-r-none border-r-0 text-center text-sm"
                      data-testid="input-quick-invoice-date"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={quickInvoiceDate ? new Date(quickInvoiceDate + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const localDate = getLocalDateString(date);
                              setQuickInvoiceDate(localDate);
                              setQuickInvoiceDateDisplay(toDisplayDate(localDate));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <Label className="text-xs text-center w-full">Factura No.</Label>
                  <Input
                    value={nextInvoiceNumber?.nextNumber || ""}
                    readOnly
                    className="w-[90px] h-8 bg-muted/50 text-center text-sm"
                    data-testid="input-quick-invoice-number"
                  />
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <Label className="text-xs text-center w-full">Vendedor</Label>
                  <Popover open={quickInvoiceSellerPopoverOpen} onOpenChange={setQuickInvoiceSellerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={quickInvoiceSellerPopoverOpen}
                        className="w-[180px] h-8 justify-between text-sm"
                        data-testid="select-quick-invoice-seller"
                      >
                        <span className="w-full text-center truncate">
                          {quickInvoiceSellerId ? sellers.find((s: Seller) => s.id === quickInvoiceSellerId)?.name || "" : ""}
                        </span>
                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Buscar vendedor..." data-testid="input-quick-invoice-seller-search" />
                        <CommandList>
                          <CommandEmpty>No se encontraron vendedores.</CommandEmpty>
                          <CommandGroup>
                            {sellers.filter((s: Seller) => s.status === 'active').map((seller: Seller) => (
                              <CommandItem
                                key={seller.id}
                                value={seller.name}
                                onSelect={() => {
                                  setQuickInvoiceSellerId(seller.id);
                                  setQuickInvoiceSellerPopoverOpen(false);
                                }}
                                data-testid={`quick-invoice-seller-${seller.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    quickInvoiceSellerId === seller.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {seller.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
          </div>
          <div className="space-y-6 pt-2">

            <div className="flex items-start gap-4">
              <Collapsible open={quickInvoiceCustomerBoxOpen} onOpenChange={setQuickInvoiceCustomerBoxOpen} className="rounded-lg border border-[#E5E7EB] flex-1">
                {quickInvoiceCustomerBoxOpen ? (
                  <div className="flex items-center gap-4 px-4 py-3 flex-wrap">
                    <div className="flex flex-col gap-1 min-w-[200px] w-[300px]">
                      <Label>Cliente</Label>
                      <Popover open={quickInvoiceCustomerPopoverOpen} onOpenChange={setQuickInvoiceCustomerPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={quickInvoiceCustomerPopoverOpen}
                            className="w-full justify-between"
                            data-testid="select-quick-invoice-customer"
                          >
                            {selectedQuickInvoiceCustomer
                              ? selectedQuickInvoiceCustomer.name
                              : "Buscar cliente..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por nombre o RNC..." data-testid="input-quick-invoice-customer-search" />
                            <CommandList>
                              <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                              <CommandGroup heading="Clientes">
                                {customers.map((customer: Customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={`${customer.name} ${customer.rnc || ''}`}
                                    onSelect={() => {
                                      setQuickInvoiceCustomerId(customer.id);
                                      setQuickInvoiceCustomerPopoverOpen(false);
                                    }}
                                    data-testid={`quick-invoice-customer-${customer.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        quickInvoiceCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{customer.name}</span>
                                      {customer.rnc && <span className="text-xs text-gray-500">{customer.rnc}</span>}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <Label className="text-xs text-muted-foreground text-center w-full">RNC</Label>
                      <Input 
                        value={selectedQuickInvoiceCustomer?.rnc || ""} 
                        readOnly 
                        className="bg-muted/50 h-9 w-[140px] text-center" 
                        data-testid="input-quick-invoice-customer-rnc-header" 
                      />
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <Label className="text-xs text-muted-foreground text-center w-full">Teléfono</Label>
                      <Input 
                        value={selectedQuickInvoiceCustomer?.phone || ""} 
                        readOnly 
                        maxLength={16} 
                        className="bg-muted/50 h-9 w-[140px] text-center" 
                        data-testid="input-quick-invoice-customer-phone-header" 
                      />
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 mt-5" data-testid="button-toggle-customer-details">
                        <ChevronsUpDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Cliente:</Label>
                      <span className="text-sm font-medium" data-testid="text-quick-invoice-customer-collapsed">
                        {selectedQuickInvoiceCustomer?.name || "Sin cliente seleccionado"}
                      </span>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-toggle-customer-details-collapsed">
                        <ChevronsUpDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                )}
              <CollapsibleContent>
                <div className="px-4 pb-3 flex flex-wrap gap-4 items-center" data-testid="quick-invoice-customer-info">
                  <div className="flex flex-col gap-1 items-center flex-1">
                    <Label className="text-xs text-muted-foreground text-center w-full">Dirección</Label>
                    <Input value={selectedQuickInvoiceCustomer?.address || ""} readOnly className="bg-muted/50 h-9 text-center" data-testid="input-quick-invoice-customer-address" />
                  </div>
                </div>
              </CollapsibleContent>
              </Collapsible>
            </div>

            <div>
              <div className="mb-2">
                <Label className="text-base font-semibold">Productos</Label>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center w-[80px]">Cantidad</TableHead>
                    <TableHead className="text-center w-[100px]">Precio</TableHead>
                    <TableHead className="text-center w-[100px]">Subtotal</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quickInvoiceItems.map((item, index) => (
                      <TableRow
                        key={index}
                        data-testid={`row-quick-invoice-item-${index}`}
                        className={cn(
                          "group transition-colors",
                          quickInvoiceEditingIndex === index ? "bg-blue-50/50" : "hover:bg-gray-50"
                        )}
                      >
                        <TableCell>
                          {quickInvoiceEditingIndex === index ? (
                            <div>
                              <Input
                                ref={quickInvoiceDescriptionRef}
                                value={item.description}
                                onChange={(e) => {
                                  const newItems = [...quickInvoiceItems];
                                  newItems[index] = { ...newItems[index], description: e.target.value, productId: null };
                                  setQuickInvoiceItems(newItems);
                                  setQuickInvoiceProductSearchOpen(e.target.value.length > 0);
                                }}
                                onFocus={() => {
                                  if (item.description.length > 0) setQuickInvoiceProductSearchOpen(true);
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    if (!quickInvoiceDropdownInteracting.current) {
                                      setQuickInvoiceProductSearchOpen(false);
                                    }
                                  }, 150);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    setQuickInvoiceEditingIndex(null);
                                    setQuickInvoiceProductSearchOpen(false);
                                  }
                                }}
                                placeholder="Escriba para buscar producto..."
                                autoFocus
                                className="h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`input-quick-invoice-description-${index}`}
                              />
                              {quickInvoiceProductSearchOpen && item.description.length > 0 && (() => {
                                const filtered = products.filter((p: Product) =>
                                  p.name.toLowerCase().includes(item.description.toLowerCase()) ||
                                  (p.code && p.code.toLowerCase().includes(item.description.toLowerCase()))
                                );
                                if (filtered.length === 0) return null;
                                return (
                                  <div
                                    className="mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto"
                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                  >
                                    {filtered.map((product: Product) => (
                                      <div
                                        key={product.id}
                                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          quickInvoiceDropdownInteracting.current = false;
                                          const newItems = [...quickInvoiceItems];
                                          newItems[index] = {
                                            ...newItems[index],
                                            productId: product.id,
                                            description: product.name,
                                            price: product.price ? parseFloat(String(product.price)) : 0,
                                          };
                                          setQuickInvoiceItems(newItems);
                                          setQuickInvoiceProductSearchOpen(false);
                                          setTimeout(() => {
                                            quickInvoiceQuantityRef.current?.focus();
                                            quickInvoiceQuantityRef.current?.select();
                                          }, 50);
                                        }}
                                        data-testid={`quick-invoice-product-option-${product.id}`}
                                      >
                                        <span className="font-medium">{product.code ? `${product.code} - ` : ""}{product.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="text-sm">{item.description || "—"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {quickInvoiceEditingIndex === index ? (
                            <Input
                              ref={quickInvoiceQuantityRef}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...quickInvoiceItems];
                                newItems[index] = { ...newItems[index], quantity: parseFloat(e.target.value) || 1 };
                                setQuickInvoiceItems(newItems);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setQuickInvoiceEditingIndex(null);
                                }
                              }}
                              className="w-20 h-8 text-center text-sm"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`input-quick-invoice-quantity-${index}`}
                            />
                          ) : (
                            <span className="text-sm">{item.quantity}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {quickInvoiceEditingIndex === index ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...quickInvoiceItems];
                                newItems[index] = { ...newItems[index], price: parseFloat(e.target.value) || 0 };
                                setQuickInvoiceItems(newItems);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setQuickInvoiceEditingIndex(null);
                                }
                              }}
                              className="w-24 h-8 text-center text-sm"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`input-quick-invoice-price-${index}`}
                            />
                          ) : (
                            <span className="text-sm">{item.price.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium text-sm">
                          {(item.quantity * item.price).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center p-0">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7 transition-opacity",
                                quickInvoiceEditingIndex === index
                                  ? "text-blue-600 bg-blue-50 opacity-100"
                                  : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100"
                              )}
                              onClick={() => {
                                if (quickInvoiceEditingIndex === index) {
                                  setQuickInvoiceEditingIndex(null);
                                  setQuickInvoiceProductSearchOpen(false);
                                } else {
                                  setQuickInvoiceEditingIndex(index);
                                }
                              }}
                              data-testid={`button-quick-invoice-edit-${index}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const newItems = quickInvoiceItems.filter((_, i) => i !== index);
                                setQuickInvoiceItems(newItems);
                                if (quickInvoiceEditingIndex === index) {
                                  setQuickInvoiceEditingIndex(null);
                                } else if (quickInvoiceEditingIndex !== null && quickInvoiceEditingIndex > index) {
                                  setQuickInvoiceEditingIndex(quickInvoiceEditingIndex - 1);
                                }
                              }}
                              data-testid={`button-quick-invoice-remove-${index}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  <TableRow className="hover:bg-gray-50/50">
                    <TableCell>
                      <div>
                        <Input
                          ref={quickInvoiceNewRowRef}
                          value={quickInvoiceNewRowSearch}
                          onChange={(e) => {
                            setQuickInvoiceNewRowSearch(e.target.value);
                            setQuickInvoiceProductSearchOpen(true);
                          }}
                          onFocus={() => {
                            setQuickInvoiceEditingIndex(null);
                            setQuickInvoiceProductSearchOpen(true);
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              if (!quickInvoiceDropdownInteracting.current) {
                                setQuickInvoiceProductSearchOpen(false);
                              }
                            }, 150);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && quickInvoiceNewRowSearch.trim()) {
                              e.preventDefault();
                              const newItems = [...quickInvoiceItems, { productId: null, description: quickInvoiceNewRowSearch, quantity: 1, price: 0, tax: defaultTaxRate }];
                              setQuickInvoiceItems(newItems);
                              setQuickInvoiceNewRowSearch("");
                              setQuickInvoiceProductSearchOpen(false);
                              setQuickInvoiceEditingIndex(newItems.length - 1);
                            }
                          }}
                          placeholder="Escriba para buscar producto..."
                          className="h-8 text-sm border-dashed"
                          data-testid="input-quick-invoice-new-product"
                        />
                        {quickInvoiceProductSearchOpen && quickInvoiceEditingIndex === null && (() => {
                          const filtered = quickInvoiceNewRowSearch.length > 0
                            ? products.filter((p: Product) =>
                                p.name.toLowerCase().includes(quickInvoiceNewRowSearch.toLowerCase()) ||
                                (p.code && p.code.toLowerCase().includes(quickInvoiceNewRowSearch.toLowerCase()))
                              )
                            : products;
                          if (filtered.length === 0) return null;
                          return (
                            <div
                              className="mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto"
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                              {filtered.map((product: Product) => (
                                <div
                                  key={product.id}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    quickInvoiceDropdownInteracting.current = false;
                                    const newItems = [...quickInvoiceItems, {
                                      productId: product.id,
                                      description: product.name,
                                      quantity: 1,
                                      price: product.price ? parseFloat(String(product.price)) : 0,
                                      tax: defaultTaxRate,
                                    }];
                                    setQuickInvoiceItems(newItems);
                                    setQuickInvoiceNewRowSearch("");
                                    setQuickInvoiceProductSearchOpen(false);
                                    setQuickInvoiceEditingIndex(newItems.length - 1);
                                    setTimeout(() => {
                                      quickInvoiceQuantityRef.current?.focus();
                                      quickInvoiceQuantityRef.current?.select();
                                    }, 50);
                                  }}
                                  data-testid={`quick-invoice-new-product-option-${product.id}`}
                                >
                                  <span className="font-medium">{product.code ? `${product.code} - ` : ""}{product.name}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">—</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">—</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">—</TableCell>
                    <TableCell className="text-center p-0">
                      {quickInvoiceNewRowSearch.trim() && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-500 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (quickInvoiceNewRowSearch.trim()) {
                              const newItems = [...quickInvoiceItems, { productId: null, description: quickInvoiceNewRowSearch, quantity: 1, price: 0, tax: defaultTaxRate }];
                              setQuickInvoiceItems(newItems);
                              setQuickInvoiceNewRowSearch("");
                              setQuickInvoiceProductSearchOpen(false);
                              setQuickInvoiceEditingIndex(newItems.length - 1);
                            }
                          }}
                          data-testid="button-quick-invoice-add-product"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>RD$ {quickInvoiceSubtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center relative">
                  <div className="flex items-center">
                    {!quickInvoiceDiscountConfirmed && (
                      <div className="flex flex-col items-end absolute right-full mr-2">
                        <div className="flex items-center gap-1">
                          <Select value={quickInvoiceDiscountType} onValueChange={(val: "none" | "percentage" | "fixed") => { setQuickInvoiceDiscountType(val); if (val === "none") setQuickInvoiceDiscountValue(""); }}>
                            <SelectTrigger className="h-7 w-[90px] text-xs" data-testid="select-quick-invoice-discount-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Ninguno</SelectItem>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="fixed">RD$</SelectItem>
                            </SelectContent>
                          </Select>
                          {quickInvoiceDiscountType !== "none" && (
                            <Input
                              type="number"
                              min="0"
                              value={quickInvoiceDiscountValue}
                              onChange={(e) => setQuickInvoiceDiscountValue(e.target.value)}
                              className="h-7 w-[70px] text-xs text-right"
                              placeholder="0"
                              data-testid="input-quick-invoice-discount-value"
                            />
                          )}
                        </div>
                        {quickInvoiceDiscountType !== "none" && quickInvoiceDiscountValue && Number(quickInvoiceDiscountValue) > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs mt-1 px-2"
                            onClick={() => setQuickInvoiceDiscountConfirmed(true)}
                            data-testid="button-confirm-discount"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Aplicar
                          </Button>
                        )}
                      </div>
                    )}
                    <span className="text-muted-foreground">Descuento:</span>
                    {quickInvoiceDiscountConfirmed && (
                      <button
                        type="button"
                        className="ml-1 text-red-400 hover:text-red-600 transition-colors"
                        onClick={() => {
                          setQuickInvoiceDiscountConfirmed(false);
                          setQuickInvoiceDiscountType("none");
                          setQuickInvoiceDiscountValue("");
                        }}
                        data-testid="button-remove-discount"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <span className={quickInvoiceDiscountAmount > 0 ? "text-red-500" : ""}>
                    {quickInvoiceDiscountAmount > 0 ? "-" : ""}RD$ {quickInvoiceDiscountAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ITBIS:</span>
                  <span>RD$ {quickInvoiceTotalTax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total:</span>
                  <span>RD$ {quickInvoiceTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Notas (opcional)</Label>
              <Input
                value={quickInvoiceNotes}
                onChange={(e) => setQuickInvoiceNotes(e.target.value)}
                placeholder="Notas adicionales..."
                data-testid="input-quick-invoice-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetQuickInvoice} data-testid="button-cancel-quick-invoice">
              Cancelar
            </Button>
            <Button
              onClick={handleQuickInvoiceSubmit}
              disabled={createQuickInvoiceMutation.isPending}
              className="bg-primary"
              data-testid="button-submit-quick-invoice"
            >
              {createQuickInvoiceMutation.isPending ? "Creando..." : "Crear Factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={quickInvoiceCloseConfirmOpen} onOpenChange={setQuickInvoiceCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir de Factura Rápida?</AlertDialogTitle>
            <AlertDialogDescription>
              Los datos ingresados no se guardarán. ¿Está seguro que desea salir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-close-quick-invoice">No, continuar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setQuickInvoiceCloseConfirmOpen(false); resetQuickInvoice(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-close-quick-invoice"
            >
              Sí, salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Payment Confirmation Dialog */}
      <AlertDialog open={cancelPaymentOpen} onOpenChange={setCancelPaymentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular Pago</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentToCancel && (
                <>
                  ¿Está seguro de que desea anular el pago <span className="font-medium">#{paymentToCancel.receiptNumber || paymentToCancel.id}</span> por{" "}
                  <span className="font-bold text-emerald-600">
                    RD$ {parseFloat(String(paymentToCancel.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>?
                  <br />
                  <span className="text-red-600 font-medium">Esta acción no se puede deshacer.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-cancel-payment">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelPayment} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelPaymentMutation.isPending}
              data-testid="button-confirm-cancel-payment"
            >
              {cancelPaymentMutation.isPending ? "Anulando..." : "Anular Pago"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MessagePopup
        open={message.open}
        onClose={closeMessage}
        title={message.title}
        description={message.description}
        type={message.type}
      />
    </Layout>
  );
}
