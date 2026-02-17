import { useState, Fragment, useMemo } from "react";
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
import { Search, Plus, Wallet, ChevronRight, ChevronDown, Printer, FileText, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import type { SupplierPayment, Supplier, PurchaseInvoice, CompanySettings } from "@shared/schema";

interface PaymentGroup {
  paymentNumber: string;
  payments: SupplierPayment[];
  supplier: Supplier | undefined;
  totalAmount: number;
  date: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

interface PaymentRowProps {
  group: PaymentGroup;
  invoices: PurchaseInvoice[];
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
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'transferencia': return 'Transferencia Bancaria';
      case 'cheque': return 'Cheque';
      default: return method;
    }
  };

  const getInvoice = (invoiceId: number | null) => {
    if (!invoiceId) return undefined;
    return invoices.find(i => i.id === invoiceId);
  };

  const invoiceCount = group.payments.filter(p => p.purchaseInvoiceId).length;

  return (
    <Fragment>
      <TableRow 
        className="group cursor-pointer hover:bg-muted/50" 
        data-testid={`row-payment-${group.paymentNumber}`}
        onClick={() => onOpenReceipt(group)}
      >
        <TableCell className="w-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            data-testid={`button-expand-${group.paymentNumber}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-blue-600" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{group.paymentNumber}</TableCell>
        <TableCell>{formatDate(group.date)}</TableCell>
        <TableCell>{group.supplier?.name || "—"}</TableCell>
        <TableCell>
          {invoiceCount > 1 ? (
            <Badge variant="secondary" className="text-xs">{invoiceCount} facturas</Badge>
          ) : invoiceCount === 1 ? (
            getInvoice(group.payments[0].purchaseInvoiceId)?.invoiceNumber || "—"
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
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onCancelPayment(group);
              }}
              data-testid={`button-cancel-${group.paymentNumber}`}
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
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Proveedor</p>
                  <p className="font-medium">{group.supplier?.name || "—"}</p>
                  {group.supplier?.rnc && <p className="text-muted-foreground">RNC: {group.supplier.rnc}</p>}
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
                    Facturas Aplicadas ({group.payments.filter(p => p.purchaseInvoiceId).length})
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">No. Factura</TableHead>
                        <TableHead className="text-xs">Fecha Factura</TableHead>
                        <TableHead className="text-xs text-right">Total Factura</TableHead>
                        <TableHead className="text-xs text-right">Monto Aplicado</TableHead>
                        <TableHead className="text-xs text-right">Balance Pendiente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.payments.map((payment) => {
                        const invoice = getInvoice(payment.purchaseInvoiceId);
                        const invoiceTotal = invoice ? parseFloat(String(invoice.total)) : 0;
                        const amountPaid = parseFloat(String(payment.amount));
                        const balance = invoice ? Math.max(0, invoiceTotal - amountPaid) : 0;
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
                            <TableCell className="py-2 text-sm text-right font-medium">
                              {invoice ? `RD$ ${balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : "—"}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReceipt(group);
                  }}
                  data-testid={`button-print-expanded-${group.paymentNumber}`}
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

export default function SupplierPaymentsPage() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<PaymentGroup | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [groupToCancel, setGroupToCancel] = useState<PaymentGroup | null>(null);

  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentNumber: string) => {
      const response = await fetch(`/api/supplier-payments/by-number/${encodeURIComponent(paymentNumber)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error al anular el recibo" }));
        throw new Error(error.error || "Error al anular el recibo");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allSupplierPayments"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoiceBalance"] });
      queryClient.invalidateQueries({ queryKey: ["invoicePayments"] });
      queryClient.invalidateQueries({ queryKey: ["supplierPayments"] });
      queryClient.invalidateQueries({ queryKey: ["supplierPendingInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["supplierBalances"] });
      showSuccess("Recibo Anulado", `Se eliminaron ${data.deleted} pago(s) y se actualizaron ${data.invoicesUpdated} factura(s).`);
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
      cancelPaymentMutation.mutate(groupToCancel.paymentNumber);
    }
  };

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["allSupplierPayments"],
    queryFn: async () => {
      const response = await fetch("/api/supplier-payments");
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json() as Promise<SupplierPayment[]>;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json() as Promise<Supplier[]>;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["purchaseInvoices"],
    queryFn: async () => {
      const response = await fetch("/api/purchase-invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json() as Promise<PurchaseInvoice[]>;
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

  const getSupplier = (supplierId: number) => {
    return suppliers.find(s => s.id === supplierId);
  };

  const getInvoice = (invoiceId: number | null) => {
    if (!invoiceId) return undefined;
    return invoices.find(i => i.id === invoiceId);
  };

  const paymentGroups = useMemo(() => {
    const groups: Record<string, PaymentGroup> = {};
    
    for (const payment of payments) {
      if (!groups[payment.paymentNumber]) {
        groups[payment.paymentNumber] = {
          paymentNumber: payment.paymentNumber,
          payments: [],
          supplier: getSupplier(payment.supplierId),
          totalAmount: 0,
          date: payment.date,
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
        };
      }
      groups[payment.paymentNumber].payments.push(payment);
      groups[payment.paymentNumber].totalAmount += parseFloat(String(payment.amount));
    }
    
    return Object.values(groups).sort((a, b) => {
      const numA = parseInt(a.paymentNumber, 10);
      const numB = parseInt(b.paymentNumber, 10);
      return numB - numA;
    });
  }, [payments, suppliers]);

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
      default: return method;
    }
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = getSupplier(supplierId);
    return supplier?.name || "—";
  };

  const filteredGroups = paymentGroups.filter(group => {
    const supplierName = group.supplier?.name?.toLowerCase() || '';
    const paymentNumber = group.paymentNumber.toLowerCase();
    const reference = (group.reference || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const invoiceNumbers = group.payments
      .map(p => getInvoice(p.purchaseInvoiceId)?.invoiceNumber?.toLowerCase() || '')
      .join(' ');

    const matchesSearch = 
      supplierName.includes(search) ||
      invoiceNumbers.includes(search) ||
      paymentNumber.includes(search) ||
      reference.includes(search);

    const matchesSupplier = supplierFilter === "all" || group.supplier?.id === parseInt(supplierFilter);

    return matchesSearch && matchesSupplier;
  });

  const totalAmount = filteredGroups.reduce((sum, g) => sum + g.totalAmount, 0);

  const handleOpenReceipt = (group: PaymentGroup) => {
    handlePrint(group);
  };

  const handlePrint = (group?: PaymentGroup) => {
    const printGroup = group || selectedGroup;
    if (!printGroup) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Pago ${printGroup.paymentNumber}</title>
          <style>
            @page {
              size: 8.5in 5.5in;
              margin: 0.25in 0.3in 0.3in 0.2in;
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box;
              font-family: 'Courier New', Courier, monospace;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html {
              background: #f0f0f0;
            }
            body { 
              width: 8.5in;
              height: 5.5in;
              margin: 20px auto;
              background: white;
              box-shadow: 0 2px 10px rgba(0,0,0,0.2);
              font-size: 14px;
              line-height: 1.3;
              padding: 0.15in 0.2in 0.15in 0.15in;
              color: #000;
              display: flex;
              flex-direction: column;
            }
            @media print {
              html {
                background: white;
                height: 100%;
              }
              body {
                margin: 0;
                box-shadow: none;
                width: 100%;
                height: 100%;
                min-height: calc(5.5in - 0.25in - 0.3in);
                padding: 0.1in 0.15in 0.1in 0.1in;
              }
            }
            .page-content {
            }
            .page-spacer {
              flex-grow: 1;
            }
            .top-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 10px;
            }
            .company-section {
              text-align: left;
              max-width: 45%;
              flex-shrink: 1;
              overflow: hidden;
            }
            .document-section {
              text-align: right;
              min-width: 55%;
              flex-shrink: 0;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }
            .company-name {
              font-size: 18px;
              font-weight: bold;
              text-transform: uppercase;
              margin-top: 2px;
            }
            .company-info {
              font-size: 12px;
              margin-top: 2px;
              white-space: nowrap;
            }
            .document-title {
              font-size: 22px;
              font-weight: bold;
              text-align: right;
              letter-spacing: 1px;
            }
            .document-number {
              font-size: 15px;
              text-align: right;
              font-weight: bold;
              margin-top: 4px;
            }
            .info-row {
              margin-bottom: 4px;
              font-size: 15px;
              display: flex;
            }
            .info-label {
              font-weight: bold;
              width: 100px;
              text-align: right;
              margin-right: 8px;
            }
            .section {
              margin-bottom: 8px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
            }
            .items-table th {
              border-top: 2px dotted #000;
              border-bottom: 2px dotted #000;
              padding: 4px 4px;
              text-align: left;
              font-size: 14px;
              font-weight: bold;
            }
            .items-table th.amount {
              text-align: center;
            }
            .items-table td {
              padding: 3px 4px;
              font-size: 14px;
            }
            .items-table td.amount {
              text-align: center;
            }
            .total-row {
              border-top: 2px dotted #000;
              margin-top: 8px;
              padding-top: 8px;
              display: flex;
              justify-content: flex-end;
              font-size: 16px;
              font-weight: bold;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: auto;
              padding-top: 15px;
            }
            .signature-box {
              text-align: center;
              width: 45%;
            }
            .signature-line {
              border-top: 2px solid #000;
              margin-top: 25px;
              padding-top: 4px;
              font-size: 15px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="page-content">
            <div class="top-header">
              <div class="company-section">
                <div class="company-name">${companySettings?.name || 'EMPRESA'}</div>
                <div class="company-info">
                  ${companySettings?.rnc ? `RNC: ${companySettings.rnc}` : ''} 
                  ${companySettings?.phone ? ` | Tel: ${companySettings.phone}` : ''}
                </div>
                ${companySettings?.address ? `<div class="company-info">${companySettings.address}</div>` : ''}
              </div>
              <div class="document-section">
                <div class="document-title">RECIBO DE PAGO</div>
                <div class="info-row" style="justify-content: flex-end;">
                  <span class="info-label">Fecha:</span>
                  <span>${formatDate(printGroup.date)}</span>
                </div>
                <div class="info-row" style="justify-content: flex-end;">
                  <span class="info-label">Recibo No:</span>
                  <span>${printGroup.paymentNumber}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="info-row">
                <span class="info-label">Proveedor:</span>
                <span>${printGroup.supplier?.name || '—'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Método:</span>
                <span>${getMethodLabel(printGroup.method)}</span>
              </div>
              ${printGroup.reference ? `<div class="info-row"><span class="info-label">Referencia:</span><span>${printGroup.reference}</span></div>` : ''}
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th class="amount">NO. FACTURA</th>
                  <th class="amount">BALANCE PENDIENTE</th>
                  <th class="amount">MONTO PAGADO</th>
                  <th class="amount">BALANCE NUEVO</th>
                </tr>
              </thead>
              <tbody>
                ${printGroup.payments.map((payment) => {
                  const invoice = getInvoice(payment.purchaseInvoiceId);
                  const amountPaid = parseFloat(String(payment.amount));
                  const balanceNuevo = invoice ? parseFloat(String(invoice.balance || 0)) : 0;
                  const balancePendiente = balanceNuevo + amountPaid;
                  return `
                    <tr>
                      <td class="amount">${invoice?.invoiceNumber || 'Anticipo'}</td>
                      <td class="amount">RD$ ${balancePendiente.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td class="amount">RD$ ${amountPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td class="amount">RD$ ${balanceNuevo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="total-row">
              <span>TOTAL PAGADO: RD$ ${printGroup.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>

            ${printGroup.notes ? `<div style="margin-top: 8px; font-size: 13px;"><strong>Notas:</strong> ${printGroup.notes}</div>` : ''}
          </div>

          <div class="page-spacer"></div>

          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line">Entregado por</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Recibido por</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Recibos de Pago
            </h1>
            <p className="text-muted-foreground mt-1">
              Historial de todos los pagos realizados a proveedores.
            </p>
          </div>
          <Link href="/supplier-payments/new">
            <Button data-testid="button-new-payment">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Pagos
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
                Monto Total Pagado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                RD$ {totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">en pagos filtrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Proveedores Pagados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(paymentGroups.map(g => g.supplier?.id)).size}
              </div>
              <p className="text-xs text-muted-foreground mt-1">proveedores distintos</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Registro de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por proveedor, número de pago, factura o referencia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-supplier-filter">
                  <SelectValue placeholder="Filtrar por proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>No. Pago</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Facturas</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Cargando pagos...
                    </TableCell>
                  </TableRow>
                ) : filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron pagos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((group) => (
                    <PaymentRow
                      key={group.paymentNumber}
                      group={group}
                      invoices={invoices}
                      onOpenReceipt={handleOpenReceipt}
                      onCancelPayment={handleCancelPayment}
                    />
                  ))
                )}
              </TableBody>
            </Table>

            {filteredGroups.length > 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Mostrando {filteredGroups.length} de {paymentGroups.length} pagos
                </span>
                <span className="font-semibold">
                  Total: RD$ {totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Vista Previa - Recibo de Pago
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center bg-gray-100 p-4 rounded-lg overflow-auto">
            <div 
              style={{
                width: "8.5in",
                height: "5.5in",
                transform: "scale(0.7)",
                transformOrigin: "top center",
                backgroundColor: "white",
                padding: "0.1in 0.5in 0.1in 0.1in",
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: "14px",
                lineHeight: "1.3",
                color: "#000",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ textAlign: "left", maxWidth: "45%" }}>
                    <div style={{ fontSize: "20px", fontWeight: "bold", textTransform: "uppercase", marginTop: "8px" }}>
                      {companySettings?.name || 'EMPRESA'}
                    </div>
                    <div style={{ fontSize: "15px", marginTop: "2px" }}>
                      {companySettings?.rnc ? `RNC: ${companySettings.rnc}` : ''} 
                      {companySettings?.phone ? ` | Tel: ${companySettings.phone}` : ''}
                    </div>
                    {companySettings?.address && (
                      <div style={{ fontSize: "15px", marginTop: "2px" }}>{companySettings.address}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", minWidth: "55%", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ fontSize: "26px", fontWeight: "bold", letterSpacing: "1px" }}>RECIBO DE PAGO</div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px", fontSize: "15px" }}>
                      <span style={{ fontWeight: "bold", width: "100px", textAlign: "right", marginRight: "8px" }}>Fecha:</span>
                      <span>{selectedGroup ? formatDate(selectedGroup.date) : ''}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px", fontSize: "15px" }}>
                      <span style={{ fontWeight: "bold", width: "100px", textAlign: "right", marginRight: "8px" }}>Recibo No:</span>
                      <span>{selectedGroup?.paymentNumber}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", marginBottom: "4px", fontSize: "15px" }}>
                    <span style={{ fontWeight: "bold", width: "100px", textAlign: "right", marginRight: "8px" }}>Proveedor:</span>
                    <span>{selectedGroup?.supplier?.name || '—'}</span>
                  </div>
                  <div style={{ display: "flex", marginBottom: "4px", fontSize: "15px" }}>
                    <span style={{ fontWeight: "bold", width: "100px", textAlign: "right", marginRight: "8px" }}>Método:</span>
                    <span>{selectedGroup ? getMethodLabel(selectedGroup.method) : ''}</span>
                  </div>
                  {selectedGroup?.reference && (
                    <div style={{ display: "flex", marginBottom: "4px", fontSize: "15px" }}>
                      <span style={{ fontWeight: "bold", width: "100px", textAlign: "right", marginRight: "8px" }}>Referencia:</span>
                      <span>{selectedGroup.reference}</span>
                    </div>
                  )}
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", margin: "8px 0" }}>
                  <thead>
                    <tr>
                      <th style={{ borderTop: "2px dotted #000", borderBottom: "2px dotted #000", padding: "4px", textAlign: "left", fontSize: "14px", fontWeight: "bold" }}>NO. FACTURA</th>
                      <th style={{ borderTop: "2px dotted #000", borderBottom: "2px dotted #000", padding: "4px", textAlign: "center", fontSize: "14px", fontWeight: "bold" }}>MONTO ORIGINAL</th>
                      <th style={{ borderTop: "2px dotted #000", borderBottom: "2px dotted #000", padding: "4px", textAlign: "center", fontSize: "14px", fontWeight: "bold" }}>MONTO PAGADO</th>
                      <th style={{ borderTop: "2px dotted #000", borderBottom: "2px dotted #000", padding: "4px", textAlign: "center", fontSize: "14px", fontWeight: "bold" }}>BALANCE PENDIENTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup?.payments.map((payment) => {
                      const invoice = getInvoice(payment.purchaseInvoiceId);
                      const invoiceTotal = invoice ? parseFloat(String(invoice.total || 0)) : 0;
                      const balance = invoice ? parseFloat(String(invoice.balance || 0)) : 0;
                      return (
                        <tr key={payment.id}>
                          <td style={{ padding: "3px 4px", fontSize: "14px" }}>{invoice?.invoiceNumber || 'Anticipo'}</td>
                          <td style={{ padding: "3px 4px", fontSize: "14px", textAlign: "center", fontWeight: "bold" }}>
                            {invoice ? `RD$ ${invoiceTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td style={{ padding: "3px 4px", fontSize: "14px", textAlign: "center", fontWeight: "bold" }}>
                            RD$ {parseFloat(String(payment.amount)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "3px 4px", fontSize: "14px", textAlign: "center" }}>
                            RD$ {balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ borderTop: "2px dotted #000", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "flex-end", fontSize: "16px", fontWeight: "bold" }}>
                  TOTAL PAGADO: RD$ {(selectedGroup?.totalAmount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </div>

                {selectedGroup?.notes && (
                  <div style={{ marginTop: "8px", fontSize: "13px" }}>
                    <strong>Notas:</strong> {selectedGroup.notes}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px" }}>
                <div style={{ textAlign: "center", width: "45%" }}>
                  <div style={{ borderTop: "2px solid #000", marginTop: "25px", paddingTop: "4px", fontSize: "15px", fontWeight: "bold" }}>Entregado por</div>
                </div>
                <div style={{ textAlign: "center", width: "45%" }}>
                  <div style={{ borderTop: "2px solid #000", marginTop: "25px", paddingTop: "4px", fontSize: "15px", fontWeight: "bold" }}>Recibido por</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={() => handlePrint()} data-testid="button-print-receipt">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este recibo de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el recibo <strong>{groupToCancel?.paymentNumber}</strong> y 
              todos los pagos asociados ({groupToCancel?.payments.length} pago(s) por un total de 
              RD$ {groupToCancel?.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}).
              <br /><br />
              Las facturas afectadas volverán a mostrar su balance pendiente original.
              <br /><br />
              <strong>Esta acción no se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupToCancel(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelPayment}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelPaymentMutation.isPending}
            >
              {cancelPaymentMutation.isPending ? "Anulando..." : "Sí, Anular Recibo"}
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
