import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Eye, CreditCard, Trash2, Wallet, ChevronDown, ChevronRight, ChevronsUpDown, Check, UserPlus, XCircle, Pencil, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn, getLocalDateString } from "@/lib/utils";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import type { PurchaseInvoice, Supplier, SupplierPayment, ExpenseCategory, ExpenseSubcategory } from "@shared/schema";
import type { ReactNode } from "react";

interface InvoiceRowProps {
  invoice: PurchaseInvoice;
  getSupplierName: (id: number) => string;
  formatDate: (date: string) => string;
  handleDelete: (id: number) => void;
  handleEdit: (invoice: PurchaseInvoice) => void;
  handleQuickPayment: (invoice: PurchaseInvoice, balance: number) => void;
  handleCancelPayment: (payment: SupplierPayment) => void;
}

function InvoiceRow({ invoice, getSupplierName, formatDate, handleDelete, handleEdit, handleQuickPayment, handleCancelPayment }: InvoiceRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: balance } = useQuery({
    queryKey: ["purchaseInvoiceBalance", invoice.id],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-invoices/${invoice.id}/balance`);
      if (!response.ok) return invoice.total;
      const data = await response.json();
      return data.balance;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["invoicePayments", invoice.id],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-invoices/${invoice.id}/payments`);
      if (!response.ok) return [];
      return response.json() as Promise<SupplierPayment[]>;
    },
  });

  const balanceValue = parseFloat(String(balance ?? invoice.total));
  const hasPayments = payments.length > 0;

  // Calculate if invoice is overdue
  const isOverdue = (() => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return false;
    if (balanceValue <= 0) return false;
    const invoiceDate = new Date(invoice.date + 'T00:00:00');
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + (invoice.paymentTermsDays ?? 0));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return today > dueDate;
  })();

  const getDisplayBadge = () => {
    // Derive status from balance, not stored status (so it updates when payments are deleted)
    if (invoice.status === 'cancelled') {
      return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 font-medium border-none rounded-lg px-3">Anulada</Badge>;
    }
    // If balance is 0 or less, invoice is paid
    if (balanceValue <= 0) {
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-medium border-none rounded-lg px-3">Pagada</Badge>;
    }
    // If balance > 0 and overdue
    if (isOverdue) {
      return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 font-medium border-none rounded-lg px-3">Vencida</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-medium border-none rounded-lg px-3">Pendiente</Badge>;
  };

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

  return (
    <>
      <TableRow className="group" data-testid={`row-invoice-${invoice.id}`}>
        <TableCell className="w-10">
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
        <TableCell className="text-center text-sm">{formatDate(invoice.date)}</TableCell>
        <TableCell className="text-center text-sm font-medium">{getSupplierName(invoice.supplierId)}</TableCell>
        <TableCell className="text-center text-sm">{invoice.invoiceNumber}</TableCell>
        <TableCell className="text-center text-sm">{invoice.ncf || "—"}</TableCell>
        <TableCell className="text-center text-sm">
          RD$ {parseFloat(String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="text-center font-medium text-sm">
          RD$ {balanceValue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="text-center">{getDisplayBadge()}</TableCell>
        <TableCell className="text-center text-sm">
          {(() => {
            if (invoice.status === 'paid' || invoice.status === 'cancelled' || balanceValue <= 0) return "—";
            const invoiceDate = new Date(invoice.date + 'T00:00:00');
            const dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + (invoice.paymentTermsDays || 0));
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - dueDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? <span className="text-red-600 font-medium">{diffDays}</span> : "—";
          })()}
        </TableCell>
        <TableCell>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {invoice.status === 'pending' && balanceValue > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleQuickPayment(invoice, balanceValue)}
                title="Registrar pago"
                data-testid={`button-quick-payment-${invoice.id}`}
              >
                <Wallet className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${hasPayments ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'}`}
              onClick={() => !hasPayments && handleEdit(invoice)}
              disabled={hasPayments}
              title={hasPayments ? "No se puede editar facturas con pagos registrados" : "Editar factura"}
              data-testid={`button-edit-${invoice.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${hasPayments ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
              onClick={() => !hasPayments && handleDelete(invoice.id)}
              disabled={hasPayments}
              title={hasPayments ? "Debe eliminar los pagos antes de borrar la factura" : "Eliminar factura"}
              data-testid={`button-delete-${invoice.id}`}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && hasPayments && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={10} className="p-0">
            <div className="px-8 py-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Historial de Pagos ({payments.length})
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs">
                    <TableHead className="h-8 text-xs text-center">No. Pago</TableHead>
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
                      <TableCell className="py-2 text-center font-medium">{payment.paymentNumber}</TableCell>
                      <TableCell className="py-2 text-center">{formatPaymentDate(payment.date)}</TableCell>
                      <TableCell className="py-2 text-center">{getPaymentMethodLabel(payment.method)}</TableCell>
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

const initialFormData = {
  invoiceNumber: "",
  ncf: "",
  supplierId: "",
  supplierRnc: "",
  date: getLocalDateString(),
  paymentTermsDays: "0",
  taxType: "gravado", // gravado, exento, personalizado
  subtotal: "",
  itbis: "",
  total: "",
  notes: "",
  expenseCategoryId: "",
  expenseSubcategoryId: "",
  tipoComprobante: "consumidor_final", // consumidor_final, comprobante_fiscal
};

export default function PurchaseInvoices() {
  const queryClient = useQueryClient();
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const { playTrashSound } = useSoundEffects();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [isSupplierSheetOpen, setIsSupplierSheetOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierRnc, setNewSupplierRnc] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [hasNcf, setHasNcf] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [customStartDateDisplay, setCustomStartDateDisplay] = useState<string>("");
  const [customEndDateDisplay, setCustomEndDateDisplay] = useState<string>("");
  
  // Quick payment dialog state
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [quickPaymentInvoice, setQuickPaymentInvoice] = useState<PurchaseInvoice | null>(null);
  const [quickPaymentBalance, setQuickPaymentBalance] = useState(0);
  const [quickPaymentData, setQuickPaymentData] = useState({
    amount: "",
    method: "efectivo",
    reference: "",
    date: getLocalDateString(),
    dateDisplay: (() => {
      const today = getLocalDateString();
      const [year, month, day] = today.split("-");
      return `${day}/${month}/${year}`;
    })(),
  });
  
  // Cancel payment dialog state
  const [cancelPaymentOpen, setCancelPaymentOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<SupplierPayment | null>(null);

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
    const digits = value.replace(/\D/g, "");
    let result = "";
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) result += "/";
      result += digits[i];
    }
    return result;
  };
  const [balances, setBalances] = useState<{ [invoiceId: number]: string }>({});
  
  const invoiceNumberRef = useRef<HTMLInputElement>(null);
  const totalRef = useRef<HTMLInputElement>(null);
  const supplierRncRef = useRef<HTMLInputElement>(null);

  const { data: invoices = [], isLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ["purchaseInvoices"],
    queryFn: async () => {
      const response = await fetch("/api/purchase-invoices");
      if (!response.ok) throw new Error("Failed to fetch purchase invoices");
      return response.json() as Promise<PurchaseInvoice[]>;
    },
    refetchOnMount: "always",
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json() as Promise<Supplier[]>;
    },
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const response = await fetch("/api/expense-categories");
      if (!response.ok) throw new Error("Failed to fetch expense categories");
      return response.json() as Promise<ExpenseCategory[]>;
    },
  });

  const { data: expenseSubcategories = [] } = useQuery({
    queryKey: ["expense-subcategories"],
    queryFn: async () => {
      const response = await fetch("/api/expense-subcategories");
      if (!response.ok) throw new Error("Failed to fetch expense subcategories");
      return response.json() as Promise<ExpenseSubcategory[]>;
    },
  });

  // Filter subcategories based on selected category
  const filteredSubcategories = formData.expenseCategoryId 
    ? expenseSubcategories.filter(sub => sub.categoryId === parseInt(formData.expenseCategoryId))
    : [];

  // Fetch balances for all invoices
  useEffect(() => {
    const fetchBalances = async () => {
      const newBalances: { [key: number]: string } = {};
      for (const invoice of invoices) {
        try {
          const response = await fetch(`/api/purchase-invoices/${invoice.id}/balance`);
          if (response.ok) {
            const data = await response.json();
            newBalances[invoice.id] = String(data.balance);
          }
        } catch {
          newBalances[invoice.id] = String(invoice.total);
        }
      }
      setBalances(newBalances);
    };
    if (invoices.length > 0) {
      fetchBalances();
    }
  }, [invoices]);

  const getInvoiceBalance = (inv: PurchaseInvoice): number => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return 0;
    if (balances[inv.id] !== undefined) {
      return parseFloat(balances[inv.id]);
    }
    return parseFloat(String(inv.total));
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Update supplier RNC if changed
      if (data.supplierRnc && data.supplierId) {
        const supplier = suppliers.find(s => String(s.id) === data.supplierId);
        if (supplier && supplier.rnc !== data.supplierRnc) {
          await fetch(`/api/suppliers/${data.supplierId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rnc: data.supplierRnc }),
          });
        }
      }
      
      const parsedDays = parseInt(data.paymentTermsDays);
      const paymentDays = isNaN(parsedDays) || data.paymentTermsDays === "" ? 30 : parsedDays;
      const invoiceDate = new Date(data.date);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentDays);
      const dueDateStr = dueDate.toISOString().split('T')[0];
      
      const response = await fetch("/api/purchase-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: data.invoiceNumber,
          ncf: data.ncf || null,
          supplierId: parseInt(data.supplierId),
          date: data.date,
          dueDate: dueDateStr,
          paymentTermsDays: paymentDays,
          subtotal: data.subtotal,
          itbis: data.itbis || "0",
          total: data.total,
          notes: data.notes || null,
          expenseCategoryId: parseInt(data.expenseCategoryId),
          expenseSubcategoryId: parseInt(data.expenseSubcategoryId),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "No se pudo registrar la factura" }));
        throw new Error(errorData.error || "No se pudo registrar la factura");
      }
      return response.json();
    },
    onSuccess: () => {
      // Play success sound
      const audio = new Audio("/sounds/success.mp3");
      audio.play().catch(() => {/* sound failed silently */});
      
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplierPendingInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["supplierBalances"] });
      setIsDialogOpen(false);
      resetForm();
      showSuccess("Factura registrada", "La factura de compra ha sido registrada exitosamente.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; data: typeof formData }) => {
      // Update supplier RNC if changed
      if (data.data.supplierRnc && data.data.supplierId) {
        const supplier = suppliers.find(s => String(s.id) === data.data.supplierId);
        if (supplier && supplier.rnc !== data.data.supplierRnc) {
          await fetch(`/api/suppliers/${data.data.supplierId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rnc: data.data.supplierRnc }),
          });
        }
      }
      
      const parsedDays = parseInt(data.data.paymentTermsDays);
      const paymentDays = isNaN(parsedDays) ? 30 : parsedDays;
      const invoiceDate = new Date(data.data.date);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentDays);
      const dueDateStr = dueDate.toISOString().split('T')[0];
      
      const response = await fetch(`/api/purchase-invoices/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: data.data.invoiceNumber,
          ncf: data.data.ncf || null,
          supplierId: parseInt(data.data.supplierId),
          date: data.data.date,
          dueDate: dueDateStr,
          paymentTermsDays: paymentDays,
          subtotal: data.data.subtotal,
          itbis: data.data.itbis || "0",
          total: data.data.total,
          notes: data.data.notes || null,
          expenseCategoryId: parseInt(data.data.expenseCategoryId),
          expenseSubcategoryId: parseInt(data.data.expenseSubcategoryId),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "No se pudo actualizar la factura" }));
        throw new Error(errorData.error || "No se pudo actualizar la factura");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplierPendingInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["supplierBalances"] });
      setIsDialogOpen(false);
      resetForm();
      showSuccess("Factura actualizada", "La factura de compra ha sido actualizada exitosamente.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/purchase-invoices/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error al eliminar factura" }));
        throw new Error(errorData.error || "Failed to delete purchase invoice");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      refetchInvoices();
      playTrashSound();
      showSuccess("Factura eliminada", "La factura ha sido eliminada.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: { name: string; rnc?: string; phone?: string; email?: string }) => {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "active" }),
      });
      if (!response.ok) throw new Error("Error al crear proveedor");
      return response.json() as Promise<Supplier>;
    },
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      const supplier = newSupplier;
      setFormData(prev => ({ 
        ...prev, 
        supplierId: String(supplier.id),
        paymentTermsDays: String(supplier.paymentTermsDays || 30)
      }));
      setIsSupplierSheetOpen(false);
      setNewSupplierName("");
      setNewSupplierRnc("");
      setNewSupplierPhone("");
      setNewSupplierEmail("");
      showSuccess("Proveedor Creado", `${newSupplier.name} ha sido agregado y seleccionado.`);
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleCreateSupplier = () => {
    if (!newSupplierName.trim()) {
      showError("Error", "El nombre del proveedor es requerido.");
      return;
    }
    createSupplierMutation.mutate({
      name: newSupplierName.trim(),
      rnc: newSupplierRnc.trim() || undefined,
      phone: newSupplierPhone.trim() || undefined,
      email: newSupplierEmail.trim() || undefined,
    });
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingInvoice(null);
    setHasNcf(false);
  };

  const handleEdit = (invoice: PurchaseInvoice) => {
    setEditingInvoice(invoice);
    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    const invoiceHasNcf = !!(invoice.ncf && invoice.ncf.trim());
    setHasNcf(invoiceHasNcf);
    const hasItbisOrNcf = !!(invoice.ncf && invoice.ncf.trim()) || (invoice.itbis && parseFloat(String(invoice.itbis)) > 0);
    setFormData({
      invoiceNumber: invoice.invoiceNumber,
      ncf: invoice.ncf || "",
      supplierId: String(invoice.supplierId),
      supplierRnc: supplier?.rnc || "",
      date: invoice.date,
      paymentTermsDays: String(invoice.paymentTermsDays),
      taxType: invoiceHasNcf ? "gravado" : "gravado",
      subtotal: String(invoice.subtotal),
      itbis: String(invoice.itbis),
      total: String(invoice.total),
      notes: invoice.notes || "",
      expenseCategoryId: invoice.expenseCategoryId ? String(invoice.expenseCategoryId) : "",
      expenseSubcategoryId: invoice.expenseSubcategoryId ? String(invoice.expenseSubcategoryId) : "",
      tipoComprobante: hasItbisOrNcf ? "comprobante_fiscal" : "consumidor_final",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar suplidor primero
    if (!formData.supplierId) {
      showError("Suplidor Requerido", "Por favor seleccione un suplidor para la factura.");
      return;
    }
    
    // Validar número de factura
    if (!formData.invoiceNumber.trim()) {
      showError("Número de Factura Requerido", "Por favor ingrese el número de factura del proveedor.");
      setHighlightedField("invoiceNumber");
      setTimeout(() => invoiceNumberRef.current?.focus(), 100);
      return;
    }
    
    // Validar fecha
    if (!formData.date) {
      showError("Fecha Requerida", "Por favor seleccione la fecha de la factura.");
      return;
    }
    
    // Validar total/monto
    if (!formData.total || parseFloat(formData.total) <= 0) {
      showError("Monto Requerido", "Por favor ingrese el monto total de la factura.");
      setHighlightedField("total");
      setTimeout(() => totalRef.current?.focus(), 100);
      return;
    }
    
    // Si tiene NCF, debe tener RNC
    if (formData.ncf && formData.ncf.trim() && !formData.supplierRnc?.trim()) {
      showError("RNC Requerido", "Si la factura tiene NCF, debe registrar el RNC del proveedor para reportes fiscales (DGII).");
      setHighlightedField("supplierRnc");
      setTimeout(() => supplierRncRef.current?.focus(), 100);
      return;
    }
    
    // Validar categoría de gasto
    if (!formData.expenseCategoryId) {
      showError("Categoría Requerida", "Por favor seleccione una categoría de gasto.");
      return;
    }
    
    // Validar subcategoría de gasto
    if (!formData.expenseSubcategoryId) {
      showError("Subcategoría Requerida", "Por favor seleccione una subcategoría de gasto.");
      return;
    }
    
    setHighlightedField(null);
    
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
      setIsDeleteConfirmOpen(false);
      setDeleteConfirmId(null);
    }
  };

  const handleQuickPayment = (invoice: PurchaseInvoice, balance: number) => {
    setQuickPaymentInvoice(invoice);
    setQuickPaymentBalance(balance);
    setQuickPaymentData({
      amount: balance.toFixed(2),
      method: "efectivo",
      reference: "",
      date: getLocalDateString(),
      dateDisplay: (() => {
        const today = getLocalDateString();
        const [year, month, day] = today.split("-");
        return `${day}/${month}/${year}`;
      })(),
    });
    setQuickPaymentOpen(true);
  };

  const quickPaymentMutation = useMutation({
    mutationFn: async (data: { invoiceId: number; supplierId: number; amount: string; date: string; method: string; reference: string }) => {
      const response = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: data.supplierId,
          purchaseInvoiceId: data.invoiceId,
          amount: data.amount,
          date: data.date,
          method: data.method,
          reference: data.reference || null,
          notes: null,
          paymentAccountId: null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al registrar pago");
      }
      return { ...await response.json(), invoiceId: data.invoiceId, paidAmount: parseFloat(data.amount) };
    },
    onSuccess: (data) => {
      showSuccess("Pago Registrado", "El pago se ha registrado correctamente");
      setQuickPaymentOpen(false);
      setQuickPaymentInvoice(null);
      // Optimistically update the specific invoice's balance immediately
      const newBalance = Math.max(0, quickPaymentBalance - data.paidAmount);
      queryClient.setQueryData(["purchaseInvoiceBalance", data.invoiceId], { balance: newBalance.toFixed(2) });
      // Then invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoiceBalance", data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoicePayments", data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["supplierPayments"] });
      queryClient.invalidateQueries({ queryKey: ["supplierBalances"] });
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
      supplierId: quickPaymentInvoice.supplierId,
      amount: quickPaymentData.amount,
      date: quickPaymentData.date,
      method: quickPaymentData.method,
      reference: quickPaymentData.reference,
    });
  };

  const handleCancelPayment = (payment: SupplierPayment) => {
    setPaymentToCancel(payment);
    setCancelPaymentOpen(true);
  };

  const cancelPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, invoiceId }: { paymentId: number; invoiceId: number }) => {
      const response = await fetch(`/api/supplier-payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al anular el pago");
      }
      return { success: true, invoiceId };
    },
    onSuccess: (data) => {
      playTrashSound();
      showSuccess("Pago Anulado", "El pago se ha anulado correctamente");
      setCancelPaymentOpen(false);
      setPaymentToCancel(null);
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoiceBalance", data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoicePayments", data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["supplierPayments"] });
      queryClient.invalidateQueries({ queryKey: ["supplierBalances"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const confirmCancelPayment = () => {
    if (paymentToCancel && paymentToCancel.purchaseInvoiceId) {
      cancelPaymentMutation.mutate({ 
        paymentId: paymentToCancel.id, 
        invoiceId: paymentToCancel.purchaseInvoiceId 
      });
    }
  };

  const calculateFromTotal = (newTotal?: string, taxType?: string, customItbis?: string) => {
    const total = parseFloat(newTotal ?? formData.total) || 0;
    const type = taxType ?? formData.taxType;
    
    let subtotal = 0;
    let itbis = 0;
    
    if (type === "gravado") {
      subtotal = total / 1.18;
      itbis = total - subtotal;
    } else if (type === "exento") {
      subtotal = total;
      itbis = 0;
    } else if (type === "personalizado") {
      itbis = parseFloat(customItbis ?? formData.itbis) || 0;
      subtotal = total - itbis;
    }
    
    setFormData(prev => ({
      ...prev,
      total: newTotal ?? prev.total,
      taxType: type,
      subtotal: subtotal.toFixed(2),
      itbis: itbis.toFixed(2),
    }));
  };

  const handleTaxTypeChange = (value: string) => {
    const totalAmount = parseFloat(formData.total) || 0;
    let subtotal = 0;
    let itbis = 0;
    
    if (value === "gravado") {
      subtotal = totalAmount / 1.18;
      itbis = totalAmount - subtotal;
    } else if (value === "exento") {
      subtotal = totalAmount;
      itbis = 0;
    } else if (value === "personalizado") {
      itbis = parseFloat(formData.itbis) || 0;
      subtotal = totalAmount - itbis;
    }
    
    setFormData({
      ...formData,
      taxType: value,
      subtotal: subtotal.toFixed(2),
      itbis: itbis.toFixed(2),
    });
  };

  const handleItbisChange = (value: string) => {
    const totalAmount = parseFloat(formData.total) || 0;
    const itbis = parseFloat(value) || 0;
    const subtotal = totalAmount - itbis;
    setFormData({
      ...formData,
      itbis: value,
      subtotal: subtotal.toFixed(2),
    });
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || "Desconocido";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Pagada</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Anulada</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Pendiente</Badge>;
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4 inline-block ml-1" /> : 
      <ArrowDown className="h-4 w-4 inline-block ml-1" />;
  };

  const referenceDate = customEndDate || getLocalDateString();
  
  const getEffectiveDueDate = (inv: PurchaseInvoice): string | null => {
    if (inv.dueDate) return inv.dueDate;
    if (inv.date && inv.paymentTermsDays !== null && inv.paymentTermsDays !== undefined) {
      const invoiceDate = new Date(inv.date);
      invoiceDate.setDate(invoiceDate.getDate() + inv.paymentTermsDays);
      return invoiceDate.toISOString().split('T')[0];
    }
    return null;
  };

  let filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Filtrar por fecha
    const dateRange = getDateRange();
    if (dateRange) {
      const invoiceDate = new Date(invoice.date + "T00:00:00");
      if (invoiceDate < dateRange.start || invoiceDate > dateRange.end) {
        return false;
      }
    }
    
    // Si no hay término de búsqueda, solo filtrar por estado
    if (!searchLower) {
      if (statusFilter === "all") return true;
      if (statusFilter === "overdue") {
        // Vencida: pendiente con fecha de vencimiento pasada
        if (invoice.status === 'cancelled' || invoice.status === 'paid') return false;
        const balance = getInvoiceBalance(invoice);
        if (balance <= 0) return false;
        const dueDate = getEffectiveDueDate(invoice);
        return dueDate !== null && dueDate <= referenceDate;
      }
      return invoice.status === statusFilter;
    }
    
    // Búsqueda por nombre de suplidor
    const supplierMatch = getSupplierName(invoice.supplierId).toLowerCase().includes(searchLower);
    
    // Búsqueda por número de factura o NCF
    const invoiceNumberMatch = 
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.internalNumber.toLowerCase().includes(searchLower) ||
      (invoice.ncf && invoice.ncf.toLowerCase().includes(searchLower));
    
    // Búsqueda por fecha (soporta DD/MM/YYYY y YYYY-MM-DD)
    const invoiceDate = formatDate(invoice.date); // DD/MM/YYYY
    const dateMatch = invoiceDate.includes(searchLower) || invoice.date.includes(searchLower);
    
    // Búsqueda por monto (total o balance)
    const totalStr = parseFloat(String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2 });
    const amountMatch = 
      totalStr.includes(searchLower) ||
      searchLower.includes(String(parseFloat(String(invoice.total))));
    
    const matchesSearch = supplierMatch || invoiceNumberMatch || dateMatch || amountMatch;
    let matchesStatus = false;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "overdue") {
      // Vencida: pendiente con fecha de vencimiento pasada
      if (invoice.status !== 'cancelled' && invoice.status !== 'paid') {
        const balance = getInvoiceBalance(invoice);
        if (balance > 0) {
          const dueDate = getEffectiveDueDate(invoice);
          matchesStatus = dueDate !== null && dueDate <= referenceDate;
        }
      }
    } else {
      matchesStatus = invoice.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Aplicar ordenamiento
  if (sortColumn) {
    filteredInvoices = [...filteredInvoices].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortColumn) {
        case "supplier":
          aVal = getSupplierName(a.supplierId).toLowerCase();
          bVal = getSupplierName(b.supplierId).toLowerCase();
          break;
        case "date":
          aVal = new Date(a.date + 'T00:00:00').getTime();
          bVal = new Date(b.date + 'T00:00:00').getTime();
          break;
        case "invoiceNumber":
          aVal = a.invoiceNumber.toLowerCase();
          bVal = b.invoiceNumber.toLowerCase();
          break;
        case "amount":
          aVal = parseFloat(String(a.total));
          bVal = parseFloat(String(b.total));
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const filteredTotalFacturado = filteredInvoices
    .reduce((sum, inv) => sum + parseFloat(String(inv.total)), 0);

  const filteredTotalPaid = filteredInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(String(inv.total)), 0);

  const filteredTotalPending = filteredInvoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + getInvoiceBalance(inv), 0);

  const filteredTotalOverdue = filteredInvoices
    .filter(inv => {
      if (inv.status === 'cancelled' || inv.status === 'paid') return false;
      const balance = getInvoiceBalance(inv);
      if (balance <= 0) return false;
      const dueDate = getEffectiveDueDate(inv);
      return dueDate && dueDate <= referenceDate;
    })
    .reduce((sum, inv) => sum + getInvoiceBalance(inv), 0);
  const filteredOverdueCount = filteredInvoices
    .filter(inv => {
      if (inv.status === 'cancelled' || inv.status === 'paid') return false;
      const balance = getInvoiceBalance(inv);
      if (balance <= 0) return false;
      const dueDate = getEffectiveDueDate(inv);
      return dueDate && dueDate <= referenceDate;
    }).length;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Facturas de Compra
            </h1>
            <p className="text-muted-foreground mt-1">Gestiona las facturas de tus proveedores.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/supplier-payments/new">
              <Button variant="outline" data-testid="button-new-payment">
                <Wallet className="w-4 h-4 mr-2" />
                Registrar Pago
              </Button>
            </Link>
            <Button 
              data-testid="button-new-purchase-invoice"
              onClick={() => {
                resetForm();
                setFormData(prev => ({ ...prev, date: getLocalDateString() }));
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Factura
            </Button>
            <Sheet open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
            <SheetContent className="w-[500px] sm:w-[550px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{editingInvoice ? "Editar Factura" : "Registrar Factura de Compra"}</SheetTitle>
                <SheetDescription>
                  {editingInvoice ? "Modifique los datos de la factura." : "Registre una nueva factura recibida de un proveedor."}
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fecha *</Label>
                    <div className="flex items-center">
                      <Input
                        type="text"
                        value={formData.date ? toDisplayDate(formData.date) : ''}
                        onChange={(e) => {
                          const formatted = formatDateInput(e.target.value);
                          const iso = toISODate(formatted);
                          if (iso) {
                            setFormData({ ...formData, date: iso });
                          }
                        }}
                        placeholder="dd/mm/yyyy"
                        className="rounded-r-none border-r-0"
                        data-testid="input-date"
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
                            selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const localDate = getLocalDateString(date);
                                setFormData({ ...formData, date: localDate });
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Comprobante *</Label>
                    <Select
                      value={formData.tipoComprobante}
                      onValueChange={(value) => {
                        setFormData({ 
                          ...formData, 
                          tipoComprobante: value,
                          ncf: value === "consumidor_final" ? "" : formData.ncf,
                          itbis: value === "consumidor_final" ? "0" : formData.itbis,
                          taxType: value === "consumidor_final" ? "exento" : formData.taxType
                        });
                        if (value === "consumidor_final") {
                          setHasNcf(false);
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-tipo-comprobante">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                        <SelectItem value="comprobante_fiscal">Comprobante Fiscal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Suplidor *</Label>
                    <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={supplierPopoverOpen}
                          className="w-full justify-between font-normal"
                          data-testid="select-supplier"
                        >
                          {formData.supplierId ? (
                            <span className="truncate">
                              {suppliers.find(s => String(s.id) === formData.supplierId)?.name || "Seleccione un suplidor..."}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Seleccione un suplidor...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar suplidor por nombre o RNC..." data-testid="input-search-supplier" />
                          <CommandList>
                            <CommandEmpty>No se encontraron suplidores.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__create_new__"
                                onSelect={() => {
                                  setSupplierPopoverOpen(false);
                                  setIsSupplierSheetOpen(true);
                                }}
                                className="text-blue-600 font-medium"
                                data-testid="option-create-supplier"
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                + Crear Nuevo Suplidor
                              </CommandItem>
                            </CommandGroup>
                            <CommandGroup>
                              {suppliers.filter(s => s.status === 'active').map(supplier => (
                                <CommandItem
                                  key={supplier.id}
                                  value={`${supplier.name} ${supplier.rnc || ''}`}
                                  onSelect={() => {
                                    const defaultCategoryId = supplier.defaultExpenseCategoryId ? Number(supplier.defaultExpenseCategoryId) : null;
                                    const currentCategoryId = formData.expenseCategoryId ? Number(formData.expenseCategoryId) : null;
                                    const categoryChanged = defaultCategoryId !== null && defaultCategoryId !== currentCategoryId;
                                    setFormData({ 
                                      ...formData, 
                                      supplierId: String(supplier.id),
                                      supplierRnc: supplier.rnc || "",
                                      paymentTermsDays: String(supplier.paymentTermsDays || 30),
                                      expenseCategoryId: defaultCategoryId !== null ? String(defaultCategoryId) : formData.expenseCategoryId,
                                      expenseSubcategoryId: categoryChanged ? "" : formData.expenseSubcategoryId
                                    });
                                    setSupplierPopoverOpen(false);
                                  }}
                                  data-testid={`option-supplier-${supplier.id}`}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.supplierId === String(supplier.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex items-center gap-2">
                                    <span>{supplier.name}</span>
                                    {supplier.rnc && <span className="text-muted-foreground text-xs">({supplier.rnc})</span>}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {formData.tipoComprobante !== "consumidor_final" && (
                    <div className="space-y-2">
                      <Label>RNC Suplidor</Label>
                      <Input
                        ref={supplierRncRef}
                        value={formData.supplierRnc || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, supplierRnc: e.target.value.toUpperCase() });
                          if (highlightedField === "supplierRnc") setHighlightedField(null);
                        }}
                        className={cn("uppercase", highlightedField === "supplierRnc" && "bg-yellow-100")}
                        data-testid="input-supplier-rnc"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>No. Factura Suplidor *</Label>
                    <Input
                      ref={invoiceNumberRef}
                      value={formData.invoiceNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, invoiceNumber: e.target.value });
                        if (highlightedField === "invoiceNumber") setHighlightedField(null);
                      }}
                      className={cn(highlightedField === "invoiceNumber" && "bg-yellow-100")}
                      data-testid="input-invoice-number"
                    />
                  </div>
                  {formData.tipoComprobante !== "consumidor_final" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="hasNcf"
                          checked={hasNcf}
                          onCheckedChange={(checked) => {
                            setHasNcf(checked === true);
                            if (checked) {
                              setFormData({ ...formData, taxType: "gravado" });
                            } else {
                              setFormData({ ...formData, ncf: "" });
                            }
                          }}
                          data-testid="checkbox-has-ncf"
                        />
                        <Label htmlFor="hasNcf" className="cursor-pointer">NCF</Label>
                      </div>
                      <Input
                        value={formData.ncf}
                        onChange={(e) => setFormData({ ...formData, ncf: e.target.value.toUpperCase() })}
                        className={cn("uppercase", !hasNcf && "bg-muted")}
                        disabled={!hasNcf}
                        data-testid="input-ncf"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Términos de Pago</Label>
                    <Select
                      value={formData.paymentTermsDays}
                      onValueChange={(value) => setFormData({ ...formData, paymentTermsDays: value })}
                    >
                      <SelectTrigger data-testid="select-payment-terms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Al Contado</SelectItem>
                        <SelectItem value="15">15 días</SelectItem>
                        <SelectItem value="30">30 días</SelectItem>
                        <SelectItem value="45">45 días</SelectItem>
                        <SelectItem value="60">60 días</SelectItem>
                        <SelectItem value="90">90 días</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Impuesto</Label>
                    <Select
                      value={formData.taxType}
                      onValueChange={handleTaxTypeChange}
                      disabled={hasNcf}
                    >
                      <SelectTrigger data-testid="select-tax-type" className={hasNcf ? "bg-muted" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gravado">Gravado (18%)</SelectItem>
                        <SelectItem value="exento">Exento</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Factura (RD$) *</Label>
                    <Input
                      ref={totalRef}
                      type="number"
                      step="0.01"
                      value={formData.total}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setFormData({ ...formData, total: value });
                        if (highlightedField === "total") setHighlightedField(null);
                      }}
                      onKeyDown={(e) => {
                        if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={() => calculateFromTotal()}
                      placeholder="0.00"
                      className={cn("text-lg font-semibold", highlightedField === "total" && "bg-yellow-100")}
                      data-testid="input-total"
                    />
                  </div>
                  {formData.tipoComprobante !== "consumidor_final" && (
                    <div className="space-y-2">
                      <Label>ITBIS (RD$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.itbis}
                        onChange={(e) => handleItbisChange(e.target.value)}
                        placeholder="0.00"
                        disabled={formData.taxType === "exento" || formData.taxType === "gravado"}
                        className={formData.taxType !== "personalizado" ? "bg-muted" : ""}
                        data-testid="input-itbis"
                      />
                    </div>
                  )}
                  {formData.tipoComprobante !== "consumidor_final" && (
                    <div className="space-y-2">
                      <Label>Subtotal (RD$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.subtotal}
                        placeholder="0.00"
                        disabled
                        className="bg-muted"
                        data-testid="input-subtotal"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Categoría de Gasto <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.expenseCategoryId}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        expenseCategoryId: value,
                        expenseSubcategoryId: "" 
                      })}
                      required
                    >
                      <SelectTrigger data-testid="select-expense-category" className={!formData.expenseCategoryId ? "border-red-200" : ""}>
                        <SelectValue placeholder="Seleccionar categoría..." />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.filter(c => c.status === "active").map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategoría <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.expenseSubcategoryId}
                      onValueChange={(value) => setFormData({ ...formData, expenseSubcategoryId: value })}
                      disabled={!formData.expenseCategoryId || filteredSubcategories.length === 0}
                      required
                    >
                      <SelectTrigger data-testid="select-expense-subcategory" className={formData.expenseCategoryId && !formData.expenseSubcategoryId ? "border-red-200" : ""}>
                        <SelectValue placeholder={!formData.expenseCategoryId ? "Seleccione categoría primero" : (filteredSubcategories.length === 0 ? "Sin subcategorías" : "Seleccionar subcategoría...")} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubcategories.filter(s => s.status === "active").map((sub) => (
                          <SelectItem key={sub.id} value={String(sub.id)}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      data-testid="input-notes"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1" data-testid="button-cancel">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending || createMutation.isPending} className="flex-1" data-testid="button-submit-invoice">
                    {editingInvoice ? (updateMutation.isPending ? "Actualizando..." : "Actualizar Factura") : (createMutation.isPending ? "Guardando..." : "Registrar Factura")}
                  </Button>
                </div>
              </form>
            </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Facturado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                RD$ {filteredTotalFacturado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredInvoices.length} facturas en el período
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pagado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                RD$ {filteredTotalPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredInvoices.filter(i => i.status === 'paid').length} facturas pagadas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendiente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                RD$ {filteredTotalPending.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredInvoices.filter(i => i.status === 'pending').length} facturas pendientes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Vencido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                RD$ {filteredTotalOverdue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredOverdueCount} facturas vencidas
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar facturas..."
                  className="pl-9 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-invoices"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Desde:</span>
                <div className="flex items-center">
                  <Input 
                    type="text" 
                    value={customStartDateDisplay} 
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setCustomStartDateDisplay(formatted);
                      const iso = toISODate(formatted);
                      if (iso) setCustomStartDate(iso);
                    }}
                    placeholder="dd/mm/yyyy"
                    className="w-[110px] h-8 rounded-r-none border-r-0"
                    data-testid="input-custom-start-date"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" type="button">
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
                            setCustomStartDateDisplay(toDisplayDate(localDate));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-sm text-muted-foreground">Hasta:</span>
                <div className="flex items-center">
                  <Input 
                    type="text" 
                    value={customEndDateDisplay} 
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setCustomEndDateDisplay(formatted);
                      const iso = toISODate(formatted);
                      if (iso) setCustomEndDate(iso);
                    }}
                    placeholder="dd/mm/yyyy"
                    className="w-[110px] h-8 rounded-r-none border-r-0"
                    data-testid="input-custom-end-date"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" type="button">
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
                            setCustomEndDateDisplay(toDisplayDate(localDate));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagada</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                    <SelectItem value="cancelled">Anulada</SelectItem>
                  </SelectContent>
                </Select>
                {(customStartDate || customEndDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCustomStartDate(""); setCustomEndDate(""); setCustomStartDateDisplay(""); setCustomEndDateDisplay(""); }}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-dates"
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("date")}>
                  Fecha {getSortIcon("date")}
                </TableHead>
                <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("supplier")}>
                  Suplidor {getSortIcon("supplier")}
                </TableHead>
                <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("invoiceNumber")}>
                  No. Factura {getSortIcon("invoiceNumber")}
                </TableHead>
                <TableHead className="text-center">NCF</TableHead>
                <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("amount")}>
                  Monto {getSortIcon("amount")}
                </TableHead>
                <TableHead className="text-center">Balance</TableHead>
                <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("status")}>
                  Estado {getSortIcon("status")}
                </TableHead>
                <TableHead className="text-center">Días Vencido</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Cargando facturas...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    No se encontraron facturas
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <InvoiceRow 
                    key={invoice.id} 
                    invoice={invoice} 
                    getSupplierName={getSupplierName}
                    formatDate={formatDate}
                    handleDelete={handleDelete}
                    handleEdit={handleEdit}
                    handleQuickPayment={handleQuickPayment}
                    handleCancelPayment={handleCancelPayment}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={isSupplierSheetOpen} onOpenChange={setIsSupplierSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Crear Nuevo Suplidor
            </SheetTitle>
            <SheetDescription>
              Ingresa los datos del nuevo suplidor. Se seleccionará automáticamente al guardar.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplierName" className="text-sm font-medium">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="supplierName"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Nombre del suplidor o empresa"
                data-testid="input-new-supplier-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierRnc" className="text-sm font-medium">
                RNC
              </Label>
              <Input
                id="supplierRnc"
                value={newSupplierRnc}
                onChange={(e) => setNewSupplierRnc(e.target.value)}
                placeholder="Número de RNC"
                data-testid="input-new-supplier-rnc"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierPhone" className="text-sm font-medium">
                Teléfono
              </Label>
              <Input
                id="supplierPhone"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                placeholder="Teléfono de contacto"
                data-testid="input-new-supplier-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierEmail" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="supplierEmail"
                type="email"
                value={newSupplierEmail}
                onChange={(e) => setNewSupplierEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                data-testid="input-new-supplier-email"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSupplierSheetOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreateSupplier}
                disabled={createSupplierMutation.isPending}
                className="flex-1"
                data-testid="button-save-new-supplier"
              >
                {createSupplierMutation.isPending ? "Guardando..." : "Guardar Suplidor"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <MessagePopup
        open={message.open}
        onClose={closeMessage}
        title={message.title}
        description={message.description}
        type={message.type}
      />
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular Factura</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar esta factura? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={quickPaymentOpen} onOpenChange={setQuickPaymentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Registrar Pago Rápido
            </DialogTitle>
            <DialogDescription>
              {quickPaymentInvoice && (
                <>
                  Factura <span className="font-medium">{quickPaymentInvoice.invoiceNumber}</span> - 
                  Suplidor: <span className="font-medium">{getSupplierName(quickPaymentInvoice.supplierId)}</span>
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

      <AlertDialog open={cancelPaymentOpen} onOpenChange={setCancelPaymentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular Pago</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentToCancel && (
                <>
                  ¿Está seguro de que desea anular el pago <span className="font-medium">#{paymentToCancel.paymentNumber}</span> por{" "}
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
    </Layout>
  );
}
