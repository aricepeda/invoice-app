import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer } from "lucide-react";
import type { Payment, Invoice, Customer, CompanySettings } from "@shared/schema";

export default function PaymentReceipt() {
  const { id } = useParams<{ id: string }>();

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment", id],
    queryFn: async () => {
      const response = await fetch(`/api/payments/${id}`);
      if (!response.ok) throw new Error("Failed to fetch payment");
      return response.json() as Promise<Payment>;
    },
    enabled: !!id,
  });

  const { data: invoice } = useQuery({
    queryKey: ["invoice", payment?.invoiceId],
    queryFn: async () => {
      if (!payment?.invoiceId) return null;
      const response = await fetch(`/api/invoices/${payment.invoiceId}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");
      return response.json() as Promise<Invoice>;
    },
    enabled: !!payment?.invoiceId,
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", payment?.customerId],
    queryFn: async () => {
      if (!payment?.customerId) return null;
      const response = await fetch(`/api/customers/${payment.customerId}`);
      if (!response.ok) throw new Error("Failed to fetch customer");
      return response.json() as Promise<Customer>;
    },
    enabled: !!payment?.customerId,
  });

  const { data: companySettings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json() as Promise<CompanySettings>;
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["balance", payment?.invoiceId],
    queryFn: async () => {
      if (!payment?.invoiceId) return null;
      const response = await fetch(`/api/invoices/${payment.invoiceId}/balance`);
      if (!response.ok) throw new Error("Failed to fetch balance");
      const data = await response.json();
      return data.balance;
    },
    enabled: !!payment?.invoiceId,
  });

  const handlePrint = () => {
    window.print();
  };

  if (paymentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando recibo...</div>
      </div>
    );
  }

  if (!payment || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Recibo no encontrado</div>
      </div>
    );
  }

  const isAdvance = !payment.invoiceId;
  const previousBalance = invoice ? parseFloat(balance || "0") + parseFloat(String(payment.amount)) : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={isAdvance ? "/payments" : `/invoices/${invoice?.id}/payments`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Recibo de Pago</h1>
        </div>
        <Button onClick={handlePrint} data-testid="button-print-receipt">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir Recibo
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-card border border-border rounded-lg shadow-sm p-8 print:shadow-none print:border-none" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{companySettings?.name || "Empresa"}</h1>
            {companySettings?.rnc && (
              <p className="text-sm text-muted-foreground">RNC: {companySettings.rnc}</p>
            )}
            {companySettings?.address && (
              <p className="text-sm text-muted-foreground">{companySettings.address}</p>
            )}
            {companySettings?.phone && (
              <p className="text-sm text-muted-foreground">Tel: {companySettings.phone}</p>
            )}
            <div className="mt-4">
              <h2 className="text-2xl font-semibold">{isAdvance ? "RECIBO DE ADELANTO" : "RECIBO DE PAGO"}</h2>
              <p className="text-muted-foreground">No. {payment.receiptNumber}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-3">Recibido de:</h3>
              <p className="font-medium">{customer.name}</p>
              {customer.rnc && <p className="text-sm text-muted-foreground">RNC/Cédula: {customer.rnc}</p>}
              {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
              {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
            </div>
            <div>
              <h3 className="font-semibold mb-3">Detalles del Pago</h3>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">Fecha:</span>{" "}
                  <span className="font-medium">{formatDate(payment.date)}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Método:</span>{" "}
                  <span className="font-medium capitalize">{payment.method}</span>
                </p>
                {payment.reference && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Referencia:</span>{" "}
                    <span className="font-medium">{payment.reference}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {isAdvance ? (
            <div className="mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-amber-800 font-medium">ADELANTO / DEPÓSITO</p>
                <p className="text-sm text-amber-600 mt-1">Este pago no está aplicado a ninguna factura</p>
              </div>
              <div className="mt-6 text-center">
                <p className="text-muted-foreground">Monto Recibido:</p>
                <p className="text-4xl font-bold text-emerald-600 mt-2">
                  RD$ {parseFloat(String(payment.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Aplicado a Factura</h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Número de Factura</p>
                      <p className="font-semibold">{invoice?.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Factura</p>
                      <p className="font-semibold">{invoice?.date ? formatDate(invoice.date) : '-'}</p>
                    </div>
                    {invoice?.ncf && (
                      <div>
                        <p className="text-sm text-muted-foreground">NCF</p>
                        <p className="font-semibold">{invoice.ncf}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Resumen</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Total de Factura:</span>
                    <span className="font-medium">
                      RD$ {parseFloat(String(invoice?.total || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Balance Anterior:</span>
                    <span className="font-medium">
                      RD$ {previousBalance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-lg">Monto Pagado:</span>
                    <span className="font-bold text-lg text-emerald-600">
                      RD$ {parseFloat(String(payment.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-2">
                    <span className="font-semibold">Balance Pendiente:</span>
                    <span className={`font-bold ${parseFloat(balance || "0") === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      RD$ {parseFloat(balance || "0").toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {payment.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="font-semibold mb-2">Notas</h3>
                <p className="text-sm text-muted-foreground">{payment.notes}</p>
              </div>
            </>
          )}

          <Separator className="my-6" />

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mx-8">
                <p className="text-sm text-muted-foreground">Firma del Cliente</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mx-8">
                <p className="text-sm text-muted-foreground">Recibido por</p>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground mt-8">
            <p>Gracias por su preferencia</p>
            <p className="mt-1">Generado el {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          @page {
            margin: 1cm;
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}
