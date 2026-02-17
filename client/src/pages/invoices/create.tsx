import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, ChevronLeft, FileText, Mail, Printer, CreditCard, Download, Palette, Settings, UserPlus, PackagePlus, Check, ChevronsUpDown, Calendar, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn, getLocalDateString } from "@/lib/utils";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { TaxSettings, Seller, Customer, Product } from "@shared/schema";

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Seleccione un cliente"),
  customerRnc: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  assignSeller: z.boolean().default(false),
  sellerId: z.number().optional(),
  useNcf: z.boolean().default(false),
  ncfType: z.string().optional(),
  ncf: z.string().optional(),
  isNotReportable: z.boolean().default(false),
  date: z.string(),
  dueDate: z.string(),
  paymentTerms: z.string().default("Al Contado"),
  paymentTermsDays: z.number().min(0).default(0),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankDetails: z.string().optional(),
  discountType: z.string().default("none"),
  discountValue: z.number().min(0).default(0),
  items: z.array(z.object({
    productId: z.string().optional().default(""),
    description: z.string().optional().default(""),
    quantity: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? (val === '' ? 0 : parseFloat(val)) : val).refine(v => v >= 1, "Cantidad mínima 1"),
    price: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? (val === '' ? 0 : parseFloat(val)) : val).refine(v => !isNaN(v), "Precio inválido"),
    tax: z.number().min(0)
  })).refine(
    (items) => items.some(item => (item.description && item.description.trim() !== "") || (item.productId && item.productId !== "") || (item.quantity > 0 && item.price > 0)),
    { message: "Agregue al menos un producto" }
  )
}).refine((data) => !data.useNcf || (data.ncfType && data.ncfType.length > 0), {
  message: "Seleccione un tipo de NCF",
  path: ["ncfType"],
}).refine((data) => {
  const requiresRnc = ["B01", "B14", "B15"];
  if (data.useNcf && data.ncfType && requiresRnc.includes(data.ncfType)) {
    return data.customerRnc && data.customerRnc.trim().length > 0;
  }
  return true;
}, {
  message: "El RNC/Cédula es obligatorio para este tipo de comprobante fiscal",
  path: ["customerRnc"],
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const customerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  rnc: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CreateInvoice() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: taxSettings } = useQuery({
    queryKey: ["taxSettings"],
    queryFn: async () => {
      const response = await fetch("/api/tax-settings");
      if (!response.ok) throw new Error("Failed to fetch tax settings");
      return response.json() as Promise<TaxSettings | null>;
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers"],
    queryFn: async () => {
      const response = await fetch("/api/sellers");
      if (!response.ok) throw new Error("Failed to fetch sellers");
      return response.json() as Promise<Seller[]>;
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

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json() as Promise<Product[]>;
    },
  });

  const { data: nextInvoiceNumber } = useQuery({
    queryKey: ["nextInvoiceNumber"],
    queryFn: async () => {
      const response = await fetch("/api/next-invoice-number");
      if (!response.ok) throw new Error("Failed to fetch next invoice number");
      return response.json() as Promise<{ nextNumber: number }>;
    },
  });

  const { data: companySettings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings");
      if (!response.ok) return null;
      return response.json();
    },
  });

  const { data: designSettings } = useQuery({
    queryKey: ["invoiceDesignSettings"],
    queryFn: async () => {
      const response = await fetch("/api/invoice-design-settings");
      if (!response.ok) return {};
      const data = await response.json();
      return data || {};
    },
  });

  const { data: ncfSequences = [] } = useQuery({
    queryKey: ["ncfSequences"],
    queryFn: async () => {
      const response = await fetch("/api/ncf-sequences");
      if (!response.ok) return [];
      return response.json() as Promise<Array<{ id: number; type: string; prefix: string; label?: string; status: string; currentNumber: number }>>;
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create invoice");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      const audio = new Audio("/sounds/success.mp3");
      audio.play().catch(() => {});
      showSuccess("Factura creada exitosamente", "");
      navigate("/invoices");
    },
    onError: (error) => {
      showError("Error", String(error));
    },
  });

  // State and form for creating new customer
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerRnc, setNewCustomerRnc] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [paperType, setPaperType] = useState(designSettings?.paperType || "carta");

  // State and form for creating new product
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(0);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const productDescriptionRef = useRef<HTMLInputElement>(null);
  const productQuantityRef = useRef<HTMLInputElement>(null);
  const productDropdownInteracting = useRef(false);
  const [productDropdownPos, setProductDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const updateProductDropdownPosition = () => {
    if (productDescriptionRef.current) {
      const rect = productDescriptionRef.current.getBoundingClientRect();
      setProductDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  const [newProductCode, setNewProductCode] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [currentProductIndex, setCurrentProductIndex] = useState<number | null>(null);

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "active" }),
      });
      if (!response.ok) throw new Error("Failed to create customer");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showSuccess("Cliente creado exitosamente", "");
      // Auto-select the new customer
      form.setValue("customerId", String(data.id));
      // Reset form and close sheet
      setNewCustomerName("");
      setNewCustomerRnc("");
      setNewCustomerEmail("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setIsCustomerSheetOpen(false);
    },
    onError: (error) => {
      showError("Error", String(error));
    },
  });

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) {
      showError("Error", "El nombre del cliente es requerido");
      return;
    }
    createCustomerMutation.mutate({
      name: newCustomerName,
      rnc: newCustomerRnc || undefined,
      email: newCustomerEmail || undefined,
      phone: newCustomerPhone || undefined,
      address: newCustomerAddress || undefined,
    });
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: { code: string; name: string; price: string; category?: string }) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "active" }),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showSuccess("Producto creado exitosamente", "");
      // Auto-select the new product in the current item
      if (currentProductIndex !== null) {
        form.setValue(`items.${currentProductIndex}.productId`, String(data.id));
        form.setValue(`items.${currentProductIndex}.price`, Number(data.price));
      }
      // Reset form and close sheet
      setNewProductCode("");
      setNewProductName("");
      setNewProductPrice("");
      setNewProductCategory("");
      setCurrentProductIndex(null);
      setIsProductSheetOpen(false);
    },
    onError: (error) => {
      showError("Error", String(error));
    },
  });

  const handleCreateProduct = () => {
    if (!newProductCode.trim()) {
      showError("Error", "El código del producto es requerido");
      return;
    }
    if (!newProductName.trim()) {
      showError("Error", "El nombre del producto es requerido");
      return;
    }
    if (!newProductPrice.trim() || isNaN(parseFloat(newProductPrice))) {
      showError("Error", "El precio del producto es requerido");
      return;
    }
    createProductMutation.mutate({
      code: newProductCode,
      name: newProductName,
      price: newProductPrice,
      category: newProductCategory || undefined,
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

  const [dateDisplay, setDateDisplay] = useState(toDisplayDate(new Date().toISOString().split('T')[0]));

  const defaultTaxRate = taxSettings?.rate ? parseFloat(String(taxSettings.rate)) : 18;
  const activeSellers = sellers.filter(s => s.status === 'active');

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: "",
      customerRnc: "",
      customerPhone: "",
      customerAddress: "",
      assignSeller: false,
      useNcf: false,
      ncfType: "",
      ncf: "",
      paymentTermsDays: 0,
      isNotReportable: false,
      date: getLocalDateString(),
      dueDate: getLocalDateString(),
      paymentTerms: "Al Contado",
      sellerId: undefined,
      discountType: "none",
      discountValue: 0,
      notes: "",
      paymentMethod: "Transferencia Bancaria",
      bankDetails: "",
      items: [{ productId: "", description: "", quantity: 1, price: 0, tax: defaultTaxRate }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchItems = form.watch("items");
  const watchCustomerId = form.watch("customerId");
  const watchDate = form.watch("date");
  const watchDueDate = form.watch("dueDate");
  const watchPaymentTerms = form.watch("paymentTerms");
  const watchNotes = form.watch("notes");
  const watchPaymentMethod = form.watch("paymentMethod");
  const watchAssignSeller = form.watch("assignSeller");
  const watchSellerId = form.watch("sellerId");
  const watchUseNcf = form.watch("useNcf");
  const watchNcfType = form.watch("ncfType");
  const watchCustomerRnc = form.watch("customerRnc");
  const watchCustomerPhone = form.watch("customerPhone");
  const watchCustomerAddress = form.watch("customerAddress");

  const selectedCustomer = customers.find(c => String(c.id) === watchCustomerId);
  
  // Check if current NCF type requires RNC
  const ncfRequiresRnc = watchUseNcf && watchNcfType && ["B01", "B14", "B15"].includes(watchNcfType);

  // Pre-fill customer fields when customer is selected
  React.useEffect(() => {
    if (selectedCustomer) {
      form.setValue("customerRnc", selectedCustomer.rnc || "");
      form.setValue("customerPhone", selectedCustomer.phone || "");
      form.setValue("customerAddress", selectedCustomer.address || "");
    }
  }, [selectedCustomer, form]);

  // Si no tiene NCF, no cobra impuesto
  const totalTax = watchUseNcf ? watchItems.reduce((sum, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
    const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : (item.quantity || 0);
    const tax = typeof item.tax === 'string' ? parseFloat(item.tax) : (item.tax || 0);
    const itemTotal = quantity * price;
    
    // Calcular impuesto según si es inclusivo o exclusivo
    if (taxSettings?.isInclusive) {
      // Si es inclusivo: el impuesto ya está en el precio
      return sum + (itemTotal * tax) / (100 + tax);
    } else {
      // Si es exclusivo: se suma al precio
      return sum + (itemTotal * (tax / 100));
    }
  }, 0) : 0;

  // Subtotal siempre debe ser el monto SIN ITBIS (o el total si no hay NCF)
  const subtotal = watchItems.reduce((sum, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
    const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : (item.quantity || 0);
    const tax = typeof item.tax === 'string' ? parseFloat(item.tax) : (item.tax || 0);
    const itemTotal = quantity * price;
    
    // Si no tiene NCF, no hay impuesto que restar
    if (!watchUseNcf) {
      return sum + itemTotal;
    }
    
    if (taxSettings?.isInclusive) {
      // Si es inclusivo: restar el impuesto del precio para obtener el monto base
      const itemTax = (itemTotal * tax) / (100 + tax);
      return sum + (itemTotal - itemTax);
    } else {
      // Si es exclusivo: el precio ya es el monto base
      return sum + itemTotal;
    }
  }, 0);
  
  const discountType = form.watch("discountType") || "none";
  const discountValue = form.watch("discountValue") || 0;
  
  // Calcular descuento según tipo
  let discount = 0;
  if (discountType === "percentage") {
    // Descuento por porcentaje: calcular el porcentaje del subtotal + impuesto
    discount = ((subtotal + totalTax) * discountValue) / 100;
  } else if (discountType === "amount") {
    // Descuento por monto fijo
    discount = discountValue;
  }
  
  const total = subtotal + totalTax - discount;

  const onSubmit = async (data: InvoiceFormValues) => {
    // Filtrar items vacíos (sin producto seleccionado) antes de guardar
    // y convertir tipos de datos para el backend
    
    // Para Consumidor Final (B02), usar "000000000" si no hay RNC
    const isB02 = data.ncfType === "B02";
    const customerRncValue = data.customerRnc || (isB02 ? "000000000" : null);
    
    const filteredData = {
      customerId: parseInt(data.customerId),
      customerRnc: customerRncValue,
      date: data.date,
      dueDate: data.dueDate || null,
      paymentTermsDays: data.paymentTermsDays || 0,
      sellerId: data.sellerId || null,
      subtotal: String(subtotal.toFixed(2)),
      itbis: String(totalTax.toFixed(2)),
      discountType: data.discountType || "none",
      discountValue: String(data.discountValue || 0),
      total: String(total.toFixed(2)),
      ncf: data.useNcf && data.ncfType ? data.ncfType : null,
      status: "pending",
      notes: data.notes || null,
      items: data.items
        .filter(item => item.productId)
        .map(item => ({
          productId: parseInt(item.productId),
          description: item.description || "",
          quantity: parseInt(String(item.quantity)),
          unitPrice: String(parseFloat(String(item.price)).toFixed(2)),
        }))
    };
    createInvoiceMutation.mutate(filteredData as any);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => String(p.id) === productId);
    return product?.name || 'Producto';
  };

  const handlePrint = () => {
    window.print();
  };

  const primaryColor = designSettings?.primaryColor || '#111826';
  
  // Determine invoice title based on NCF type
  const selectedNcfType = form.watch("ncfType");
  const useNcf = form.watch("useNcf");
  const selectedNcfSequence = ncfSequences.find(seq => seq.prefix === selectedNcfType);
  const isConsumidorFinal = selectedNcfSequence?.type?.toLowerCase().includes('consumidor') || 
                            selectedNcfSequence?.prefix === 'B02';
  
  const getHeaderText = () => {
    if (useNcf && selectedNcfSequence?.label) {
      return selectedNcfSequence.label;
    }
    return designSettings?.headerText || 'FACTURA';
  };
  const headerText = getHeaderText();
  
  // Etiqueta del comprobante NCF (para mostrar debajo)
  const ncfLabel = useNcf && selectedNcfSequence?.label ? selectedNcfSequence.label : null;
  
  // Generate NCF number for display
  const ncfNumber = useNcf && selectedNcfSequence 
    ? `${selectedNcfSequence.prefix}${selectedNcfSequence.currentNumber.toString().padStart(8, '0')}`
    : null;
  
  const footerText = designSettings?.footerText || 'Gracias por su preferencia';
  const showNotes = designSettings?.showNotes ?? true;
  const showSignature = designSettings?.showSignature ?? true;
  const showPaymentMethodSetting = designSettings?.showPaymentMethod ?? true;
  const showDueDateSetting = designSettings?.showDueDate ?? true;

  const logoSizeMap = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16'
  };
  const logoSizeClass = logoSizeMap[designSettings?.logoSize as keyof typeof logoSizeMap] || 'h-12';

  const PPI = 96; // Pixels per inch for screen display
  const paperDimensions = paperType === "media_hoja" 
    ? { width: 8.5, height: 5.5, label: "Media Hoja" } 
    : { width: 8.5, height: 11, label: "Carta" };
  const paperWidthPx = paperDimensions.width * PPI;
  const paperHeightPx = paperDimensions.height * PPI;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Left Panel - Editor */}
      <div className="w-[35%] bg-white border-r border-[#E5E7EB] flex flex-col h-screen overflow-hidden print-hide">
        {/* Header */}
        <div className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <Link href="/invoices">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <ChevronLeft className="h-5 w-5 text-[#6B7280]" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-[#111826]">Nueva Factura</h1>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <Accordion type="single" collapsible defaultValue="" className="px-6">
                {/* Detalles de Cliente */}
                <AccordionItem value="client-details" className="border-b border-[#E5E7EB]">
                  <AccordionTrigger className="text-sm font-medium text-[#111826] py-4 hover:no-underline">
                    Cliente
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-medium text-[#6B7280]">Seleccionar Cliente</FormLabel>
                          <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={customerPopoverOpen}
                                  className={cn(
                                    "w-full justify-between bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg h-10 focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? customers.find((c) => String(c.id) === field.value)?.name
                                    : "Buscar cliente..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar cliente..." />
                                <CommandList>
                                  <CommandEmpty>No se encontró cliente.</CommandEmpty>
                                  <CommandGroup>
                                    <CommandItem
                                      value="create-new"
                                      onSelect={() => {
                                        setIsCustomerSheetOpen(true);
                                        setCustomerPopoverOpen(false);
                                      }}
                                      className="text-[#7C3AED] font-medium"
                                    >
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      + Crear Nuevo Cliente
                                    </CommandItem>
                                  </CommandGroup>
                                  <CommandGroup heading="Clientes">
                                    {customers.map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={c.name}
                                        onSelect={() => {
                                          field.onChange(String(c.id));
                                          setCustomerPopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === String(c.id) ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {c.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedCustomer && (
                      <div className="space-y-3">
                        <div className="p-2 bg-[#F8F9FA] rounded-lg border border-[#E5E7EB]">
                          <p className="text-sm font-medium text-[#111826] text-center">{selectedCustomer.name}</p>
                        </div>
                        
                        {/* RNC Field - Highlighted when required */}
                        {ncfRequiresRnc ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <FormField
                              control={form.control}
                              name="customerRnc"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium text-amber-800">
                                    RNC/Cédula <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      className="bg-white border-amber-300 rounded-lg h-9 text-center" 
                                      data-testid="input-customer-rnc-required"
                                    />
                                  </FormControl>
                                  <p className="text-xs text-amber-600">Requerido para comprobantes tipo {watchNcfType}</p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        ) : (
                          <FormField
                            control={form.control}
                            name="customerRnc"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-[#6B7280]">RNC/Cédula</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg h-9 text-center" 
                                    data-testid="input-customer-rnc"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        <FormField
                          control={form.control}
                          name="customerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-[#6B7280]">Teléfono</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg h-9 text-center" 
                                  data-testid="input-customer-phone"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="customerAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-[#6B7280]">Dirección</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg min-h-[60px] resize-none text-center" 
                                  data-testid="input-customer-address"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Comprobante Fiscal */}
                <AccordionItem value="comprobante-fiscal" className="border-b border-[#E5E7EB]">
                  <AccordionTrigger className="text-sm font-medium text-[#111826] py-4 hover:no-underline">
                    Comprobante
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="useNcf"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg border border-[#E5E7EB]">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium text-[#111826]">¿Lleva Comprobante Fiscal?</FormLabel>
                            <p className="text-xs text-[#6B7280]">Activa para generar NCF</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("useNcf") && (
                      <>
                        <FormField
                          control={form.control}
                          name="ncfType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-[#6B7280]">Tipo de Comprobante</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg h-10">
                                    <SelectValue placeholder="Seleccione tipo..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ncfSequences.filter(seq => seq.status === 'active').map(seq => (
                                    <SelectItem key={seq.id} value={seq.prefix}>
                                      {seq.prefix} - {seq.type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch("ncfType") && (() => {
                          const selectedSequence = ncfSequences.find(seq => seq.prefix === form.watch("ncfType"));
                          if (!selectedSequence) return null;
                          return (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-[#6B7280]">Número de Comprobante</label>
                              <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg text-sm font-mono text-[#166534]">
                                {selectedSequence.prefix}{selectedSequence.currentNumber.toString().padStart(8, '0')}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Fechas */}
                <AccordionItem value="dates" className="border-b border-[#E5E7EB]">
                  <AccordionTrigger className="text-sm font-medium text-[#111826] py-4 hover:no-underline">
                    Fecha
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-[#6B7280] text-center block">Fecha Emisión</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Input 
                                type="text" 
                                value={dateDisplay}
                                onChange={(e) => {
                                  const formatted = formatDateInput(e.target.value);
                                  setDateDisplay(formatted);
                                  const iso = toISODate(formatted);
                                  if (iso) field.onChange(iso);
                                }}
                                placeholder="dd/mm/yyyy"
                                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-l-lg rounded-r-none border-r-0 h-10 text-center" 
                              />
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" className="rounded-l-none h-10 bg-[#F8F9FA] border-[#E5E7EB]">
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        const localDate = getLocalDateString(date);
                                        field.onChange(localDate);
                                        setDateDisplay(toDisplayDate(localDate));
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Términos de Pago */}
                <AccordionItem value="payment-terms" className="border-b border-[#E5E7EB]">
                  <AccordionTrigger className="text-sm font-medium text-[#111826] py-4 hover:no-underline">
                    Términos de Pago
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-[#6B7280]">Condiciones de Pago</FormLabel>
                          <Select value={field.value} onValueChange={(value) => {
                            field.onChange(value);
                            const days = value === "Al Contado" ? 0 : parseInt(value) || 0;
                            form.setValue("paymentTermsDays", days);
                            const currentDate = form.getValues("date");
                            if (currentDate) {
                              const date = new Date(currentDate);
                              date.setDate(date.getDate() + days);
                              form.setValue("dueDate", getLocalDateString(date));
                            }
                          }}>
                            <FormControl>
                              <SelectTrigger className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg h-10">
                                <SelectValue placeholder="Seleccione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Al Contado">Al Contado</SelectItem>
                              <SelectItem value="7 Días">7 Días</SelectItem>
                              <SelectItem value="14 Días">14 Días</SelectItem>
                              <SelectItem value="30 Días">30 Días</SelectItem>
                              <SelectItem value="60 Días">60 Días</SelectItem>
                              <SelectItem value="90 Días">90 Días</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Productos */}
                <AccordionItem value="products" className="border-b border-[#E5E7EB]">
                  <AccordionTrigger className="text-sm font-medium text-[#111826] py-4 hover:no-underline">
                    Productos
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium text-[#6B7280]">Items</Label>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={editingItemIndex !== null}
                        onClick={() => {
                          append({ productId: "", description: "", quantity: 1, price: 0, tax: defaultTaxRate });
                          setEditingItemIndex(fields.length);
                        }}
                        data-testid="button-add-item"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="w-[80px]">Cantidad</TableHead>
                          <TableHead className="w-[100px]">Precio</TableHead>
                          <TableHead className="w-[80px]">ITBIS</TableHead>
                          <TableHead className="w-[100px]">Subtotal</TableHead>
                          <TableHead className="w-[100px] text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500">
                              No hay artículos. Haga clic en 'Agregar' para añadir uno.
                            </TableCell>
                          </TableRow>
                        ) : (
                          fields.map((field, index) => {
                            const isEditing = editingItemIndex === index;
                            const itemProduct = products.find(p => String(p.id) === watchItems[index]?.productId);
                            return (
                              <TableRow key={field.id} className={isEditing ? "bg-[#e9ee9d]" : ""}>
                                <TableCell>
                                  {isEditing ? (
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.description`}
                                      render={({ field: descField }) => (
                                        <FormItem>
                                          <FormControl>
                                            <div>
                                              <Input
                                                ref={productDescriptionRef}
                                                value={descField.value || ""}
                                                onChange={(e) => {
                                                  descField.onChange(e.target.value);
                                                  form.setValue(`items.${index}.productId`, "");
                                                  updateProductDropdownPosition();
                                                  setProductSearchOpen(e.target.value.length > 0);
                                                }}
                                                onFocus={() => {
                                                  updateProductDropdownPosition();
                                                  if ((descField.value || "").length > 0) setProductSearchOpen(true);
                                                }}
                                                onBlur={() => {
                                                  setTimeout(() => {
                                                    if (!productDropdownInteracting.current) {
                                                      setProductSearchOpen(false);
                                                    }
                                                  }, 150);
                                                }}
                                                placeholder="Escriba para buscar producto..."
                                                autoFocus
                                                className="bg-white border-[#E5E7EB] rounded-lg h-9 text-sm"
                                                data-testid={`input-description-${index}`}
                                              />
                                              {productSearchOpen && (descField.value || "").length > 0 && (() => {
                                                const searchVal = (descField.value || "").toLowerCase();
                                                const filtered = products.filter((p: Product) =>
                                                  p.name.toLowerCase().includes(searchVal) ||
                                                  (p.code && p.code.toLowerCase().includes(searchVal))
                                                );
                                                if (filtered.length === 0) return null;
                                                return createPortal(
                                                  <div
                                                    className="bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto"
                                                    style={{
                                                      position: 'fixed',
                                                      top: productDropdownPos.top,
                                                      left: productDropdownPos.left,
                                                      width: productDropdownPos.width,
                                                      zIndex: 9999,
                                                    }}
                                                    onMouseEnter={() => { productDropdownInteracting.current = true; }}
                                                    onMouseLeave={() => { productDropdownInteracting.current = false; }}
                                                  >
                                                    {filtered.map((product: Product) => (
                                                      <div
                                                        key={product.id}
                                                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          productDropdownInteracting.current = false;
                                                          form.setValue(`items.${index}.productId`, String(product.id));
                                                          form.setValue(`items.${index}.description`, product.name);
                                                          form.setValue(`items.${index}.price`, Number(product.price));
                                                          setProductSearchOpen(false);
                                                          setTimeout(() => {
                                                            productQuantityRef.current?.focus();
                                                            productQuantityRef.current?.select();
                                                          }, 50);
                                                        }}
                                                        data-testid={`product-option-${product.id}`}
                                                      >
                                                        <span className="font-medium">{product.code ? `${product.code} - ` : ""}{product.name}</span>
                                                      </div>
                                                    ))}
                                                  </div>,
                                                  document.body
                                                );
                                              })()}
                                            </div>
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  ) : (
                                    <span className="font-medium text-sm" data-testid={`text-description-${index}`}>{watchItems[index]?.description || itemProduct?.name || "—"}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.quantity`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input 
                                              type="number" 
                                              {...field} 
                                              ref={(el) => {
                                                field.ref(el);
                                                (productQuantityRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                                              }}
                                              className="bg-white border-[#E5E7EB] rounded-lg h-9 text-sm"
                                              data-testid={`input-quantity-${index}`}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  ) : (
                                    <span className="font-medium text-sm" data-testid={`text-quantity-${index}`}>{watchItems[index]?.quantity}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.price`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input 
                                              type="number" 
                                              step="0.01"
                                              {...field} 
                                              className="bg-white border-[#E5E7EB] rounded-lg h-9 text-sm"
                                              data-testid={`input-price-${index}`}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  ) : (
                                    <span className="text-sm" data-testid={`text-price-${index}`}>{Number(watchItems[index]?.price || 0).toFixed(2)}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.tax`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input 
                                              type="number" 
                                              step="0.01"
                                              {...field}
                                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                              className="bg-white border-[#E5E7EB] rounded-lg h-9 text-sm"
                                              data-testid={`input-tax-${index}`}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  ) : (
                                    <span className="text-sm" data-testid={`text-tax-${index}`}>{watchItems[index]?.tax || 0}%</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm font-medium" data-testid={`text-subtotal-${index}`}>
                                    {(Number(watchItems[index]?.quantity || 0) * Number(watchItems[index]?.price || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-center gap-1">
                                    {isEditing ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-50"
                                        onClick={() => {
                                          if (!watchItems[index]?.description?.trim()) {
                                            showError("Error", "Ingrese una descripción o seleccione un producto");
                                            return;
                                          }
                                          setEditingItemIndex(null);
                                        }}
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
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                      onClick={() => {
                                        remove(index);
                                        if (editingItemIndex === index) setEditingItemIndex(null);
                                        else if (editingItemIndex !== null && editingItemIndex > index) setEditingItemIndex(editingItemIndex - 1);
                                      }}
                                      data-testid={`button-remove-item-${index}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>

                {/* Seller */}
                <AccordionItem value="seller" className="border-b border-[#E5E7EB]">
                  <AccordionTrigger className="text-sm font-medium text-[#111826] py-4 hover:no-underline">
                    Vendedor
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="assignSeller"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3 p-3 bg-[#F8F9FA] rounded-lg border border-[#E5E7EB]">
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (!checked) {
                                  form.setValue("sellerId", undefined);
                                }
                              }}
                            />
                            <Label className="text-xs font-medium text-[#6B7280] cursor-pointer">Asignar Vendedor</Label>
                          </div>
                        </FormItem>
                      )}
                    />

                    {watchAssignSeller && (
                      <FormField
                        control={form.control}
                        name="sellerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-[#6B7280]">Vendedor</FormLabel>
                            <Select 
                              value={field.value ? String(field.value) : ""} 
                              onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg h-10">
                                  <SelectValue placeholder="Seleccione vendedor..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {activeSellers.map(s => (
                                  <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Descuento */}
                <AccordionItem value="discount" className="border-b border-[#E5E7EB]">
                  <AccordionTrigger className="text-sm font-medium text-[#111826] py-4 hover:no-underline">
                    Descuento
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-[#6B7280]">Tipo de Descuento</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg h-10">
                                <SelectValue placeholder="Seleccione tipo..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sin Descuento</SelectItem>
                              <SelectItem value="percentage">Porciento (%)</SelectItem>
                              <SelectItem value="amount">Monto (RD$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {form.watch("discountType") !== "none" && (
                      <FormField
                        control={form.control}
                        name="discountValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-[#6B7280]">
                              {form.watch("discountType") === "percentage" ? "Porcentaje (%)" : "Monto (RD$)"}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step={form.watch("discountType") === "percentage" ? "0.1" : "0.01"}
                                min="0"
                                max={form.watch("discountType") === "percentage" ? "100" : undefined}
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg h-10"
                                placeholder={form.watch("discountType") === "percentage" ? "Ej: 10" : "Ej: 500.00"}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Add Notes */}
                <AccordionItem value="notes" className="border-b border-[#E5E7EB]">
                  <AccordionTrigger className="text-sm font-medium text-[#111826] py-4 hover:no-underline">
                    Notas
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="Términos de pago, instrucciones especiales..."
                              className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg min-h-[60px] text-sm resize-none overflow-hidden"
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Save Button */}
              <div className="p-6 mt-auto border-t border-[#E5E7EB]">
                <Button 
                  type="submit"
                  className={`w-full h-12 font-medium rounded-lg ${
                    !watchCustomerId || !watchItems.some(item => item.productId || item.description?.trim())
                      ? "bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111826] border border-[#E5E7EB] disabled:opacity-50 disabled:cursor-not-allowed"
                      : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white border-0"
                  }`}
                  disabled={createInvoiceMutation.isPending || !watchCustomerId || !watchItems.some(item => item.productId || item.description?.trim())}
                >
                  {createInvoiceMutation.isPending ? "Guardando..." : "Guardar Factura"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-[65%] bg-[#F8F9FA] p-8 overflow-y-auto h-screen">
        {!companySettings || !designSettings || !nextInvoiceNumber ? (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#E5E7EB] border-t-blue-500 mb-4"></div>
              <p className="text-[#6B7280]">Cargando vista previa...</p>
            </div>
          </div>
        ) : (
          <div>
        <div className="flex items-center justify-between mb-6 print-hide">
          <div className="flex items-center gap-2">
            <Select value={paperType} onValueChange={setPaperType}>
              <SelectTrigger className="w-48 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carta">📄 Carta (8.5" x 11")</SelectItem>
                <SelectItem value="media_hoja">📄 Media Hoja (8.5" x 5.5")</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button disabled={!watchCustomerId || !watchItems.some(item => item.productId || item.description?.trim())} variant="outline" size="sm" className="h-9 rounded-lg bg-white border-[#E5E7EB] text-[#6B7280]">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button disabled={!watchCustomerId || !watchItems.some(item => item.productId || item.description?.trim())} variant="outline" size="sm" className="h-9 rounded-lg bg-white border-[#E5E7EB] text-[#6B7280]">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button disabled={!watchCustomerId || !watchItems.some(item => item.productId || item.description?.trim())} onClick={handlePrint} variant="outline" size="sm" className="h-9 rounded-lg bg-white border-[#E5E7EB] text-[#6B7280]" data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Invoice Card with Paper Size - Real Size Preview */}
        <div className="flex justify-center print:block">
          <div 
            id="invoice-print-area"
            className="bg-white shadow-lg border border-[#D1D5DB] overflow-hidden print:shadow-none print:border-none"
            style={{ 
              width: `${paperWidthPx}px`,
              height: `${paperHeightPx}px`,
              fontFamily: paperType === "media_hoja" ? "'Courier New', monospace" : (designSettings?.fontFamily || 'Manrope')
            }}
          >
            {/* Layout condicional según tipo de papel */}
            {paperType === "media_hoja" ? (
              /* Media Hoja Layout - Formato Conduce (optimizado para impresora de matriz) */
              <div className="h-full flex flex-col" style={{ fontSize: '12px', lineHeight: 1.3, fontFamily: "'Courier New', Courier, monospace", padding: '0.1in 0.5in 0.1in 0.1in', color: '#000' }}>
                <div className="flex-1">
                  {/* Header - Empresa a la izquierda, documento a la derecha */}
                  <div className="flex justify-between items-start mb-0">
                    <div className="max-w-[45%]">
                      <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '8px' }}>
                        {companySettings?.name || 'EMPRESA'}
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>
                        {companySettings?.rnc ? `RNC: ${companySettings.rnc}` : ''} 
                        {companySettings?.phone ? ` | Tel: ${companySettings.phone}` : ''}
                      </div>
                      {companySettings?.address && (
                        <div style={{ fontSize: '12px', marginTop: '2px' }}>{companySettings.address}</div>
                      )}
                    </div>
                    <div className="min-w-[55%] flex flex-col items-end">
                      <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'right', letterSpacing: '1px' }}>
                        {headerText}
                      </div>
                      {useNcf && ncfNumber && (
                        <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                          <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>NCF:</span>
                          <span style={{ width: '100px', textAlign: 'left' }}>{ncfNumber}</span>
                        </div>
                      )}
                      <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>Fecha:</span>
                        <span style={{ width: '100px', textAlign: 'left' }}>{formatDate(watchDate)}</span>
                      </div>
                      <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>Factura No:</span>
                        <span style={{ width: '100px', textAlign: 'left' }}>{nextInvoiceNumber?.nextNumber || '---'}</span>
                      </div>
                      <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>Condiciones:</span>
                        <span style={{ width: '100px', textAlign: 'left' }}>{watchPaymentTerms}</span>
                      </div>
                      {watchSellerId && sellers.find(s => String(s.id) === String(watchSellerId)) && (() => {
                        const fullName = sellers.find(s => String(s.id) === String(watchSellerId))?.name || '';
                        const displayName = fullName.length > 12 ? fullName.split(' ')[0] : fullName;
                        return (
                          <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                            <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>Vendedor:</span>
                            <span style={{ width: '100px', textAlign: 'left' }}>{displayName}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="mb-1" style={{ marginTop: '4px' }}>
                    {selectedCustomer ? (
                      <>
                        <div className="flex mb-0" style={{ fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold', width: '70px', textAlign: 'right', marginRight: '6px' }}>Cliente:</span>
                          <span>{selectedCustomer.name}</span>
                          {watchCustomerRnc && <span style={{ marginLeft: '10px' }}>RNC: {watchCustomerRnc}</span>}
                          {watchCustomerPhone && <span style={{ marginLeft: '10px' }}>Tel: {watchCustomerPhone}</span>}
                        </div>
                        {watchCustomerAddress && (
                          <div className="flex mb-0" style={{ fontSize: '12px' }}>
                            <span style={{ fontWeight: 'bold', width: '70px', textAlign: 'right', marginRight: '6px', flexShrink: 0 }}>Dirección:</span>
                            <span style={{ maxWidth: '396px', wordWrap: 'break-word' }}>{watchCustomerAddress}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex mb-0" style={{ fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', width: '70px', textAlign: 'right', marginRight: '6px' }}>Cliente:</span>
                        <span>-</span>
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <table className="w-full" style={{ borderCollapse: 'collapse', margin: '8px 0' }}>
                    <thead>
                      <tr>
                        <th style={{ borderTop: '2px dotted #000', borderBottom: '2px dotted #000', padding: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', width: '60px' }}>CANT.</th>
                        <th style={{ borderTop: '2px dotted #000', borderBottom: '2px dotted #000', padding: '4px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>DESCRIPCION</th>
                        <th style={{ borderTop: '2px dotted #000', borderBottom: '2px dotted #000', padding: '4px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', width: '100px' }}>PRECIO</th>
                        <th style={{ borderTop: '2px dotted #000', borderBottom: '2px dotted #000', padding: '4px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', width: '100px' }}>MONTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchItems.map((item, index) => {
                        const price = Number(item.price) || 0;
                        const quantity = Number(item.quantity) || 0;
                        const tax = Number(item.tax) || 0;
                        const itemTotal = quantity * price;
                        let finalAmount;
                        if (taxSettings?.isInclusive) {
                          finalAmount = itemTotal;
                        } else {
                          finalAmount = itemTotal + (itemTotal * (tax / 100));
                        }
                        return (
                          <tr key={index}>
                            <td style={{ padding: '3px 4px', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }}>{quantity}</td>
                            <td style={{ padding: '3px 4px', fontSize: '12px' }}>
                              {item.description || (item.productId ? getProductName(item.productId) : <span style={{ fontStyle: 'italic', color: '#999' }}>Sin producto</span>)}
                            </td>
                            <td style={{ padding: '3px 4px', fontSize: '12px', textAlign: 'right' }}>{price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                            <td style={{ padding: '3px 4px', fontSize: '12px', textAlign: 'right' }}>{finalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2}></td>
                        <td style={{ borderTop: '2px dotted #000', padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>Subtotal:</td>
                        <td style={{ borderTop: '2px dotted #000', padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>{subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                      </tr>
                      {watchUseNcf && (
                        <tr>
                          <td colSpan={2}></td>
                          <td style={{ padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>ITBIS:</td>
                          <td style={{ padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>{totalTax.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                        </tr>
                      )}
                      {discount > 0 && (
                        <tr>
                          <td colSpan={2}></td>
                          <td style={{ padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>Descuento:</td>
                          <td style={{ padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>-{discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={2}></td>
                        <td style={{ borderTop: '2px solid #000', padding: '4px', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ borderTop: '2px solid #000', padding: '4px', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>{total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Notas */}
                  {showNotes && watchNotes && (
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>Notas: </span>
                      <span style={{ fontStyle: 'italic' }}>{watchNotes}</span>
                    </div>
                  )}
                </div>

                {/* Signatures - al final */}
                {showSignature && (
                  <div className="flex justify-between" style={{ paddingTop: '10px' }}>
                    <div className="text-center" style={{ width: '45%' }}>
                      <div style={{ borderTop: '2px solid #000', marginTop: '25px', paddingTop: '4px', fontSize: '12px', fontWeight: 'bold' }}>Entregado por</div>
                    </div>
                    <div className="text-center" style={{ width: '45%' }}>
                      <div style={{ borderTop: '2px solid #000', marginTop: '25px', paddingTop: '4px', fontSize: '12px', fontWeight: 'bold' }}>Recibido por</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Carta (Letter) Layout - Original */
              <div className="h-full overflow-hidden p-8 flex flex-col" style={{ fontSize: '12px', fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="text-left">
                    {companySettings?.logoUrl ? (
                      <img 
                        src={companySettings.logoUrl} 
                        alt="Company Logo"
                        className={`${logoSizeClass} mb-3 object-contain`}
                      />
                    ) : (
                      <div className="text-xl font-bold mb-3" style={{ color: primaryColor }}>Clorio</div>
                    )}
                    <div className="space-y-0.5">
                      <p className="text-base font-bold" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>{companySettings?.name || "Tu Empresa S.R.L."}</p>
                      <p className="text-sm text-[#6B7280]" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>RNC: {companySettings?.rnc || "---"}</p>
                      <p className="text-sm text-[#6B7280]" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>{companySettings?.address || "Calle Principal #123"}</p>
                      <p className="text-sm text-[#6B7280]" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>{companySettings?.phone || "(809) 555-0000"}</p>
                    </div>
                  </div>
                  <div>
                    <h1 className="font-bold mb-1 text-right" style={{ color: primaryColor, fontSize: '24px', fontFamily: "'Atkinson Hyperlegible', monospace" }}>{headerText}</h1>
                    {useNcf && ncfNumber && (
                      <div className="mb-2">
                        <div className="flex justify-end gap-2">
                          <span className="font-bold" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace", width: '128px', textAlign: 'right' }}>NCF:</span>
                          <p className="font-mono text-sm text-[#111826]" style={{ fontFamily: "'Atkinson Hyperlegible', monospace" }}>{ncfNumber}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <span className="text-sm font-bold text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace", width: '128px' }}>Factura Numero:</span>
                      <span className="text-sm" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>{nextInvoiceNumber?.nextNumber || '---'}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <span className="text-sm font-bold text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace", width: '128px' }}>Fecha:</span>
                      <span className="text-sm" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>{formatDate(watchDate)}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <span className="text-sm font-bold text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace", width: '128px' }}>Condiciones:</span>
                      <span className="text-sm" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>{watchPaymentTerms}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <span className="text-sm font-bold text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace", width: '128px' }}>Vencimiento:</span>
                      <span className="text-sm" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>{formatDate(watchDueDate)}</span>
                    </div>
                    {watchSellerId && sellers.find(s => String(s.id) === String(watchSellerId)) && (
                      <div className="flex justify-end gap-2">
                        <span className="text-sm font-bold text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace", width: '128px' }}>Vendedor:</span>
                        <span className="text-sm" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>{sellers.find(s => String(s.id) === String(watchSellerId))?.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cliente */}
                <div className="mb-6 pb-4 border-b border-[#E5E7EB]">
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Facturar A</h3>
                  {selectedCustomer ? (
                    <>
                      <p className="font-medium text-[#111826]" style={{ fontSize: '22px' }}>{selectedCustomer.name}</p>
                      {watchCustomerRnc && <p className="text-[#6B7280]" style={{ fontSize: '14px' }}>Cédula/RNC: {watchCustomerRnc}</p>}
                      {watchCustomerPhone && <p className="text-[#6B7280]" style={{ fontSize: '14px' }}>Tel: {watchCustomerPhone}</p>}
                      {watchCustomerAddress && <p className="text-[#6B7280]" style={{ fontSize: '14px' }}>{watchCustomerAddress}</p>}
                      {selectedCustomer.email && <p className="text-[#6B7280]" style={{ fontSize: '14px' }}>{selectedCustomer.email}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-[#9CA3AF] italic">Seleccione un cliente...</p>
                  )}
                </div>

                {/* Items Table - flex-1 para ocupar espacio disponible */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-center py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-12">Cant</th>
                        <th className="text-left py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Descripción</th>
                        <th className="text-center py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-28">Precio</th>
                        <th className="text-center py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-28">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchItems.map((item, index) => {
                        const price = Number(item.price) || 0;
                        const quantity = Number(item.quantity) || 0;
                        const tax = Number(item.tax) || 0;
                        const itemTotal = quantity * price;
                        
                        let itemTax;
                        let finalAmount;
                        if (taxSettings?.isInclusive) {
                          itemTax = (itemTotal * tax) / (100 + tax);
                          finalAmount = itemTotal;
                        } else {
                          itemTax = itemTotal * (tax / 100);
                          finalAmount = itemTotal + itemTax;
                        }
                        
                        return (
                          <tr key={index} className="border-b border-[#F3F4F6]">
                            <td className="py-3 text-[#111826] text-center" style={{ fontSize: '14px' }}>{quantity}</td>
                            <td className="py-3 text-[#111826]">
                              <div>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.description || (item.productId ? getProductName(item.productId) : <span className="text-[#9CA3AF] italic">Sin producto</span>)}</span>
                              </div>
                            </td>
                            <td className="py-3 text-[#111826] text-right" style={{ fontSize: '14px' }}>RD$ {price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                            <td className="py-3 font-medium text-[#111826] text-right" style={{ fontSize: '14px' }}>RD$ {finalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer fijo: Totales, Notas, Firmas */}
                <div className="mt-auto">
                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <div className="w-56 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Subtotal</span>
                      <span className="text-[#111826]">RD$ {subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                    </div>
                    {watchUseNcf && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6B7280]">ITBIS</span>
                        <span className="text-[#111826]">RD$ {totalTax.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6B7280]">Descuento</span>
                        <span className="text-red-500">-RD$ {discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-[#E5E7EB]">
                      <span className="text-[#111826]">Total</span>
                      <span className="text-[#111826]">RD$ {total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {showNotes && watchNotes && (
                  <div className="mb-4 p-3 rounded-lg border" style={{ 
                    backgroundColor: `${primaryColor}08`,
                    borderColor: `${primaryColor}20`
                  }}>
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: primaryColor }}>Notas</p>
                    <p className="text-xs text-[#6B7280] italic whitespace-pre-wrap break-words">{watchNotes}</p>
                  </div>
                )}

                {/* Signature Area */}
                {showSignature && (
                  <div className="flex justify-center gap-16 pt-4 border-t border-[#E5E7EB]">
                    <div className="text-center">
                      <div className="w-48 h-12 border-b border-[#E5E7EB] mb-1"></div>
                      <p className="text-xs text-[#6B7280] font-semibold">RECIBIDO POR</p>
                    </div>
                    <div className="text-center">
                      <div className="w-48 h-12 border-b border-[#E5E7EB] mb-1"></div>
                      <p className="text-xs text-[#6B7280] font-semibold">DESPACHADO POR</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                {footerText && (
                  <div className="text-center mt-4 pt-3 border-t border-[#E5E7EB]">
                    <p className="text-xs" style={{ color: primaryColor }}>{footerText}</p>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Design Settings Button */}
        <div className="flex justify-center mt-4 print-hide">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg bg-white border-[#E5E7EB] text-[#6B7280]">
                <Palette className="h-4 w-4" />
                Diseño de Factura
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Diseño de Factura
                </SheetTitle>
                <SheetDescription>
                  Personaliza la apariencia de tus facturas. Los cambios se guardan automáticamente.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Tamaño de Papel</h4>
                  <div className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    📄 Carta (8.5" x 11")
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Tamaño del Logo</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "small", label: "Pequeño" },
                      { value: "medium", label: "Mediano" },
                      { value: "large", label: "Grande" },
                    ].map(size => (
                      <Button 
                        key={size.value} 
                        variant={designSettings?.logoSize === size.value ? "default" : "outline"} 
                        size="sm"
                        className="text-xs"
                      >
                        {size.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Secciones Visibles</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">Mostrar Notas</span>
                      <Switch checked={designSettings?.showNotes ?? true} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">Mostrar Firma</span>
                      <Switch checked={designSettings?.showSignature ?? true} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">Mostrar Método de Pago</span>
                      <Switch checked={designSettings?.showPaymentMethod ?? true} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Link href="/settings?tab=invoice-design">
                    <Button variant="outline" className="w-full gap-2">
                      <Settings className="h-4 w-4" />
                      Todas las Opciones de Diseño
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
          </div>
        )}
      </div>

      {/* Sheet for creating new customer */}
      <Sheet open={isCustomerSheetOpen} onOpenChange={setIsCustomerSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#7C3AED]" />
              Crear Nuevo Cliente
            </SheetTitle>
            <SheetDescription>
              Ingresa los datos del nuevo cliente. Se seleccionará automáticamente al guardar.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-sm font-medium">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Nombre del cliente o empresa"
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerRnc" className="text-sm font-medium">RNC / Cédula</Label>
              <Input
                id="customerRnc"
                value={newCustomerRnc}
                onChange={(e) => setNewCustomerRnc(e.target.value)}
                placeholder="000-0000000-0"
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-sm font-medium">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone" className="text-sm font-medium">Teléfono</Label>
              <Input
                id="customerPhone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="809-000-0000"
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerAddress" className="text-sm font-medium">Dirección</Label>
              <Textarea
                id="customerAddress"
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                placeholder="Calle, número, sector, ciudad"
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg min-h-[80px]"
              />
            </div>

            <div className="pt-4 space-y-2">
              <Button
                type="button"
                onClick={handleCreateCustomer}
                disabled={createCustomerMutation.isPending || !newCustomerName.trim()}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {createCustomerMutation.isPending ? "Guardando..." : "Guardar Cliente"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomerSheetOpen(false)}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet for creating new product */}
      <Sheet open={isProductSheetOpen} onOpenChange={setIsProductSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-[#7C3AED]" />
              Crear Nuevo Producto
            </SheetTitle>
            <SheetDescription>
              Ingresa los datos del nuevo producto. Se seleccionará automáticamente al guardar.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productCode" className="text-sm font-medium">
                Código <span className="text-red-500">*</span>
              </Label>
              <Input
                id="productCode"
                value={newProductCode}
                onChange={(e) => setNewProductCode(e.target.value)}
                placeholder="SKU o código único"
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName" className="text-sm font-medium">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="productName"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Nombre del producto"
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productPrice" className="text-sm font-medium">
                Precio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="productPrice"
                type="number"
                step="0.01"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                placeholder="0.00"
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productCategory" className="text-sm font-medium">Categoría</Label>
              <Input
                id="productCategory"
                value={newProductCategory}
                onChange={(e) => setNewProductCategory(e.target.value)}
                placeholder="Ej: Muebles, Electrónica..."
                className="bg-[#F8F9FA] border-[#E5E7EB] rounded-lg"
              />
            </div>

            <div className="pt-4 space-y-2">
              <Button
                type="button"
                onClick={handleCreateProduct}
                disabled={createProductMutation.isPending || !newProductCode.trim() || !newProductName.trim() || !newProductPrice.trim()}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {createProductMutation.isPending ? "Guardando..." : "Guardar Producto"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProductSheetOpen(false)}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <MessagePopup
        open={message.open}
        onClose={closeMessage}
        title={message.title}
        description={message.description}
        type={message.type}
      />
    </div>
  );
}
