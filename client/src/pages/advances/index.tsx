import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Plus, 
  Wallet, 
  ChevronsUpDown, 
  Check, 
  Calendar,
  FileText,
  ArrowRightLeft,
  UserPlus,
  Save,
  Edit,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn, getLocalDateString } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import type { Customer, Payment } from "@shared/schema";
import { format, formatISO, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const parseDateForCalendar = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  const datePart = String(dateStr).split('T')[0];
  const date = parseISO(datePart);
  return isNaN(date.getTime()) ? undefined : date;
};
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface AdvanceWithAvailable extends Payment {
  availableAmount: string;
}

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

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(num);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const datePart = String(dateStr).split('T')[0];
  const date = new Date(datePart + 'T00:00:00');
  return isNaN(date.getTime()) ? "" : format(date, "dd/MM/yyyy", { locale: es });
};

export default function AdvancesPage() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const { playPaymentSound } = useSoundEffects();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentDateDisplay, setPaymentDateDisplay] = useState(toDisplayDate(getLocalDateString()));
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filterCustomerId, setFilterCustomerId] = useState<string>("");
  const [filterCustomerPopoverOpen, setFilterCustomerPopoverOpen] = useState(false);
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerRnc, setNewCustomerRnc] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editConcept, setEditConcept] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDateDisplay, setEditDateDisplay] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [advanceToDelete, setAdvanceToDelete] = useState<Payment | null>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const { data: advances = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["advances", filterCustomerId],
    queryFn: async () => {
      const url = filterCustomerId 
        ? `/api/advances?customerId=${filterCustomerId}` 
        : "/api/advances";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch advances");
      return response.json();
    },
  });

  const createAdvanceMutation = useMutation({
    mutationFn: async (data: {
      customerId: number;
      amount: string;
      date: string;
      method: string;
      concept: string;
      reference: string | null;
      notes: string | null;
    }) => {
      const response = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear anticipo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advances"] });
      playPaymentSound();
      
      // Mostrar el popup de éxito primero
      showSuccess("Anticipo Registrado", "El anticipo ha sido registrado exitosamente.");
      
      // NO limpiar el formulario ni cerrar el diálogo todavía.
      // Dejamos que el usuario vea sus datos mientras el popup está visible.
      // El reset ocurrirá cuando el usuario cierre el popup o después de un tiempo prudente.
      setTimeout(() => {
        resetForm();
        setIsCreateDialogOpen(false);
      }, 3000); // 3 segundos para que el usuario pueda ver el popup y sus datos
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const resetForm = () => {
    setSelectedCustomerId("");
    setAmount("");
    setConcept("");
    setPaymentDate(getLocalDateString());
    setPaymentDateDisplay(toDisplayDate(getLocalDateString()));
    setPaymentMethod("efectivo");
    setReference("");
    setNotes("");
  };

  const resetCustomerForm = () => {
    setNewCustomerName("");
    setNewCustomerRnc("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setNewCustomerAddress("");
  };

  const updateAdvanceMutation = useMutation({
    mutationFn: async (data: { id: number; amount?: string; concept?: string; date?: string; reference?: string; notes?: string }) => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/advances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar anticipo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advances"] });
      showSuccess("Anticipo Actualizado", "El anticipo ha sido actualizado exitosamente.");
      setIsEditDialogOpen(false);
      setEditingAdvance(null);
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const deleteAdvanceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/advances/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar anticipo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advances"] });
      showSuccess("Anticipo Eliminado", "El anticipo ha sido eliminado exitosamente.");
      setDeleteConfirmOpen(false);
      setAdvanceToDelete(null);
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleEditAdvance = (advance: Payment) => {
    setEditingAdvance(advance);
    setEditAmount(String(advance.amount));
    setEditConcept(advance.concept || "");
    setEditDate(advance.date);
    setEditDateDisplay(toDisplayDate(advance.date));
    setEditReference(advance.reference || "");
    setEditNotes(advance.notes || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingAdvance) return;
    if (!editAmount || parseFloat(editAmount) <= 0) {
      showError("Error", "El monto es requerido y debe ser mayor a 0.");
      return;
    }
    updateAdvanceMutation.mutate({
      id: editingAdvance.id,
      amount: editAmount,
      concept: editConcept,
      date: editDate,
      reference: editReference || undefined,
      notes: editNotes || undefined,
    });
  };

  const handleDeleteAdvance = (advance: Payment) => {
    setAdvanceToDelete(advance);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAdvance = () => {
    if (advanceToDelete) {
      deleteAdvanceMutation.mutate(advanceToDelete.id);
    }
  };

  const handleEditDateInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setEditDateDisplay(formatted);
    const iso = toISODate(formatted);
    if (iso) setEditDate(iso);
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; rnc?: string; phone?: string; email?: string; address?: string; status?: string }) => {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al crear cliente");
      }
      return response.json() as Promise<Customer>;
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedCustomerId(String(newCustomer.id));
      showSuccess("Cliente Creado", `El cliente "${newCustomer.name}" ha sido creado y seleccionado.`);
      resetCustomerForm();
      setIsCustomerSheetOpen(false);
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) {
      showError("Error", "El nombre del cliente es requerido.");
      return;
    }
    const customerData: { name: string; rnc?: string; phone?: string; email?: string; address?: string; status: string } = {
      name: newCustomerName.trim(),
      status: "active",
    };
    if (newCustomerRnc.trim()) customerData.rnc = newCustomerRnc.trim();
    if (newCustomerPhone.trim()) customerData.phone = newCustomerPhone.trim();
    if (newCustomerEmail.trim()) customerData.email = newCustomerEmail.trim();
    if (newCustomerAddress.trim()) customerData.address = newCustomerAddress.trim();
    
    createCustomerMutation.mutate(customerData);
  };

  const handleSubmit = () => {
    if (!selectedCustomerId) {
      showError("Error", "Debe seleccionar un cliente.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showError("Error", "El monto debe ser mayor a 0.");
      return;
    }
    if (!concept.trim()) {
      showError("Error", "El concepto es requerido.");
      return;
    }
    if (!paymentDate) {
      showError("Error", "La fecha es requerida.");
      return;
    }

    createAdvanceMutation.mutate({
      customerId: parseInt(selectedCustomerId),
      amount: amount,
      date: paymentDate,
      method: paymentMethod,
      concept: concept.trim(),
      reference: reference.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const handleDateInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setPaymentDateDisplay(formatted);
    const iso = toISODate(formatted);
    if (iso) {
      setPaymentDate(iso);
    }
  };

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));
  const filterCustomer = customers.find(c => c.id === parseInt(filterCustomerId));
  const activeCustomers = customers.filter(c => c.status === "active");

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Cliente desconocido";
  };

  const getAvailableAmount = (advance: Payment) => {
    const amount = parseFloat(String(advance.amount));
    const applied = parseFloat(String(advance.appliedAmount || "0"));
    return (amount - applied).toFixed(2);
  };

  const getStatusBadge = (advance: Payment) => {
    const available = parseFloat(getAvailableAmount(advance));
    if (available <= 0) {
      return <Badge variant="secondary">Aplicado</Badge>;
    }
    return <Badge variant="default" className="bg-emerald-500">Disponible</Badge>;
  };

  return (
    <Layout>
      <MessagePopup 
        open={message.open} 
        title={message.title}
        description={message.description}
        type={message.type}
        onClose={closeMessage} 
      />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anticipos de Clientes</h1>
          <p className="text-muted-foreground">
            Registre pagos anticipados antes de crear la factura
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-new-advance">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Anticipo
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtrar por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Popover open={filterCustomerPopoverOpen} onOpenChange={setFilterCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[300px] justify-between"
                  data-testid="select-filter-customer"
                >
                  {filterCustomer ? filterCustomer.name : "Todos los clientes"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>No se encontró cliente.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFilterCustomerId("");
                          setFilterCustomerPopoverOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", !filterCustomerId ? "opacity-100" : "opacity-0")} />
                        Todos los clientes
                      </CommandItem>
                      {activeCustomers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          onSelect={() => {
                            setFilterCustomerId(String(customer.id));
                            setFilterCustomerPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", filterCustomerId === String(customer.id) ? "opacity-100" : "opacity-0")} />
                          {customer.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {filterCustomerId && (
              <Button variant="ghost" size="sm" onClick={() => setFilterCustomerId("")}>
                Limpiar filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Lista de Anticipos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : advances.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay anticipos registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recibo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.map((advance) => {
                  const availableAmount = getAvailableAmount(advance);
                  const isFullyApplied = parseFloat(availableAmount) <= 0;
                  return (
                  <TableRow key={advance.id} data-testid={`row-advance-${advance.id}`}>
                    <TableCell className="font-mono text-sm">
                      {advance.receiptNumber}
                    </TableCell>
                    <TableCell>{formatDate(advance.date)}</TableCell>
                    <TableCell>{getCustomerName(advance.customerId)}</TableCell>
                    <TableCell>{advance.concept || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(advance.amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatCurrency(availableAmount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(advance)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-advance-menu-${advance.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditAdvance(advance)} data-testid={`button-edit-advance-${advance.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAdvance(advance)}
                            disabled={isFullyApplied || parseFloat(String(advance.appliedAmount)) > 0}
                            className="text-destructive"
                            data-testid={`button-delete-advance-${advance.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Nuevo Anticipo
            </DialogTitle>
            <DialogDescription>
              Registre un pago anticipado de un cliente antes de crear la factura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    data-testid="select-customer"
                  >
                    {selectedCustomer ? selectedCustomer.name : "Seleccionar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>No se encontró cliente.</CommandEmpty>
                      <CommandGroup heading="Acciones">
                        <CommandItem
                          onSelect={() => {
                            setCustomerPopoverOpen(false);
                            setIsCustomerSheetOpen(true);
                          }}
                          className="text-[#7C3AED] font-medium"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          + Crear Nuevo Cliente
                        </CommandItem>
                      </CommandGroup>
                      <CommandGroup heading="Clientes">
                        {activeCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            onSelect={() => {
                              setSelectedCustomerId(String(customer.id));
                              setCustomerPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === String(customer.id) ? "opacity-100" : "opacity-0")} />
                            {customer.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Concepto *</Label>
              <Input
                placeholder="Ej: Anticipo proyecto X, Inicio de trabajo..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                data-testid="input-concept"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="input-amount"
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        placeholder="DD/MM/YYYY"
                        value={paymentDateDisplay}
                        onChange={(e) => handleDateInputChange(e.target.value)}
                        className="pr-10"
                        data-testid="input-date"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={paymentDate ? new Date(paymentDate + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          setPaymentDate(iso);
                          setPaymentDateDisplay(toDisplayDate(iso));
                        }
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  placeholder="No. cheque, transferencia..."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  data-testid="input-reference"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                data-testid="input-notes"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createAdvanceMutation.isPending}
                data-testid="button-save-advance"
              >
                {createAdvanceMutation.isPending ? "Guardando..." : "Guardar Anticipo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Nombre del cliente"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                data-testid="input-new-customer-name"
              />
            </div>

            <div className="space-y-2">
              <Label>RNC / Cédula</Label>
              <Input
                placeholder="000-0000000-0"
                value={newCustomerRnc}
                onChange={(e) => setNewCustomerRnc(e.target.value)}
                data-testid="input-new-customer-rnc"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                placeholder="809-000-0000"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                data-testid="input-new-customer-phone"
              />
            </div>

            <div className="space-y-2">
              <Label>Correo Electrónico</Label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                data-testid="input-new-customer-email"
              />
            </div>

            <div className="space-y-2">
              <Label>Dirección</Label>
              <Textarea
                placeholder="Dirección del cliente"
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                rows={2}
                data-testid="input-new-customer-address"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsCustomerSheetOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCustomer} 
              disabled={createCustomerMutation.isPending}
              data-testid="button-save-new-customer"
            >
              <Save className="w-4 h-4 mr-2" />
              {createCustomerMutation.isPending ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Anticipo
            </DialogTitle>
            <DialogDescription>
              Modifique los datos del anticipo. Solo se pueden editar anticipos que no han sido aplicados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input 
                value={editingAdvance ? getCustomerName(editingAdvance.customerId) : ""} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                data-testid="input-edit-amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                placeholder="Ej: Adelanto para pedido #123"
                value={editConcept}
                onChange={(e) => setEditConcept(e.target.value)}
                data-testid="input-edit-concept"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      placeholder="DD/MM/YYYY"
                      value={editDateDisplay}
                      onChange={(e) => handleEditDateInputChange(e.target.value)}
                      className="pr-10"
                      data-testid="input-edit-date"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editDate ? parseDateForCalendar(editDate) : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        const isoStr = formatISO(date, { representation: "date" });
                        setEditDate(isoStr);
                        setEditDateDisplay(toDisplayDate(isoStr));
                      }
                      setEditCalendarOpen(false);
                    }}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input
                placeholder="Número de cheque, transferencia, etc."
                value={editReference}
                onChange={(e) => setEditReference(e.target.value)}
                data-testid="input-edit-reference"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales sobre el anticipo"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                data-testid="input-edit-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateAdvanceMutation.isPending}
              data-testid="button-save-edit-advance"
            >
              {updateAdvanceMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar anticipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El anticipo será eliminado permanentemente
              y el monto será reversado de la cuenta asociada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteAdvance}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-advance"
            >
              {deleteAdvanceMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
