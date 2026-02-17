import { useState, useRef, Fragment, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Search, Plus, HandCoins, ChevronRight, ChevronDown, Printer, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import type { Payment, Customer, Invoice, CompanySettings } from "@shared/schema";

interface PaymentGroup {
  receiptNumber: string;
  payments: Payment[];
  customer: Customer | undefined;
  totalAmount: number;
  date: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

interface PaymentRowProps {
  group: PaymentGroup;
  invoices: Invoice[];
  onOpenReceipt: (group: PaymentGroup) => void;
  onCancelPayment: (group: PaymentGroup) => void;
}

function PaymentRow({ group, invoices, onOpenReceipt, onCancelPayment }: PaymentRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Efectivo</Badge>;
      case 'transferencia':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Transferencia</Badge>;
      case 'cheque':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Cheque</Badge>;
      case 'tarjeta':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Tarjeta</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'transferencia': return 'Transferencia Bancaria';
      case 'cheque': return 'Cheque';
      case 'tarjeta': return 'Tarjeta';
      default: return method;
    }
  };

  const getInvoice = (invoiceId: number | null) => {
    if (!invoiceId) return undefined;
    return invoices.find(i => i.id === invoiceId);
  };

  const invoiceCount = group.payments.filter(p => p.invoiceId).length;

  return (
    <Fragment>
      <TableRow className="group cursor-pointer hover:bg-muted/50" data-testid={`row-payment-${group.receiptNumber}`}>
        <TableCell className="w-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            data-testid={`button-expand-${group.receiptNumber}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-blue-600" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{group.receiptNumber}</TableCell>
        <TableCell>{formatDate(group.date)}</TableCell>
        <TableCell>{group.customer?.name || "—"}</TableCell>
        <TableCell>
          {invoiceCount > 1 ? (
            <Badge variant="secondary" className="text-xs">{invoiceCount} facturas</Badge>
          ) : invoiceCount === 1 ? (
            getInvoice(group.payments[0].invoiceId)?.invoiceNumber || "—"
          ) : (
            <Badge variant="secondary" className="text-xs">Anticipo</Badge>
          )}
        </TableCell>
        <TableCell>{getPaymentMethodBadge(group.method)}</TableCell>
        <TableCell className="text-muted-foreground">
          {group.reference || "—"}
        </TableCell>
        <TableCell className="text-right font-medium">
          RD$ {group.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="w-20">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReceipt(group);
              }}
              data-testid={`button-receipt-${group.receiptNumber}`}
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onCancelPayment(group);
              }}
              data-testid={`button-cancel-${group.receiptNumber}`}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableCell colSpan={9} className="py-4">
            <div className="ml-10 space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Cliente</p>
                  <p className="font-medium">{group.customer?.name || "—"}</p>
                  {group.customer?.rnc && <p className="text-muted-foreground">RNC: {group.customer.rnc}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Método de Pago</p>
                  <p className="font-medium">{getMethodLabel(group.method)}</p>
                  {group.reference && <p className="text-muted-foreground">Ref: {group.reference}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Fecha</p>
                  <p className="font-medium">{formatDate(group.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Monto Total</p>
                  <p className="font-bold text-lg">RD$ {group.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {group.payments.length > 0 && (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground p-3 bg-slate-100 border-b">
                    Facturas Aplicadas ({group.payments.filter(p => p.invoiceId).length})
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">No. Factura</TableHead>
                        <TableHead className="text-xs">Fecha Factura</TableHead>
                        <TableHead className="text-xs text-right">Total Factura</TableHead>
                        <TableHead className="text-xs text-right">Monto Aplicado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.payments.map((payment) => {
                        const invoice = getInvoice(payment.invoiceId);
                        const invoiceTotal = invoice ? parseFloat(String(invoice.total)) : 0;
                        const amountPaid = parseFloat(String(payment.amount));
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="py-2 text-sm font-medium">
                              {invoice?.invoiceNumber || <Badge variant="secondary" className="text-xs">Anticipo</Badge>}
                            </TableCell>
                            <TableCell className="py-2 text-sm">{invoice ? formatDate(invoice.date) : "—"}</TableCell>
                            <TableCell className="py-2 text-sm text-right">
                              {invoice ? `RD$ ${invoiceTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : "—"}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-right font-semibold text-emerald-600">
                              RD$ {amountPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {group.notes && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Notas</p>
                  <p className="text-sm">{group.notes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenReceipt(group)}
                  data-testid={`button-print-expanded-${group.receiptNumber}`}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Recibo
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

export default function CustomerPaymentsPage() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<PaymentGroup | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [groupToCancel, setGroupToCancel] = useState<PaymentGroup | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const cancelPaymentMutation = useMutation({
    mutationFn: async (receiptNumber: string) => {
      const response = await fetch(`/api/customer-payments/by-number/${encodeURIComponent(receiptNumber)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error al anular el recibo" }));
        throw new Error(error.error || "Error al anular el recibo");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allCustomerPayments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceBalance"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["customerPendingInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["customerBalances"] });
      showSuccess("Recibo Anulado", `Se eliminaron ${data.deleted} cobro(s) y se actualizaron ${data.invoicesUpdated} factura(s).`);
      setShowCancelDialog(false);
      setGroupToCancel(null);
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleCancelPayment = (group: PaymentGroup) => {
    setGroupToCancel(group);
    setShowCancelDialog(true);
  };

  const confirmCancelPayment = () => {
    if (groupToCancel) {
      cancelPaymentMutation.mutate(groupToCancel.receiptNumber);
    }
  };

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["allCustomerPayments"],
    queryFn: async () => {
      const response = await fetch("/api/customer-payments");
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

  const { data: companySettings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings");
      if (!response.ok) return null;
      return response.json() as Promise<CompanySettings>;
    },
  });

  const getCustomer = (customerId: number) => {
    return customers.find(c => c.id === customerId);
  };

  const getInvoice = (invoiceId: number | null) => {
    if (!invoiceId) return undefined;
    return invoices.find(i => i.id === invoiceId);
  };

  const paymentGroups = useMemo(() => {
    const groups: Record<string, PaymentGroup> = {};
    
    for (const payment of payments) {
      if (!groups[payment.receiptNumber]) {
        groups[payment.receiptNumber] = {
          receiptNumber: payment.receiptNumber,
          payments: [],
          customer: getCustomer(payment.customerId),
          totalAmount: 0,
          date: payment.date,
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
        };
      }
      groups[payment.receiptNumber].payments.push(payment);
      groups[payment.receiptNumber].totalAmount += parseFloat(String(payment.amount));
    }
    
    return Object.values(groups).sort((a, b) => {
      const numA = parseInt(a.receiptNumber.replace(/\D/g, ''), 10);
      const numB = parseInt(b.receiptNumber.replace(/\D/g, ''), 10);
      return numB - numA;
    });
  }, [payments, customers]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'transferencia': return 'Transferencia Bancaria';
      case 'cheque': return 'Cheque';
      case 'tarjeta': return 'Tarjeta';
      default: return method;
    }
  };

  const filteredGroups = paymentGroups.filter(group => {
    const customerName = group.customer?.name?.toLowerCase() || '';
    const receiptNumber = group.receiptNumber.toLowerCase();
    const reference = (group.reference || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const invoiceNumbers = group.payments
      .map(p => getInvoice(p.invoiceId)?.invoiceNumber?.toLowerCase() || '')
      .join(' ');

    const matchesSearch = 
      customerName.includes(search) ||
      invoiceNumbers.includes(search) ||
      receiptNumber.includes(search) ||
      reference.includes(search);

    const matchesCustomer = customerFilter === "all" || group.customer?.id === parseInt(customerFilter);

    return matchesSearch && matchesCustomer;
  });

  const totalAmount = filteredGroups.reduce((sum, g) => sum + g.totalAmount, 0);

  const handleOpenReceipt = (group: PaymentGroup) => {
    setSelectedGroup(group);
    setShowReceiptDialog(true);
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Cobro - ${selectedGroup?.receiptNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Atkinson Hyperlegible', sans-serif; 
              padding: 40px;
              color: #1a1a1a;
            }
            .receipt { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e5e5; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .company-info { font-size: 12px; color: #666; }
            .receipt-title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
            .receipt-number { font-size: 14px; color: #666; text-align: center; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-section { }
            .info-label { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 3px; }
            .info-value { font-size: 14px; font-weight: 500; }
            .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .invoice-table th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e5e5e5; }
            .invoice-table td { padding: 12px 10px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
            .invoice-table .amount { text-align: right; }
            .total-section { margin-top: 20px; text-align: right; padding: 15px; background: #f8f8f8; border-radius: 8px; }
            .total-label { font-size: 14px; color: #666; }
            .total-amount { font-size: 24px; font-weight: bold; margin-top: 5px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e5e5e5; padding-top: 20px; }
            .notes { margin-top: 20px; padding: 15px; background: #fafafa; border-radius: 8px; font-size: 13px; }
            .notes-label { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
            @media print {
              body { padding: 20px; }
              .receipt { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Cobros a Clientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Historial de todos los cobros realizados a clientes.
            </p>
          </div>
          <Link href="/customer-payments/new">
            <Button data-testid="button-new-payment">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Cobro
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Cobros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentGroups.length}</div>
              <p className="text-xs text-muted-foreground mt-1">recibos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monto Total Cobrado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                RD$ {totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">en cobros filtrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes Cobrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(paymentGroups.map(g => g.customer?.id)).size}
              </div>
              <p className="text-xs text-muted-foreground mt-1">clientes distintos</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5" />
              Registro de Cobros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, número de recibo, factura o referencia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-customer-filter">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {customers.filter(c => c.status === 'active').map(customer => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando cobros...
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron cobros.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"></TableHead>
                      <TableHead>No. Recibo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Factura(s)</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.map(group => (
                      <PaymentRow
                        key={group.receiptNumber}
                        group={group}
                        invoices={invoices}
                        onOpenReceipt={handleOpenReceipt}
                        onCancelPayment={handleCancelPayment}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recibo de Cobro</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4">
              <div ref={receiptRef}>
                <div className="receipt">
                  <div className="header">
                    <p className="company-name">{companySettings?.name || "Empresa"}</p>
                    {companySettings?.rnc && <p className="company-info">RNC: {companySettings.rnc}</p>}
                    {companySettings?.address && <p className="company-info">{companySettings.address}</p>}
                    {companySettings?.phone && <p className="company-info">Tel: {companySettings.phone}</p>}
                  </div>
                  <p className="receipt-title">RECIBO DE COBRO</p>
                  <p className="receipt-number">No. {selectedGroup.receiptNumber}</p>
                  
                  <div className="info-grid">
                    <div className="info-section">
                      <p className="info-label">Cliente</p>
                      <p className="info-value">{selectedGroup.customer?.name || "—"}</p>
                      {selectedGroup.customer?.rnc && (
                        <p className="company-info">RNC: {selectedGroup.customer.rnc}</p>
                      )}
                    </div>
                    <div className="info-section">
                      <p className="info-label">Fecha</p>
                      <p className="info-value">{formatDate(selectedGroup.date)}</p>
                    </div>
                    <div className="info-section">
                      <p className="info-label">Método de Pago</p>
                      <p className="info-value">{getMethodLabel(selectedGroup.method)}</p>
                    </div>
                    {selectedGroup.reference && (
                      <div className="info-section">
                        <p className="info-label">Referencia</p>
                        <p className="info-value">{selectedGroup.reference}</p>
                      </div>
                    )}
                  </div>

                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>No. Factura</th>
                        <th>Fecha</th>
                        <th className="amount">Monto Aplicado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.payments.map(payment => {
                        const invoice = getInvoice(payment.invoiceId);
                        return (
                          <tr key={payment.id}>
                            <td>{invoice?.invoiceNumber || "Anticipo"}</td>
                            <td>{invoice ? formatDate(invoice.date) : "—"}</td>
                            <td className="amount">
                              RD$ {parseFloat(String(payment.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="total-section">
                    <p className="total-label">Total Cobrado</p>
                    <p className="total-amount">
                      RD$ {selectedGroup.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {selectedGroup.notes && (
                    <div className="notes">
                      <p className="notes-label">Notas</p>
                      <p>{selectedGroup.notes}</p>
                    </div>
                  )}

                  <div className="footer">
                    <p>Gracias por su pago</p>
                    <p style={{ marginTop: '5px' }}>Documento generado electrónicamente</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
                  Cerrar
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este recibo de cobro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el recibo {groupToCancel?.receiptNumber} y todos sus pagos asociados.
              Los balances de las facturas afectadas serán restaurados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelPaymentMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelPayment}
              disabled={cancelPaymentMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {cancelPaymentMutation.isPending ? "Anulando..." : "Anular Recibo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
