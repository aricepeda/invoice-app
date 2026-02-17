import { Layout } from "@/components/layout";
import { getLocalDateString } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Download, Printer, Calendar, Package, TrendingUp, Award, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import type { Invoice, InvoiceItem, PurchaseInvoice, PurchaseInvoiceItem, Product } from "@shared/schema";

export default function InventoryReports() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

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
  
  const printTableRefBestSelling = useRef<HTMLDivElement>(null);
  const printTableRefByRevenue = useRef<HTMLDivElement>(null);
  const printTableRefPurchased = useRef<HTMLDivElement>(null);

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: invoiceItems = [] } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoice-items"],
  });

  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ["/api/purchase-invoices"],
  });

  const { data: purchaseInvoiceItems = [] } = useQuery<PurchaseInvoiceItem[]>({
    queryKey: ["/api/purchase-invoice-items"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
  };

  const selectedPeriodLabel = `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;

  const productsMap = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<number, Product>);
  }, [products]);

  const filteredSalesInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.status === "cancelled") return false;
      const invDateStr = String(inv.date).split('T')[0];
      const invDate = new Date(invDateStr + 'T00:00:00');
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      return invDate >= start && invDate <= end;
    });
  }, [invoices, startDate, endDate]);

  const filteredPurchaseInvoices = useMemo(() => {
    return purchaseInvoices.filter(inv => {
      if (inv.status === "cancelled") return false;
      const invDateStr = String(inv.date).split('T')[0];
      const invDate = new Date(invDateStr + 'T00:00:00');
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      return invDate >= start && invDate <= end;
    });
  }, [purchaseInvoices, startDate, endDate]);

  const bestSellingProducts = useMemo(() => {
    const relevantInvoiceIds = new Set(filteredSalesInvoices.map(inv => inv.id));
    const byProduct: Record<string, { 
      productId: number | null; 
      name: string; 
      code: string;
      quantity: number; 
      revenue: number;
      cost: number;
      margin: number;
    }> = {};

    invoiceItems.forEach(item => {
      if (!relevantInvoiceIds.has(item.invoiceId)) return;

      const key = item.productId ? `product-${item.productId}` : `desc-${item.description}`;
      const product = item.productId ? productsMap[item.productId] : null;
      const productName = product?.name || item.description;
      const productCode = product?.code || "-";
      const unitCost = product?.cost ? parseFloat(String(product.cost)) : 0;

      if (!byProduct[key]) {
        byProduct[key] = {
          productId: item.productId,
          name: productName,
          code: productCode,
          quantity: 0,
          revenue: 0,
          cost: 0,
          margin: 0
        };
      }

      const itemTotal = parseFloat(String(item.total));
      const itemCost = unitCost * item.quantity;

      byProduct[key].quantity += item.quantity;
      byProduct[key].revenue += itemTotal;
      byProduct[key].cost += itemCost;
      byProduct[key].margin = byProduct[key].revenue - byProduct[key].cost;
    });

    return Object.values(byProduct).sort((a, b) => b.quantity - a.quantity);
  }, [filteredSalesInvoices, invoiceItems, productsMap]);

  const productsByRevenue = useMemo(() => {
    return [...bestSellingProducts].sort((a, b) => b.revenue - a.revenue);
  }, [bestSellingProducts]);

  const purchasedProducts = useMemo(() => {
    const relevantInvoiceIds = new Set(filteredPurchaseInvoices.map(inv => inv.id));
    const byProduct: Record<string, { 
      productId: number | null; 
      name: string; 
      code: string;
      quantity: number; 
      total: number;
    }> = {};

    purchaseInvoiceItems.forEach(item => {
      if (!relevantInvoiceIds.has(item.purchaseInvoiceId)) return;

      const key = item.productId ? `product-${item.productId}` : `desc-${item.description}`;
      const product = item.productId ? productsMap[item.productId] : null;
      const productName = product?.name || item.description;
      const productCode = product?.code || "-";

      if (!byProduct[key]) {
        byProduct[key] = {
          productId: item.productId,
          name: productName,
          code: productCode,
          quantity: 0,
          total: 0
        };
      }

      byProduct[key].quantity += item.quantity;
      byProduct[key].total += parseFloat(String(item.total));
    });

    return Object.values(byProduct).sort((a, b) => b.total - a.total);
  }, [filteredPurchaseInvoices, purchaseInvoiceItems, productsMap]);

  const totalQuantitySold = bestSellingProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalRevenue = bestSellingProducts.reduce((sum, p) => sum + p.revenue, 0);
  const totalQuantityPurchased = purchasedProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalPurchased = purchasedProducts.reduce((sum, p) => sum + p.total, 0);

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
          <h2>Período: ${selectedPeriodLabel}</h2>
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

  const exportToCSV = (type: "bestSelling" | "byRevenue" | "purchased") => {
    let csvContent = "";
    let filename = "";
    const dateRangeSuffix = `${startDate}_${endDate}`;

    if (type === "bestSelling") {
      filename = `productos_mas_vendidos_${dateRangeSuffix}.csv`;
      csvContent = "Código,Producto,Cantidad,Ingresos,Costo,Margen\n";
      bestSellingProducts.forEach(item => {
        csvContent += `"${item.code}","${item.name}",${item.quantity},${item.revenue.toFixed(2)},${item.cost.toFixed(2)},${item.margin.toFixed(2)}\n`;
      });
    } else if (type === "byRevenue") {
      filename = `productos_por_ingresos_${dateRangeSuffix}.csv`;
      csvContent = "Código,Producto,Cantidad,Ingresos,Costo,Margen\n";
      productsByRevenue.forEach(item => {
        csvContent += `"${item.code}","${item.name}",${item.quantity},${item.revenue.toFixed(2)},${item.cost.toFixed(2)},${item.margin.toFixed(2)}\n`;
      });
    } else if (type === "purchased") {
      filename = `productos_comprados_${dateRangeSuffix}.csv`;
      csvContent = "Código,Producto,Cantidad,Total\n";
      purchasedProducts.forEach(item => {
        csvContent += `"${item.code}","${item.name}",${item.quantity},${item.total.toFixed(2)}\n`;
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
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Reportes de Inventario</h1>
            <p className="text-muted-foreground mt-1">Análisis de productos vendidos y comprados por período</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
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
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Productos Vendidos</p>
                  <p className="text-2xl font-bold" data-testid="text-products-sold">{bestSellingProducts.length}</p>
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
                  <p className="text-sm text-muted-foreground">Unidades Vendidas</p>
                  <p className="text-2xl font-bold" data-testid="text-units-sold">{totalQuantitySold.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Award className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-emerald-600" data-testid="text-total-revenue">
                    {totalRevenue.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compras Totales</p>
                  <p className="text-2xl font-bold text-purple-600" data-testid="text-total-purchased">
                    {totalPurchased.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bestSelling" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bestSelling" data-testid="tab-best-selling">Más Vendidos (Cantidad)</TabsTrigger>
            <TabsTrigger value="byRevenue" data-testid="tab-by-revenue">Por Ingresos</TabsTrigger>
            <TabsTrigger value="purchased" data-testid="tab-purchased">Productos Comprados</TabsTrigger>
          </TabsList>

          <TabsContent value="bestSelling" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Productos Más Vendidos (por Cantidad) - {selectedPeriodLabel}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrint(printTableRefBestSelling, "Productos Más Vendidos")} data-testid="button-print-best-selling">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("bestSelling")} data-testid="button-export-best-selling">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {bestSellingProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay productos vendidos en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefBestSelling}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Costo Est.</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bestSellingProducts.slice(0, 50).map((item, index) => (
                          <TableRow key={item.productId || item.name} data-testid={`row-product-${item.productId || index}`}>
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.code}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              {item.revenue.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.cost.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${item.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {item.margin.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell colSpan={3} className="font-bold text-black">{bestSellingProducts.length} productos</TableCell>
                          <TableCell className="text-center font-bold text-black">{totalQuantitySold.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-black">
                            {totalRevenue.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-bold text-black">
                            {bestSellingProducts.reduce((sum, p) => sum + p.cost, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-bold text-black">
                            {bestSellingProducts.reduce((sum, p) => sum + p.margin, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="byRevenue" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Productos por Ingresos - {selectedPeriodLabel}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrint(printTableRefByRevenue, "Productos por Ingresos")} data-testid="button-print-by-revenue">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("byRevenue")} data-testid="button-export-by-revenue">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {productsByRevenue.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay productos vendidos en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefByRevenue}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Costo Est.</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsByRevenue.slice(0, 50).map((item, index) => (
                          <TableRow key={item.productId || item.name} data-testid={`row-product-revenue-${item.productId || index}`}>
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.code}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {item.revenue.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.cost.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${item.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {item.margin.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell colSpan={3} className="font-bold text-black">{productsByRevenue.length} productos</TableCell>
                          <TableCell className="text-center font-bold text-black">{totalQuantitySold.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-black">
                            {totalRevenue.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-bold text-black">
                            {productsByRevenue.reduce((sum, p) => sum + p.cost, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-bold text-black">
                            {productsByRevenue.reduce((sum, p) => sum + p.margin, 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchased" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Productos Comprados - {selectedPeriodLabel}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrint(printTableRefPurchased, "Productos Comprados")} data-testid="button-print-purchased">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV("purchased")} data-testid="button-export-purchased">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {purchasedProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay productos comprados en este período</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden" ref={printTableRefPurchased}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchasedProducts.slice(0, 50).map((item, index) => (
                          <TableRow key={item.productId || item.name} data-testid={`row-product-purchased-${item.productId || index}`}>
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.code}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <TableRow className="bg-gray-100 border-t-2">
                          <TableCell colSpan={3} className="font-bold text-black">{purchasedProducts.length} productos</TableCell>
                          <TableCell className="text-center font-bold text-black">{totalQuantityPurchased.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-black">
                            {totalPurchased.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
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
