import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Seller, InsertSeller } from "@shared/schema";
import { useState, useEffect } from "react";

const sellerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  commissionRate: z.string().min(0, "La comisión debe ser mayor o igual a 0"),
  status: z.enum(["active", "inactive"]),
});

export type SellerFormValues = z.infer<typeof sellerSchema>;

interface NewSellerSheetProps {
  seller?: Seller;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function NewSellerSheet({ seller, open, onOpenChange, trigger }: NewSellerSheetProps) {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<SellerFormValues>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      commissionRate: "0",
      status: "active",
    },
  });

  // Update form when seller prop changes
  useEffect(() => {
    if (seller) {
      form.reset({
        name: seller.name,
        email: seller.email || "",
        phone: seller.phone || "",
        commissionRate: String(seller.commissionRate),
        status: seller.status as "active" | "inactive",
      });
    }
  }, [seller, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertSeller) => {
      const response = await fetch("/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create seller");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      showSuccess("Vendedor creado", "El vendedor ha sido agregado exitosamente.");
      form.reset();
      handleClose();
    },
    onError: () => {
      showError("Error", "No se pudo crear el vendedor.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertSeller> }) => {
      const response = await fetch(`/api/sellers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update seller");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      showSuccess("Vendedor actualizado", "Los cambios han sido guardados exitosamente.");
      handleClose();
    },
    onError: () => {
      showError("Error", "No se pudo actualizar el vendedor.");
    },
  });

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setIsOpen(false);
    }
  };

  const onSubmit = (data: SellerFormValues) => {
    const sellerData: InsertSeller = {
      ...data,
      email: data.email || null,
      phone: data.phone || null,
    };

    if (seller) {
      updateMutation.mutate({ id: seller.id, data: sellerData });
    } else {
      createMutation.mutate(sellerData);
    }
  };

  const sheetOpen = open !== undefined ? open : isOpen;
  const setSheetOpen = onOpenChange || setIsOpen;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button data-testid="button-new-seller">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Vendedor
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{seller ? "Editar Vendedor" : "Nuevo Vendedor"}</SheetTitle>
          <SheetDescription>
            {seller ? "Actualiza la información del vendedor." : "Agrega un nuevo vendedor a tu equipo."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} data-testid="input-seller-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="vendedor@ejemplo.com" {...field} data-testid="input-seller-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="809-555-1234" {...field} data-testid="input-seller-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comisión (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="5.00" 
                        {...field} 
                        data-testid="input-seller-commission"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-seller-status">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" data-testid="button-submit-seller">
                {seller ? "Actualizar" : "Crear"} Vendedor
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
      <MessagePopup
        open={message.open}
        onClose={closeMessage}
        title={message.title}
        description={message.description}
        type={message.type}
      />
    </Sheet>
  );
}
