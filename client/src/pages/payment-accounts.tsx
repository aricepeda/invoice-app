import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Landmark, CreditCard, Wallet, ArrowUpDown, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useLocation } from "wouter";
import type { PaymentAccount } from "@shared/schema";

const accountTypeLabels: Record<string, string> = {
  banco: "Banco",
  tarjeta_credito: "Tarjeta de Crédito",
  caja_chica: "Caja Chica",
};

const accountTypeIcons: Record<string, React.ReactNode> = {
  banco: <Landmark className="h-4 w-4" />,
  tarjeta_credito: <CreditCard className="h-4 w-4" />,
  caja_chica: <Wallet className="h-4 w-4" />,
};

// Bank logos mapping - using bank name to get color and text
const getBankLogo = (bankName: string | undefined | null, type: string, bankLogo?: string | null) => {
  // If custom logo image is provided, show it
  if (bankLogo) {
    return (
      <img
        src={bankLogo}
        alt={bankName || "bank"}
        className="w-12 h-12 rounded-lg object-cover object-center"
      />
    );
  }

  if (!bankName) {
    if (type === "caja_chica") {
      return (
        <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs text-center px-1">
          Caja
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
        {type === "tarjeta_credito" ? "CARD" : "BANK"}
      </div>
    );
  }

  const name = bankName.toLowerCase().trim();
  
  // Bank color mappings for Dominican banks
  if (name.includes("popular")) {
    return (
      <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        Popular
      </div>
    );
  }
  if (name.includes("bhd") || name.includes("león")) {
    return (
      <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        BHD
      </div>
    );
  }
  if (name.includes("banreservas") || name.includes("reservas")) {
    return (
      <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        BRes
      </div>
    );
  }
  if (name.includes("scotiabank")) {
    return (
      <div className="w-12 h-12 rounded-lg bg-red-900 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        Scotia
      </div>
    );
  }
  if (name.includes("caribe")) {
    return (
      <div className="w-12 h-12 rounded-lg bg-cyan-500 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        Caribe
      </div>
    );
  }
  if (name.includes("visa")) {
    return (
      <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        VISA
      </div>
    );
  }
  if (name.includes("mastercard") || name.includes("master")) {
    return (
      <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        MC
      </div>
    );
  }
  if (name.includes("amex") || name.includes("american")) {
    return (
      <div className="w-12 h-12 rounded-lg bg-green-700 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        AMEX
      </div>
    );
  }

  // Default based on type
  if (type === "tarjeta_credito") {
    return (
      <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center text-white font-bold text-xs text-center px-1">
        {bankName.substring(0, 3).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg bg-slate-500 flex items-center justify-center text-white font-bold text-xs text-center px-1">
      {bankName.substring(0, 3).toUpperCase()}
    </div>
  );
};

const initialFormData = {
  name: "",
  type: "caja_chica",
  bankName: "",
  accountNumber: "",
  initialBalance: "0",
  status: "active",
  notes: "",
  bankLogo: "" as string | null,
};

export default function PaymentAccounts() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/payment-accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json() as Promise<PaymentAccount[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      setIsDialogOpen(false);
      resetForm();
      showSuccess("Cuenta creada", "La cuenta ha sido creada exitosamente.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: number }) => {
      const response = await fetch(`/api/payment-accounts/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      setIsDialogOpen(false);
      resetForm();
      showSuccess("Cuenta actualizada", "La cuenta ha sido actualizada exitosamente.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/payment-accounts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error al eliminar cuenta" }));
        throw new Error(errorData.error || "Failed to delete account");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      showSuccess("Cuenta eliminada", "La cuenta ha sido eliminada.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingAccount(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData({ ...formData, bankLogo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (account: PaymentAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      bankName: account.bankName || "",
      accountNumber: account.accountNumber || "",
      initialBalance: String(account.initialBalance),
      status: account.status,
      notes: account.notes || "",
      bankLogo: account.bankLogo || null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Está seguro de que desea eliminar esta cuenta?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError("Error", "El nombre es requerido.");
      return;
    }
    if (editingAccount) {
      updateMutation.mutate({ ...formData, id: editingAccount.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(num);
  };

  const getAdjustedBalance = (account: PaymentAccount): number => {
    const balance = parseFloat(String(account.currentBalance));
    return account.type === "tarjeta_credito" ? -balance : balance;
  };

  const nonBankAccounts = accounts.filter(account => account.type !== "banco");

  const filteredAccounts = nonBankAccounts.filter(
    (account) =>
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.bankName && account.bankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (account.accountNumber && account.accountNumber.includes(searchTerm))
  );

  const totalBalance = nonBankAccounts.reduce(
    (sum, acc) => sum + getAdjustedBalance(acc),
    0
  );

  const totalByType = nonBankAccounts.reduce(
    (acc, account) => {
      const type = account.type;
      acc[type] = (acc[type] || 0) + getAdjustedBalance(account);
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Layout>
      <MessagePopup 
        open={message.open}
        type={message.type}
        title={message.title}
        description={message.description}
        onClose={closeMessage}
      />
      
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Cajas y Bancos</h2>
            <p className="text-muted-foreground">
              Administra tus cuentas bancarias, tarjetas de crédito y cajas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/treasury/transfers")} data-testid="button-transfers">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Transferencias
            </Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-new-account">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cuenta
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efectivo Disponible</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${(totalByType.caja_chica || 0) < 0 ? 'text-red-600' : (totalByType.caja_chica || 0) === 0 ? 'text-foreground' : 'text-green-600'}`} data-testid="text-cash-balance">
                {formatCurrency(totalByType.caja_chica || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deuda en Tarjetas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${(totalByType.tarjeta_credito || 0) < 0 ? 'text-red-600' : (totalByType.tarjeta_credito || 0) === 0 ? 'text-foreground' : 'text-green-600'}`} data-testid="text-card-balance">
                {formatCurrency(totalByType.tarjeta_credito || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${totalBalance < 0 ? 'text-red-600' : totalBalance === 0 ? 'text-foreground' : 'text-green-600'}`} data-testid="text-total-balance">
                {formatCurrency(totalBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar cuentas..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-accounts"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Logo</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>No. Cuenta</TableHead>
                <TableHead className="text-right">Balance Actual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Cargando cuentas...
                  </TableCell>
                </TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron cuentas
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow 
                    key={account.id} 
                    data-testid={`row-account-${account.id}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/treasury/accounts/${account.id}/transactions`)}
                  >
                    <TableCell className="py-3">
                      {getBankLogo(account.bankName, account.type, account.bankLogo)}
                    </TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {accountTypeIcons[account.type]}
                        {account.bankName || accountTypeLabels[account.type] || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{account.accountNumber || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getAdjustedBalance(account))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.status === "active" ? "default" : "secondary"}>
                        {account.status === "active" ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-account-${account.id}`}>
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => navigate(`/treasury/accounts/${account.id}/transactions`)}
                            data-testid={`button-view-transactions-${account.id}`}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Movimientos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(account)} data-testid={`button-edit-account-${account.id}`}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(account.id)} 
                            className="text-red-600"
                            data-testid={`button-delete-account-${account.id}`}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Editar Cuenta" : "Nueva Cuenta"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount ? "Modifica los datos de la cuenta." : "Completa los datos para crear una nueva cuenta."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bankLogo">Logo del Banco/Tarjeta</Label>
                <label
                  htmlFor="logoInput"
                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition flex flex-col items-center justify-center h-24"
                  data-testid="drop-zone-bank-logo"
                >
                  {formData.bankLogo ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={formData.bankLogo}
                        alt="logo preview"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <p className="text-xs text-gray-600">Click para cambiar</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-xs font-medium">Agregar logo</p>
                    </div>
                  )}
                  <input
                    id="logoInput"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="input-bank-logo"
                  />
                </label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Titulo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  data-testid="input-account-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo de Cuenta *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="type" data-testid="select-account-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caja_chica">Caja Chica / Efectivo</SelectItem>
                      <SelectItem value="tarjeta_credito">Tarjeta de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status" data-testid="select-account-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.type === "banco" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="bankName">Nombre del Banco</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Ej: Banco BHD León"
                      data-testid="input-bank-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accountNumber">Número de Cuenta</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="Ej: 123-456789-0"
                      data-testid="input-account-number"
                    />
                  </div>
                </>
              )}
              {formData.type === "tarjeta_credito" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="bankName">Banco Emisor</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Ej: Visa BHD"
                      data-testid="input-bank-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accountNumber">Últimos 4 dígitos</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="Ej: ****1234"
                      maxLength={8}
                      data-testid="input-account-number"
                    />
                  </div>
                </>
              )}
              {!editingAccount && (
                <div className="grid gap-2">
                  <Label htmlFor="initialBalance">Balance Inicial</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-initial-balance"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-account"
              >
                {editingAccount ? "Guardar Cambios" : "Crear Cuenta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
