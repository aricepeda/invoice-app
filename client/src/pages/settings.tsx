import { Layout } from "@/components/layout";
import { getLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Building2, FileText, Users, Receipt, Save, Plus, Trash2, Edit, Palette, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaxSettings, InvoiceDesignSettings } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function Settings() {
  const { user } = useAuth();
  const isVendedor = user?.role === 'vendedor';
  const tabCount = isVendedor ? 5 : 6;
  
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground mt-1">Administra los parámetros generales del sistema.</p>
        </div>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className={`grid w-full lg:w-auto`} style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="invoice-design">Diseño Factura</TabsTrigger>
            <TabsTrigger value="sequences">Numeración</TabsTrigger>
            <TabsTrigger value="ncf">Secuencias NCF</TabsTrigger>
            <TabsTrigger value="taxes">Impuestos</TabsTrigger>
            {!isVendedor && <TabsTrigger value="users">Usuarios</TabsTrigger>}
          </TabsList>

          <TabsContent value="company" className="mt-6">
            <CompanySettings />
          </TabsContent>

          <TabsContent value="invoice-design" className="mt-6">
            <InvoiceDesignSettingsForm />
          </TabsContent>

          <TabsContent value="sequences" className="mt-6">
            <DocumentSequenceSettings />
          </TabsContent>

          <TabsContent value="ncf" className="mt-6">
            <NCFSettings />
          </TabsContent>

          <TabsContent value="taxes" className="mt-6">
            <TaxSettings />
          </TabsContent>

          {!isVendedor && (
            <TabsContent value="users" className="mt-6">
              <UserSettings />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}

function CompanySettings() {
  const queryClient = useQueryClient();
  
  const defaultFormData = {
    name: "",
    rnc: "",
    phone: "",
    email: "",
    address: "",
    logoUrl: "",
    invoiceStartNumber: 1,
    conduceStartNumber: 1,
    incomeReceiptStartNumber: 1,
    paymentReceiptStartNumber: 1,
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"success" | "error">("success");
  const [dialogMessage, setDialogMessage] = useState("");

  const { data: companySettings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings");
      if (!response.ok) throw new Error("Failed to fetch company settings");
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/company-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save company settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      setDialogType("success");
      setDialogMessage("Los datos de la empresa han sido actualizados exitosamente.");
      setDialogOpen(true);
    },
    onError: () => {
      setDialogType("error");
      setDialogMessage("No se pudo guardar la configuración. Intente nuevamente.");
      setDialogOpen(true);
    },
  });

  useEffect(() => {
    if (companySettings) {
      setFormData(companySettings);
      if (companySettings.logoUrl) {
        setLogoPreview(companySettings.logoUrl);
      }
    }
  }, [companySettings]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setFormData(prev => ({ ...prev, logoUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Perfil de la Empresa</CardTitle>
          <CardDescription>Información general que aparecerá en tus facturas y reportes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden relative">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()}>
                Subir Logo
              </Button>
              <input 
                id="logo-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleLogoUpload}
              />
              <p className="text-xs text-muted-foreground">Recomendado: PNG, JPG de al menos 400x400px</p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nombre / Razón Social</Label>
              <Input 
                id="company-name" 
                value={formData.name} 
                onChange={(e) => handleChange("name", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rnc">RNC</Label>
              <Input 
                id="rnc" 
                value={formData.rnc} 
                onChange={(e) => handleChange("rnc", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input 
                id="phone" 
                value={formData.phone} 
                onChange={(e) => handleChange("phone", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email" 
                value={formData.email} 
                onChange={(e) => handleChange("email", e.target.value)} 
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea 
                id="address" 
                value={formData.address} 
                onChange={(e) => handleChange("address", e.target.value)} 
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/50">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogType === "success" ? "Configuración Guardada" : "Error"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setDialogOpen(false)}>
            Entendido
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocumentSequenceSettings() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  
  const defaultFormData = {
    name: "",
    rnc: "",
    phone: "",
    email: "",
    address: "",
    logoUrl: "",
    invoiceStartNumber: 1,
    conduceStartNumber: 1,
    incomeReceiptStartNumber: 1,
    paymentReceiptStartNumber: 1,
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [originalData, setOriginalData] = useState(defaultFormData);

  const { data: companySettings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings");
      if (!response.ok) throw new Error("Failed to fetch company settings");
      return response.json();
    },
  });

  const { data: hasInvoicesData } = useQuery({
    queryKey: ["hasInvoices"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings/has-invoices");
      if (!response.ok) throw new Error("Failed to check invoices");
      return response.json();
    },
  });

  const { data: hasSupplierPaymentsData } = useQuery({
    queryKey: ["hasSupplierPayments"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings/has-supplier-payments");
      if (!response.ok) throw new Error("Failed to check supplier payments");
      return response.json();
    },
  });

  const { data: hasConducesData } = useQuery({
    queryKey: ["hasConduces"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings/has-conduces");
      if (!response.ok) throw new Error("Failed to check conduces");
      return response.json();
    },
  });

  const hasInvoices = hasInvoicesData?.hasInvoices || false;
  const hasSupplierPayments = hasSupplierPaymentsData?.hasSupplierPayments || false;
  const hasConduces = hasConducesData?.hasConduces || false;

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/company-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save company settings");
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      setOriginalData(variables);
      showSuccess("✓ Configuración Guardada", "Los números de inicio han sido actualizados exitosamente.");
    },
    onError: (error: Error) => {
      showError("Error", error.message || "No se pudo guardar la configuración. Intente nuevamente.");
    },
  });

  useEffect(() => {
    if (companySettings) {
      setFormData(companySettings);
      setOriginalData(companySettings);
    }
  }, [companySettings]);

  const hasChanges = 
    formData.invoiceStartNumber !== originalData.invoiceStartNumber ||
    formData.conduceStartNumber !== originalData.conduceStartNumber ||
    formData.incomeReceiptStartNumber !== originalData.incomeReceiptStartNumber ||
    formData.paymentReceiptStartNumber !== originalData.paymentReceiptStartNumber;

  const handleChange = (field: string, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Numeración de Documentos</CardTitle>
          <CardDescription>Define el número de inicio para cada tipo de documento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice-start">Facturas - Número Inicial</Label>
              <Input 
                id="invoice-start" 
                type="number" 
                min="1"
                value={formData.invoiceStartNumber} 
                onChange={(e) => handleChange("invoiceStartNumber", parseInt(e.target.value) || 1)} 
                disabled={hasInvoices}
                className={hasInvoices ? "bg-muted cursor-not-allowed" : ""}
                data-testid="input-invoice-start-number"
              />
              {hasInvoices ? (
                <p className="text-xs text-amber-600">No se puede cambiar porque ya existen facturas en el sistema</p>
              ) : (
                <p className="text-xs text-muted-foreground">Las facturas comenzarán desde este número</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="conduce-start">Conduces - Número Inicial</Label>
              <Input 
                id="conduce-start" 
                type="number" 
                min="1"
                value={formData.conduceStartNumber} 
                onChange={(e) => handleChange("conduceStartNumber", parseInt(e.target.value) || 1)} 
                disabled={hasConduces}
                className={hasConduces ? "bg-muted cursor-not-allowed" : ""}
                data-testid="input-conduce-start-number"
              />
              {hasConduces ? (
                <p className="text-xs text-amber-600">No se puede cambiar porque ya existen conduces en el sistema</p>
              ) : (
                <p className="text-xs text-muted-foreground">Los conduces comenzarán desde este número</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-start">Recibos de Ingresos - Número Inicial</Label>
              <Input 
                id="income-start" 
                type="number" 
                min="1"
                value={formData.incomeReceiptStartNumber} 
                onChange={(e) => handleChange("incomeReceiptStartNumber", parseInt(e.target.value) || 1)} 
                data-testid="input-income-start-number"
              />
              <p className="text-xs text-muted-foreground">Los recibos de ingresos comenzarán desde este número</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-start">Recibos de Pagos - Número Inicial</Label>
              <Input 
                id="payment-start" 
                type="number" 
                min="1"
                value={formData.paymentReceiptStartNumber} 
                onChange={(e) => handleChange("paymentReceiptStartNumber", parseInt(e.target.value) || 1)} 
                disabled={hasSupplierPayments}
                className={hasSupplierPayments ? "bg-muted cursor-not-allowed" : ""}
                data-testid="input-payment-start-number"
              />
              {hasSupplierPayments ? (
                <p className="text-xs text-amber-600">No se puede cambiar porque ya existen pagos en el sistema</p>
              ) : (
                <p className="text-xs text-muted-foreground">Los recibos de pagos comenzarán desde este número</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/50">
          <Button onClick={handleSave} disabled={saveMutation.isPending || !hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
          {!hasChanges && (
            <span className="text-sm text-muted-foreground ml-3">No hay cambios pendientes</span>
          )}
        </CardFooter>
      </Card>
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

function NCFSettings() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();

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

  const defaultExpirationDate = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0];
  const [createDateDisplay, setCreateDateDisplay] = useState(toDisplayDate(defaultExpirationDate));
  const [editDateDisplay, setEditDateDisplay] = useState("");
  
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["ncfSequences"],
    queryFn: async () => {
      const response = await fetch("/api/ncf-sequences");
      if (!response.ok) throw new Error("Failed to fetch NCF sequences");
      return response.json();
    },
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    type: "Factura de Crédito",
    prefix: "B01",
    label: "",
    currentNumber: 1,
    startNumber: 1,
    endNumber: 99999999,
    expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
    status: "active"
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ncf-sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create NCF sequence");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ncfSequences"] });
      setShowCreateDialog(false);
      setCreateFormData({
        type: "Factura de Crédito",
        prefix: "B01",
        label: "",
        currentNumber: 1,
        startNumber: 1,
        endNumber: 99999999,
        expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
        status: "active"
      });
      showSuccess("Secuencia creada", "La secuencia NCF ha sido creada exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo crear la secuencia. Intente nuevamente.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/ncf-sequences/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update NCF sequence");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ncfSequences"] });
      setShowEditDialog(false);
      setEditingId(null);
      showSuccess("Secuencia actualizada", "La secuencia ha sido actualizada exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo actualizar la secuencia. Intente nuevamente.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/ncf-sequences/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete NCF sequence");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ncfSequences"] });
      showSuccess("Secuencia eliminada", "La secuencia NCF ha sido eliminada.");
    },
    onError: () => {
      showError("Error", "No se pudo eliminar la secuencia.");
    },
  });

  const handleEdit = (seq: any) => {
    setEditingId(seq.id);
    setEditFormData({
      prefix: seq.prefix,
      currentNumber: seq.currentNumber,
      startNumber: seq.startNumber,
      endNumber: seq.endNumber,
      expirationDate: seq.expirationDate,
      status: seq.status,
      label: seq.label || "",
    });
    setEditDateDisplay(toDisplayDate(seq.expirationDate || ""));
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editFormData) {
      updateMutation.mutate(editFormData);
    }
  };

  const handleCreate = () => {
    createMutation.mutate(createFormData);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Está seguro de eliminar esta secuencia NCF?")) {
      deleteMutation.mutate(id);
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Secuencias NCF</CardTitle>
              <CardDescription>Gestiona los rangos y vencimientos de tus comprobantes fiscales autorizados por DGII.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-new-ncf-sequence">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Secuencia
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground">Cargando secuencias...</div>
          ) : sequences.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No hay secuencias NCF configuradas.</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Secuencia
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Comprobante</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Secuencia Actual</TableHead>
                  <TableHead>Límite</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((seq: any) => (
                  <TableRow key={seq.id}>
                    <TableCell className="font-medium">{seq.type}</TableCell>
                    <TableCell>{seq.prefix}</TableCell>
                    <TableCell>{seq.currentNumber.toString().padStart(8, '0')}</TableCell>
                    <TableCell>{seq.endNumber.toString().padStart(8, '0')}</TableCell>
                    <TableCell>{seq.expirationDate}</TableCell>
                    <TableCell>
                      <Badge variant={seq.status === 'active' ? 'default' : 'secondary'} className={seq.status === 'active' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none" : ""}>
                        {seq.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(seq)} data-testid={`button-edit-ncf-sequence-${seq.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(seq.id)} data-testid={`button-delete-ncf-sequence-${seq.id}`}>
                          <Trash2 className="h-4 w-4" />
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

      {/* Create Dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nueva Secuencia NCF</AlertDialogTitle>
            <AlertDialogDescription>
              Ingrese los datos de la secuencia NCF autorizada por DGII.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del Comprobante</label>
              <Input 
                type="text" 
                placeholder="Ej: Factura de Crédito"
                value={createFormData.type}
                onChange={(e) => setCreateFormData({...createFormData, type: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prefijo</label>
              <Input 
                type="text" 
                placeholder="Ej: B01"
                value={createFormData.prefix}
                onChange={(e) => setCreateFormData({...createFormData, prefix: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Etiqueta en Factura</label>
              <Input 
                type="text" 
                placeholder="Ej: Consumidor Final"
                value={createFormData.label}
                onChange={(e) => setCreateFormData({...createFormData, label: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Número de Comprobante</label>
              <div className="p-3 bg-muted rounded-md border text-sm font-mono">
                {createFormData.prefix}{createFormData.currentNumber.toString().padStart(8, '0')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Número Inicial</label>
                <Input 
                  type="number" 
                  value={createFormData.startNumber}
                  onChange={(e) => setCreateFormData({
                    ...createFormData, 
                    startNumber: parseInt(e.target.value) || 1,
                    currentNumber: parseInt(e.target.value) || 1
                  })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Número Final</label>
                <Input 
                  type="number" 
                  value={createFormData.endNumber}
                  onChange={(e) => setCreateFormData({...createFormData, endNumber: parseInt(e.target.value) || 99999999})}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha de Vencimiento</label>
              <div className="flex items-center">
                <Input 
                  type="text" 
                  value={createDateDisplay}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    setCreateDateDisplay(formatted);
                    const iso = toISODate(formatted);
                    if (iso) setCreateFormData({...createFormData, expirationDate: iso});
                  }}
                  placeholder="dd/mm/yyyy"
                  className="flex-1 rounded-r-none border-r-0"
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
                      selected={createFormData.expirationDate ? new Date(createFormData.expirationDate + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const localDate = getLocalDateString(date);
                          setCreateFormData({...createFormData, expirationDate: localDate});
                          setCreateDateDisplay(toDisplayDate(localDate));
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear Secuencia"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Secuencia NCF</AlertDialogTitle>
          </AlertDialogHeader>
          {editFormData && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="text-sm font-medium">Número de Comprobante Actual</label>
                <div className="p-3 bg-muted rounded-md border text-sm font-mono">
                  {editFormData.prefix}{editFormData.currentNumber.toString().padStart(8, '0')}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Número Inicial</label>
                <Input 
                  type="number" 
                  value={editFormData.startNumber}
                  onChange={(e) => setEditFormData({...editFormData, startNumber: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Número Final</label>
                <Input 
                  type="number" 
                  value={editFormData.endNumber}
                  onChange={(e) => setEditFormData({...editFormData, endNumber: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de Vencimiento</label>
                <div className="flex items-center">
                  <Input 
                    type="text" 
                    value={editDateDisplay}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setEditDateDisplay(formatted);
                      const iso = toISODate(formatted);
                      if (iso) setEditFormData({...editFormData, expirationDate: iso});
                    }}
                    placeholder="dd/mm/yyyy"
                    className="flex-1 rounded-r-none border-r-0"
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
                        selected={editFormData.expirationDate ? new Date(editFormData.expirationDate + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const localDate = getLocalDateString(date);
                            setEditFormData({...editFormData, expirationDate: localDate});
                            setEditDateDisplay(toDisplayDate(localDate));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Etiqueta en Factura</label>
                <Input 
                  type="text" 
                  placeholder="Ej: NCF, Comprobante Fiscal"
                  value={editFormData.label || ""}
                  onChange={(e) => setEditFormData({...editFormData, label: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">Texto que aparece junto al número en la factura impresa</p>
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={editFormData.status} onValueChange={(value) => setEditFormData({...editFormData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TaxSettings() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  
  const defaultFormData = {
    id: 0,
    name: "ITBIS",
    rate: "18.00" as any,
    isInclusive: false,
    currency: "DOP",
    retentionItbis: "30.00" as any,
    retentionIsr: "10.00" as any,
    retentionItbisEnabled: false,
    retentionIsrEnabled: false,
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [isLoading, setIsLoading] = useState(true);

  const { data: taxSettings } = useQuery({
    queryKey: ["taxSettings"],
    queryFn: async () => {
      const response = await fetch("/api/tax-settings");
      if (!response.ok) throw new Error("Failed to fetch tax settings");
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/tax-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save tax settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxSettings"] });
      showSuccess("Configuración guardada", "Los cambios han sido guardados exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo guardar la configuración. Intente nuevamente.");
    },
  });

  useEffect(() => {
    if (taxSettings) {
      setFormData(taxSettings);
    }
    setIsLoading(false);
  }, [taxSettings]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate({
      name: formData.name,
      rate: String(formData.rate),
      isInclusive: formData.isInclusive,
      currency: formData.currency,
      retentionItbis: String(formData.retentionItbis),
      retentionIsr: String(formData.retentionIsr),
      retentionItbisEnabled: formData.retentionItbisEnabled,
      retentionIsrEnabled: formData.retentionIsrEnabled,
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Impuestos y Moneda</CardTitle>
          <CardDescription>Configuración regional y fiscal del sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tax-name">Nombre del Impuesto</Label>
              <Input 
                id="tax-name" 
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tasa (%)</Label>
              <Input 
                id="tax-rate" 
                type="number" 
                step="0.01"
                value={formData.rate}
                onChange={(e) => handleChange("rate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda Base</Label>
              <Select value={formData.currency} onValueChange={(value) => handleChange("currency", value)}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOP">Peso Dominicano (DOP)</SelectItem>
                  <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-medium">Aplicación del Impuesto</h3>
            <div className="space-y-2">
              <Label htmlFor="tax-type">Tipo de Aplicación</Label>
              <Select 
                value={formData.isInclusive ? "inclusive" : "exclusive"}
                onValueChange={(value) => handleChange("isInclusive", value === "inclusive")}
              >
                <SelectTrigger id="tax-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Exclusivo (se suma al precio)</SelectItem>
                  <SelectItem value="inclusive">Inclusivo (incluido en el precio)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground bg-white rounded p-2 border">
                {formData.isInclusive 
                  ? "El precio mostrado YA INCLUYE el impuesto"
                  : "El impuesto se SUMA al precio mostrado"
                }
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/50">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </CardFooter>
      </Card>
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

interface UserData {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  contador: "Contador",
};

function UserSettings() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "vendedor",
    status: "active",
  });

  const { data: users = [], isLoading } = useQuery<UserData[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDialogOpen(false);
      resetForm();
      showSuccess("Usuario creado", "El usuario ha sido creado exitosamente.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      resetForm();
      showSuccess("Usuario actualizado", "El usuario ha sido actualizado.");
    },
    onError: () => {
      showError("Error", "No se pudo actualizar el usuario.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("Usuario eliminado", "El usuario ha sido eliminado.");
    },
    onError: () => {
      showError("Error", "No se pudo eliminar el usuario.");
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      name: "",
      email: "",
      role: "vendedor",
      status: "active",
    });
  };

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      name: user.name,
      email: user.email || "",
      role: user.role,
      status: user.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingUser) {
      const updateData: Partial<typeof formData> = { ...formData };
      if (!updateData.password) delete updateData.password;
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleOpenDialog = () => {
    setEditingUser(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuarios y Permisos</CardTitle>
              <CardDescription>Gestiona quién tiene acceso al sistema y sus roles.</CardDescription>
            </div>
            <Button size="sm" onClick={handleOpenDialog} data-testid="button-add-user">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando usuarios...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <span className="text-sm text-muted-foreground">
                          {user.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(user.id)}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Modifica los datos del usuario." : "Crea un nuevo usuario para el sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="usuario123"
                disabled={!!editingUser}
                data-testid="input-user-username"
              />
            </div>
            <div className="space-y-2">
              <Label>Contraseña {editingUser && "(dejar vacío para no cambiar)"}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? "••••••••" : "Ingresa la contraseña"}
                data-testid="input-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
                data-testid="input-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Correo Electrónico</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@empresa.com"
                data-testid="input-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="contador">Contador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger data-testid="select-user-status">
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-user"
            >
              {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MessagePopup
        open={message.open}
        onClose={closeMessage}
        title={message.title}
        description={message.description}
        type={message.type}
      />
    </>
  );
}

function InvoiceDesignSettingsForm() {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  
  const defaultFormData = {
    id: 1,
    paperSize: "letter",
    logoSize: "medium",
    primaryColor: "#111826",
    fontFamily: "Inter",
    headerText: "FACTURA",
    footerText: "Gracias por su preferencia",
    showNotes: true,
    showSignature: true,
    showPaymentMethod: true,
    showDueDate: true,
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [isLoading, setIsLoading] = useState(true);

  const { data: designSettings } = useQuery({
    queryKey: ["invoiceDesignSettings"],
    queryFn: async () => {
      const response = await fetch("/api/invoice-design-settings");
      if (!response.ok) throw new Error("Failed to fetch invoice design settings");
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/invoice-design-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save invoice design settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoiceDesignSettings"] });
      showSuccess("✓ Diseño guardado", "Los cambios se han guardado exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo guardar la configuración. Intente nuevamente.");
    },
  });

  useEffect(() => {
    if (designSettings) {
      setFormData(prev => ({ ...prev, ...designSettings }));
    }
    setIsLoading(false);
  }, [designSettings]);

  const handleChange = (field: string, value: string | boolean | number) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    // Auto-save cuando cambias los valores
    setTimeout(() => {
      if (newData.paperSize && newData.logoSize && newData.fontFamily) {
        saveMutation.mutate(newData);
      }
    }, 300);
  };

  const handleSave = () => {
    if (!formData.paperSize || !formData.logoSize || !formData.fontFamily) {
      showError("Error", "Completa todos los campos requeridos");
      return;
    }
    saveMutation.mutate(formData);
  };

  const paperSizes = [
    { value: "letter", label: "📄 Carta (8.5\" x 11\")" },
  ];

  const logoSizes = [
    { value: "small", label: "🔍 Pequeño (32px)" },
    { value: "medium", label: "🔍 Mediano (48px)" },
    { value: "large", label: "🔍 Grande (64px)" },
  ];

  const fontFamilies = [
    { value: "Inter", label: "Inter (Moderno, recomendado)" },
    { value: "Georgia", label: "Georgia (Clásico)" },
    { value: "Arial", label: "Arial (Simple)" },
    { value: "Courier New", label: "Courier New (Monoespaciada)" },
  ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Diseño de Factura
          </CardTitle>
          <CardDescription>Personaliza cómo se ven tus facturas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando configuración...</div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Tamaño de Papel</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {paperSizes.map(size => (
                      <button
                        key={size.value}
                        onClick={() => handleChange("paperSize", size.value)}
                        className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                          formData.paperSize === size.value 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                        }`}
                        data-testid={`button-paper-${size.value}`}
                      >
                        {size.label.split('(')[0].trim()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Define el tamaño del papel para tus facturas</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Tamaño del Logo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {logoSizes.map(size => (
                      <button
                        key={size.value}
                        onClick={() => handleChange("logoSize", size.value)}
                        className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                          formData.logoSize === size.value 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                        }`}
                        data-testid={`button-logo-${size.value}`}
                      >
                        {size.label.split('🔍')[1]?.trim() || size.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Altura del logo en la factura</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Tipografía</Label>
                  <div className="grid gap-2">
                    {fontFamilies.map(font => (
                      <button
                        key={font.value}
                        onClick={() => handleChange("fontFamily", font.value)}
                        className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors text-left ${
                          formData.fontFamily === font.value 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                        }`}
                        data-testid={`button-font-${font.value}`}
                        style={formData.fontFamily !== font.value ? { fontFamily: font.value } : {}}
                      >
                        <span style={formData.fontFamily !== font.value ? {} : { fontFamily: font.value }} className="font-semibold">
                          {font.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Fuente para el texto de la factura</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-color">Color Principal</Label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      id="primary-color"
                      type="color" 
                      value={formData.primaryColor || "#111826"} 
                      onChange={(e) => handleChange("primaryColor", e.target.value)}
                      className="w-14 h-10 p-1 cursor-pointer"
                      data-testid="input-primary-color"
                    />
                    <Input 
                      value={formData.primaryColor || "#111826"} 
                      onChange={(e) => handleChange("primaryColor", e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="#111826"
                      data-testid="input-primary-color-hex"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Color usado en títulos y elementos destacados</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="header-text">Título de Factura</Label>
                  <Input 
                    id="header-text"
                    value={formData.headerText || "FACTURA"} 
                    onChange={(e) => handleChange("headerText", e.target.value)}
                    placeholder="FACTURA, Recibo, Invoice..."
                    data-testid="input-header-text"
                  />
                  <p className="text-xs text-muted-foreground">Texto que aparece como título principal</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer-text">Pie de Página</Label>
                  <Input 
                    id="footer-text"
                    value={formData.footerText || ""} 
                    onChange={(e) => handleChange("footerText", e.target.value)}
                    placeholder="Gracias por su preferencia..."
                    data-testid="input-footer-text"
                  />
                  <p className="text-xs text-muted-foreground">Mensaje al pie de la factura</p>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-medium">Secciones Visibles</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Mostrar Notas</Label>
                  <p className="text-sm text-muted-foreground">Muestra las notas en la factura</p>
                </div>
                <Switch 
                  checked={formData.showNotes} 
                  onCheckedChange={(v) => handleChange("showNotes", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Mostrar Firma</Label>
                  <p className="text-sm text-muted-foreground">Área para firma autorizada</p>
                </div>
                <Switch 
                  checked={formData.showSignature} 
                  onCheckedChange={(v) => handleChange("showSignature", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Mostrar Método de Pago</Label>
                  <p className="text-sm text-muted-foreground">Muestra el método de pago seleccionado</p>
                </div>
                <Switch 
                  checked={formData.showPaymentMethod} 
                  onCheckedChange={(v) => handleChange("showPaymentMethod", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Mostrar Fecha de Vencimiento</Label>
                  <p className="text-sm text-muted-foreground">Muestra la fecha de vencimiento</p>
                </div>
                <Switch 
                  checked={formData.showDueDate} 
                  onCheckedChange={(v) => handleChange("showDueDate", v)}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/50">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Guardando..." : "Guardar Diseño"}
          </Button>
        </CardFooter>
      </Card>
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
