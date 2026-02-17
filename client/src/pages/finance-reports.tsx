import { Layout } from "@/components/layout";
import { getLocalDateString } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DollarSign, Download, Printer, Calendar, TrendingUp, TrendingDown, ChevronRight, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, Fragment } from "react";
import type { Invoice, PurchaseInvoice, ExpenseCategory, ExpenseSubcategory, Supplier } from "@shared/schema";

export default function FinanceReports() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const printRef = useRef<HTMLDivElement>(null);

  const { data: salesInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ["/api/purchase-invoices"],
  });

  const { data: expenseCategories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });

  const { data: expenseSubcategories = [] } = useQuery<ExpenseSubcategory[]>({
    queryKey: ["/api/expense-subcategories"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
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

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
  };

  const selectedPeriodLabel = `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;

  const categoriesMap = useMemo(() => {
    return expenseCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<number, ExpenseCategory>);
  }, [expenseCategories]);

  const subcategoriesMap = useMemo(() => {
    return expenseSubcategories.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<number, ExpenseSubcategory>);
  }, [expenseSubcategories]);

  const suppliersMap = useMemo(() => {
    return suppliers.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<number, Supplier>);
  }, [suppliers]);

  const filteredSalesInvoices = useMemo(() => {
    return salesInvoices.filter(inv => {
      if (inv.status === "cancelled") return false;
      const invDateStr = String(inv.date).split('T')[0];
      return invDateStr >= startDate && invDateStr <= endDate;
    });
  }, [salesInvoices, startDate, endDate]);

  const filteredPurchaseInvoices = useMemo(() => {
    return purchaseInvoices.filter(inv => {
      if (inv.status === "cancelled") return false;
      const invDateStr = String(inv.date).split('T')[0];
      return invDateStr >= startDate && invDateStr <= endDate;
    });
  }, [purchaseInvoices, startDate, endDate]);

  const salesSummary = useMemo(() => {
    const total = filteredSalesInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.total)), 0);
    const subtotal = filteredSalesInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.subtotal)), 0);
    const itbis = filteredSalesInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.itbis)), 0);
    return { total, subtotal, itbis, count: filteredSalesInvoices.length };
  }, [filteredSalesInvoices]);

  const expensesByCategory = useMemo(() => {
    const byCategory: Record<number, { 
      categoryId: number;
      category: ExpenseCategory | null; 
      subtotal: number;
      itbis: number;
      total: number; 
      count: number;
      subcategories: Record<number, {
        subcategoryId: number;
        subcategory: ExpenseSubcategory | null;
        subtotal: number;
        itbis: number;
        total: number;
        count: number;
      }>;
    }> = {};
    
    filteredPurchaseInvoices.forEach(inv => {
      const categoryId = inv.expenseCategoryId || 0;
      const subcategoryId = inv.expenseSubcategoryId || 0;
      
      if (!byCategory[categoryId]) {
        byCategory[categoryId] = {
          categoryId,
          category: categoryId ? categoriesMap[categoryId] : null,
          subtotal: 0,
          itbis: 0,
          total: 0,
          count: 0,
          subcategories: {}
        };
      }
      byCategory[categoryId].subtotal += parseFloat(String(inv.subtotal));
      byCategory[categoryId].itbis += parseFloat(String(inv.itbis));
      byCategory[categoryId].total += parseFloat(String(inv.total));
      byCategory[categoryId].count += 1;

      if (!byCategory[categoryId].subcategories[subcategoryId]) {
        byCategory[categoryId].subcategories[subcategoryId] = {
          subcategoryId,
          subcategory: subcategoryId ? subcategoriesMap[subcategoryId] : null,
          subtotal: 0,
          itbis: 0,
          total: 0,
          count: 0
        };
      }
      byCategory[categoryId].subcategories[subcategoryId].subtotal += parseFloat(String(inv.subtotal));
      byCategory[categoryId].subcategories[subcategoryId].itbis += parseFloat(String(inv.itbis));
      byCategory[categoryId].subcategories[subcategoryId].total += parseFloat(String(inv.total));
      byCategory[categoryId].subcategories[subcategoryId].count += 1;
    });

    return Object.values(byCategory).sort((a, b) => b.total - a.total);
  }, [filteredPurchaseInvoices, categoriesMap, subcategoriesMap]);

  const expensesTotals = useMemo(() => {
    return expensesByCategory.reduce((acc, item) => ({
      subtotal: acc.subtotal + item.subtotal,
      itbis: acc.itbis + item.itbis,
      total: acc.total + item.total,
      count: acc.count + item.count
    }), { subtotal: 0, itbis: 0, total: 0, count: 0 });
  }, [expensesByCategory]);

  const netResult = salesSummary.total - expensesTotals.total;

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte Financiero</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            tfoot td { background-color: #f5f5f5; font-weight: bold; }
            .summary { margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .text-green { color: #16a34a; }
            .text-red { color: #dc2626; }
            svg { display: none; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>Reporte Financiero</h1>
          <h2>Período: ${selectedPeriodLabel}</h2>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  };

  const handlePrintSubcategory = (subcategoryId: number, subcategoryName: string, categoryName: string) => {
    const invoices = filteredPurchaseInvoices.filter(inv => inv.expenseSubcategoryId === subcategoryId);
    if (invoices.length === 0) return;

    const totals = invoices.reduce((acc, inv) => ({
      subtotal: acc.subtotal + parseFloat(String(inv.subtotal)),
      itbis: acc.itbis + parseFloat(String(inv.itbis)),
      total: acc.total + parseFloat(String(inv.total))
    }), { subtotal: 0, itbis: 0, total: 0 });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceRows = invoices.sort((a, b) => {
      const dateA = String(a.date).split('T')[0];
      const dateB = String(b.date).split('T')[0];
      return dateB.localeCompare(dateA);
    }).map(inv => {
      const supplier = suppliersMap[inv.supplierId];
      const dateStr = String(inv.date).split('T')[0];
      const [year, month, day] = dateStr.split('-');
      return `
        <tr>
          <td>${day}/${month}/${year}</td>
          <td>${supplier?.name || "-"}</td>
          <td>${inv.invoiceNumber}</td>
          <td>${inv.ncf || "-"}</td>
          <td class="text-right">${parseFloat(String(inv.subtotal)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${parseFloat(String(inv.itbis)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${parseFloat(String(inv.total)).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${subcategoryName}</title>
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
          <h1>${subcategoryName}</h1>
          <h2>${categoryName} - ${selectedPeriodLabel}</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>No. Factura</th>
                <th>NCF</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">ITBIS</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4"><strong>TOTAL (${invoices.length} facturas)</strong></td>
                <td class="text-right"><strong>${totals.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</strong></td>
                <td class="text-right"><strong>${totals.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</strong></td>
                <td class="text-right"><strong>${totals.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  };

  const exportToCSV = () => {
    let csvContent = "";
    const dateRangeSuffix = `${startDate}_${endDate}`;
    
    csvContent += "REPORTE FINANCIERO\n";
    csvContent += `Período,${selectedPeriodLabel}\n\n`;
    
    csvContent += "VENTAS\n";
    csvContent += "No.,Concepto,Cant. Facturas,Subtotal,ITBIS,Total\n";
    csvContent += `1,Ventas del Período,${salesSummary.count},${salesSummary.subtotal.toFixed(2)},${salesSummary.itbis.toFixed(2)},${salesSummary.total.toFixed(2)}\n`;
    csvContent += `,"TOTAL VENTAS",${salesSummary.count},${salesSummary.subtotal.toFixed(2)},${salesSummary.itbis.toFixed(2)},${salesSummary.total.toFixed(2)}\n\n`;
    
    csvContent += "GASTOS POR CATEGORÍA\n";
    csvContent += "No.,Categoría,Cant. Facturas,Subtotal,ITBIS,Total\n";
    expensesByCategory.forEach((item, index) => {
      csvContent += `${index + 1},"${item.category?.name || "Sin categoría"}",${item.count},${item.subtotal.toFixed(2)},${item.itbis.toFixed(2)},${item.total.toFixed(2)}\n`;
    });
    csvContent += `,"TOTAL GASTOS",${expensesTotals.count},${expensesTotals.subtotal.toFixed(2)},${expensesTotals.itbis.toFixed(2)},${expensesTotals.total.toFixed(2)}\n\n`;
    
    csvContent += "RESULTADO NETO\n";
    csvContent += "No.,Concepto,Cant. Facturas,Subtotal,ITBIS,Total\n";
    csvContent += `1,Total Ventas,${salesSummary.count},${salesSummary.subtotal.toFixed(2)},${salesSummary.itbis.toFixed(2)},${salesSummary.total.toFixed(2)}\n`;
    csvContent += `2,Total Gastos,${expensesTotals.count},(${expensesTotals.subtotal.toFixed(2)}),(${expensesTotals.itbis.toFixed(2)}),(${expensesTotals.total.toFixed(2)})\n`;
    csvContent += `,"RESULTADO NETO",-,${(salesSummary.subtotal - expensesTotals.subtotal).toFixed(2)},${(salesSummary.itbis - expensesTotals.itbis).toFixed(2)},${netResult.toFixed(2)}\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_financiero_${dateRangeSuffix}.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Reporte Financiero</h1>
            <p className="text-muted-foreground mt-1">Resumen de ventas y gastos por categoría</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} data-testid="button-print">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={exportToCSV} data-testid="button-export">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
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

        <div ref={printRef}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Ventas - {selectedPeriodLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-center">No.</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-center w-[100px]">Facturas</TableHead>
                      <TableHead className="text-right w-[140px]">Subtotal</TableHead>
                      <TableHead className="text-right w-[120px]">ITBIS</TableHead>
                      <TableHead className="text-right w-[140px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow data-testid="row-sales">
                      <TableCell className="text-center font-medium">1</TableCell>
                      <TableCell className="font-medium">Ventas del Período</TableCell>
                      <TableCell className="text-center">{salesSummary.count}</TableCell>
                      <TableCell className="text-right">
                        {salesSummary.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {salesSummary.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {salesSummary.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-green-50 border-t-2">
                      <TableCell colSpan={2} className="font-bold text-green-700">TOTAL VENTAS</TableCell>
                      <TableCell className="text-center font-bold text-green-700">{salesSummary.count}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        {salesSummary.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        {salesSummary.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        {salesSummary.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Gastos por Categoría - {selectedPeriodLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay gastos registrados en este período</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px] text-center">No.</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-center w-[100px]">Facturas</TableHead>
                        <TableHead className="text-right w-[140px]">Subtotal</TableHead>
                        <TableHead className="text-right w-[120px]">ITBIS</TableHead>
                        <TableHead className="text-right w-[140px]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expensesByCategory.map((item, index) => {
                        const isExpanded = expandedCategories.has(item.categoryId);
                        const subcategoryList = Object.values(item.subcategories).sort((a, b) => b.total - a.total);
                        const hasSubcategories = subcategoryList.length > 0;
                        
                        return (
                          <Fragment key={`cat-${item.categoryId}`}>
                            <TableRow 
                              data-testid={`row-category-${item.category?.id || 'none'}`}
                              className={hasSubcategories ? "cursor-pointer hover:bg-gray-50" : ""}
                              onClick={() => hasSubcategories && toggleCategory(item.categoryId)}
                            >
                              <TableCell className="text-center font-medium">
                                <div className="flex items-center justify-center gap-1">
                                  {hasSubcategories && (
                                    isExpanded ? 
                                      <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                                      <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                  {index + 1}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{item.category?.name || "Sin categoría"}</TableCell>
                              <TableCell className="text-center">{item.count}</TableCell>
                              <TableCell className="text-right">
                                {item.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {item.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                            {isExpanded && subcategoryList.map((sub, subIndex) => (
                              <TableRow 
                                key={`sub-${item.categoryId}-${sub.subcategoryId}`} 
                                className="bg-gray-50 cursor-pointer hover:bg-gray-100"
                                data-testid={`row-subcategory-${sub.subcategoryId}`}
                                onClick={() => handlePrintSubcategory(
                                  sub.subcategoryId,
                                  sub.subcategory?.name || "Sin subcategoría",
                                  item.category?.name || "Sin categoría"
                                )}
                              >
                                <TableCell className="text-center text-gray-500 text-sm"></TableCell>
                                <TableCell className="pl-8 text-gray-600">
                                  {sub.subcategory?.name || "Sin subcategoría"}
                                </TableCell>
                                <TableCell className="text-center text-gray-600">{sub.count}</TableCell>
                                <TableCell className="text-right text-gray-600">
                                  {sub.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right text-gray-600">
                                  {sub.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right text-gray-600">
                                  {sub.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                    <tfoot>
                      <TableRow className="bg-red-50 border-t-2">
                        <TableCell colSpan={2} className="font-bold text-red-700">TOTAL GASTOS</TableCell>
                        <TableCell className="text-center font-bold text-red-700">{expensesTotals.count}</TableCell>
                        <TableCell className="text-right font-bold text-red-700">
                          {expensesTotals.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-700">
                          {expensesTotals.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-700">
                          {expensesTotals.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Resultado Neto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-center">No.</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-center w-[100px]">Facturas</TableHead>
                      <TableHead className="text-right w-[140px]">Subtotal</TableHead>
                      <TableHead className="text-right w-[120px]">ITBIS</TableHead>
                      <TableHead className="text-right w-[140px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow data-testid="row-net-sales">
                      <TableCell className="text-center font-medium">1</TableCell>
                      <TableCell className="font-medium text-green-700">Total Ventas</TableCell>
                      <TableCell className="text-center">{salesSummary.count}</TableCell>
                      <TableCell className="text-right text-green-700">
                        {salesSummary.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-green-700">
                        {salesSummary.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-700">
                        {salesSummary.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                    <TableRow data-testid="row-net-expenses">
                      <TableCell className="text-center font-medium">2</TableCell>
                      <TableCell className="font-medium text-red-700">Total Gastos</TableCell>
                      <TableCell className="text-center">{expensesTotals.count}</TableCell>
                      <TableCell className="text-right text-red-700">
                        ({expensesTotals.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })})
                      </TableCell>
                      <TableCell className="text-right text-red-700">
                        ({expensesTotals.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })})
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-700">
                        ({expensesTotals.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })})
                      </TableCell>
                    </TableRow>
                  </TableBody>
                  <tfoot>
                    <TableRow className={`border-t-2 ${netResult >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                      <TableCell colSpan={2} className={`font-bold ${netResult >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        RESULTADO NETO
                      </TableCell>
                      <TableCell className="text-center font-bold">-</TableCell>
                      <TableCell className={`text-right font-bold ${netResult >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        {(salesSummary.subtotal - expensesTotals.subtotal).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${netResult >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        {(salesSummary.itbis - expensesTotals.itbis).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${netResult >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        {netResult.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
