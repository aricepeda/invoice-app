import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer, InsertCustomer } from "@shared/schema";

const customerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  rnc: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

async function createCustomer(data: InsertCustomer): Promise<Customer> {
  const response = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create customer");
  return response.json();
}

async function updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
  const response = await fetch(`/api/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update customer");
  return response.json();
}

interface NewCustomerSheetProps {
  customer?: Customer;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewCustomerSheet({ 
  customer, 
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: NewCustomerSheetProps) {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showSuccess("Cliente creado", "El cliente ha sido registrado exitosamente.");
      if (setOpen) setOpen(false);
      form.reset();
    },
    onError: () => {
      showError("Error", "No se pudo crear el cliente. Intente nuevamente.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCustomer> }) =>
      updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showSuccess("Cliente actualizado", "Los cambios han sido guardados exitosamente.");
      if (setOpen) setOpen(false);
    },
    onError: () => {
      showError("Error", "No se pudo actualizar el cliente. Intente nuevamente.");
    },
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name || "",
      rnc: customer?.rnc || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
      status: (customer?.status as "active" | "inactive" | undefined) || "active",
    },
  });

  // Update form values when customer prop changes or sheet opens
  useEffect(() => {
    if (open && customer) {
      form.reset({
        name: customer.name || "",
        rnc: customer.rnc || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        status: (customer.status as "active" | "inactive" | undefined) || "active",
      });
    } else if (open && !customer) {
      form.reset({
        name: "",
        rnc: "",
        phone: "",
        email: "",
        address: "",
        status: "active",
      });
    }
  }, [open, customer, form]);

  function onSubmit(data: CustomerFormValues) {
    if (customer?.id) {
      updateMutation.mutate({ id: customer.id, data });
    } else {
      createMutation.mutate({ ...data, status: "active" } as InsertCustomer);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{customer ? "Editar Cliente" : "Nuevo Cliente"}</SheetTitle>
          <SheetDescription>
            {customer 
              ? "Actualice los datos del cliente." 
              : "Complete los datos del cliente para registrarlo en el sistema."}
          </SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre / Razón Social <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rnc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RNC / Cédula <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="min-h-[100px] resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen && setOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
                disabled={!form.formState.isValid || createMutation.isPending || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {customer ? "Actualizar Cliente" : "Guardar Cliente"}
              </Button>
            </SheetFooter>
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
