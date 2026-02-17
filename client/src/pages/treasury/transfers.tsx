import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getLocalDateString } from "@/lib/utils";
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
import { ArrowLeft, Plus, ArrowRightLeft, Landmark, CreditCard, Wallet, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useLocation } from "wouter";
import type { PaymentAccount, AccountTransaction } from "@shared/schema";

const accountTypeIcons: Record<string, React.ReactNode> = {
  banco: <Landmark className="h-4 w-4" />,
  tarjeta_credito: <CreditCard className="h-4 w-4" />,
  caja_chica: <Wallet className="h-4 w-4" />,
};

const initialFormData = {
  fromAccountId: "",
  toAccountId: "",
  amount: "",
  date: getLocalDateString(),
  description: "",
  notes: "",
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

export default function Transfers() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [dateDisplay, setDateDisplay] = useState(toDisplayDate(initialFormData.date));

  const { data: accounts = [] } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/payment-accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json() as Promise<PaymentAccount[]>;
    },
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["account-transactions"],
    queryFn: async () => {
      const response = await fetch("/api/account-transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json() as Promise<AccountTransaction[]>;
    },
  });

  const transferTransactions = transactions.filter(
    (t) => t.type === "transferencia_salida" || t.type === "transferencia_entrada"
  );

  const uniqueTransfers = transferTransactions
    .filter((t) => t.type === "transferencia_salida")
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          fromAccountId: parseInt(data.fromAccountId),
          toAccountId: parseInt(data.toAccountId),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transfer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setDateDisplay(toDisplayDate(initialFormData.date));
      showSuccess("Transferencia realizada", "La transferencia se ha completado exitosamente.");
    },
    onError: (error: Error) => {
      showError("No se pudo completar la transferencia", error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromAccountId || !formData.toAccountId) {
      showError("Datos incompletos", "Selecciona las cuentas de origen y destino.");
      return;
    }
    if (formData.fromAccountId === formData.toAccountId) {
      showError("Cuentas iguales", "Las cuentas de origen y destino deben ser diferentes.");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError("Monto inválido", "El monto debe ser mayor a cero.");
      return;
    }

    const fromAccount = accounts.find(a => a.id === parseInt(formData.fromAccountId));
    createMutation.mutate(formData);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getAccountName = (accountId: number | null) => {
    if (!accountId) return "-";
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || "-";
  };

  const activeAccounts = accounts.filter((a) => a.status === "active" && a.type !== "banco");

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/treasury/accounts")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight">Transferencias</h2>
            <p className="text-muted-foreground">
              Mueve fondos entre tus cuentas bancarias y cajas
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-transfer">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Transferencia
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transferido (Mes)</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-monthly-transfers">
                {formatCurrency(
                  uniqueTransfers
                    .filter((t) => {
                      const date = new Date(t.date + 'T00:00:00');
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    })
                    .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transferencias del Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-transfer-count">
                {uniqueTransfers.filter((t) => {
                  const date = new Date(t.date + 'T00:00:00');
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cuenta Origen</TableHead>
                <TableHead></TableHead>
                <TableHead>Cuenta Destino</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Cargando transferencias...
                  </TableCell>
                </TableRow>
              ) : uniqueTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay transferencias registradas
                  </TableCell>
                </TableRow>
              ) : (
                uniqueTransfers.map((transfer) => (
                  <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                    <TableCell>{formatDate(transfer.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {accountTypeIcons[accounts.find(a => a.id === transfer.paymentAccountId)?.type || "banco"]}
                        {getAccountName(transfer.paymentAccountId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {accountTypeIcons[accounts.find(a => a.id === transfer.relatedAccountId)?.type || "banco"]}
                        {getAccountName(transfer.relatedAccountId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transfer.amount)}
                    </TableCell>
                    <TableCell>
                      <div>{transfer.description}</div>
                      {transfer.notes && (
                        <div className="text-sm text-muted-foreground">{transfer.notes}</div>
                      )}
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
            <DialogTitle>Nueva Transferencia</DialogTitle>
            <DialogDescription>
              Transfiere fondos de una cuenta a otra.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fromAccount">Cuenta Origen *</Label>
                <Select
                  value={formData.fromAccountId}
                  onValueChange={(value) => setFormData({ ...formData, fromAccountId: value })}
                >
                  <SelectTrigger id="fromAccount" data-testid="select-from-account">
                    <SelectValue placeholder="Seleccionar cuenta origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        <span className="flex items-center gap-2">
                          {accountTypeIcons[account.type]}
                          {account.name} ({formatCurrency(account.currentBalance)})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="toAccount">Cuenta Destino *</Label>
                <Select
                  value={formData.toAccountId}
                  onValueChange={(value) => setFormData({ ...formData, toAccountId: value })}
                >
                  <SelectTrigger id="toAccount" data-testid="select-to-account">
                    <SelectValue placeholder="Seleccionar cuenta destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts
                      .filter((a) => String(a.id) !== formData.fromAccountId)
                      .map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          <span className="flex items-center gap-2">
                            {accountTypeIcons[account.type]}
                            {account.name} ({formatCurrency(account.currentBalance)})
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-transfer-amount"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Fecha *</Label>
                  <div className="flex items-center">
                    <Input
                      id="date"
                      type="text"
                      value={dateDisplay}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value);
                        setDateDisplay(formatted);
                        const iso = toISODate(formatted);
                        if (iso) setFormData({ ...formData, date: iso });
                      }}
                      placeholder="dd/mm/yyyy"
                      className="flex-1 rounded-r-none border-r-0"
                      data-testid="input-transfer-date"
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
                          selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const localDate = getLocalDateString(date);
                              setFormData({ ...formData, date: localDate });
                              setDateDisplay(toDisplayDate(localDate));
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la transferencia"
                  data-testid="input-transfer-description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                  data-testid="input-transfer-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-save-transfer"
              >
                Realizar Transferencia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
