import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Users, Building2, DollarSign, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import type { Invoice, Customer, PurchaseInvoice, Supplier, Payment, SupplierPayment } from "@shared/schema";

export default function ReceivablesPayables() {
  const printTableRefReceivables = useRef<HTMLDivElement>(null);
  const printTableRefPayables = useRef<HTMLDivElement>(null);

  const [receivableFilter, setReceivableFilter] = useState<number | null>(null);
  const [payableFilter, setPayableFilter] = useState<number | null>(null);
  const [expandedReceivables, setExpandedReceivables] = useState<Set<number>>(new Set());
  const [expandedPayables, setExpandedPayables] = useState<Set<number>>(new Set());

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ["/api/purchase-invoices"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: supplierPayments = [] } = useQuery<SupplierPayment[]>({
    queryKey: ["/api/supplier-payments"],
  });

  const customersMap = useMemo(() => {
    return customers.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<number, Customer>);
  }, [customers]);

  const suppliersMap = useMemo(() => {
    return suppliers.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<number, Supplier>);
  }, [suppliers]);

  const paymentsMap = useMemo(() => {
    const map: Record<number, number> = {};
    payments.forEach(p => {
      if (p.invoiceId) {
        map[p.invoiceId] = (map[p.invoiceId] || 0) + parseFloat(String(p.amount));
      }
    });
    return map;
  }, [payments]);

  const supplierPaymentsMap = useMemo(() => {
    const map: Record<number, number> = {};
    supplierPayments.forEach(p => {
      if (p.purchaseInvoiceId) {
        map[p.purchaseInvoiceId] = (map[p.purchaseInvoiceId] || 0) + parseFloat(String(p.amount));
      }
    });
    return map;
  }, [supplierPayments]);

  const accountsReceivable = useMemo(() => {
    const pendingInvoices = invoices.filter(inv => 
      inv.status === "pending" || inv.status === "partial"
    );

    const byCustomer: Record<number, { 
      customer: Customer; 
      invoices: Array<Invoice & { balance: number; paid: number }>; 
      totalBalance: number;
      totalInvoiced: number;
    }> = {};

    pendingInvoices.forEach(inv => {
      const total = parseFloat(String(inv.total));
      const paid = paymentsMap[inv.id] || 0;
      const balance = total - paid;

      if (balance <= 0) return;

      if (!byCustomer[inv.customerId]) {
        byCustomer[inv.customerId] = {
          customer: customersMap[inv.customerId],
          invoices: [],
          totalBalance: 0,
          totalInvoiced: 0
        };
      }

      byCustomer[inv.customerId].invoices.push({
        ...inv,
        balance,
        paid
      });
      byCustomer[inv.customerId].totalBalance += balance;
      byCustomer[inv.customerId].totalInvoiced += total;
    });

    return Object.values(byCustomer).sort((a, b) => b.totalBalance - a.totalBalance);
  }, [invoices, customersMap, paymentsMap]);

  const accountsPayable = useMemo(() => {
    const pendingPurchases = purchaseInvoices.filter(inv => 
      inv.status === "pending" || inv.status === "partial"
    );

    const bySupplier: Record<number, { 
      supplier: Supplier; 
      invoices: Array<PurchaseInvoice & { balance: number; paid: number }>; 
      totalBalance: number;
      totalInvoiced: number;
    }> = {};

    pendingPurchases.forEach(inv => {
      const total = parseFloat(String(inv.total));
      const paid = supplierPaymentsMap[inv.id] || 0;
      const balance = total - paid;

      if (balance <= 0) return;

      if (!bySupplier[inv.supplierId]) {
        bySupplier[inv.supplierId] = {
          supplier: suppliersMap[inv.supplierId],
          invoices: [],
          totalBalance: 0,
          totalInvoiced: 0
        };
      }

      bySupplier[inv.supplierId].invoices.push({
        ...inv,
        balance,
        paid
      });
      bySupplier[inv.supplierId].totalBalance += balance;
      bySupplier[inv.supplierId].totalInvoiced += total;
    });

    const result = Object.values(bySupplier).sort((a, b) => b.totalBalance - a.totalBalance);
    result.forEach(item => {
      item.invoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return result;
  }, [purchaseInvoices, suppliersMap, supplierPaymentsMap]);

  const totalReceivables = accountsReceivable.reduce((sum, a) => sum + a.totalBalance, 0);
  const totalPayables = accountsPayable.reduce((sum, a) => sum + a.totalBalance, 0);

  const filteredReceivables = useMemo(() => {
    if (receivableFilter === null) return accountsReceivable;
    return accountsReceivable.filter(item => item.customer?.id === receivableFilter);
  }, [accountsReceivable, receivableFilter]);

  const filteredPayables = useMemo(() => {
    if (payableFilter === null) return accountsPayable;
    return accountsPayable.filter(item => item.supplier?.id === payableFilter);
  }, [accountsPayable, payableFilter]);

  const getDaysOverdue = (dueDate: string | null, invoiceDate: string): number => {
    const today = new Date();
    const due = dueDate ? new Date(dueDate) : new Date(invoiceDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const toggleExpandReceivable = (customerId: number) => {
    setExpandedReceivables(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const toggleExpandPayable = (supplierId: number) => {
    setExpandedPayables(prev => {
      const next = new Set(prev);
      if (next.has(supplierId)) {
        next.delete(supplierId);
      } else {
        next.add(supplierId);
      }
      return next;
    });
  };

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>, title: string) => {
    if (!ref.current) return;
    
    const printContent = ref.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            tfoot td { background-color: #f5f5f5; font-weight: bold; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>Generado: ${new Date().toLocaleDateString("es-DO")}</h2>
          ${printContent}
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

  const exportToCSV = (type: "receivables" | "payables") => {
    let csvContent = "";
    let filename = "";

    if (type === "receivables") {
      filename = `cuentas_por_cobrar_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Cliente,RNC,Factura,Fecha,Vencimiento,Total,Pagado,Balance,Días Vencido\n";
      accountsReceivable.forEach(item => {
        item.invoices.forEach(inv => {
          const daysOverdue = getDaysOverdue(inv.dueDate, inv.date);
          csvContent += `"${item.customer?.name || ""}","${item.customer?.rnc || ""}",${inv.invoiceNumber},${inv.date},${inv.dueDate || ""},${inv.total},${inv.paid.toFixed(2)},${inv.balance.toFixed(2)},${daysOverdue}\n`;
        });
      });
    } else if (type === "payables") {
      filename = `cuentas_por_pagar_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Proveedor,RNC,Fecha,Factura,Vencimiento,Total,Pagado,Balance,Días Vencido\n";
      accountsPayable.forEach(item => {
        item.invoices.forEach(inv => {
          const daysOverdue = getDaysOverdue(inv.dueDate, inv.date);
          csvContent += `"${item.supplier?.name || ""}","${item.supplier?.rnc || ""}",${inv.date},${inv.invoiceNumber},${inv.dueDate || ""},${inv.total},${inv.paid.toFixed(2)},${inv.balance.toFixed(2)},${daysOverdue}\n`;
        });
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Cuentas por Cobrar y Pagar</h1>
            <p className="text-muted-foreground mt-1">Balance de cuentas pendientes con clientes y proveedores</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Total Cuentas por Cobrar</p>
                  <p className="text-3xl font-bold text-green-700" data-testid="text-total-receivables">
                    {totalReceivables.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                  </p>
                  <p className="text-sm text-green-600">{accountsReceivable.length} clientes con balance pendiente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">Total Cuentas por Pagar</p>
                  <p className="text-3xl font-bold text-red-700" data-testid="text-total-payables">
                    {totalPayables.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                  </p>
                  <p className="text-sm text-red-600">{accountsPayable.length} proveedores con balance pendiente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="receivables" className="space-y-4">
          <TabsList>
            <TabsTrigger value="receivables" data-testid="tab-receivables">
              <Users className="h-4 w-4 mr-2" />
              Cuentas por Cobrar
            </TabsTrigger>
            <TabsTrigger value="payables" data-testid="tab-payables">
              <Building2 className="h-4 w-4 mr-2" />
              Cuentas por Pagar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receivables" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Cuentas por Cobrar (Clientes)
                  </CardTitle>
                  <div className="flex gap-2 items-center">
                    <Select
                      value={receivableFilter === null ? "all" : String(receivableFilter)}
                      onValueChange={(val) => setReceivableFilter(val === "all" ? null : Number(val))}
                    >
                      <SelectTrigger className="w-[220px]" data-testid="select-filter-receivables">
                        <SelectValue placeholder="Filtrar por cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" data-testid="select-item-all-customers">Todos</SelectItem>
                        {accountsReceivable.map(item => (
                          <SelectItem
                            key={item.customer?.id}
                            value={String(item.customer?.id)}
                            data-testid={`select-item-customer-${item.customer?.id}`}
                          >
                            {item.customer?.name || "Cliente Desconocido"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => handlePrint(printTableRefReceivables, "Cuentas por Cobrar")} data-testid="button-print-receivables">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("receivables")} data-testid="button-export-receivables">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredReceivables.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay cuentas por cobrar pendientes</p>
                  </div>
                ) : (
                  <div ref={printTableRefReceivables}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-center">Total Facturas</TableHead>
                          <TableHead className="text-right">Monto Total</TableHead>
                          <TableHead className="text-right">Monto Pendiente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReceivables.map((item) => {
                          const customerId = item.customer?.id ?? 0;
                          const isExpanded = expandedReceivables.has(customerId);
                          return (
                            <>
                              <TableRow
                                key={`receivable-${customerId}`}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleExpandReceivable(customerId)}
                                data-testid={`row-customer-${customerId}`}
                              >
                                <TableCell>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" data-testid={`icon-expand-customer-${customerId}`} />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" data-testid={`icon-expand-customer-${customerId}`} />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{item.customer?.name || "Cliente Desconocido"}</TableCell>
                                <TableCell className="text-center">{item.invoices.length}</TableCell>
                                <TableCell className="text-right">
                                  {item.totalInvoiced.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  {item.totalBalance.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow key={`receivable-detail-${customerId}`}>
                                  <TableCell colSpan={5} className="p-0">
                                    <div className="bg-muted/30 p-4">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-center">Fecha</TableHead>
                                            <TableHead className="text-center">No Factura</TableHead>
                                            <TableHead className="text-center">NCF</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Pagado</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                            <TableHead className="text-center">Días Vencido</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {item.invoices.map(inv => {
                                            const daysOverdue = getDaysOverdue(inv.dueDate, inv.date);
                                            return (
                                              <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                                                <TableCell className="text-center">{new Date(inv.date + 'T00:00:00').toLocaleDateString("es-DO")}</TableCell>
                                                <TableCell className="text-center font-medium">{inv.invoiceNumber}</TableCell>
                                                <TableCell className="text-center">{inv.ncf || "—"}</TableCell>
                                                <TableCell className="text-right">
                                                  {parseFloat(String(inv.total)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {inv.paid.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                  {inv.balance.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  {daysOverdue > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                      <AlertCircle className="h-3 w-3" />
                                                      {daysOverdue} días
                                                    </span>
                                                  ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                      Vigente
                                                    </span>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center mt-4">
                      <span className="font-bold text-lg">TOTAL CUENTAS POR COBRAR:</span>
                      <span className="font-bold text-2xl text-green-600">
                        {totalReceivables.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payables" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Cuentas por Pagar (Proveedores)
                  </CardTitle>
                  <div className="flex gap-2 items-center">
                    <Select
                      value={payableFilter === null ? "all" : String(payableFilter)}
                      onValueChange={(val) => setPayableFilter(val === "all" ? null : Number(val))}
                    >
                      <SelectTrigger className="w-[220px]" data-testid="select-filter-payables">
                        <SelectValue placeholder="Filtrar por proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" data-testid="select-item-all-suppliers">Todos</SelectItem>
                        {accountsPayable.map(item => (
                          <SelectItem
                            key={item.supplier?.id}
                            value={String(item.supplier?.id)}
                            data-testid={`select-item-supplier-${item.supplier?.id}`}
                          >
                            {item.supplier?.name || "Proveedor Desconocido"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => handlePrint(printTableRefPayables, "Cuentas por Pagar")} data-testid="button-print-payables">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("payables")} data-testid="button-export-payables">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPayables.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay cuentas por pagar pendientes</p>
                  </div>
                ) : (
                  <div ref={printTableRefPayables}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead className="text-center">Total Facturas</TableHead>
                          <TableHead className="text-right">Monto Total</TableHead>
                          <TableHead className="text-right">Monto Pendiente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayables.map((item) => {
                          const supplierId = item.supplier?.id ?? 0;
                          const isExpanded = expandedPayables.has(supplierId);
                          return (
                            <>
                              <TableRow
                                key={`payable-${supplierId}`}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleExpandPayable(supplierId)}
                                data-testid={`row-supplier-${supplierId}`}
                              >
                                <TableCell>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" data-testid={`icon-expand-supplier-${supplierId}`} />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" data-testid={`icon-expand-supplier-${supplierId}`} />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{item.supplier?.name || "Proveedor Desconocido"}</TableCell>
                                <TableCell className="text-center">{item.invoices.length}</TableCell>
                                <TableCell className="text-right">
                                  {item.totalInvoiced.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                  {item.totalBalance.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow key={`payable-detail-${supplierId}`}>
                                  <TableCell colSpan={5} className="p-0">
                                    <div className="bg-muted/30 p-4">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-center">Fecha</TableHead>
                                            <TableHead className="text-center">Factura</TableHead>
                                            <TableHead className="text-center">Vencimiento</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Pagado</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                            <TableHead className="text-center">Estado</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {item.invoices.map(inv => {
                                            const daysOverdue = getDaysOverdue(inv.dueDate, inv.date);
                                            return (
                                              <TableRow key={inv.id} data-testid={`row-purchase-invoice-${inv.id}`}>
                                                <TableCell className="text-center">{new Date(inv.date + 'T00:00:00').toLocaleDateString("es-DO")}</TableCell>
                                                <TableCell className="text-center font-medium">{inv.invoiceNumber}</TableCell>
                                                <TableCell className="text-center">{inv.dueDate ? new Date(inv.dueDate + 'T00:00:00').toLocaleDateString("es-DO") : "-"}</TableCell>
                                                <TableCell className="text-right">
                                                  {parseFloat(String(inv.total)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {inv.paid.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-red-600">
                                                  {inv.balance.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  {daysOverdue > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                      <AlertCircle className="h-3 w-3" />
                                                      {daysOverdue} días vencido
                                                    </span>
                                                  ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                      Pendiente
                                                    </span>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center mt-4">
                      <span className="font-bold text-lg">TOTAL CUENTAS POR PAGAR:</span>
                      <span className="font-bold text-2xl text-red-600">
                        {totalPayables.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
