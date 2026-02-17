import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Save, Landmark, CreditCard, Wallet, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { getLocalDateString } from "@/lib/utils";
import type { PurchaseInvoice, Supplier, SupplierPayment, PaymentAccount } from "@shared/schema";

const paymentSchema = z.object({
  amount: z.string().min(1, "Monto requerido"),
  date: z.string().min(1, "Fecha requerida"),
  method: z.string().min(1, "Método de pago requerido"),
  paymentAccountId: z.string().min(1, "Cuenta de pago requerida"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PurchaseInvoicePayments() {
  const { id } = useParams<{ id: string }>();
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [dateDisplay, setDateDisplay] = useState((() => {
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

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["purchaseInvoice", id],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-invoices/${id}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");
      return response.json() as Promise<PurchaseInvoice>;
    },
    enabled: !!id,
  });

  const { data: supplier } = useQuery({
    queryKey: ["supplier", invoice?.supplierId],
    queryFn: async () => {
      if (!invoice?.supplierId) return null;
      const response = await fetch(`/api/suppliers/${invoice.supplierId}`);
      if (!response.ok) throw new Error("Failed to fetch supplier");
      return response.json() as Promise<Supplier>;
    },
    enabled: !!invoice?.supplierId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["purchaseInvoicePayments", id],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-invoices/${id}/payments`);
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json() as Promise<SupplierPayment[]>;
    },
    enabled: !!id,
  });

  const { data: balance } = useQuery({
    queryKey: ["purchaseInvoiceBalance", id],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-invoices/${id}/balance`);
      if (!response.ok) throw new Error("Failed to fetch balance");
      const data = await response.json();
      return data.balance;
    },
    enabled: !!id,
  });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      date: getLocalDateString(),
      method: "transferencia",
      paymentAccountId: "",
      reference: "",
      notes: "",
    },
  });

  const { data: paymentAccounts = [] } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/payment-accounts");
      if (!response.ok) throw new Error("Failed to fetch payment accounts");
      return response.json() as Promise<PaymentAccount[]>;
    },
  });

  const activePaymentAccounts = paymentAccounts.filter(a => a.status === 'active' && a.type !== 'banco');

  const watchedMethod = form.watch("method");

  const getFilteredAccountsByMethod = (method: string) => {
    switch (method) {
      case "efectivo":
        return activePaymentAccounts.filter(a => a.type === "caja_chica");
      case "tarjeta":
        return activePaymentAccounts.filter(a => a.type === "tarjeta_credito");
      default:
        return activePaymentAccounts;
    }
  };

  const filteredPaymentAccounts = getFilteredAccountsByMethod(watchedMethod);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "banco":
        return <Landmark className="h-4 w-4" />;
      case "tarjeta_credito":
        return <CreditCard className="h-4 w-4" />;
      case "caja_chica":
        return <Wallet className="h-4 w-4" />;
      default:
        return <Landmark className="h-4 w-4" />;
    }
  };

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      const response = await fetch(`/api/purchase-invoices/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: invoice?.supplierId,
          amount: data.amount,
          date: data.date,
          method: data.method,
          paymentAccountId: data.paymentAccountId ? parseInt(data.paymentAccountId) : null,
          reference: data.reference || null,
          notes: data.notes || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to create payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoicePayments", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoiceBalance", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoice", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      form.reset();
      showSuccess("Pago Registrado", "El pago ha sido registrado exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo registrar el pago. Intente nuevamente.");
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await fetch(`/api/supplier-payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete payment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoicePayments", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoiceBalance", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoice", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      showSuccess("Pago Eliminado", "El pago ha sido eliminado.");
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      showError("Error", "El monto debe ser mayor a 0.");
      return;
    }
    const currentBalance = parseFloat(balance || String(invoice?.total || 0));
    if (amount > currentBalance) {
      showError("Error", `El monto no puede ser mayor al balance pendiente (RD$ ${currentBalance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
      return;
    }
    createPaymentMutation.mutate(data);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (invoiceLoading) {
    return (
      <Layout>
        <div className="text-center py-10">Cargando factura...</div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="text-center py-10">Factura no encontrada</div>
      </Layout>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/purchase-invoices">
            <Button variant="outline" size="icon" type="button" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Registrar Pago
            </h1>
            <p className="text-muted-foreground mt-1">
              Factura {invoice.internalNumber} - {invoice.invoiceNumber}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Factura</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              RD$ {parseFloat(String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pagado</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-600">
              RD$ {totalPaid.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Balance Pendiente</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-amber-600">
              RD$ {parseFloat(balance || String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suplidor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{supplier?.name}</p>
            {supplier?.rnc && <p className="text-sm text-muted-foreground">RNC: {supplier.rnc}</p>}
          </CardContent>
        </Card>

        {parseFloat(balance || String(invoice.total)) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Nuevo Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto (RD$)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              data-testid="input-payment-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha del Pago</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Input 
                                type="text" 
                                value={dateDisplay} 
                                onChange={(e) => {
                                  const formatted = formatDateInput(e.target.value);
                                  setDateDisplay(formatted);
                                  const iso = toISODate(formatted);
                                  if (iso) field.onChange(iso);
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
                                    selected={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        const localDate = getLocalDateString(date);
                                        field.onChange(localDate);
                                        setDateDisplay(toDisplayDate(localDate));
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de Pago</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("paymentAccountId", "");
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="efectivo">Efectivo</SelectItem>
                            <SelectItem value="tarjeta">Tarjeta de Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cuenta de Pago *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-account">
                              <SelectValue placeholder="Seleccionar cuenta..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredPaymentAccounts.length === 0 ? (
                              <SelectItem value="__no_accounts__" disabled>
                                No hay cuentas de {watchedMethod === "efectivo" ? "caja chica" : watchedMethod === "tarjeta" ? "tarjeta de crédito" : "banco"} disponibles
                              </SelectItem>
                            ) : (
                              filteredPaymentAccounts.map((account) => (
                                <SelectItem key={account.id} value={String(account.id)}>
                                  <span className="flex items-center gap-2">
                                    {getAccountIcon(account.type)}
                                    {account.name} {account.bankName && `(${account.bankName})`} - RD$ {parseFloat(String(account.currentBalance)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referencia (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="No. cheque, transferencia, etc." data-testid="input-payment-reference" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas (Opcional)</FormLabel>
                        <FormControl>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={createPaymentMutation.isPending} data-testid="button-submit-payment">
                    <Save className="w-4 h-4 mr-2" />
                    {createPaymentMutation.isPending ? "Guardando..." : "Registrar Pago"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          RD$ {parseFloat(String(payment.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{payment.paymentNumber}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.date)} • {payment.method}
                        {payment.reference && ` • Ref: ${payment.reference}`}
                      </p>
                      {payment.notes && <p className="text-sm text-muted-foreground">{payment.notes}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePaymentMutation.mutate(payment.id)}
                      disabled={deletePaymentMutation.isPending}
                      data-testid={`button-delete-payment-${payment.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
