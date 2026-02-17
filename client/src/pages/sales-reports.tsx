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
import { BarChart3, Download, Printer, Calendar, Users, Package, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import type { Invoice, InvoiceItem, Customer, Product, Seller } from "@shared/schema";

export default function SalesReports() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const printTableRefSummary = useRef<HTMLDivElement>(null);
  const printTableRefByCustomer = useRef<HTMLDivElement>(null);
  const printTableRefProducts = useRef<HTMLDivElement>(null);
  const printTableRefBySeller = useRef<HTMLDivElement>(null);

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: invoiceItems = [] } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoice-items"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: sellers = [] } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatInvoiceDate = (date: string | Date) => {
    const dateStr = String(date).split('T')[0];
    return new Date(dateStr + 'T00:00:00').toLocaleDateString("es-DO");
  };

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

  const handleStartDateChange = (value: string) => {
    const formatted = formatDateInput(value);
    setStartDateDisplay(formatted);
    const iso = toISODate(formatted);
    if (iso) setStartDate(iso);
  };

  const handleEndDateChange = (value: string) => {
    const formatted = formatDateInput(value);
    setEndDateDisplay(formatted);
    const iso = toISODate(formatted);
    if (iso) setEndDate(iso);
  };

  const selectedPeriodLabel = `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;

  const customersMap = useMemo(() => {
    return customers.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<number, Customer>);
  }, [customers]);

  const productsMap = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<number, Product>);
  }, [products]);

  const sellersMap = useMemo(() => {
    return sellers.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<number, Seller>);
  }, [sellers]);

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

  const filteredInvoices = useMemo(() => {
    const filtered = invoices.filter(inv => {
      if (inv.status === "cancelled") return false;
      const invDateStr = String(inv.date).split('T')[0];
      const invDate = new Date(invDateStr + 'T00:00:00');
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      return invDate >= start && invDate <= end;
    });

    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "date":
          aValue = String(a.date);
          bValue = String(b.date);
          break;
        case "customer":
          aValue = customersMap[a.customerId]?.name || "";
          bValue = customersMap[b.customerId]?.name || "";
          break;
        case "invoice":
          aValue = a.invoiceNumber;
          bValue = b.invoiceNumber;
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
  }, [invoices, startDate, endDate, sortColumn, sortDirection, customersMap]);

  const invoiceItemsMap = useMemo(() => {
    const map: Record<number, InvoiceItem[]> = {};
    invoiceItems.forEach(item => {
      if (!map[item.invoiceId]) {
        map[item.invoiceId] = [];
      }
      map[item.invoiceId].push(item);
    });
    return map;
  }, [invoiceItems]);

  const salesSummary = useMemo(() => {
    const total = filteredInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.total)), 0);
    const subtotal = filteredInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.subtotal)), 0);
    const itbis = filteredInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.itbis)), 0);
    const count = filteredInvoices.length;
    const paid = filteredInvoices.filter(inv => inv.status === "paid").length;
    const pending = filteredInvoices.filter(inv => inv.status === "pending").length;
    return { total, subtotal, itbis, count, paid, pending };
  }, [filteredInvoices]);

  const salesByCustomer = useMemo(() => {
    const byCustomer: Record<number, { customer: Customer; total: number; count: number; invoices: Invoice[] }> = {};
    
    filteredInvoices.forEach(inv => {
      if (!byCustomer[inv.customerId]) {
        byCustomer[inv.customerId] = {
          customer: customersMap[inv.customerId],
          total: 0,
          count: 0,
          invoices: []
        };
      }
      byCustomer[inv.customerId].total += parseFloat(String(inv.total));
      byCustomer[inv.customerId].count += 1;
      byCustomer[inv.customerId].invoices.push(inv);
    });

    return Object.values(byCustomer).sort((a, b) => b.total - a.total);
  }, [filteredInvoices, customersMap]);

  const salesBySeller = useMemo(() => {
    const bySeller: Record<number | string, { seller: Seller | null; total: number; count: number; commission: number }> = {};
    
    filteredInvoices.forEach(inv => {
      const sellerId = inv.sellerId || 0;
      if (!bySeller[sellerId]) {
        bySeller[sellerId] = {
          seller: sellerId ? sellersMap[sellerId] : null,
          total: 0,
          count: 0,
          commission: 0
        };
      }
      bySeller[sellerId].total += parseFloat(String(inv.total));
      bySeller[sellerId].count += 1;
      bySeller[sellerId].commission += parseFloat(String(inv.commission || "0"));
    });

    return Object.values(bySeller).sort((a, b) => b.total - a.total);
  }, [filteredInvoices, sellersMap]);

  const productsSold = useMemo(() => {
    const byProduct: Record<number, { product: Product | null; name: string; quantity: number; total: number }> = {};
    
    const relevantInvoiceIds = new Set(filteredInvoices.map(inv => inv.id));
    
    invoiceItems.forEach(item => {
      if (!relevantInvoiceIds.has(item.invoiceId)) return;
      
      const productId = item.productId || 0;
      const productName = item.productId ? (productsMap[item.productId]?.name || item.description) : item.description;
      
      if (!byProduct[productId]) {
        byProduct[productId] = {
          product: item.productId ? productsMap[item.productId] : null,
          name: productName,
          quantity: 0,
          total: 0
        };
      }
      byProduct[productId].quantity += item.quantity;
      byProduct[productId].total += parseFloat(String(item.total));
    });

    return Object.values(byProduct).sort((a, b) => b.total - a.total);
  }, [filteredInvoices, invoiceItems, productsMap]);

  const customerProductsSold = useMemo(() => {
    if (selectedCustomer === "all") return productsSold;

    const customerId = parseInt(selectedCustomer);
    const customerInvoices = filteredInvoices.filter(inv => inv.customerId === customerId);
    const relevantInvoiceIds = new Set(customerInvoices.map(inv => inv.id));
    
    const byProduct: Record<number, { product: Product | null; name: string; quantity: number; total: number }> = {};
    
    invoiceItems.forEach(item => {
      if (!relevantInvoiceIds.has(item.invoiceId)) return;
      
      const productId = item.productId || 0;
      const productName = item.productId ? (productsMap[item.productId]?.name || item.description) : item.description;
      
      if (!byProduct[productId]) {
        byProduct[productId] = {
          product: item.productId ? productsMap[item.productId] : null,
          name: productName,
          quantity: 0,
          total: 0
        };
      }
      byProduct[productId].quantity += item.quantity;
      byProduct[productId].total += parseFloat(String(item.total));
    });

    return Object.values(byProduct).sort((a, b) => b.total - a.total);
  }, [selectedCustomer, filteredInvoices, invoiceItems, productsMap, productsSold]);

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

  const exportToCSV = (type: "summary" | "byCustomer" | "products" | "bySeller") => {
    let csvContent = "";
    let filename = "";
    const dateRangeSuffix = `${startDate}_${endDate}`;

    if (type === "summary") {
      filename = `resumen_ventas_${dateRangeSuffix}.csv`;
      csvContent = "Factura,Cliente,Fecha,Subtotal,ITBIS,Total,Estado\n";
      filteredInvoices.forEach(inv => {
        const customer = customersMap[inv.customerId];
        csvContent += `${inv.invoiceNumber},"${customer?.name || ""}",${inv.date},${inv.subtotal},${inv.itbis},${inv.total},${inv.status}\n`;
      });
    } else if (type === "byCustomer") {
      filename = `ventas_por_cliente_${dateRangeSuffix}.csv`;
      csvContent = "Cliente,RNC,Cantidad Facturas,Total\n";
      salesByCustomer.forEach(item => {
        csvContent += `"${item.customer?.name || ""}","${item.customer?.rnc || ""}",${item.count},${item.total.toFixed(2)}\n`;
      });
    } else if (type === "products") {
      filename = `productos_vendidos_${dateRangeSuffix}.csv`;
      csvContent = "Producto,Cantidad,Total\n";
      customerProductsSold.forEach(item => {
        csvContent += `"${item.name}",${item.quantity},${item.total.toFixed(2)}\n`;
      });
    } else if (type === "bySeller") {
      filename = `ventas_por_vendedor_${dateRangeSuffix}.csv`;
      csvContent = "Vendedor,Facturas,Total Ventas,Comision\n";
      salesBySeller.forEach(item => {
        csvContent += `"${item.seller?.name || "Sin vendedor"}",${item.count},${item.total.toFixed(2)},${item.commission.toFixed(2)}\n`;
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
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Reportes de Ventas</h1>
            <p className="text-muted-foreground mt-1">Análisis de ventas por período, cliente y producto</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
          <span className="text-sm font-medium">Desde:</span>
          <div className="flex items-center">
            <Input 
              type="text" 
              value={startDateDisplay} 
              onChange={(e) => handleStartDateChange(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-[120px] rounded-r-none border-r-0"
              data-testid="input-start-date"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-l-none" data-testid="button-start-calendar">
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
              onChange={(e) => handleEndDateChange(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-[120px] rounded-r-none border-r-0"
              data-testid="input-end-date"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-l-none" data-testid="button-end-calendar">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-black">Total Ventas</p>
                  <p className="text-lg font-bold text-black" data-testid="text-total-sales">
                    {salesSummary.total.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-black">Facturas</p>
                  <p className="text-lg font-bold text-black" data-testid="text-invoice-count">{salesSummary.count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-black">Pagadas</p>
                  <p className="text-lg font-bold text-black" data-testid="text-paid-count">{salesSummary.paid}</p>
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
                  <p className="text-lg font-bold text-black" data-testid="text-pending-count">{salesSummary.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary" data-testid="tab-summary">Resumen de Ventas</TabsTrigger>
            <TabsTrigger value="byCustomer" data-testid="tab-by-customer">Ventas por Cliente</TabsTrigger>
            <TabsTrigger value="bySeller" data-testid="tab-by-seller">Ventas por Vendedor</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">Productos Vendidos</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Resumen de Ventas - {selectedPeriodLabel}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrint(printTableRefSummary, "Resumen de Ventas")} data-testid="button-print-summary">
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
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay ventas registradas en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefSummary}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("date")}>
                            Fecha {getSortIcon("date")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("customer")}>
                            Cliente {getSortIcon("customer")}
                          </TableHead>
                          <TableHead className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort("invoice")}>
                            Factura {getSortIcon("invoice")}
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
                        {filteredInvoices.map((inv) => {
                          const customer = customersMap[inv.customerId];
                          return (
                            <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                              <TableCell className="text-center">{formatInvoiceDate(inv.date)}</TableCell>
                              <TableCell className="text-center">{customer?.name || "Desconocido"}</TableCell>
                              <TableCell className="text-center text-sm font-medium">{inv.invoiceNumber}</TableCell>
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
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {inv.status === "paid" ? "Pagada" : inv.status === "pending" ? "Pendiente" : inv.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell className="font-bold text-black">{filteredInvoices.length} facturas</TableCell>
                          <TableCell colSpan={2} className="text-center font-bold text-black">TOTALES:</TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {salesSummary.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {salesSummary.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {salesSummary.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="byCustomer" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Ventas por Cliente - {selectedPeriodLabel}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrint(printTableRefByCustomer, "Ventas por Cliente")} data-testid="button-print-by-customer">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("byCustomer")} data-testid="button-export-by-customer">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salesByCustomer.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay ventas registradas en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefByCustomer}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Cliente</TableHead>
                          <TableHead className="text-center">RNC/Cédula</TableHead>
                          <TableHead className="text-center">Facturas</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesByCustomer.map((item, index) => (
                          <TableRow key={item.customer?.id || index} data-testid={`row-customer-${item.customer?.id}`}>
                            <TableCell className="text-center font-medium">{item.customer?.name || "Desconocido"}</TableCell>
                            <TableCell className="text-center text-sm">{item.customer?.rnc || "-"}</TableCell>
                            <TableCell className="text-center">{item.count}</TableCell>
                            <TableCell className="text-center font-medium">
                              {item.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell className="font-bold text-black">{salesByCustomer.length} clientes</TableCell>
                          <TableCell className="text-center font-bold text-black">TOTAL:</TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {salesByCustomer.reduce((sum, c) => sum + c.count, 0)}
                          </TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {salesByCustomer.reduce((sum, c) => sum + c.total, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bySeller" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Ventas por Vendedor - {selectedPeriodLabel}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrint(printTableRefBySeller, "Ventas por Vendedor")} data-testid="button-print-by-seller">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("bySeller")} data-testid="button-export-by-seller">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salesBySeller.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay ventas registradas en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefBySeller}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Vendedor</TableHead>
                          <TableHead className="text-center">Facturas</TableHead>
                          <TableHead className="text-center">Total Ventas</TableHead>
                          <TableHead className="text-center">Comisión</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesBySeller.map((item, index) => (
                          <TableRow key={item.seller?.id || index} data-testid={`row-seller-${item.seller?.id || 'none'}`}>
                            <TableCell className="text-center font-medium">{item.seller?.name || "Sin vendedor"}</TableCell>
                            <TableCell className="text-center">{item.count}</TableCell>
                            <TableCell className="text-center font-medium">
                              {item.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center font-medium text-green-600">
                              {item.commission.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell className="font-bold text-black">{salesBySeller.length} vendedores</TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {salesBySeller.reduce((sum, s) => sum + s.count, 0)}
                          </TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {salesBySeller.reduce((sum, s) => sum + s.total, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center font-bold text-green-600">
                            {salesBySeller.reduce((sum, s) => sum + s.commission, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Productos Vendidos - {selectedPeriodLabel}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger className="w-[200px]" data-testid="select-customer-filter">
                        <SelectValue placeholder="Todos los clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>{customer.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => handlePrint(printTableRefProducts, "Productos Vendidos")} data-testid="button-print-products">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("products")} data-testid="button-export-products">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {customerProductsSold.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay productos vendidos en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefProducts}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Producto</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerProductsSold.map((item, index) => (
                          <TableRow key={index} data-testid={`row-product-${index}`}>
                            <TableCell className="text-center font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-center font-medium">
                              {item.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell className="font-bold text-black">{customerProductsSold.length} productos</TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {customerProductsSold.reduce((sum, p) => sum + p.quantity, 0)}
                          </TableCell>
                          <TableCell className="text-center font-bold text-black">
                            {customerProductsSold.reduce((sum, p) => sum + p.total, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
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
