import { useState, useEffect, useMemo } from "react";
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
import { ArrowLeft, Save, AlertCircle, CheckCircle2, ChevronsUpDown, Check, UserPlus, Calendar, ArrowUp, ArrowDown, Coins, ArrowRightLeft } from "lucide-react";
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
import type { Customer, Invoice, Payment } from "@shared/schema";

interface InvoiceWithBalance extends Invoice {
  balance: string;
}

interface AdvanceWithBalance extends Payment {
  remainingBalance: string;
}

interface AllocationMap {
  [invoiceId: number]: string;
}

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

export default function NewCustomerPayment() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const { playPaymentSound } = useSoundEffects();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentDateDisplay, setPaymentDateDisplay] = useState(toDisplayDate(getLocalDateString()));
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<AllocationMap>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successPaymentAmount, setSuccessPaymentAmount] = useState("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerRnc, setNewCustomerRnc] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [sortField, setSortField] = useState<"date" | "invoiceNumber" | "total" | "balance">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: "date" | "invoiceNumber" | "total" | "balance") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; rnc?: string; phone?: string; email?: string }) => {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "active" }),
      });
      if (!response.ok) throw new Error("Error al crear cliente");
      return response.json() as Promise<Customer>;
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedCustomerId(String(newCustomer.id));
      setIsCustomerSheetOpen(false);
      setNewCustomerName("");
      setNewCustomerRnc("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      showSuccess("Cliente Creado", `${newCustomer.name} ha sido agregado y seleccionado.`);
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) {
      showError("Error", "El nombre del cliente es requerido.");
      return;
    }
    createCustomerMutation.mutate({
      name: newCustomerName.trim(),
      rnc: newCustomerRnc.trim() || undefined,
      phone: newCustomerPhone.trim() || undefined,
      email: newCustomerEmail.trim() || undefined,
    });
  };

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json() as Promise<Customer[]>;
    },
  });

  const activeCustomers = customers.filter(c => c.status === 'active');

  const { data: customerBalances = {} } = useQuery({
    queryKey: ["customerBalances", paymentDate, activeCustomers.map(c => c.id).join(',')],
    queryFn: async () => {
      const balances: Record<number, { totalPending: string; totalOverdue: string }> = {};
      await Promise.all(
        activeCustomers.map(async (customer) => {
          try {
            const response = await fetch(`/api/customers/${customer.id}/balances?date=${paymentDate}`);
            if (response.ok) {
              balances[customer.id] = await response.json();
            }
          } catch {
            balances[customer.id] = { totalPending: "0.00", totalOverdue: "0.00" };
          }
        })
      );
      return balances;
    },
    enabled: activeCustomers.length > 0,
  });

  const { data: pendingInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["customerPendingInvoices", selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const response = await fetch(`/api/customers/${selectedCustomerId}/pending-invoices`);
      if (!response.ok) throw new Error("Failed to fetch pending invoices");
      return response.json() as Promise<InvoiceWithBalance[]>;
    },
    enabled: !!selectedCustomerId,
  });

  const { data: availableAdvances = [], isLoading: loadingAdvances } = useQuery({
    queryKey: ["availableAdvances", selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const response = await fetch(`/api/customers/${selectedCustomerId}/advances/available`);
      if (!response.ok) throw new Error("Failed to fetch advances");
      return response.json() as Promise<AdvanceWithBalance[]>;
    },
    enabled: !!selectedCustomerId,
  });

  const totalAvailableAdvances = availableAdvances.reduce(
    (sum, adv) => sum + parseFloat(adv.remainingBalance || "0"),
    0
  );

  const applyAdvanceMutation = useMutation({
    mutationFn: async ({ advanceId, invoiceId, amount }: { advanceId: number; invoiceId: number; amount: number }) => {
      const response = await fetch(`/api/advances/${advanceId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, amount, date: paymentDate, notes: "Aplicado desde cobros unificados" }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error al aplicar anticipo" }));
        throw new Error(error.error || "Failed to apply advance");
      }
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["availableAdvances", selectedCustomerId] }),
        queryClient.invalidateQueries({ queryKey: ["customerPendingInvoices", selectedCustomerId] }),
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["invoiceBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["customerBalances"] }),
      ]);
      showSuccess("Anticipo Aplicado", "El anticipo ha sido aplicado a la factura exitosamente.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleApplyAdvanceToInvoice = (advance: AdvanceWithBalance, invoice: InvoiceWithBalance) => {
    const advanceRemaining = parseFloat(advance.remainingBalance || "0");
    const invoiceBalance = parseFloat(invoice.balance || String(invoice.total));
    const amountToApply = Math.min(advanceRemaining, invoiceBalance);
    
    if (amountToApply <= 0) {
      showError("Error", "No hay monto disponible para aplicar.");
      return;
    }

    applyAdvanceMutation.mutate({
      advanceId: advance.id,
      invoiceId: invoice.id,
      amount: amountToApply
    });
  };

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
        case "balance":
          comparison = parseFloat(a.balance) - parseFloat(b.balance);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [pendingInvoices, sortField, sortDirection]);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      customerId: number;
      amount: string;
      date: string;
      method: string;
      reference: string | null;
      notes: string | null;
      allocations: { invoiceId: number; amount: string }[];
    }) => {
      const response = await fetch("/api/customer-payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error al procesar el cobro" }));
        throw new Error(error.error || "Failed to create payment");
      }
      return response.json();
    },
    onSuccess: () => {
      // Mostrar el popup de éxito PRIMERO, antes de invalidar queries
      setSuccessPaymentAmount(totalPayment.toLocaleString('es-DO', { minimumFractionDigits: 2 }));
      setShowSuccessDialog(true);
      playPaymentSound();
      
      // Invalidar queries después de un delay para que el usuario vea el popup con los datos actuales
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["payments"] });
        queryClient.invalidateQueries({ queryKey: ["customerPendingInvoices"] });
        queryClient.invalidateQueries({ queryKey: ["invoiceBalance"] });
        queryClient.invalidateQueries({ queryKey: ["customerBalances"] });
        queryClient.invalidateQueries({ queryKey: ["allPayments"] });
        queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
        queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      }, 500);
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  useEffect(() => {
    setAllocations({});
  }, [selectedCustomerId]);

  const totalPayment = Object.values(allocations).reduce(
    (sum, val) => sum + (parseFloat(val) || 0), 
    0
  );

  const totalPendingBalance = pendingInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.balance || String(inv.total)), 
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
    
    if (!selectedCustomerId) {
      showError("Error", "Seleccione un cliente.");
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
      customerId: parseInt(selectedCustomerId),
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

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="icon" type="button" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Registrar Cobro a Cliente
            </h1>
            <p className="text-muted-foreground mt-1">
              Seleccione el cliente y distribuya el cobro entre sus facturas pendientes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cobro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha del Cobro *</Label>
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
                        className="flex-1 rounded-r-none border-r-0"
                        data-testid="input-payment-date"
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

                  <div className="col-span-3 space-y-2">
                    <Label>Cliente *</Label>
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerPopoverOpen}
                          className="w-full justify-between font-normal"
                          data-testid="select-customer"
                        >
                          {selectedCustomerId ? (
                            <span className="truncate">
                              {(() => {
                                const customer = activeCustomers.find(c => String(c.id) === selectedCustomerId);
                                if (!customer) return "Seleccione un cliente...";
                                const balances = customerBalances[customer.id];
                                const pending = parseFloat(balances?.totalPending || "0");
                                return (
                                  <span className="flex items-center gap-2">
                                    <span>{customer.name}</span>
                                    {customer.rnc && <span className="text-muted-foreground">({customer.rnc})</span>}
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
                            <span className="text-muted-foreground">Seleccione un cliente...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cliente por nombre o RNC..." data-testid="input-search-customer" />
                          <CommandList>
                            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__create_new__"
                                onSelect={() => {
                                  setCustomerPopoverOpen(false);
                                  setIsCustomerSheetOpen(true);
                                }}
                                className="text-blue-600 font-medium"
                                data-testid="option-create-customer"
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                + Crear Nuevo Cliente
                              </CommandItem>
                            </CommandGroup>
                            <CommandGroup>
                              {activeCustomers.map(customer => {
                                const balances = customerBalances[customer.id];
                                const pending = parseFloat(balances?.totalPending || "0");
                                const overdue = parseFloat(balances?.totalOverdue || "0");
                                return (
                                  <CommandItem
                                    key={customer.id}
                                    value={`${customer.name} ${customer.rnc || ''}`}
                                    onSelect={() => {
                                      setSelectedCustomerId(String(customer.id));
                                      setCustomerPopoverOpen(false);
                                    }}
                                    data-testid={`option-customer-${customer.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCustomerId === String(customer.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex items-center justify-between w-full gap-4">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{customer.name}</span>
                                        {customer.rnc && <span className="text-xs text-muted-foreground">RNC: {customer.rnc}</span>}
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
                    <Label>Monto Total (RD$)</Label>
                    <Input
                      type="text"
                      value={totalPayment.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      readOnly
                      className="bg-muted font-semibold"
                      data-testid="input-payment-amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Método de Pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Referencia (Opcional)</Label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="No. cheque, transferencia, etc."
                      data-testid="input-reference"
                    />
                  </div>

                  <div className="col-span-4 space-y-2">
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

            {selectedCustomerId && (
              <>
                <div className="grid grid-cols-4 gap-4">
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
                        Monto del Cobro
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">
                        RD$ {totalPayment.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        a recibir
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
                      <div className="text-2xl font-bold text-blue-600">
                        {Object.values(allocations).filter(v => parseFloat(v) > 0).length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        de {pendingInvoices.length} pendientes
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={totalAvailableAdvances > 0 ? "border-amber-200 bg-amber-50/50" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Coins className="h-4 w-4 text-amber-600" />
                        Anticipos Disponibles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${totalAvailableAdvances > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                        RD$ {totalAvailableAdvances.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {availableAdvances.length} anticipos
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {availableAdvances.length > 0 && pendingInvoices.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-amber-800">Aplicar Anticipos a Facturas</CardTitle>
                      </div>
                      <p className="text-sm text-amber-700 mt-1">
                        Seleccione una factura para aplicar cada anticipo disponible
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-amber-100/50">
                            <TableHead className="text-center">Recibo</TableHead>
                            <TableHead className="text-center">Fecha</TableHead>
                            <TableHead className="text-center">Disponible</TableHead>
                            <TableHead className="text-center">Aplicar a Factura</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableAdvances.map((advance) => (
                            <TableRow key={advance.id} data-testid={`row-advance-${advance.id}`}>
                              <TableCell className="text-center font-medium">{advance.receiptNumber}</TableCell>
                              <TableCell className="text-center">{formatDate(advance.date)}</TableCell>
                              <TableCell className="text-center font-semibold text-amber-700">
                                RD$ {parseFloat(advance.remainingBalance).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">
                                <Select
                                  onValueChange={(invoiceId) => {
                                    const invoice = pendingInvoices.find(i => String(i.id) === invoiceId);
                                    if (invoice) {
                                      handleApplyAdvanceToInvoice(advance, invoice);
                                    }
                                  }}
                                  disabled={applyAdvanceMutation.isPending}
                                >
                                  <SelectTrigger className="w-[220px] mx-auto" data-testid={`select-invoice-for-advance-${advance.id}`}>
                                    <SelectValue placeholder="Seleccionar factura..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {pendingInvoices.map((invoice) => (
                                      <SelectItem key={invoice.id} value={String(invoice.id)}>
                                        {invoice.invoiceNumber} - RD$ {parseFloat(invoice.balance || String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Facturas Pendientes de {selectedCustomer?.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingInvoices ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Cargando facturas...
                      </div>
                    ) : pendingInvoices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8" />
                        <p>Este cliente no tiene facturas pendientes</p>
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
                                No Factura
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
                                Total
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
                            <TableHead className="text-center w-[180px]">Monto a Cobrar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedInvoices.map((invoice) => {
                            const balance = parseFloat(invoice.balance);
                            return (
                              <TableRow 
                                key={invoice.id}
                                data-testid={`row-invoice-${invoice.id}`}
                              >
                                <TableCell className="text-center">
                                  {formatDate(invoice.date)}
                                </TableCell>
                                <TableCell className="text-center font-medium">
                                  {invoice.invoiceNumber}
                                </TableCell>
                                <TableCell className="text-center">
                                  {invoice.ncf || '—'}
                                </TableCell>
                                <TableCell className="text-center">
                                  RD$ {parseFloat(String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-center font-medium text-red-600">
                                  RD$ {balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center gap-2 justify-center">
                                    <span className="text-sm text-muted-foreground">RD$</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={balance}
                                      value={allocations[invoice.id] || ""}
                                      onChange={(e) => handleAllocationChange(invoice.id, e.target.value, balance)}
                                      placeholder="0.00"
                                      className="w-32 text-right"
                                      data-testid={`input-allocation-${invoice.id}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAllocationChange(invoice.id, balance.toFixed(2), balance)}
                                      data-testid={`button-pay-full-${invoice.id}`}
                                    >
                                      Total
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex justify-end gap-4">
              <Link href="/invoices">
                <Button variant="outline" type="button" data-testid="button-cancel">
                  Cancelar
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={totalPayment <= 0 || createPaymentMutation.isPending}
                data-testid="button-submit"
              >
                <Save className="h-4 w-4 mr-2" />
                {createPaymentMutation.isPending ? "Procesando..." : "Registrar Cobro"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
              Cobro Registrado
            </DialogTitle>
            <DialogDescription>
              El cobro por RD$ {successPaymentAmount} ha sido registrado exitosamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                setSelectedCustomerId("");
                setAllocations({});
                setReference("");
                setNotes("");
              }}
              data-testid="button-new-payment"
            >
              Nuevo Cobro
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                navigate("/invoices");
              }}
              data-testid="button-go-invoices"
            >
              Ir a Facturas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={isCustomerSheetOpen} onOpenChange={setIsCustomerSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Crear Nuevo Cliente</SheetTitle>
            <SheetDescription>
              Agregue un nuevo cliente al sistema.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Nombre del cliente"
                data-testid="input-new-customer-name"
              />
            </div>
            <div className="space-y-2">
              <Label>RNC/Cédula</Label>
              <Input
                value={newCustomerRnc}
                onChange={(e) => setNewCustomerRnc(e.target.value)}
                placeholder="RNC o Cédula"
                data-testid="input-new-customer-rnc"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Teléfono"
                data-testid="input-new-customer-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                placeholder="Email"
                type="email"
                data-testid="input-new-customer-email"
              />
            </div>
            <Button 
              onClick={handleCreateCustomer}
              disabled={createCustomerMutation.isPending}
              data-testid="button-save-customer"
            >
              {createCustomerMutation.isPending ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <MessagePopup
        open={message.open}
        type={message.type}
        title={message.title}
        description={message.description}
        onClose={closeMessage}
      />
    </Layout>
  );
}
