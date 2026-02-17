import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Save, FileText, Calendar, Wallet, Check } from "lucide-react";
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
import type { Invoice, Customer, Payment, AdvanceApplication } from "@shared/schema";

interface AdvanceWithBalance {
  id: number;
  customerId: number;
  amount: string;
  remainingBalance: string;
  date: string;
  receiptNumber: string;
  notes: string | null;
}

const paymentSchema = z.object({
  amount: z.string().min(1, "Monto requerido"),
  date: z.string().min(1, "Fecha requerida"),
  method: z.string().min(1, "Método de pago requerido"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function InvoicePayments() {
  const { id } = useParams<{ id: string }>();
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");
      return response.json() as Promise<Invoice>;
    },
    enabled: !!id,
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", invoice?.customerId],
    queryFn: async () => {
      if (!invoice?.customerId) return null;
      const response = await fetch(`/api/customers/${invoice.customerId}`);
      if (!response.ok) throw new Error("Failed to fetch customer");
      return response.json() as Promise<Customer>;
    },
    enabled: !!invoice?.customerId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}/payments`);
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json() as Promise<Payment[]>;
    },
    enabled: !!id,
  });

  const { data: balance } = useQuery({
    queryKey: ["balance", id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}/balance`);
      if (!response.ok) throw new Error("Failed to fetch balance");
      const data = await response.json();
      return data.balance;
    },
    enabled: !!id,
  });

  const { data: availableAdvances = [] } = useQuery({
    queryKey: ["availableAdvances", invoice?.customerId],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${invoice?.customerId}/advances/available`);
      if (!response.ok) throw new Error("Failed to fetch advances");
      return response.json() as Promise<AdvanceWithBalance[]>;
    },
    enabled: !!invoice?.customerId,
  });

  const { data: appliedAdvances = [] } = useQuery({
    queryKey: ["appliedAdvances", id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}/advances`);
      if (!response.ok) throw new Error("Failed to fetch applied advances");
      return response.json() as Promise<AdvanceApplication[]>;
    },
    enabled: !!id,
  });

  const { data: totalAdvancesApplied = 0 } = useQuery({
    queryKey: ["totalAdvancesApplied", id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}/advances/total`);
      if (!response.ok) throw new Error("Failed to fetch total advances");
      const data = await response.json();
      return parseFloat(data.total || "0");
    },
    enabled: !!id,
  });

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

  const [dateDisplay, setDateDisplay] = useState(toDisplayDate(getLocalDateString()));

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      date: getLocalDateString(),
      method: "efectivo",
      reference: "",
      notes: "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      const response = await fetch(`/api/invoices/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: invoice?.customerId,
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
      queryClient.invalidateQueries({ queryKey: ["payments", id] });
      queryClient.invalidateQueries({ queryKey: ["balance", id] });
      form.reset();
      showSuccess("Pago Registrado", "El pago ha sido registrado exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo registrar el pago. Intente nuevamente.");
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
      queryClient.invalidateQueries({ queryKey: ["payments", id] });
      queryClient.invalidateQueries({ queryKey: ["balance", id] });
      showSuccess("Pago Eliminado", "El pago ha sido eliminado.");
    },
  });

  const applyAdvanceMutation = useMutation({
    mutationFn: async ({ advanceId, amount }: { advanceId: number; amount: number }) => {
      const response = await fetch(`/api/advances/${advanceId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: parseInt(id!),
          amount: amount.toString(),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply advance");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availableAdvances", invoice?.customerId] });
      queryClient.invalidateQueries({ queryKey: ["appliedAdvances", id] });
      queryClient.invalidateQueries({ queryKey: ["totalAdvancesApplied", id] });
      queryClient.invalidateQueries({ queryKey: ["balance", id] });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      showSuccess("Anticipo Aplicado", "El anticipo ha sido aplicado a la factura.");
    },
    onError: (error: Error) => {
      showError("Error", error.message || "No se pudo aplicar el anticipo.");
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
  const totalApplied = totalPaid + totalAdvancesApplied;

  const handleApplyAdvance = (advance: AdvanceWithBalance) => {
    const currentBalance = parseFloat(balance || String(invoice?.total || 0));
    const advanceRemaining = parseFloat(advance.remainingBalance);
    const amountToApply = Math.min(advanceRemaining, currentBalance);
    
    if (amountToApply <= 0) {
      showError("Error", "No hay balance pendiente para aplicar anticipos.");
      return;
    }
    
    applyAdvanceMutation.mutate({ advanceId: advance.id, amount: amountToApply });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href={`/invoices/${id}`}>
            <Button variant="outline" size="icon" type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registrar Pago</h1>
            <p className="text-muted-foreground mt-1">Factura {invoice.invoiceNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Factura</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold">
              RD$ {parseFloat(String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pagado</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-emerald-600">
              RD$ {totalPaid.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Anticipos Aplicados</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-blue-600">
              RD$ {totalAdvancesApplied.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balance Pendiente</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-amber-600">
              RD$ {parseFloat(balance || String(invoice.total)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{customer?.name}</p>
            {customer?.rnc && <p className="text-sm text-muted-foreground">RNC: {customer.rnc}</p>}
          </CardContent>
        </Card>

        {availableAdvances.length > 0 && parseFloat(balance || "0") > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                Anticipos Disponibles
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Este cliente tiene anticipos que puede aplicar a esta factura
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableAdvances.map((advance) => {
                  const advanceRemaining = parseFloat(advance.remainingBalance);
                  const invoiceBalance = parseFloat(balance || "0");
                  const amountToApply = Math.min(advanceRemaining, invoiceBalance);
                  
                  return (
                    <div 
                      key={advance.id} 
                      className="flex items-center justify-between p-3 bg-white border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-sm">{advance.receiptNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {toDisplayDate(advance.date)} • Disponible: RD$ {advanceRemaining.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                        {advance.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{advance.notes}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleApplyAdvance(advance)}
                        disabled={applyAdvanceMutation.isPending}
                        data-testid={`button-apply-advance-${advance.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aplicar RD$ {amountToApply.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
                                <Button variant="outline" size="icon" className="rounded-l-none">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
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
                        <Input {...field} data-testid="input-payment-reference" />
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

                <Button type="submit" className="w-full" disabled={createPaymentMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {createPaymentMutation.isPending ? "Guardando..." : "Guardar Pago"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

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
                      <p className="font-semibold">RD$ {parseFloat(String(payment.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.date} • {payment.method}
                        {payment.reference && ` • Ref: ${payment.reference}`}
                      </p>
                      {payment.notes && <p className="text-sm text-muted-foreground">{payment.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/payments/${payment.id}/receipt`}>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-receipt-${payment.id}`}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Recibo
                        </Button>
                      </Link>
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
