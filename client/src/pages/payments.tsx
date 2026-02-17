import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Trash2, Search, Filter, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { getLocalDateString } from "@/lib/utils";
import type { Payment, Customer, Invoice } from "@shared/schema";

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

export default function Payments() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "advance" | "invoice">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateDisplay, setDateDisplay] = useState(toDisplayDate(getLocalDateString()));

  const [formData, setFormData] = useState({
    customerId: "",
    invoiceId: "",
    amount: "",
    date: getLocalDateString(),
    method: "efectivo",
    reference: "",
    notes: "",
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["allPayments"],
    queryFn: async () => {
      const response = await fetch("/api/payments");
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json() as Promise<Payment[]>;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json() as Promise<Customer[]>;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const response = await fetch("/api/invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json() as Promise<Invoice[]>;
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: parseInt(data.customerId),
          invoiceId: data.invoiceId ? parseInt(data.invoiceId) : null,
          amount: data.amount,
          date: data.date,
          method: data.method,
          reference: data.reference || null,
          notes: data.notes || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to create payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPayments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setIsDialogOpen(false);
      resetForm();
      showSuccess("Pago Registrado", "El pago ha sido registrado exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo registrar el pago.");
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete payment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPayments"] });
      showSuccess("Pago Eliminado", "El pago ha sido eliminado.");
    },
  });

  const resetForm = () => {
    const today = getLocalDateString();
    setFormData({
      customerId: "",
      invoiceId: "",
      amount: "",
      date: today,
      method: "efectivo",
      reference: "",
      notes: "",
    });
    setDateDisplay(toDisplayDate(today));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      showError("Error", "Seleccione un cliente.");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError("Error", "El monto debe ser mayor a 0.");
      return;
    }
    createPaymentMutation.mutate(formData);
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Cliente desconocido";
  };

  const getInvoiceNumber = (invoiceId: number | null) => {
    if (!invoiceId) return null;
    const invoice = invoices.find(i => i.id === invoiceId);
    return invoice?.invoiceNumber || null;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const customerInvoices = invoices.filter(
    inv => inv.customerId === parseInt(formData.customerId) && inv.status !== 'cancelled'
  );

  const filteredPayments = payments.filter(payment => {
    const matchesFilter = 
      filter === "all" ? true :
      filter === "advance" ? !payment.invoiceId :
      filter === "invoice" ? !!payment.invoiceId : true;
    
    const customerName = getCustomerName(payment.customerId).toLowerCase();
    const matchesSearch = searchTerm === "" || 
      customerName.includes(searchTerm.toLowerCase()) ||
      payment.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const totalAdvances = payments
    .filter(p => !p.invoiceId)
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  const totalInvoicePayments = payments
    .filter(p => p.invoiceId)
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Pagos y Recibos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona todos los pagos y adelantos de clientes
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-payment">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Registrar Pago</DialogTitle>
                <DialogDescription>
                  Registre un pago o adelanto de cliente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) => setFormData({ ...formData, customerId: value, invoiceId: "" })}
                  >
                    <SelectTrigger data-testid="select-customer">
                      <SelectValue placeholder="Seleccione un cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={String(customer.id)}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aplicar a Factura (Opcional)</Label>
                  <Select
                    value={formData.invoiceId}
                    onValueChange={(value) => setFormData({ ...formData, invoiceId: value })}
                    disabled={!formData.customerId}
                  >
                    <SelectTrigger data-testid="select-invoice">
                      <SelectValue placeholder="Sin factura (Adelanto)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin factura (Adelanto)</SelectItem>
                      {customerInvoices.map(invoice => (
                        <SelectItem key={invoice.id} value={String(invoice.id)}>
                          Factura #{invoice.invoiceNumber} - RD$ {parseFloat(String(invoice.total)).toLocaleString('es-DO')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto (RD$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      data-testid="input-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha *</Label>
                    <div className="flex items-center">
                      <Input
                        type="text"
                        value={dateDisplay}
                        onChange={(e) => {
                          const formatted = formatDateInput(e.target.value);
                          setDateDisplay(formatted);
                          const iso = toISODate(formatted);
                          if (iso) setFormData({ ...formData, date: iso });
                        }}
                        placeholder="dd/mm/yyyy"
                        className="flex-1 rounded-r-none border-r-0"
                        data-testid="input-date"
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
                            selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const localDate = getLocalDateString(date);
                                setFormData({ ...formData, date: localDate });
                                setDateDisplay(toDisplayDate(localDate));
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value) => setFormData({ ...formData, method: value })}
                  >
                    <SelectTrigger data-testid="select-method">
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
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Número de transferencia, cheque, etc."
                    data-testid="input-reference"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notas (Opcional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                    data-testid="input-notes"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createPaymentMutation.isPending}>
                    {createPaymentMutation.isPending ? "Guardando..." : "Guardar Pago"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Recibido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                RD$ {(totalAdvances + totalInvoicePayments).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Adelantos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                RD$ {totalAdvances.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {payments.filter(p => !p.invoiceId).length} pagos sin factura
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pagos a Facturas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                RD$ {totalInvoicePayments.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {payments.filter(p => p.invoiceId).length} pagos aplicados
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historial de Pagos</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search"
                  />
                </div>
                <div className="flex items-center gap-2 bg-secondary/30 rounded-lg p-1">
                  <Button
                    variant={filter === "all" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilter("all")}
                    className="rounded-lg"
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filter === "advance" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilter("advance")}
                    className="rounded-lg"
                  >
                    Adelantos
                  </Button>
                  <Button
                    variant={filter === "invoice" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilter("invoice")}
                    className="rounded-lg"
                  >
                    Facturas
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10">Cargando pagos...</div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No hay pagos registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>Recibo</TableHead>
                    <TableHead className="text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>Fecha</TableHead>
                    <TableHead className="text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>Cliente</TableHead>
                    <TableHead className="text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>Tipo</TableHead>
                    <TableHead className="text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>Método</TableHead>
                    <TableHead className="text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>Monto</TableHead>
                    <TableHead className="text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="text-center text-sm" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
                        {payment.receiptNumber}
                      </TableCell>
                      <TableCell className="text-center text-sm" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
                        {formatDate(payment.date)}
                      </TableCell>
                      <TableCell className="text-center text-sm" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
                        {getCustomerName(payment.customerId)}
                      </TableCell>
                      <TableCell className="text-center" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
                        {payment.invoiceId ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Factura #{getInvoiceNumber(payment.invoiceId)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            Adelanto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm capitalize" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
                        {payment.method}
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
                        RD$ {parseFloat(String(payment.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/payments/${payment.id}/receipt`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-receipt-${payment.id}`}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePaymentMutation.mutate(payment.id)}
                            disabled={deletePaymentMutation.isPending}
                            data-testid={`button-delete-payment-${payment.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
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
