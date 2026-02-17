import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Save, Upload, X } from "lucide-react";
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
import type { Product, InsertProduct } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  price: z.number().min(0, "El precio debe ser mayor a 0"),
  image: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

async function createProduct(data: InsertProduct): Promise<Product> {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create product");
  return response.json();
}

async function updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product> {
  const response = await fetch(`/api/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update product");
  return response.json();
}

interface NewProductSheetProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onProductCreated?: (product: Product) => void;
  productId?: number;
  product?: Product;
}

export function NewProductSheet({ 
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onProductCreated,
  productId,
  product
}: NewProductSheetProps) {
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;
  const isEditMode = !!productId;

  const createMutation = useMutation({
    mutationFn: (data: InsertProduct) => isEditMode ? updateProduct(productId!, data) : createProduct(data),
    onSuccess: (resultProduct) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      // Only show success dialog for creation, not for updates
      if (!isEditMode) {
        setShowSuccessDialog(true);
      }
      if (onProductCreated) {
        onProductCreated(resultProduct);
      }
      if (setOpen) setOpen(false);
      form.reset();
    },
    onError: () => {
      showError("Error", `No se pudo ${isEditMode ? 'actualizar' : 'crear'} el producto. Intente nuevamente.`);
    },
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      price: 0,
      image: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && product) {
        form.reset({
          name: product.name,
          price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
          image: product.description || "",
          status: (product.status as "active" | "inactive") || "active",
        });
        setImagePreview("");
      } else {
        form.reset({
          name: "",
          price: 0,
          image: "",
          status: "active",
        });
        setImagePreview("");
      }
    }
  }, [open, form, isEditMode, product]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        form.setValue("image", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(data: ProductFormValues) {
    const submitData: Partial<InsertProduct> = { 
      ...data, 
      status: "active",
      price: data.price.toString(),
    };
    
    if (!isEditMode) {
      submitData.code = ""; // Generate code on server for new products
    }
    
    createMutation.mutate(submitData as InsertProduct);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Actualice los datos del producto." : "Complete los datos del producto para registrarlo en el sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
              <FormField
                control={form.control}
                name="image"
                render={() => (
                  <FormItem>
                    <FormLabel>Imagen del Producto</FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-40 h-40 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden">
                          {imagePreview ? (
                            <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <Upload className="w-8 h-8 text-muted-foreground/50" />
                          )}
                        </div>
                        <label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button type="button" variant="outline" className="cursor-pointer" onClick={(e) => {
                            e.preventDefault();
                            (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                          }}>
                            Seleccionar Imagen
                          </Button>
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen && setOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={!form.formState.isValid || createMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? "Actualizar" : "Guardar"} Producto
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¡Producto creado exitosamente!</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center py-4">
            El producto ha sido registrado en el sistema.
          </p>
          <DialogFooter className="flex justify-center">
            <Button 
              onClick={() => setShowSuccessDialog(false)}
              className="bg-primary hover:bg-primary/90"
            >
              Entendido
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
