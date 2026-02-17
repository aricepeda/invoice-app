import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Filter, Download, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import type { Supplier, ExpenseCategory } from "@shared/schema";

const initialFormData = {
  name: "",
  rnc: "",
  phone: "",
  address: "",
  paymentTermsDays: "30",
  defaultExpenseCategoryId: "",
  status: "active",
};

const CATEGORY_ORDER = [
  "Gastos de Personal",
  "Materia Prima y Producción",
  "Servicios Básicos",
  "Transporte y Combustible",
  "Mantenimiento y Reparaciones",
  "Impuestos y Organizaciones",
  "Gastos Administrativos",
  "Otros Gastos",
];

const sortCategories = (categories: ExpenseCategory[]) => {
  return [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.findIndex(name => 
      a.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(a.name.toLowerCase())
    );
    const indexB = CATEGORY_ORDER.findIndex(name => 
      b.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(b.name.toLowerCase())
    );
    
    if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

export default function Suppliers() {
  const queryClient = useQueryClient();
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json() as Promise<Supplier[]>;
    },
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const response = await fetch("/api/expense-categories");
      if (!response.ok) throw new Error("Failed to fetch expense categories");
      return response.json() as Promise<ExpenseCategory[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          paymentTermsDays: parseInt(data.paymentTermsDays) || 30,
          defaultExpenseCategoryId: data.defaultExpenseCategoryId ? parseInt(data.defaultExpenseCategoryId) : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to create supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsDialogOpen(false);
      resetForm();
      showSuccess("Suplidor creado", "El suplidor ha sido creado exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo crear el suplidor.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: number }) => {
      const response = await fetch(`/api/suppliers/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          paymentTermsDays: parseInt(data.paymentTermsDays) || 30,
          defaultExpenseCategoryId: data.defaultExpenseCategoryId ? parseInt(data.defaultExpenseCategoryId) : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to update supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsDialogOpen(false);
      resetForm();
      showSuccess("Suplidor actualizado", "El suplidor ha sido actualizado exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo actualizar el suplidor.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error al eliminar suplidor" }));
        throw new Error(errorData.error || "Failed to delete supplier");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showSuccess("Suplidor eliminado", "El suplidor ha sido eliminado.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      rnc: supplier.rnc || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      paymentTermsDays: String(supplier.paymentTermsDays),
      defaultExpenseCategoryId: supplier.defaultExpenseCategoryId ? String(supplier.defaultExpenseCategoryId) : "",
      status: supplier.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Está seguro de que desea eliminar este suplidor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError("Error", "El nombre es requerido.");
      return;
    }
    if (editingSupplier) {
      updateMutation.mutate({ ...formData, id: editingSupplier.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.rnc?.includes(searchTerm) ?? false) ||
    (supplier.phone?.includes(searchTerm) ?? false)
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}>
              Suplidores
            </h1>
            <p className="text-muted-foreground mt-1">Gestiona tu base de datos de proveedores.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-supplier">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Suplidor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? "Editar Suplidor" : "Nuevo Suplidor"}</DialogTitle>
                  <DialogDescription>
                    {editingSupplier ? "Actualice la información del suplidor." : "Complete la información del nuevo suplidor."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Nombre *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nombre del suplidor"
                        data-testid="input-supplier-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>RNC/Cédula</Label>
                      <Input
                        value={formData.rnc}
                        onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                        placeholder="000-00000-0"
                        data-testid="input-supplier-rnc"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="809-000-0000"
                        data-testid="input-supplier-phone"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Dirección</Label>
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Dirección completa"
                        data-testid="input-supplier-address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Términos de Pago (días)</Label>
                      <Select
                        value={formData.paymentTermsDays}
                        onValueChange={(value) => setFormData({ ...formData, paymentTermsDays: value })}
                      >
                        <SelectTrigger data-testid="select-payment-terms">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Contado</SelectItem>
                          <SelectItem value="15">15 días</SelectItem>
                          <SelectItem value="30">30 días</SelectItem>
                          <SelectItem value="45">45 días</SelectItem>
                          <SelectItem value="60">60 días</SelectItem>
                          <SelectItem value="90">90 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Categoría de Gasto Predeterminada</Label>
                      <Select
                        value={formData.defaultExpenseCategoryId || "none"}
                        onValueChange={(value) => setFormData({ ...formData, defaultExpenseCategoryId: value === "none" ? "" : value })}
                      >
                        <SelectTrigger data-testid="select-default-expense-category">
                          <SelectValue placeholder="Seleccionar categoría..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sortCategories(expenseCategories).map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="none">Sin categoría predeterminada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-supplier">
                      {editingSupplier ? "Actualizar" : "Crear"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar suplidores..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-suppliers"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Suplidor</TableHead>
                <TableHead>RNC/Cédula</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Términos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Cargando suplidores...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No se encontraron suplidores
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="group" data-testid={`row-supplier-${supplier.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border bg-secondary">
                          <AvatarFallback className="text-primary font-medium">
                            <Building2 className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-foreground" data-testid={`text-supplier-name-${supplier.id}`}>
                            {supplier.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{supplier.phone || "—"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-rnc-${supplier.id}`}>
                      {supplier.rnc || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{supplier.phone || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {supplier.paymentTermsDays === 0 ? "Contado" : `${supplier.paymentTermsDays} días`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`
                        ${supplier.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-100'} 
                        font-normal border-none text-sm`
                      }>
                        {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-supplier-menu-${supplier.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(supplier.id)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
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
