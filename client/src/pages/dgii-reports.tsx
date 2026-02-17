import { useState, useMemo, useRef } from "react";
import { getLocalDateString } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { FileSpreadsheet, Download, FileText, Calendar, Building2, AlertCircle, AlertTriangle, Printer } from "lucide-react";
import type { PurchaseInvoice, Invoice, Supplier, Customer, CompanySettings } from "@shared/schema";

function getFirstDayOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getLastDayOfMonth(date: Date): string {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr + 'T00:00:00').toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (a > 31) return new Date(a, b - 1, c);
    if (c > 31) return new Date(c, b - 1, a);
    return new Date(a, b - 1, c);
  }
  return null;
}

function formatDateDGII(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatRNC(rnc: string | null | undefined): string {
  if (!rnc) return "";
  const cleaned = rnc.replace(/\D/g, "");
  return cleaned;
}

function formatRNCPadded(rnc: string | null | undefined): string {
  if (!rnc) return "".padStart(11, " ");
  const cleaned = rnc.replace(/\D/g, "");
  return cleaned.padStart(11, "0");
}

function formatNCF(ncf: string | null | undefined): string {
  if (!ncf) return "";
  return ncf.replace(/\s/g, "").toUpperCase();
}

function formatAmount(amount: string | number | null | undefined): string {
  const num = parseFloat(String(amount || 0));
  return num.toFixed(2);
}

function formatAmountDGII(amount: string | number | null | undefined): string {
  const num = parseFloat(String(amount || 0));
  return Math.round(num * 100).toString();
}

function getTipoId(rnc: string | null | undefined): string {
  if (!rnc) return "3";
  const cleaned = rnc.replace(/\D/g, "");
  if (cleaned.length === 9) return "1";
  if (cleaned.length === 11) return "2";
  return "3";
}

function getNCFType(ncf: string | null | undefined): string {
  if (!ncf) return "";
  const prefix = ncf.substring(0, 3).toUpperCase();
  const types: Record<string, string> = {
    "B01": "01",
    "B02": "02",
    "B11": "11",
    "B12": "12",
    "B13": "13",
    "B14": "14",
    "B15": "15",
    "B16": "16",
  };
  return types[prefix] || "02";
}

export default function DGIIReports() {
  const today = new Date();
  const [startDate, setStartDate] = useState(getFirstDayOfMonth(today));
  const [endDate, setEndDate] = useState(getLastDayOfMonth(today));
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");

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

  const [startDateDisplay, setStartDateDisplay] = useState(toDisplayDate(startDate));
  const [endDateDisplay, setEndDateDisplay] = useState(toDisplayDate(endDate));
  
  const printTableRef606 = useRef<HTMLDivElement>(null);
  const printTableRef607 = useRef<HTMLDivElement>(null);
  const printTableRef608 = useRef<HTMLDivElement>(null);

  const handlePrint = (tableRef: React.RefObject<HTMLDivElement | null>, title: string) => {
    if (!tableRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const periodLabel = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
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
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>Período: ${periodLabel}</h2>
          ${tableRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ["/api/purchase-invoices"],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const res = await fetch("/api/company-settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const suppliersMap = useMemo(() => {
    return suppliers.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<number, Supplier>);
  }, [suppliers]);

  const customersMap = useMemo(() => {
    return customers.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<number, Customer>);
  }, [customers]);

  const filteredPurchases = useMemo(() => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59.999");
    
    return purchaseInvoices.filter((inv) => {
      const date = parseDate(inv.date);
      if (!date) return false;
      const matchesDate = date >= start && date <= end;
      const matchesSupplier = selectedSupplierId === "all" || inv.supplierId === parseInt(selectedSupplierId);
      return matchesDate && matchesSupplier && inv.status !== "cancelled" && inv.ncf;
    });
  }, [purchaseInvoices, startDate, endDate, selectedSupplierId]);

  const filteredSales = useMemo(() => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59.999");
    
    return invoices.filter((inv) => {
      const date = parseDate(inv.date);
      if (!date) return false;
      return date >= start && date <= end && inv.status !== "cancelled" && inv.ncf;
    });
  }, [invoices, startDate, endDate]);

  const cancelledInvoices = useMemo(() => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59.999");
    
    const cancelledSales = invoices.filter((inv) => {
      const date = parseDate(inv.date);
      if (!date) return false;
      return date >= start && date <= end && inv.status === "cancelled" && inv.ncf;
    }).map((inv) => ({
      type: "venta" as const,
      ncf: inv.ncf,
      date: inv.date,
    }));

    const cancelledPurchases = purchaseInvoices.filter((inv) => {
      const date = parseDate(inv.date);
      if (!date) return false;
      return date >= start && date <= end && inv.status === "cancelled" && inv.ncf;
    }).map((inv) => ({
      type: "compra" as const,
      ncf: inv.ncf,
      date: inv.date,
    }));

    return [...cancelledSales, ...cancelledPurchases];
  }, [invoices, purchaseInvoices, startDate, endDate]);

  const purchaseIssues = useMemo(() => {
    return filteredPurchases.filter((inv) => {
      const supplier = suppliersMap[inv.supplierId];
      return !supplier?.rnc || !inv.ncf;
    });
  }, [filteredPurchases, suppliersMap]);

  const salesIssues = useMemo(() => {
    return filteredSales.filter((inv) => {
      const customer = customersMap[inv.customerId];
      const ncfType = getNCFType(inv.ncf);
      return (ncfType === "01" && !customer?.rnc) || !inv.ncf;
    });
  }, [filteredSales, customersMap]);

  const purchaseTotals = useMemo(() => {
    return filteredPurchases.reduce(
      (acc, inv) => ({
        subtotal: acc.subtotal + parseFloat(String(inv.subtotal)),
        itbis: acc.itbis + parseFloat(String(inv.itbis)),
        total: acc.total + parseFloat(String(inv.total)),
        count: acc.count + 1,
      }),
      { subtotal: 0, itbis: 0, total: 0, count: 0 }
    );
  }, [filteredPurchases]);

  const salesTotals = useMemo(() => {
    return filteredSales.reduce(
      (acc, inv) => ({
        subtotal: acc.subtotal + parseFloat(String(inv.subtotal)),
        itbis: acc.itbis + parseFloat(String(inv.itbis)),
        total: acc.total + parseFloat(String(inv.total)),
        count: acc.count + 1,
      }),
      { subtotal: 0, itbis: 0, total: 0, count: 0 }
    );
  }, [filteredSales]);

  const exportToCSV = (type: "606" | "607" | "608") => {
    let csvContent = "";
    const startParts = startDate.split("-");
    const period = `${startParts[0]}${startParts[1]}`;
    const companyRNC = formatRNC(companySettings?.rnc);

    if (type === "606") {
      csvContent = "RNC/Cedula,Tipo Id,Tipo Bienes y Servicios,NCF,NCF o Documento Modificado,Fecha Comprobante,Fecha Pago,Monto Facturado,ITBIS Facturado,ITBIS Retenido,ITBIS sujeto a Proporcionalidad (Art. 349),ITBIS llevado al Costo,ITBIS por Adelantar,ITBIS percibido en compras,Tipo de Retencion en ISR,Monto Retencion Renta,ISR Percibido en compras,Impuesto Selectivo al Consumo,Otros Impuesto/Tasas,Monto Propina Legal,Forma de Pago\n";
      
      filteredPurchases.forEach((inv) => {
        const supplier = suppliersMap[inv.supplierId];
        const rnc = formatRNC(supplier?.rnc);
        const tipoId = getTipoId(supplier?.rnc);
        const ncfType = getNCFType(inv.ncf) || "02";
        const ncf = formatNCF(inv.ncf);
        const fecha = formatDateDGII(inv.date);
        const monto = formatAmount(inv.total);
        const itbis = formatAmount(inv.itbis);
        
        csvContent += `${rnc},${tipoId},${ncfType},${ncf},,${fecha},,${monto},${itbis},0.00,0.00,0.00,0.00,0.00,,0.00,0.00,0.00,0.00,0.00,04\n`;
      });
    } else if (type === "607") {
      csvContent = "RNC/Cedula,Tipo Id,NCF,NCF o Documento Modificado,Tipo de Ingreso,Fecha Comprobante,Fecha de Retencion,Monto Facturado,ITBIS Facturado,ITBIS Retenido por Terceros,ITBIS Percibido,Retencion Renta por Terceros,ISR Percibido,Impuesto Selectivo al Consumo,Otros Impuestos/Tasas,Monto Propina Legal,Efectivo,Cheque/Transferencia/Deposito,Tarjeta Debito/Credito,Venta a Credito,Bonos o Certificados de Regalo,Permuta,Otras Formas de Ventas\n";
      
      filteredSales.forEach((inv) => {
        const customer = customersMap[inv.customerId];
        const rnc = formatRNC(customer?.rnc);
        const tipoId = getTipoId(customer?.rnc);
        const ncf = formatNCF(inv.ncf);
        const fecha = formatDateDGII(inv.date);
        const monto = formatAmount(inv.total);
        const itbis = formatAmount(inv.itbis);
        const isPaid = inv.status === "paid";
        
        csvContent += `${rnc},${tipoId},${ncf},,01,${fecha},,${monto},${itbis},0.00,0.00,0.00,0.00,0.00,0.00,0.00,${isPaid ? monto : "0.00"},0.00,0.00,${isPaid ? "0.00" : monto},0.00,0.00,0.00\n`;
      });
    } else if (type === "608") {
      csvContent = "NCF,Tipo de Anulacion,Fecha Comprobante\n";
      
      cancelledInvoices.forEach((inv) => {
        const ncf = formatNCF(inv.ncf);
        const fecha = formatDateDGII(inv.date);
        csvContent += `${ncf},02,${fecha}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const filename = `${type}_${companyRNC}_${period}.csv`;
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportToTXT = (type: "606" | "607" | "608") => {
    let content = "";
    const startParts = startDate.split("-");
    const period = `${startParts[0]}${startParts[1]}`;
    const companyRNC = formatRNC(companySettings?.rnc);

    if (type === "606") {
      filteredPurchases.forEach((inv) => {
        const supplier = suppliersMap[inv.supplierId];
        const rnc = formatRNCPadded(supplier?.rnc);
        const tipoId = getTipoId(supplier?.rnc);
        const ncfType = (getNCFType(inv.ncf) || "02").padEnd(2);
        const ncf = formatNCF(inv.ncf).padEnd(19);
        const fecha = formatDateDGII(inv.date).padEnd(8);
        const monto = formatAmount(inv.total).padStart(12);
        const itbis = formatAmount(inv.itbis).padStart(12);
        
        content += `${rnc}${tipoId}${ncfType}${ncf}${" ".repeat(19)}${fecha}${" ".repeat(8)}${monto}${itbis}${"0.00".padStart(12).repeat(5)}${"".padEnd(1)}${"0.00".padStart(12).repeat(2)}${"0.00".padStart(12).repeat(2)}${"0.00".padStart(12)}04\n`;
      });
    } else if (type === "607") {
      filteredSales.forEach((inv) => {
        const customer = customersMap[inv.customerId];
        const rnc = formatRNCPadded(customer?.rnc);
        const tipoId = getTipoId(customer?.rnc);
        const ncf = formatNCF(inv.ncf).padEnd(19);
        const fecha = formatDateDGII(inv.date).padEnd(8);
        const monto = formatAmount(inv.total).padStart(12);
        const itbis = formatAmount(inv.itbis).padStart(12);
        
        content += `${rnc}${tipoId}${ncf}${" ".repeat(19)}01${fecha}${" ".repeat(8)}${monto}${itbis}${"0.00".padStart(12).repeat(6)}${"0.00".padStart(12)}${monto.padStart(12)}${"0.00".padStart(12).repeat(5)}\n`;
      });
    } else if (type === "608") {
      cancelledInvoices.forEach((inv) => {
        const ncf = formatNCF(inv.ncf).padEnd(19);
        const fecha = formatDateDGII(inv.date).padEnd(8);
        content += `${ncf}02${fecha}\n`;
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    const filename = `${type}_${companyRNC}_${period}.txt`;
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const selectedPeriodLabel = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Reportes DGII</h1>
            <p className="text-muted-foreground mt-1">
              Formatos 606, 607 y 608 para la Dirección General de Impuestos Internos
            </p>
          </div>
        </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Período de Reporte</CardTitle>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Desde:</Label>
                <div className="flex items-center">
                  <Input
                    type="text"
                    value={startDateDisplay}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setStartDateDisplay(formatted);
                      const iso = toISODate(formatted);
                      if (iso) setStartDate(iso);
                    }}
                    placeholder="dd/mm/yyyy"
                    className="w-[120px] rounded-r-none border-r-0"
                    data-testid="input-start-date"
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
                        selected={startDate ? new Date(startDate + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const localDate = getLocalDateString(date);
                            setStartDate(localDate);
                            setStartDateDisplay(toDisplayDate(localDate));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Hasta:</Label>
                <div className="flex items-center">
                  <Input
                    type="text"
                    value={endDateDisplay}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setEndDateDisplay(formatted);
                      const iso = toISODate(formatted);
                      if (iso) setEndDate(iso);
                    }}
                    placeholder="dd/mm/yyyy"
                    className="w-[120px] rounded-r-none border-r-0"
                    data-testid="input-end-date"
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
                        selected={endDate ? new Date(endDate + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const localDate = getLocalDateString(date);
                            setEndDate(localDate);
                            setEndDateDisplay(toDisplayDate(localDate));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Proveedor:</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="w-[200px]" data-testid="select-supplier-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proveedores</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="606" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="606" className="flex items-center gap-2" data-testid="tab-606">
            <FileSpreadsheet className="h-4 w-4" />
            Formato 606
          </TabsTrigger>
          <TabsTrigger value="607" className="flex items-center gap-2" data-testid="tab-607">
            <FileText className="h-4 w-4" />
            Formato 607
          </TabsTrigger>
          <TabsTrigger value="608" className="flex items-center gap-2" data-testid="tab-608">
            <AlertCircle className="h-4 w-4" />
            Formato 608
          </TabsTrigger>
        </TabsList>

        <TabsContent value="606" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Formato 606 - Compras de Bienes y Servicios
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reporte de compras realizadas a proveedores - {selectedPeriodLabel}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handlePrint(printTableRef606, "Formato 606 - Compras")} data-testid="button-print-606">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button variant="outline" onClick={() => exportToCSV("606")} data-testid="button-export-606-csv">
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={() => exportToTXT("606")} data-testid="button-export-606-txt">
                    <Download className="mr-2 h-4 w-4" />
                    TXT
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {purchaseIssues.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Datos Incompletos</AlertTitle>
                  <AlertDescription>
                    {purchaseIssues.length} factura(s) tienen datos faltantes (RNC de proveedor o NCF). 
                    Revisa estos registros antes de exportar.
                  </AlertDescription>
                </Alert>
              )}

              {filteredPurchases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay compras registradas en este período</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden" ref={printTableRef606}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">RNC Proveedor</TableHead>
                        <TableHead className="text-center">Proveedor</TableHead>
                        <TableHead className="text-center">NCF</TableHead>
                        <TableHead className="text-center">Fecha</TableHead>
                        <TableHead className="text-center">Monto</TableHead>
                        <TableHead className="text-center">ITBIS</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchases.map((inv) => {
                        const supplier = suppliersMap[inv.supplierId];
                        return (
                          <TableRow key={inv.id} data-testid={`row-purchase-${inv.id}`}>
                            <TableCell className="text-center text-sm font-medium">{supplier?.rnc || "-"}</TableCell>
                            <TableCell className="text-center">{supplier?.name || "Desconocido"}</TableCell>
                            <TableCell className="text-center text-sm font-medium">{inv.ncf || "-"}</TableCell>
                            <TableCell className="text-center">{new Date(inv.date + 'T00:00:00').toLocaleDateString("es-DO")}</TableCell>
                            <TableCell className="text-center">
                              {parseFloat(String(inv.subtotal)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                              {parseFloat(String(inv.itbis)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {parseFloat(String(inv.total)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <tfoot>
                      <TableRow className="bg-gray-100 border-t-2">
                        <TableCell colSpan={4} className="font-bold text-black">{filteredPurchases.length} facturas</TableCell>
                        <TableCell className="text-center font-bold text-black">
                          {purchaseTotals.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center font-bold text-black">
                          {purchaseTotals.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center font-bold text-black">
                          {purchaseTotals.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="607" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Formato 607 - Ventas de Bienes y Servicios
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reporte de ventas realizadas a clientes - {selectedPeriodLabel}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handlePrint(printTableRef607, "Formato 607 - Ventas")} data-testid="button-print-607">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button variant="outline" onClick={() => exportToCSV("607")} data-testid="button-export-607-csv">
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={() => exportToTXT("607")} data-testid="button-export-607-txt">
                    <Download className="mr-2 h-4 w-4" />
                    TXT
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {salesIssues.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Datos Incompletos</AlertTitle>
                  <AlertDescription>
                    {salesIssues.length} factura(s) con Crédito Fiscal (B01) no tienen RNC del cliente o falta NCF.
                  </AlertDescription>
                </Alert>
              )}

              {filteredSales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay ventas registradas en este período</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden" ref={printTableRef607}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">RNC/Cédula</TableHead>
                        <TableHead className="text-center">Cliente</TableHead>
                        <TableHead className="text-center">NCF</TableHead>
                        <TableHead className="text-center">Fecha</TableHead>
                        <TableHead className="text-center">Monto</TableHead>
                        <TableHead className="text-center">ITBIS</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((inv) => {
                        const customer = customersMap[inv.customerId];
                        return (
                          <TableRow key={inv.id} data-testid={`row-sale-${inv.id}`}>
                            <TableCell className="text-center text-sm font-medium">{customer?.rnc || "-"}</TableCell>
                            <TableCell className="text-center">{customer?.name || "Desconocido"}</TableCell>
                            <TableCell className="text-center text-sm font-medium">{inv.ncf || "-"}</TableCell>
                            <TableCell className="text-center">{new Date(inv.date + 'T00:00:00').toLocaleDateString("es-DO")}</TableCell>
                            <TableCell className="text-center">
                              {parseFloat(String(inv.subtotal)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                              {parseFloat(String(inv.itbis)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {parseFloat(String(inv.total)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <tfoot>
                      <TableRow className="bg-gray-100 border-t-2">
                        <TableCell colSpan={4} className="font-bold text-black">{filteredSales.length} facturas</TableCell>
                        <TableCell className="text-center font-bold text-black">
                          {salesTotals.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center font-bold text-black">
                          {salesTotals.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center font-bold text-black">
                          {salesTotals.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="608" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Formato 608 - Comprobantes Anulados
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reporte de NCF anulados - {selectedPeriodLabel}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handlePrint(printTableRef608, "Formato 608 - Anulados")} disabled={cancelledInvoices.length === 0} data-testid="button-print-608">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button variant="outline" onClick={() => exportToCSV("608")} disabled={cancelledInvoices.length === 0} data-testid="button-export-608-csv">
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={() => exportToTXT("608")} disabled={cancelledInvoices.length === 0} data-testid="button-export-608-txt">
                    <Download className="mr-2 h-4 w-4" />
                    TXT
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">Comprobantes Anulados</p>
                  <p className="text-2xl font-bold text-red-700">{cancelledInvoices.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">Período</p>
                  <p className="text-2xl font-bold">{selectedPeriodLabel}</p>
                </div>
              </div>

              {cancelledInvoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay comprobantes anulados en este período</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden" ref={printTableRef608}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NCF</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo de Anulación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancelledInvoices.map((inv, index) => (
                        <TableRow key={index} data-testid={`row-cancelled-${index}`}>
                          <TableCell className="text-sm font-medium">{inv.ncf}</TableCell>
                          <TableCell>
                            <Badge variant={inv.type === "venta" ? "default" : "secondary"}>
                              {inv.type === "venta" ? "Venta" : "Compra"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(inv.date + 'T00:00:00').toLocaleDateString("es-DO")}</TableCell>
                          <TableCell>02 - Deterioro de impreso</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
