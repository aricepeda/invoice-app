import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Package, CalendarIcon, Pencil, Check, ChevronsUpDown, User, Building2, Printer, Eye } from "lucide-react";
import { cn, getLocalDateString } from "@/lib/utils";

interface Recipient {
  id: number;
  name: string;
  rnc: string | null;
  address: string | null;
  type: 'customer' | 'supplier';
}

interface Conduce {
  id: number;
  conduceNumber: string;
  recipientType: 'customer' | 'supplier';
  customerId: number | null;
  supplierId: number | null;
  date: string;
  notes: string | null;
  status: 'pending' | 'delivered' | 'cancelled';
  deliveryAddress: string | null;
  driverName: string | null;
  vehiclePlate: string | null;
}

interface ConduceItem {
  id: number;
  conduceId: number;
  productId: number | null;
  description: string;
  quantity: number;
}

const conduceFormSchema = z.object({
  recipientType: z.enum(['customer', 'supplier']),
  customerId: z.number().nullable(),
  supplierId: z.number().nullable(),
  date: z.string(),
  deliveryAddress: z.string().optional(),
  driverName: z.string().optional(),
});

type ConduceFormData = z.infer<typeof conduceFormSchema>;

interface ConduceItemForm {
  productId: number | null;
  description: string;
  quantity: number;
}

export default function Conduces() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConduce, setSelectedConduce] = useState<Conduce | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<ConduceItemForm[]>([]);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewConduce, setPreviewConduce] = useState<Conduce | null>(null);
  const [previewItems, setPreviewItems] = useState<ConduceItem[]>([]);
  const [dateDisplay, setDateDisplay] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conduces = [], isLoading } = useQuery<Conduce[]>({
    queryKey: ["/api/conduces"],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: companySettings } = useQuery<any>({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings");
      if (!response.ok) throw new Error("Failed to fetch company settings");
      return response.json();
    },
  });

  const allRecipients = useMemo<Recipient[]>(() => {
    const customerRecipients = (customers || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      rnc: c.rnc,
      address: c.address,
      type: 'customer' as const,
    }));
    const supplierRecipients = (suppliers || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      rnc: s.rnc,
      address: s.address,
      type: 'supplier' as const,
    }));
    return [...customerRecipients, ...supplierRecipients];
  }, [customers, suppliers]);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch) return allRecipients;
    const search = recipientSearch.toLowerCase();
    return allRecipients.filter(
      r => r.name.toLowerCase().includes(search) || (r.rnc && r.rnc.includes(search))
    );
  }, [allRecipients, recipientSearch]);

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

  const form = useForm<ConduceFormData>({
    resolver: zodResolver(conduceFormSchema),
    defaultValues: {
      recipientType: 'customer',
      customerId: null,
      supplierId: null,
      date: getLocalDateString(),
      deliveryAddress: "",
      driverName: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ConduceFormData & { items: ConduceItemForm[] }) => {
      const response = await fetch("/api/conduces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create conduce");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conduces"] });
      toast({ title: "Conduce creado correctamente" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Error al crear conduce", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ConduceFormData & { items: ConduceItemForm[] }) => {
      const response = await fetch(`/api/conduces/${selectedConduce?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update conduce");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conduces"] });
      toast({ title: "Conduce actualizado correctamente" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Error al actualizar conduce", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/conduces/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete conduce");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conduces"] });
      toast({ title: "Conduce eliminado correctamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar conduce", variant: "destructive" });
    },
  });

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedConduce(null);
    setViewMode(false);
    setItems([]);
    setSelectedRecipient(null);
    setEditingItemIndex(null);
    setDateDisplay(toDisplayDate(getLocalDateString()));
    form.reset();
  };

  const handleEdit = async (conduce: Conduce) => {
    setSelectedConduce(conduce);
    setViewMode(false);
    
    const recipient = conduce.recipientType === 'customer'
      ? allRecipients.find(r => r.type === 'customer' && r.id === conduce.customerId)
      : allRecipients.find(r => r.type === 'supplier' && r.id === conduce.supplierId);
    setSelectedRecipient(recipient || null);
    
    form.reset({
      recipientType: conduce.recipientType,
      customerId: conduce.customerId,
      supplierId: conduce.supplierId,
      date: conduce.date,
      deliveryAddress: conduce.deliveryAddress || "",
      driverName: conduce.driverName || "",
    });
    setDateDisplay(toDisplayDate(conduce.date));
    
    const itemsResponse = await fetch(`/api/conduces/${conduce.id}/items`);
    const itemsData = await itemsResponse.json();
    setItems(itemsData.map((item: ConduceItem) => ({
      productId: item.productId,
      description: item.description,
      quantity: Number(item.quantity) || 1,
    })));
    
    setIsDialogOpen(true);
  };

  const handlePrint = async (conduce: Conduce) => {
    const itemsResponse = await fetch(`/api/conduces/${conduce.id}/items`);
    const conduceItems = await itemsResponse.json();
    
    const recipient = conduce.recipientType === 'customer'
      ? customers.find((c: any) => c.id === conduce.customerId)
      : suppliers.find((s: any) => s.id === conduce.supplierId);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Conduce ${conduce.conduceNumber}</title>
          <style>
            @page {
              size: 8.5in 5.5in;
              margin: 0.2in;
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box;
              font-family: 'Courier New', Courier, monospace;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              height: 5.1in;
            }
            body { 
              font-size: 14px;
              line-height: 1.3;
              padding: 0.1in 0.5in 0.1in 0.1in;
              color: #000;
              display: flex;
              flex-direction: column;
            }
            .page-content {
              flex: 1;
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
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
              margin-top: 8px;
            }
            .company-info {
              font-size: 15px;
              margin-top: 2px;
            }
            .document-title {
              font-size: 30px;
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
              font-size: 15px;
              font-weight: bold;
            }
            .items-table th:first-child {
              text-align: center;
              width: 70px;
            }
            .items-table td {
              padding: 3px 4px;
              font-size: 15px;
            }
            .items-table td:first-child {
              text-align: center;
              font-weight: bold;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              padding-top: 10px;
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
            @media print {
              body { padding: 0.1in 0.5in 0.1in 0.1in; }
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
                <div class="document-title">CONDUCE</div>
                <div class="info-row" style="justify-content: flex-end;">
                  <span class="info-label">Fecha:</span>
                  <span>${format(new Date(conduce.date + 'T00:00:00'), "dd/MM/yyyy")}</span>
                </div>
                <div class="info-row" style="justify-content: flex-end;">
                  <span class="info-label">Conduce No:</span>
                  <span>${conduce.conduceNumber}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="info-row">
                <span class="info-label">${conduce.recipientType === 'customer' ? 'Cliente' : 'Suplidor'}:</span>
                <span>${recipient?.name || '-'}</span>
              </div>
              ${recipient?.phone ? `<div class="info-row"><span class="info-label">Teléfono:</span><span>${recipient.phone}</span></div>` : ''}
              ${conduce.deliveryAddress ? `<div class="info-row"><span class="info-label">Dirección:</span><span>${conduce.deliveryAddress}</span></div>` : ''}
              ${conduce.driverName ? `<div class="info-row"><span class="info-label">Conductor:</span><span>${conduce.driverName}</span></div>` : ''}
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>CANT.</th>
                  <th>DESCRIPCION</th>
                </tr>
              </thead>
              <tbody>
                ${conduceItems.map((item: ConduceItem) => `
                  <tr>
                    <td>${item.quantity}</td>
                    <td>${item.description}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

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

  const handleSubmit = (data: ConduceFormData) => {
    const submitData = { ...data, items };
    if (selectedConduce) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const addItem = () => {
    const newItems = [...items, { productId: null, description: "", quantity: 1 }];
    setItems(newItems);
    setEditingItemIndex(newItems.length - 1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    if (editingItemIndex === index) setEditingItemIndex(null);
    else if (editingItemIndex !== null && editingItemIndex > index) setEditingItemIndex(editingItemIndex - 1);
  };

  const updateItem = (index: number, field: keyof ConduceItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const confirmItem = (index: number) => {
    const item = items[index];
    if (!item.description.trim()) {
      toast({ title: "Ingrese una descripción para el artículo", variant: "destructive" });
      return;
    }
    setEditingItemIndex(null);
  };

  const handleRecipientSelect = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    form.setValue('recipientType', recipient.type);
    if (recipient.type === 'customer') {
      form.setValue('customerId', recipient.id);
      form.setValue('supplierId', null);
    } else {
      form.setValue('supplierId', recipient.id);
      form.setValue('customerId', null);
    }
    form.setValue('deliveryAddress', recipient.address ?? "");
    setRecipientOpen(false);
  };

  const getRecipientName = (conduce: Conduce) => {
    if (conduce.recipientType === 'customer') {
      const customer = (customers || []).find((c: any) => c.id === conduce.customerId);
      return customer?.name || 'Cliente no encontrado';
    } else {
      const supplier = (suppliers || []).find((s: any) => s.id === conduce.supplierId);
      return supplier?.name || 'Suplidor no encontrado';
    }
  };

  const handlePreview = async (conduce: Conduce) => {
    try {
      const itemsResponse = await fetch(`/api/conduces/${conduce.id}/items`);
      if (!itemsResponse.ok) {
        toast({ title: "Error al cargar los artículos", variant: "destructive" });
        return;
      }
      const itemsData = await itemsResponse.json();
      setPreviewConduce(conduce);
      setPreviewItems(itemsData);
      setPreviewOpen(true);
    } catch (error) {
      toast({ title: "Error al cargar la vista previa", variant: "destructive" });
    }
  };

  const getPreviewRecipient = () => {
    if (!previewConduce) return null;
    return previewConduce.recipientType === 'customer'
      ? customers.find((c: any) => c.id === previewConduce.customerId)
      : suppliers.find((s: any) => s.id === previewConduce.supplierId);
  };

  const filteredConduces = conduces.filter(c =>
    c.conduceNumber.includes(searchQuery) ||
    getRecipientName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Conduces</h1>
            <p className="text-gray-500 text-sm">Gestiona notas de entrega para clientes y suplidores</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogTrigger asChild>
              <Button onClick={() => { setDateDisplay(toDisplayDate(getLocalDateString())); setIsDialogOpen(true); }} data-testid="button-create-conduce">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Conduce
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {viewMode ? 'Ver Conduce' : selectedConduce ? 'Editar Conduce' : 'Nuevo Conduce'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1">
                    <Label>Fecha</Label>
                    <div className="flex items-center">
                      <Input
                        type="text"
                        value={dateDisplay}
                        onChange={(e) => {
                          const formatted = formatDateInput(e.target.value);
                          setDateDisplay(formatted);
                          const iso = toISODate(formatted);
                          if (iso) {
                            form.setValue('date', iso);
                          }
                        }}
                        placeholder="ddmmyyyy"
                        className="w-[120px] rounded-r-none border-r-0"
                        disabled={viewMode}
                        data-testid="input-conduce-date"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="rounded-l-none" disabled={viewMode}>
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={form.watch('date') ? new Date(form.watch('date') + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const localDate = getLocalDateString(date);
                                form.setValue('date', localDate);
                                setDateDisplay(toDisplayDate(localDate));
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <Label>Cliente / Suplidor</Label>
                    <Popover open={recipientOpen} onOpenChange={setRecipientOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={recipientOpen}
                          className="w-full justify-between"
                          disabled={viewMode}
                          data-testid="select-recipient"
                        >
                          {selectedRecipient ? (
                            <span className="flex items-center gap-2">
                              {selectedRecipient.type === 'customer' ? (
                                <User className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Building2 className="h-4 w-4 text-purple-500" />
                              )}
                              {selectedRecipient.name}
                            </span>
                          ) : (
                            "Buscar..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar por nombre o RNC..." 
                            value={recipientSearch}
                            onValueChange={setRecipientSearch}
                            data-testid="input-recipient-search"
                          />
                          <CommandList>
                            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                            <CommandGroup heading="Clientes">
                              {filteredRecipients
                                .filter(r => r.type === 'customer')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`customer-${recipient.id}`}
                                    value={`customer ${recipient.name} ${recipient.rnc || ''}`}
                                    onSelect={() => handleRecipientSelect(recipient)}
                                    data-testid={`recipient-customer-${recipient.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedRecipient?.id === recipient.id && selectedRecipient?.type === 'customer'
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <User className="h-4 w-4 mr-2 text-blue-500" />
                                    <div className="flex flex-col">
                                      <span>{recipient.name}</span>
                                      {recipient.rnc && (
                                        <span className="text-xs text-gray-500">{recipient.rnc}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup heading="Suplidores">
                              {filteredRecipients
                                .filter(r => r.type === 'supplier')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`supplier-${recipient.id}`}
                                    value={`supplier ${recipient.name} ${recipient.rnc || ''}`}
                                    onSelect={() => handleRecipientSelect(recipient)}
                                    data-testid={`recipient-supplier-${recipient.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedRecipient?.id === recipient.id && selectedRecipient?.type === 'supplier'
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <Building2 className="h-4 w-4 mr-2 text-purple-500" />
                                    <div className="flex flex-col">
                                      <span>{recipient.name}</span>
                                      {recipient.rnc && (
                                        <span className="text-xs text-gray-500">{recipient.rnc}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                </div>

                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1">
                    <Label>Dirección de Entrega</Label>
                    <Input
                      {...form.register('deliveryAddress')}
                      placeholder="Dirección de entrega"
                      disabled={viewMode}
                      data-testid="input-delivery-address"
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <Label>Conductor</Label>
                    <Input
                      {...form.register('driverName')}
                      placeholder="Nombre del conductor"
                      disabled={viewMode}
                      data-testid="input-driver-name"
                    />
                  </div>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-base">Artículos</CardTitle>
                    {!viewMode && (
                      <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={editingItemIndex !== null} data-testid="button-add-item">
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Cantidad</TableHead>
                          <TableHead>Descripción</TableHead>
                          {!viewMode && <TableHead className="w-[100px] text-center">Acciones</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={viewMode ? 2 : 3} className="text-center text-gray-500">
                              No hay artículos. {!viewMode && "Haga clic en 'Agregar' para añadir uno."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((item, index) => {
                            const isEditing = editingItemIndex === index;
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={item.quantity}
                                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                      data-testid={`input-quantity-${index}`}
                                    />
                                  ) : (
                                    <span className="font-medium" data-testid={`text-quantity-${index}`}>{item.quantity}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={item.description}
                                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                                      placeholder="Descripción del artículo"
                                      autoFocus
                                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmItem(index); } }}
                                      data-testid={`input-description-${index}`}
                                    />
                                  ) : (
                                    <span data-testid={`text-description-${index}`}>{item.description || <span className="text-gray-400 italic">Sin descripción</span>}</span>
                                  )}
                                </TableCell>
                                {!viewMode && (
                                  <TableCell>
                                    <div className="flex justify-center gap-1">
                                      {isEditing ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-50"
                                          onClick={() => confirmItem(index)}
                                          data-testid={`button-confirm-item-${index}`}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => setEditingItemIndex(index)}
                                          disabled={editingItemIndex !== null}
                                          data-testid={`button-edit-item-${index}`}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => removeItem(index)}
                                        data-testid={`button-remove-item-${index}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    {viewMode ? 'Cerrar' : 'Cancelar'}
                  </Button>
                  {!viewMode && (
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                      {selectedConduce ? 'Actualizar' : 'Crear'} Conduce
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número o destinatario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-conduces"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredConduces.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No se encontraron conduces</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConduces.map((conduce) => (
                    <TableRow key={conduce.id} data-testid={`row-conduce-${conduce.id}`}>
                      <TableCell className="font-mono">{conduce.conduceNumber}</TableCell>
                      <TableCell>{format(new Date(conduce.date + 'T00:00:00'), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={conduce.recipientType === 'customer' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}>
                          {conduce.recipientType === 'customer' ? 'Cliente' : 'Suplidor'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getRecipientName(conduce)}</TableCell>
                      <TableCell>{conduce.driverName || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handlePreview(conduce)} data-testid={`button-preview-${conduce.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(conduce)} data-testid={`button-print-${conduce.id}`}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(conduce)} data-testid={`button-edit-${conduce.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('¿Está seguro de eliminar este conduce?')) {
                                deleteMutation.mutate(conduce.id);
                              }
                            }}
                            data-testid={`button-delete-${conduce.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista Previa del Conduce</DialogTitle>
          </DialogHeader>
          {previewConduce && (
            <div className="flex flex-col items-center">
              <div 
                className="bg-white border-2 border-gray-300 shadow-lg overflow-hidden"
                style={{ 
                  width: '680px', 
                  height: '440px',
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: '12px',
                  padding: '8px 40px 8px 8px',
                  boxSizing: 'border-box'
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="max-w-[45%]">
                    <div className="text-lg font-bold uppercase">{companySettings?.name || 'EMPRESA'}</div>
                    <div className="text-xs mt-1">
                      {companySettings?.rnc ? `RNC: ${companySettings.rnc}` : ''} 
                      {companySettings?.phone ? ` | Tel: ${companySettings.phone}` : ''}
                    </div>
                    {companySettings?.address && <div className="text-xs">{companySettings.address}</div>}
                  </div>
                  <div className="text-right min-w-[55%]">
                    <div className="text-2xl font-bold tracking-wider">CONDUCE</div>
                    <div className="text-sm font-bold mt-1 flex justify-end gap-2">
                      <span className="font-bold w-24 text-right">Fecha:</span>
                      <span>{format(new Date(previewConduce.date + 'T00:00:00'), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="text-sm font-bold flex justify-end gap-2">
                      <span className="font-bold w-24 text-right">Conduce No:</span>
                      <span>{previewConduce.conduceNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="text-sm flex gap-2">
                    <span className="font-bold w-24 text-right">{previewConduce.recipientType === 'customer' ? 'Cliente' : 'Suplidor'}:</span>
                    <span>{getPreviewRecipient()?.name || '-'}</span>
                  </div>
                  {getPreviewRecipient()?.phone && (
                    <div className="text-sm flex gap-2">
                      <span className="font-bold w-24 text-right">Teléfono:</span>
                      <span>{getPreviewRecipient()?.phone}</span>
                    </div>
                  )}
                  {previewConduce.deliveryAddress && (
                    <div className="text-sm flex gap-2">
                      <span className="font-bold w-24 text-right">Dirección:</span>
                      <span>{previewConduce.deliveryAddress}</span>
                    </div>
                  )}
                  {previewConduce.driverName && (
                    <div className="text-sm flex gap-2">
                      <span className="font-bold w-24 text-right">Conductor:</span>
                      <span>{previewConduce.driverName}</span>
                    </div>
                  )}
                </div>

                <table className="w-full border-collapse my-2">
                  <thead>
                    <tr className="border-t-2 border-b-2 border-dotted border-black">
                      <th className="text-left py-1 px-1 text-sm font-bold w-16 text-center">CANT.</th>
                      <th className="text-left py-1 px-1 text-sm font-bold">DESCRIPCION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item, index) => (
                      <tr key={index}>
                        <td className="py-1 px-1 text-sm text-center font-bold">{item.quantity}</td>
                        <td className="py-1 px-1 text-sm">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between pt-2 mt-auto">
                  <div className="text-center w-[45%]">
                    <div className="border-t-2 border-black mt-6 pt-1 text-sm font-bold">Entregado por</div>
                  </div>
                  <div className="text-center w-[45%]">
                    <div className="border-t-2 border-black mt-6 pt-1 text-sm font-bold">Recibido por</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Tamaño real: 8.5" x 5.5" (media hoja)</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cerrar</Button>
            <Button onClick={() => previewConduce && handlePrint(previewConduce)}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
