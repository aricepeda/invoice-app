import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { ArrowLeft, Save, AlertCircle, CheckCircle2, ChevronsUpDown, Check, UserPlus, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, getLocalDateString } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import type { Supplier, PurchaseInvoice } from "@shared/schema";

interface InvoiceWithBalance extends PurchaseInvoice {
  balance: string;
}

interface AllocationMap {
  [invoiceId: number]: string;
}

export default function NewSupplierPayment() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const { playPaymentSound } = useSoundEffects();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentDateDisplay, setPaymentDateDisplay] = useState((() => {
    const today = getLocalDateString();
    const [year, month, day] = today.split("-");
    return `${day}/${month}/${year}`;
  })());

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
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<AllocationMap>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successPaymentAmount, setSuccessPaymentAmount] = useState("");
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [isSupplierSheetOpen, setIsSupplierSheetOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierRnc, setNewSupplierRnc] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [sortField, setSortField] = useState<"date" | "invoiceNumber" | "total" | "balance" | "daysOverdue">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: "date" | "invoiceNumber" | "total" | "balance" | "daysOverdue") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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
      setSelectedSupplierId(String(newSupplier.id));
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

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json() as Promise<Supplier[]>;
    },
  });

  const activeSuppliers = suppliers.filter(s => s.status === 'active');

  const { data: supplierBalances = {} } = useQuery({
    queryKey: ["supplierBalances", paymentDate, activeSuppliers.map(s => s.id).join(',')],
    queryFn: async () => {
      const balances: Record<number, { totalPending: string; totalOverdue: string }> = {};
      await Promise.all(
        activeSuppliers.map(async (supplier) => {
          try {
            const response = await fetch(`/api/suppliers/${supplier.id}/balances?date=${paymentDate}`);
            if (response.ok) {
              balances[supplier.id] = await response.json();
            }
          } catch {
            balances[supplier.id] = { totalPending: "0.00", totalOverdue: "0.00" };
          }
        })
      );
      return balances;
    },
    enabled: activeSuppliers.length > 0,
  });

  const { data: pendingInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["supplierPendingInvoices", selectedSupplierId],
    queryFn: async () => {
      if (!selectedSupplierId) return [];
      const response = await fetch(`/api/suppliers/${selectedSupplierId}/pending-invoices`);
      if (!response.ok) throw new Error("Failed to fetch pending invoices");
      return response.json() as Promise<InvoiceWithBalance[]>;
    },
    enabled: !!selectedSupplierId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const getDaysOverdue = useCallback((invoice: InvoiceWithBalance) => {
    const invoiceDate = new Date(invoice.date + 'T00:00:00');
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + (invoice.paymentTermsDays || 0));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const sortedInvoices = useMemo(() => {
    if (!pendingInvoices.length) return [];
    return [...pendingInvoices].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = a.date.localeCompare(b.date);
          break;
        case "invoiceNumber":
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
          break;
        case "total":
          comparison = parseFloat(String(a.total)) - parseFloat(String(b.total));
          break;
        case "balance": {
          const balanceA = parseFloat(a.balance) || 0;
          const balanceB = parseFloat(b.balance) || 0;
          comparison = balanceA - balanceB;
          break;
        }
        case "daysOverdue": {
          const daysA = getDaysOverdue(a);
          const daysB = getDaysOverdue(b);
          comparison = daysA - daysB;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [pendingInvoices, sortField, sortDirection, getDaysOverdue]);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      supplierId: number;
      amount: string;
      date: string;
      method: string;
      reference: string | null;
      notes: string | null;
      allocations: { invoiceId: number; amount: string }[];
    }) => {
      const response = await fetch("/api/supplier-payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error al procesar el pago" }));
        throw new Error(error.error || "Failed to create payment");
      }
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] }),
        queryClient.invalidateQueries({ queryKey: ["supplierPayments"] }),
        queryClient.invalidateQueries({ queryKey: ["supplierPendingInvoices"] }),
        queryClient.invalidateQueries({ queryKey: ["purchaseInvoiceBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["supplierBalances"] }),
        queryClient.invalidateQueries({ queryKey: ["invoicePayments"] }),
        queryClient.invalidateQueries({ queryKey: ["allSupplierPayments"] }),
        queryClient.invalidateQueries({ queryKey: ["payment-accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["account-transactions"] }),
      ]);
      
      setSuccessPaymentAmount(totalPayment.toLocaleString('es-DO', { minimumFractionDigits: 2 }));
      setShowSuccessDialog(true);
      playPaymentSound();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  useEffect(() => {
    setAllocations({});
  }, [selectedSupplierId]);

  const totalPayment = Object.values(allocations).reduce(
    (sum, val) => sum + (parseFloat(val) || 0), 
    0
  );

  const totalPendingBalance = pendingInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.balance || "0"), 
    0
  );

  const handleAllocationChange = (invoiceId: number, value: string, maxBalance: number) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return;
    if (numValue > maxBalance) {
      showError("Monto excedido", `El monto no puede superar el balance de la factura (RD$ ${maxBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })})`);
      return;
    }

    setAllocations(prev => ({
      ...prev,
      [invoiceId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplierId) {
      showError("Error", "Seleccione un suplidor.");
      return;
    }
    if (totalPayment <= 0) {
      showError("Error", "Ingrese al menos un monto en las facturas.");
      return;
    }

    const allocationsList = Object.entries(allocations)
      .filter(([, amount]) => parseFloat(amount) > 0)
      .map(([invoiceId, amount]) => ({
        invoiceId: parseInt(invoiceId),
        amount,
      }));

    createPaymentMutation.mutate({
      supplierId: parseInt(selectedSupplierId),
      amount: totalPayment.toFixed(2),
      date: paymentDate,
      method: paymentMethod,
      reference: reference || null,
      notes: notes || null,
      allocations: allocationsList,
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const selectedSupplier = suppliers.find(s => s.id === parseInt(selectedSupplierId));

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/purchase-invoices">
            <Button variant="outline" size="icon" type="button" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Registrar Pago a Proveedor
            </h1>
            <p className="text-muted-foreground mt-1">
              Seleccione el suplidor y distribuya el pago entre sus facturas pendientes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha *</Label>
                    <div className="flex items-center">
                      <Input 
                        type="text" 
                        value={paymentDateDisplay} 
                        onChange={(e) => {
                          const formatted = formatDateInput(e.target.value);
                          setPaymentDateDisplay(formatted);
                          const iso = toISODate(formatted);
                          if (iso) setPaymentDate(iso);
                        }}
                        placeholder="dd/mm/yyyy"
                        className="rounded-r-none border-r-0"
                        data-testid="input-payment-date"
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
                            selected={paymentDate ? new Date(paymentDate + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const localDate = getLocalDateString(date);
                                setPaymentDate(localDate);
                                setPaymentDateDisplay(toDisplayDate(localDate));
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="col-span-4 space-y-2">
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
                          {selectedSupplierId ? (
                            <span className="truncate">
                              {(() => {
                                const supplier = activeSuppliers.find(s => String(s.id) === selectedSupplierId);
                                if (!supplier) return "Seleccione un suplidor...";
                                const balances = supplierBalances[supplier.id];
                                const pending = parseFloat(balances?.totalPending || "0");
                                return (
                                  <span className="flex items-center gap-2">
                                    <span>{supplier.name}</span>
                                    {supplier.rnc && <span className="text-muted-foreground">({supplier.rnc})</span>}
                                    {pending > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        - Pend: RD$ {pending.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Seleccione un suplidor...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
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
                              {activeSuppliers.map(supplier => {
                                const balances = supplierBalances[supplier.id];
                                const pending = parseFloat(balances?.totalPending || "0");
                                const overdue = parseFloat(balances?.totalOverdue || "0");
                                return (
                                  <CommandItem
                                    key={supplier.id}
                                    value={`${supplier.name} ${supplier.rnc || ''}`}
                                    onSelect={() => {
                                      setSelectedSupplierId(String(supplier.id));
                                      setSupplierPopoverOpen(false);
                                    }}
                                    data-testid={`option-supplier-${supplier.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedSupplierId === String(supplier.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex items-center justify-between w-full gap-4">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{supplier.name}</span>
                                        {supplier.rnc && <span className="text-xs text-muted-foreground">RNC: {supplier.rnc}</span>}
                                      </div>
                                      {pending > 0 && (
                                        <div className="text-xs text-right">
                                          <div className="text-muted-foreground">
                                            Pend: RD$ {pending.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                          </div>
                                          {overdue > 0 && (
                                            <div className="text-red-500">
                                              Vencido: RD$ {overdue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Monto (RD$)</Label>
                    <Input
                      type="text"
                      value={totalPayment.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      readOnly
                      className="bg-muted font-semibold"
                      data-testid="input-payment-amount"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Método de Pago</Label>
                    <Select 
                      value={paymentMethod} 
                      onValueChange={setPaymentMethod}
                    >
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta de Crédito</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Referencia (Opcional)</Label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="No. cheque, transferencia, etc."
                      data-testid="input-reference"
                    />
                  </div>

                  <div className="col-span-6 space-y-2">
                    <Label>Notas (Opcional)</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas adicionales..."
                      data-testid="input-notes"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedSupplierId && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Balance Total Pendiente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        RD$ {totalPendingBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pendingInvoices.length} facturas pendientes
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Monto del Pago
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        RD$ {totalPayment.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        a distribuir
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Facturas Seleccionadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">
                        {Object.values(allocations).filter(v => parseFloat(v) > 0).length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        de {pendingInvoices.length} pendientes
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Facturas Pendientes de {selectedSupplier?.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingInvoices ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Cargando facturas...
                      </div>
                    ) : pendingInvoices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8" />
                        <p>Este suplidor no tiene facturas pendientes</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead 
                              className="text-center cursor-pointer hover:bg-muted"
                              onClick={() => handleSort("date")}
                            >
                              <div className="flex items-center justify-center gap-1">
                                Fecha
                                {sortField === "date" && (
                                  sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-center cursor-pointer hover:bg-muted"
                              onClick={() => handleSort("invoiceNumber")}
                            >
                              <div className="flex items-center justify-center gap-1">
                                No. Factura
                                {sortField === "invoiceNumber" && (
                                  sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="text-center">NCF</TableHead>
                            <TableHead 
                              className="text-center cursor-pointer hover:bg-muted"
                              onClick={() => handleSort("total")}
                            >
                              <div className="flex items-center justify-center gap-1">
                                Monto
                                {sortField === "total" && (
                                  sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-center cursor-pointer hover:bg-muted"
                              onClick={() => handleSort("balance")}
                            >
                              <div className="flex items-center justify-center gap-1">
                                Balance
                                {sortField === "balance" && (
                                  sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-center cursor-pointer hover:bg-muted"
                              onClick={() => handleSort("daysOverdue")}
                            >
                              <div className="flex items-center justify-center gap-1">
                                Días Vencido
                                {sortField === "daysOverdue" && (
                                  sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-[180px]">Monto a Pagar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedInvoices.map((invoice) => {
                            const balance = parseFloat(invoice.balance || String(invoice.total));
                            const allocated = parseFloat(allocations[invoice.id] || "0");
                            
                            return (
                              <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                                <TableCell className="text-center text-sm">{formatDate(invoice.date)}</TableCell>
                                <TableCell className="text-center text-sm font-medium">{invoice.invoiceNumber}</TableCell>
                                <TableCell className="text-center text-sm">{invoice.ncf || "—"}</TableCell>
                                <TableCell className="text-center text-sm">
                                  RD$ {parseFloat(String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium text-red-600">
                                  RD$ {balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {(() => {
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
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={balance}
                                    value={allocations[invoice.id] || ""}
                                    onChange={(e) => handleAllocationChange(invoice.id, e.target.value, balance)}
                                    placeholder="0.00"
                                    className="w-full text-center"
                                    data-testid={`input-allocation-${invoice.id}`}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={5} className="text-right text-sm">
                              Total a Pagar:
                            </TableCell>
                            <TableCell className="text-center text-sm">—</TableCell>
                            <TableCell className="text-center text-sm font-bold text-blue-600">
                              RD$ {totalPayment.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Link href="/purchase-invoices">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={createPaymentMutation.isPending || !selectedSupplierId || totalPayment <= 0}
                data-testid="button-submit-payment"
              >
                <Save className="w-4 h-4 mr-2" />
                {createPaymentMutation.isPending ? "Procesando..." : "Registrar Pago"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Pago Realizado
            </DialogTitle>
            <DialogDescription className="text-center text-lg mt-2">
              Se ha registrado exitosamente un pago de
              <span className="block text-2xl font-bold text-emerald-600 mt-2">
                RD$ {successPaymentAmount}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                navigate("/supplier-payments");
              }}
              className="px-8"
              data-testid="button-close-success"
            >
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </Layout>
  );
}
