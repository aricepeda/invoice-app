import { Layout } from "@/components/layout";
import { getLocalDateString } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { BarChart3, Download, Printer, Calendar, Building2, Package, TrendingDown, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import type { PurchaseInvoice, PurchaseInvoiceItem, Supplier, Product } from "@shared/schema";

export default function PurchaseReports() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
  
  const printTableRefSummary = useRef<HTMLDivElement>(null);
  const printTableRefBySupplier = useRef<HTMLDivElement>(null);

  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ["/api/purchase-invoices"],
  });

  const { data: purchaseInvoiceItems = [] } = useQuery<PurchaseInvoiceItem[]>({
    queryKey: ["/api/purchase-invoice-items"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatInvoiceDate = (date: string | Date) => {
    const dateStr = String(date).split('T')[0];
    return new Date(dateStr + 'T00:00:00').toLocaleDateString("es-DO");
  };

  const selectedPeriodLabel = `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;

  const suppliersMap = useMemo(() => {
    return suppliers.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<number, Supplier>);
  }, [suppliers]);

  const productsMap = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<number, Product>);
  }, [products]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="inline h-3 w-3 ml-1" />
      : <ArrowDown className="inline h-3 w-3 ml-1" />;
  };

  const filteredPurchaseInvoices = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    const filtered = purchaseInvoices.filter(inv => {
      if (inv.status === "cancelled") return false;
      
      const invDateStr = String(inv.date).split('T')[0];
      const invDate = new Date(invDateStr + 'T00:00:00');
      if (invDate < start || invDate > end) return false;
      
      if (selectedSupplierFilter !== "all" && inv.supplierId !== parseInt(selectedSupplierFilter)) {
        return false;
      }
      
      if (selectedStatusFilter !== "all") {
        if (selectedStatusFilter === "paid") {
          if (inv.status !== "paid") return false;
        } else if (selectedStatusFilter === "pending") {
          if (inv.status !== "pending" && inv.status !== "partial") return false;
        } else if (selectedStatusFilter === "overdue") {
          const invoiceDate = new Date(String(inv.date).split('T')[0] + 'T00:00:00');
          const paymentDays = inv.paymentTermsDays || 0;
          const calculatedDueDate = new Date(invoiceDate);
          calculatedDueDate.setDate(calculatedDueDate.getDate() + paymentDays);
          const isOverdue = calculatedDueDate < end && inv.status !== "paid";
          if (!isOverdue) return false;
        }
      }
      
      return true;
    });

    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "date":
          aValue = String(a.date);
          bValue = String(b.date);
          break;
        case "supplier":
          aValue = suppliersMap[a.supplierId]?.name || "";
          bValue = suppliersMap[b.supplierId]?.name || "";
          break;
        case "invoice":
          aValue = a.invoiceNumber;
          bValue = b.invoiceNumber;
          break;
        case "ncf":
          aValue = a.ncf || "";
          bValue = b.ncf || "";
          break;
        case "subtotal":
          aValue = parseFloat(String(a.subtotal));
          bValue = parseFloat(String(b.subtotal));
          break;
        case "itbis":
          aValue = parseFloat(String(a.itbis));
          bValue = parseFloat(String(b.itbis));
          break;
        case "total":
          aValue = parseFloat(String(a.total));
          bValue = parseFloat(String(b.total));
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [purchaseInvoices, startDate, endDate, selectedSupplierFilter, selectedStatusFilter, sortColumn, sortDirection, suppliersMap]);

  const purchaseItemsMap = useMemo(() => {
    const map: Record<number, PurchaseInvoiceItem[]> = {};
    purchaseInvoiceItems.forEach(item => {
      if (!map[item.purchaseInvoiceId]) {
        map[item.purchaseInvoiceId] = [];
      }
      map[item.purchaseInvoiceId].push(item);
    });
    return map;
  }, [purchaseInvoiceItems]);

  const purchaseSummary = useMemo(() => {
    const total = filteredPurchaseInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.total)), 0);
    const subtotal = filteredPurchaseInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.subtotal)), 0);
    const itbis = filteredPurchaseInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.itbis)), 0);
    const count = filteredPurchaseInvoices.length;
    const paid = filteredPurchaseInvoices.filter(inv => inv.status === "paid").length;
    const pending = filteredPurchaseInvoices.filter(inv => inv.status === "pending" || inv.status === "partial").length;
    return { total, subtotal, itbis, count, paid, pending };
  }, [filteredPurchaseInvoices]);

  const purchasesBySupplier = useMemo(() => {
    const bySupplier: Record<number, { supplier: Supplier; total: number; count: number; invoices: PurchaseInvoice[] }> = {};
    
    filteredPurchaseInvoices.forEach(inv => {
      if (!bySupplier[inv.supplierId]) {
        bySupplier[inv.supplierId] = {
          supplier: suppliersMap[inv.supplierId],
          total: 0,
          count: 0,
          invoices: []
        };
      }
      bySupplier[inv.supplierId].total += parseFloat(String(inv.total));
      bySupplier[inv.supplierId].count += 1;
      bySupplier[inv.supplierId].invoices.push(inv);
    });

    return Object.values(bySupplier).sort((a, b) => b.total - a.total);
  }, [filteredPurchaseInvoices, suppliersMap]);

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
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            tfoot td { background-color: #f5f5f5; font-weight: bold; }
            svg { display: none; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>Período: ${selectedPeriodLabel}</h2>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  };

  const exportToCSV = (type: "summary" | "bySupplier") => {
    let csvContent = "";
    let filename = "";
    const dateRangeSuffix = `${startDate}_${endDate}`;

    if (type === "summary") {
      filename = `resumen_compras_${dateRangeSuffix}.csv`;
      csvContent = "Fecha,Proveedor,Factura,NCF,Subtotal,ITBIS,Total,Estado\n";
      filteredPurchaseInvoices.forEach(inv => {
        const supplier = suppliersMap[inv.supplierId];
        csvContent += `${inv.date},"${supplier?.name || ""}",${inv.invoiceNumber},"${inv.ncf || ""}",${inv.subtotal},${inv.itbis},${inv.total},${inv.status}\n`;
      });
    } else if (type === "bySupplier") {
      filename = `compras_por_proveedor_${dateRangeSuffix}.csv`;
      csvContent = "Proveedor,RNC,Cantidad Facturas,Total\n";
      purchasesBySupplier.forEach(item => {
        csvContent += `"${item.supplier?.name || ""}","${item.supplier?.rnc || ""}",${item.count},${item.total.toFixed(2)}\n`;
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
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Reportes de Compras</h1>
            <p className="text-muted-foreground mt-1">Análisis de compras por período, proveedor y producto</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg border">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Desde:</span>
          </div>
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
          <span className="text-sm font-medium">Hasta:</span>
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
          
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Proveedor:</span>
          </div>
          <Select value={selectedSupplierFilter} onValueChange={setSelectedSupplierFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-supplier-filter">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <span className="text-sm font-medium">Estado:</span>
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="paid">Pagadas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-black">Total Compras</p>
                  <p className="text-lg font-bold text-black" data-testid="text-total-purchases">
                    {purchaseSummary.total.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-black">Facturas</p>
                  <p className="text-lg font-bold text-black" data-testid="text-invoice-count">{purchaseSummary.count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-black">Pagadas</p>
                  <p className="text-lg font-bold text-black" data-testid="text-paid-count">{purchaseSummary.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-black">Pendientes</p>
                  <p className="text-lg font-bold text-black" data-testid="text-pending-count">{purchaseSummary.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary" data-testid="tab-summary">Resumen de Compras</TabsTrigger>
            <TabsTrigger value="bySupplier" data-testid="tab-by-supplier">Compras por Proveedor</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Resumen de Compras - {selectedPeriodLabel}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrint(printTableRefSummary, "Resumen de Compras")} data-testid="button-print-summary">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("summary")} data-testid="button-export-summary">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPurchaseInvoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay compras registradas en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefSummary}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("date")}>
                            Fecha {getSortIcon("date")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("supplier")}>
                            Proveedor {getSortIcon("supplier")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("invoice")}>
                            Factura {getSortIcon("invoice")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("ncf")}>
                            NCF {getSortIcon("ncf")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("subtotal")}>
                            Subtotal {getSortIcon("subtotal")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("itbis")}>
                            ITBIS {getSortIcon("itbis")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("total")}>
                            Total {getSortIcon("total")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("status")}>
                            Estado {getSortIcon("status")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPurchaseInvoices.map((inv) => {
                          const supplier = suppliersMap[inv.supplierId];
                          return (
                            <TableRow key={inv.id} data-testid={`row-purchase-invoice-${inv.id}`}>
                              <TableCell className="text-center">{formatInvoiceDate(inv.date)}</TableCell>
                              <TableCell className="text-center">{supplier?.name || "Desconocido"}</TableCell>
                              <TableCell className="text-center text-sm font-medium">{inv.invoiceNumber}</TableCell>
                              <TableCell className="text-center text-sm">{inv.ncf || "—"}</TableCell>
                              <TableCell className="text-center">
                                {parseFloat(String(inv.subtotal)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">
                                {parseFloat(String(inv.itbis)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {parseFloat(String(inv.total)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  inv.status === "paid" ? "bg-green-100 text-green-700" :
                                  inv.status === "pending" ? "bg-amber-100 text-amber-700" :
                                  inv.status === "partial" ? "bg-blue-100 text-blue-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {inv.status === "paid" ? "Pagada" : 
                                   inv.status === "pending" ? "Pendiente" : 
                                   inv.status === "partial" ? "Parcial" : inv.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell colSpan={4} className="font-bold text-black">{filteredPurchaseInvoices.length} facturas</TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {purchaseSummary.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {purchaseSummary.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {purchaseSummary.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bySupplier" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Compras por Proveedor - {selectedPeriodLabel}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrint(printTableRefBySupplier, "Compras por Proveedor")} data-testid="button-print-by-supplier">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("bySupplier")} data-testid="button-export-by-supplier">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {purchasesBySupplier.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay compras registradas en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefBySupplier}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>RNC</TableHead>
                          <TableHead className="text-center">Facturas</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchasesBySupplier.map((item, index) => (
                          <TableRow key={item.supplier?.id || index} data-testid={`row-supplier-${item.supplier?.id}`}>
                            <TableCell className="font-medium">{item.supplier?.name || "Desconocido"}</TableCell>
                            <TableCell className="text-sm">{item.supplier?.rnc || "-"}</TableCell>
                            <TableCell className="text-center">{item.count}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell className="font-bold text-black">{purchasesBySupplier.length} proveedores</TableCell>
                          <TableCell className="text-right font-bold text-black">TOTAL:</TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {purchasesBySupplier.reduce((sum, s) => sum + s.count, 0)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-black">
                            {purchasesBySupplier.reduce((sum, s) => sum + s.total, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </tfoot>
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
