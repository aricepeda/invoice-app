import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";

// Middleware to require specific roles
const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "No autenticado" });
    }
    if (!allowedRoles.includes(req.session.role || "")) {
      return res.status(403).json({ error: "No tienes permiso para realizar esta acción" });
    }
    next();
  };
};
import {
  insertUserSchema,
  insertCustomerSchema,
  insertCompanySettingsSchema,
  insertNcfSequenceSchema,
  insertProductSchema,
  insertInvoiceSchema,
  insertInvoiceClientSchema,
  insertInvoiceItemSchema,
  insertTaxSettingsSchema,
  insertSellerSchema,
  insertPaymentSchema,
  insertInvoiceDesignSettingsSchema,
  insertSupplierSchema,
  insertPurchaseInvoiceClientSchema,
  insertPurchaseInvoiceItemSchema,
  insertSupplierPaymentSchema,
  insertPaymentAccountSchema,
  insertAccountTransactionSchema,
  insertExpenseCategorySchema,
  insertExpenseSubcategorySchema,
  insertConduceClientSchema,
  insertConduceItemSchema,
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      }

      if (user.status !== 'active') {
        return res.status(401).json({ error: "Usuario inactivo" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      res.json({ 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    res.json({ 
      id: user.id, 
      username: user.username, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    });
  });

  // Users CRUD endpoints
  app.get("/api/users", async (_req, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", requireRole("admin", "contador"), async (req, res) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const existingUser = await storage.getUserByUsername(validation.data.username);
      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }

      const hashedPassword = await bcrypt.hash(validation.data.password, 10);
      const user = await storage.createUser({
        ...validation.data,
        password: hashedPassword
      });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updateData = { ...req.body };
      
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireRole("admin", "contador"), async (req, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Seed admin user endpoint (for initial setup)
  app.post("/api/users/seed-admin", async (_req, res) => {
    try {
      const existingAdmin = await storage.getUserByUsername("admin");
      if (existingAdmin) {
        return res.status(400).json({ error: "Admin user already exists" });
      }

      const hashedPassword = await bcrypt.hash("admin123", 10);
      const admin = await storage.createUser({
        username: "admin",
        password: hashedPassword,
        name: "Administrador",
        email: "admin@empresa.com",
        role: "admin",
        status: "active"
      });

      const { password, ...adminWithoutPassword } = admin;
      res.status(201).json(adminWithoutPassword);
    } catch (error) {
      console.error("Error seeding admin:", error);
      res.status(500).json({ error: "Failed to create admin user" });
    }
  });

  // Customers endpoints
  app.get("/api/customers", async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(parseInt(req.params.id));
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const validation = insertCustomerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const customer = await storage.createCustomer(validation.data);
      res.status(201).json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const validation = insertCustomerSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const customer = await storage.updateCustomer(parseInt(req.params.id), validation.data);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomer(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Customer pending invoices and balances
  app.get("/api/customers/:id/pending-invoices", async (req, res) => {
    try {
      const invoices = await storage.getCustomerPendingInvoices(parseInt(req.params.id));
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending invoices" });
    }
  });

  app.get("/api/customers/:id/balances", async (req, res) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const balances = await storage.getCustomerBalances(parseInt(req.params.id), date);
      res.json(balances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer balances" });
    }
  });

  // Bulk customer payment
  app.post("/api/customer-payments/bulk", async (req, res) => {
    try {
      const { customerId, amount, date, method, reference, notes, paymentAccountId, allocations } = req.body;
      
      if (!customerId || !amount || !date) {
        return res.status(400).json({ error: "Cliente, monto y fecha son requeridos" });
      }

      const result = await storage.createBulkCustomerPayment({
        customerId,
        amount,
        date,
        method: method || "efectivo",
        reference,
        notes,
        paymentAccountId: paymentAccountId || null,
        allocations: allocations || [],
      });

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Bulk customer payment error:", error);
      res.status(500).json({ error: "Failed to process bulk payment" });
    }
  });

  // Customer payments listing
  app.get("/api/customer-payments", async (_req, res) => {
    try {
      const allPayments = await storage.getAllPayments();
      res.json(allPayments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer payments" });
    }
  });

  app.delete("/api/customer-payments/by-number/:receiptNumber", async (req, res) => {
    try {
      const result = await storage.deletePaymentsByReceiptNumber(req.params.receiptNumber);
      if (result.deleted === 0) {
        return res.status(404).json({ error: "No se encontró el recibo de cobro" });
      }
      res.json({ 
        message: "Recibo anulado exitosamente",
        deleted: result.deleted,
        invoicesUpdated: result.invoicesUpdated
      });
    } catch (error) {
      res.status(500).json({ error: "Error al anular el recibo de cobro" });
    }
  });

  // Company Settings endpoints
  app.get("/api/company-settings", async (_req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company settings" });
    }
  });

  app.post("/api/company-settings", async (req, res) => {
    try {
      const validation = insertCompanySettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const result = await storage.createOrUpdateCompanySettings(validation.data);
      
      // Check if result is an error
      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to save company settings" });
    }
  });

  app.get("/api/company-settings/has-invoices", async (_req, res) => {
    try {
      const hasInvoices = await storage.hasInvoices();
      res.json({ hasInvoices });
    } catch (error) {
      res.status(500).json({ error: "Failed to check invoices" });
    }
  });

  app.get("/api/company-settings/has-supplier-payments", async (_req, res) => {
    try {
      const hasSupplierPayments = await storage.hasSupplierPayments();
      res.json({ hasSupplierPayments });
    } catch (error) {
      res.status(500).json({ error: "Failed to check supplier payments" });
    }
  });

  app.get("/api/company-settings/has-conduces", async (_req, res) => {
    try {
      const hasConduces = await storage.hasConduces();
      res.json({ hasConduces });
    } catch (error) {
      res.status(500).json({ error: "Failed to check conduces" });
    }
  });

  // NCF Sequences endpoints
  app.get("/api/ncf-sequences", async (_req, res) => {
    try {
      const sequences = await storage.getNcfSequences();
      res.json(sequences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch NCF sequences" });
    }
  });

  app.get("/api/ncf-sequences/:id", async (req, res) => {
    try {
      const sequence = await storage.getNcfSequence(parseInt(req.params.id));
      if (!sequence) {
        return res.status(404).json({ error: "NCF sequence not found" });
      }
      res.json(sequence);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch NCF sequence" });
    }
  });

  app.post("/api/ncf-sequences", async (req, res) => {
    try {
      const validation = insertNcfSequenceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const sequence = await storage.createNcfSequence(validation.data);
      res.status(201).json(sequence);
    } catch (error) {
      res.status(500).json({ error: "Failed to create NCF sequence" });
    }
  });

  app.patch("/api/ncf-sequences/:id", async (req, res) => {
    try {
      const validation = insertNcfSequenceSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const sequence = await storage.updateNcfSequence(parseInt(req.params.id), validation.data);
      if (!sequence) {
        return res.status(404).json({ error: "NCF sequence not found" });
      }
      res.json(sequence);
    } catch (error) {
      res.status(500).json({ error: "Failed to update NCF sequence" });
    }
  });

  app.delete("/api/ncf-sequences/:id", async (req, res) => {
    try {
      const success = await storage.deleteNcfSequence(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "NCF sequence not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete NCF sequence" });
    }
  });

  app.get("/api/ncf-sequences/preview/:type", async (req, res) => {
    try {
      const result = await storage.getPreviewNcf(req.params.type);
      if ('error' in result) {
        return res.status(404).json({ error: result.error });
      }
      res.json({ ncf: result.ncf });
    } catch (error) {
      res.status(500).json({ error: "Failed to get preview NCF" });
    }
  });

  app.get("/api/ncf-sequences/next/:type", async (req, res) => {
    try {
      const result = await storage.getNextNcf(req.params.type);
      if ('error' in result) {
        return res.status(404).json({ error: result.error });
      }
      res.json({ ncf: result.ncf });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next NCF" });
    }
  });

  // Products endpoints
  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validation = insertProductSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const result = await storage.createProduct(validation.data);
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json(result.product);
    } catch (error) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const validation = insertProductSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const product = await storage.updateProduct(parseInt(req.params.id), validation.data);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const result = await storage.deleteProduct(parseInt(req.params.id));
      if (!result.success) {
        return res.status(400).json({ error: result.error || "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Invoices endpoints
  app.get("/api/invoices", async (_req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.get("/api/next-invoice-number", async (_req, res) => {
    try {
      const nextNumber = await storage.getNextInvoiceNumber();
      res.json({ nextNumber });
    } catch (error) {
      console.error("Error fetching next invoice number:", error);
      res.status(500).json({ error: "Failed to fetch next invoice number", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const { items, customerRnc, ...invoiceData } = req.body;
      const validation = insertInvoiceClientSchema.safeParse(invoiceData);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      
      // Update customer RNC if provided and customer doesn't have one
      if (customerRnc && validation.data.customerId) {
        const customer = await storage.getCustomer(validation.data.customerId);
        if (customer && (!customer.rnc || customer.rnc.trim() === '')) {
          await storage.updateCustomer(validation.data.customerId, { rnc: customerRnc });
        }
      }
      
      // Generate full NCF only if a prefix type is provided (B01, B02, B14, B15)
      // If ncf is null/undefined, the invoice is created without NCF (consumidor sin comprobante)
      let ncfNumber: string | null = null;
      if (validation.data.ncf) {
        const ncfPrefix = validation.data.ncf; // B01, B02, B14, B15
        const result = await storage.getNextNcf(ncfPrefix);
        
        if ('error' in result) {
          return res.status(400).json({ error: result.error });
        }
        
        ncfNumber = result.ncf;
      }
      
      const invoice = await storage.createInvoice({
        ...validation.data,
        ncf: ncfNumber
      });
      
      // Create invoice items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createInvoiceItem({
            invoiceId: invoice.id,
            productId: item.productId || null,
            description: item.description || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: String((item.quantity * parseFloat(item.unitPrice)).toFixed(2))
          });
        }
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const { items, customerRnc, ...invoiceData } = req.body;
      const validation = insertInvoiceClientSchema.partial().safeParse(invoiceData);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      
      // Update customer RNC if provided and customer doesn't have one
      if (customerRnc && validation.data.customerId) {
        const customer = await storage.getCustomer(validation.data.customerId);
        if (customer && (!customer.rnc || customer.rnc.trim() === '')) {
          await storage.updateCustomer(validation.data.customerId, { rnc: customerRnc });
        }
      }
      
      const invoice = await storage.updateInvoice(parseInt(req.params.id), validation.data);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      // Delete existing items and create new ones
      if (items && Array.isArray(items)) {
        // Get existing items
        const existingItems = await storage.getInvoiceItems(invoice.id);
        
        // Delete all existing items
        for (const existingItem of existingItems) {
          await storage.deleteInvoiceItem(existingItem.id);
        }
        
        // Create new items
        for (const item of items) {
          await storage.createInvoiceItem({
            invoiceId: invoice.id,
            productId: item.productId || null,
            description: item.description || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: String((item.quantity * parseFloat(item.unitPrice)).toFixed(2))
          });
        }
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Failed to update invoice", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      // Special handling for cancellation
      if (req.body.status === "cancelled") {
        const result = await storage.cancelInvoice(parseInt(req.params.id));
        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }
        return res.json(result.invoice);
      }

      const validation = insertInvoiceSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const invoice = await storage.updateInvoice(parseInt(req.params.id), validation.data);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      // Set total to 0 when deleting
      const result = await storage.cancelInvoice(parseInt(req.params.id));
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result.invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Invoice Items endpoints
  app.get("/api/invoice-items", async (_req, res) => {
    try {
      const items = await storage.getAllInvoiceItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice items" });
    }
  });

  app.get("/api/invoices/:invoiceId/items", async (req, res) => {
    try {
      const items = await storage.getInvoiceItems(parseInt(req.params.invoiceId));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice items" });
    }
  });

  app.post("/api/invoices/:invoiceId/items", async (req, res) => {
    try {
      const validation = insertInvoiceItemSchema.safeParse({
        ...req.body,
        invoiceId: parseInt(req.params.invoiceId),
      });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const item = await storage.createInvoiceItem(validation.data);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create invoice item" });
    }
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    try {
      const success = await storage.deleteInvoiceItem(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Invoice item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice item" });
    }
  });

  // Tax Settings endpoints
  app.get("/api/tax-settings", async (_req, res) => {
    try {
      const settings = await storage.getTaxSettings();
      res.json(settings || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tax settings" });
    }
  });

  app.post("/api/tax-settings", async (req, res) => {
    try {
      const validation = insertTaxSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const settings = await storage.createOrUpdateTaxSettings(validation.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to save tax settings" });
    }
  });

  // Sellers endpoints
  app.get("/api/sellers", async (_req, res) => {
    try {
      const sellers = await storage.getSellers();
      res.json(sellers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sellers" });
    }
  });

  app.get("/api/sellers/:id", async (req, res) => {
    try {
      const seller = await storage.getSeller(parseInt(req.params.id));
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.json(seller);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch seller" });
    }
  });

  app.post("/api/sellers", async (req, res) => {
    try {
      const validation = insertSellerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const seller = await storage.createSeller(validation.data);
      res.status(201).json(seller);
    } catch (error) {
      res.status(500).json({ error: "Failed to create seller" });
    }
  });

  app.patch("/api/sellers/:id", async (req, res) => {
    try {
      const validation = insertSellerSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const seller = await storage.updateSeller(parseInt(req.params.id), validation.data);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.json(seller);
    } catch (error) {
      res.status(500).json({ error: "Failed to update seller" });
    }
  });

  app.delete("/api/sellers/:id", async (req, res) => {
    try {
      const success = await storage.deleteSeller(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete seller" });
    }
  });

  // Payments endpoints
  app.get("/api/payments", async (_req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/next-number", async (_req, res) => {
    try {
      const nextNumber = await storage.getNextReceiptNumber();
      res.json({ nextNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next receipt number" });
    }
  });

  app.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(parseInt(req.params.id));
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  app.get("/api/invoices/:invoiceId/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments(parseInt(req.params.invoiceId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/customers/:customerId/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByCustomer(parseInt(req.params.customerId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer payments" });
    }
  });

  app.get("/api/customers/:customerId/balance", async (req, res) => {
    try {
      const balance = await storage.getCustomerBalance(parseInt(req.params.customerId));
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer balance" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validation = insertPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const payment = await storage.createPayment(validation.data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.post("/api/invoices/:invoiceId/payments", async (req, res) => {
    try {
      const validation = insertPaymentSchema.safeParse({
        ...req.body,
        invoiceId: parseInt(req.params.invoiceId),
      });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const payment = await storage.createPayment(validation.data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      const success = await storage.deletePayment(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  app.get("/api/invoices/:invoiceId/balance", async (req, res) => {
    try {
      const balance = await storage.getInvoiceBalance(parseInt(req.params.invoiceId));
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  // ========== CUSTOMER ADVANCES (ANTICIPOS) ==========

  // Get all advances or filter by customer
  app.get("/api/advances", async (req, res) => {
    try {
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      const advances = await storage.getCustomerAdvances(customerId);
      res.json(advances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch advances" });
    }
  });

  // Get available advances for a customer (advances with remaining balance)
  app.get("/api/customers/:customerId/advances/available", async (req, res) => {
    try {
      const advances = await storage.getAvailableAdvances(parseInt(req.params.customerId));
      res.json(advances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch available advances" });
    }
  });

  // Create a new advance payment
  app.post("/api/advances", async (req, res) => {
    try {
      const validation = insertPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      
      if (!req.body.concept) {
        return res.status(400).json({ error: "El concepto es requerido para anticipos" });
      }

      const advance = await storage.createAdvance({
        ...validation.data,
        concept: req.body.concept,
      });

      // Create account transaction if paymentAccountId is provided
      if (validation.data.paymentAccountId) {
        const account = await storage.getPaymentAccount(validation.data.paymentAccountId);
        if (account) {
          const amount = parseFloat(String(validation.data.amount));
          const currentBalance = parseFloat(String(account.currentBalance));
          const newBalance = account.type === "tarjeta_credito"
            ? currentBalance - amount
            : currentBalance + amount;
          await storage.updatePaymentAccountBalance(validation.data.paymentAccountId, newBalance.toFixed(2));

          const customer = await storage.getCustomer(validation.data.customerId);
          await storage.createAccountTransaction({
            paymentAccountId: validation.data.paymentAccountId,
            type: 'entrada',
            amount: String(validation.data.amount),
            date: validation.data.date,
            description: `Anticipo: ${req.body.concept} - ${customer?.name || 'Cliente'}`,
            referenceType: 'customer_payment',
            referenceId: advance.id,
            receiptNumber: advance.receiptNumber,
          });
        }
      }

      res.status(201).json(advance);
    } catch (error) {
      console.error("Error creating advance:", error);
      res.status(500).json({ error: "Failed to create advance" });
    }
  });

  // Apply an advance to an invoice
  app.post("/api/advances/:advanceId/apply", async (req, res) => {
    try {
      const { invoiceId, amount, date, notes } = req.body;
      
      if (!invoiceId || !amount || !date) {
        return res.status(400).json({ error: "Se requiere invoiceId, amount y date" });
      }

      const result = await storage.applyAdvanceToInvoice(
        parseInt(req.params.advanceId),
        parseInt(invoiceId),
        amount,
        date,
        notes
      );

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Error applying advance:", error);
      res.status(500).json({ error: "Failed to apply advance to invoice" });
    }
  });

  // Update an advance
  app.put("/api/advances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const advance = await storage.getPayment(id);
      if (!advance) {
        return res.status(404).json({ error: "Anticipo no encontrado" });
      }

      const oldAmount = parseFloat(String(advance.amount));
      const newAmount = req.body.amount ? parseFloat(req.body.amount) : oldAmount;
      const amountChanged = Math.abs(oldAmount - newAmount) > 0.001;

      const result = await storage.updateAdvance(id, req.body);
      
      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      // Update account transaction if amount changed and there's a payment account
      if (amountChanged && advance.paymentAccountId) {
        const account = await storage.getPaymentAccount(advance.paymentAccountId);
        if (account) {
          const difference = newAmount - oldAmount;
          const currentBalance = parseFloat(String(account.currentBalance));
          const newBalance = account.type === "tarjeta_credito"
            ? currentBalance - difference
            : currentBalance + difference;
          await storage.updatePaymentAccountBalance(advance.paymentAccountId, newBalance.toFixed(2));

          // Update the account transaction
          const transactions = await storage.getAccountTransactions(advance.paymentAccountId);
          const transaction = transactions.find(t => t.receiptNumber === advance.receiptNumber);
          if (transaction) {
            await storage.createAccountTransaction({
              paymentAccountId: advance.paymentAccountId,
              type: difference > 0 ? 'entrada' : 'salida',
              amount: String(Math.abs(difference)),
              date: req.body.date || advance.date,
              description: `Ajuste anticipo: ${advance.receiptNumber}`,
              referenceType: 'customer_payment',
              referenceId: advance.id,
              receiptNumber: `ADJ-${advance.receiptNumber}`,
            });
          }
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating advance:", error);
      res.status(500).json({ error: "Failed to update advance" });
    }
  });

  // Delete an advance
  app.delete("/api/advances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const advance = await storage.getPayment(id);
      
      if (!advance) {
        return res.status(404).json({ error: "Anticipo no encontrado" });
      }

      // Revert account balance before deletion
      if (advance.paymentAccountId) {
        const account = await storage.getPaymentAccount(advance.paymentAccountId);
        if (account) {
          const amount = parseFloat(String(advance.amount));
          const currentBalance = parseFloat(String(account.currentBalance));
          const newBalance = account.type === "tarjeta_credito"
            ? currentBalance + amount
            : currentBalance - amount;
          await storage.updatePaymentAccountBalance(advance.paymentAccountId, newBalance.toFixed(2));
        }
      }

      const result = await storage.deleteAdvance(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ message: "Anticipo eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting advance:", error);
      res.status(500).json({ error: "Failed to delete advance" });
    }
  });

  // Get applications of a specific advance
  app.get("/api/advances/:advanceId/applications", async (req, res) => {
    try {
      const applications = await storage.getAdvanceApplications(parseInt(req.params.advanceId));
      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch advance applications" });
    }
  });

  // Get advances applied to an invoice
  app.get("/api/invoices/:invoiceId/advances", async (req, res) => {
    try {
      const applications = await storage.getInvoiceAdvanceApplications(parseInt(req.params.invoiceId));
      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice advances" });
    }
  });

  // Get total advance amount applied to an invoice
  app.get("/api/invoices/:invoiceId/advances/total", async (req, res) => {
    try {
      const total = await storage.getInvoiceAdvanceTotal(parseInt(req.params.invoiceId));
      res.json({ total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice advance total" });
    }
  });

  // Invoice Design Settings endpoints
  app.get("/api/invoice-design-settings", async (_req, res) => {
    try {
      const settings = await storage.getInvoiceDesignSettings();
      res.json(settings || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice design settings" });
    }
  });

  app.post("/api/invoice-design-settings", async (req, res) => {
    try {
      const validation = insertInvoiceDesignSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const settings = await storage.createOrUpdateInvoiceDesignSettings(validation.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to save invoice design settings" });
    }
  });

  // ========== ACCOUNTS PAYABLE (CUENTAS POR PAGAR) ==========

  // Suppliers endpoints
  app.get("/api/suppliers", async (_req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const supplier = await storage.getSupplier(parseInt(req.params.id));
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  app.get("/api/suppliers/:id/balance", async (req, res) => {
    try {
      const balance = await storage.getSupplierBalance(parseInt(req.params.id));
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier balance" });
    }
  });

  app.get("/api/suppliers/:id/balances", async (req, res) => {
    try {
      const asOfDate = req.query.date as string || new Date().toISOString().split('T')[0];
      const balances = await storage.getSupplierBalances(parseInt(req.params.id), asOfDate);
      res.json(balances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier balances" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const validation = insertSupplierSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const supplier = await storage.createSupplier(validation.data);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  app.patch("/api/suppliers/:id", async (req, res) => {
    try {
      const validation = insertSupplierSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const supplier = await storage.updateSupplier(parseInt(req.params.id), validation.data);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const result = await storage.deleteSupplier(parseInt(req.params.id));
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  // Purchase Invoices endpoints
  app.get("/api/purchase-invoices", async (_req, res) => {
    try {
      const invoices = await storage.getPurchaseInvoices();
      // Add balance to each invoice
      const invoicesWithBalance = await Promise.all(
        invoices.map(async (invoice) => {
          const balance = await storage.getPurchaseInvoiceBalance(invoice.id);
          return { ...invoice, balance };
        })
      );
      res.json(invoicesWithBalance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase invoices" });
    }
  });

  app.get("/api/purchase-invoices/next-number", async (_req, res) => {
    try {
      const nextNumber = await storage.getNextPurchaseInvoiceNumber();
      res.json({ nextNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next purchase invoice number" });
    }
  });

  app.get("/api/purchase-invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getPurchaseInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ error: "Purchase invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase invoice" });
    }
  });

  app.get("/api/purchase-invoices/:id/balance", async (req, res) => {
    try {
      const balance = await storage.getPurchaseInvoiceBalance(parseInt(req.params.id));
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase invoice balance" });
    }
  });

  app.post("/api/purchase-invoices", async (req, res) => {
    try {
      const validation = insertPurchaseInvoiceClientSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      
      const existingInvoice = await storage.getPurchaseInvoiceByNumber(
        validation.data.invoiceNumber,
        validation.data.supplierId
      );
      if (existingInvoice) {
        return res.status(400).json({ 
          error: `Ya existe una factura con el número "${validation.data.invoiceNumber}" para este suplidor.` 
        });
      }
      
      const invoice = await storage.createPurchaseInvoice(validation.data);
      console.log(`Purchase invoice created successfully: ID ${invoice.id}, Number ${invoice.invoiceNumber}`);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating purchase invoice:", error);
      res.status(500).json({ error: "Failed to create purchase invoice: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.patch("/api/purchase-invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.updatePurchaseInvoice(parseInt(req.params.id), req.body);
      if (!invoice) {
        return res.status(404).json({ error: "Purchase invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update purchase invoice" });
    }
  });

  app.delete("/api/purchase-invoices/:id", async (req, res) => {
    try {
      const success = await storage.deletePurchaseInvoice(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Purchase invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase invoice" });
    }
  });

  // Purchase Invoice Items endpoints
  app.get("/api/purchase-invoices/:id/items", async (req, res) => {
    try {
      const items = await storage.getPurchaseInvoiceItems(parseInt(req.params.id));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase invoice items" });
    }
  });

  app.post("/api/purchase-invoices/:id/items", async (req, res) => {
    try {
      const validation = insertPurchaseInvoiceItemSchema.safeParse({
        ...req.body,
        purchaseInvoiceId: parseInt(req.params.id),
      });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const item = await storage.createPurchaseInvoiceItem(validation.data);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create purchase invoice item" });
    }
  });

  app.get("/api/purchase-invoice-items", async (_req, res) => {
    try {
      const items = await storage.getAllPurchaseInvoiceItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase invoice items" });
    }
  });

  app.delete("/api/purchase-invoice-items/:id", async (req, res) => {
    try {
      const success = await storage.deletePurchaseInvoiceItem(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Purchase invoice item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase invoice item" });
    }
  });

  // Supplier Payments endpoints
  app.get("/api/supplier-payments", async (_req, res) => {
    try {
      const payments = await storage.getAllSupplierPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier payments" });
    }
  });

  app.get("/api/supplier-payments/next-number", async (_req, res) => {
    try {
      const nextNumber = await storage.getNextSupplierPaymentNumber();
      res.json({ nextNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next payment number" });
    }
  });

  app.get("/api/supplier-payments/:id", async (req, res) => {
    try {
      const payment = await storage.getSupplierPayment(parseInt(req.params.id));
      if (!payment) {
        return res.status(404).json({ error: "Supplier payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier payment" });
    }
  });

  app.get("/api/purchase-invoices/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getSupplierPayments(parseInt(req.params.id));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments for purchase invoice" });
    }
  });

  app.get("/api/suppliers/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getSupplierPaymentsBySupplier(parseInt(req.params.id));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier payments" });
    }
  });

  app.get("/api/suppliers/:id/pending-invoices", async (req, res) => {
    try {
      const invoices = await storage.getSupplierPendingInvoices(parseInt(req.params.id));
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending invoices" });
    }
  });

  app.post("/api/supplier-payments/bulk", async (req, res) => {
    try {
      const { supplierId, amount, date, method, reference, notes, paymentAccountId, allocations } = req.body;
      
      if (!supplierId || !amount || !date) {
        return res.status(400).json({ error: "Suplidor, monto y fecha son requeridos" });
      }

      const result = await storage.createBulkSupplierPayment({
        supplierId,
        amount,
        date,
        method: method || "transferencia",
        reference,
        notes,
        paymentAccountId: paymentAccountId || null,
        allocations: allocations || [],
      });

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Bulk payment error:", error);
      res.status(500).json({ error: "Failed to process bulk payment" });
    }
  });

  app.post("/api/supplier-payments", async (req, res) => {
    try {
      const validation = insertSupplierPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const payment = await storage.createSupplierPayment(validation.data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create supplier payment" });
    }
  });

  app.post("/api/purchase-invoices/:id/payments", async (req, res) => {
    try {
      const validation = insertSupplierPaymentSchema.safeParse({
        ...req.body,
        purchaseInvoiceId: parseInt(req.params.id),
      });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const payment = await storage.createSupplierPayment(validation.data);
      
      // Create account transaction if paymentAccountId is provided
      if (validation.data.paymentAccountId) {
        const account = await storage.getPaymentAccount(validation.data.paymentAccountId);
        if (account) {
          const amount = parseFloat(String(validation.data.amount));
          const currentBalance = parseFloat(String(account.currentBalance));
          // For credit cards: paying with card increases debt (add to balance)
          // For bank/cash: paying decreases balance (subtract from balance)
          const newBalance = account.type === "tarjeta_credito"
            ? currentBalance + amount
            : currentBalance - amount;
          await storage.updatePaymentAccountBalance(validation.data.paymentAccountId, newBalance.toFixed(2));
          
          const supplier = await storage.getSupplier(validation.data.supplierId);
          await storage.createAccountTransaction({
            paymentAccountId: validation.data.paymentAccountId,
            type: 'salida',
            amount: String(validation.data.amount),
            date: validation.data.date,
            description: `Pago a proveedor: ${supplier?.name || 'Desconocido'}`,
            referenceType: 'supplier_payment',
            referenceId: payment.id,
            notes: validation.data.notes || null,
          });
        }
      }
      
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create supplier payment" });
    }
  });

  app.delete("/api/supplier-payments/:id", async (req, res) => {
    try {
      const success = await storage.deleteSupplierPayment(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Supplier payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier payment" });
    }
  });

  app.delete("/api/supplier-payments/by-number/:paymentNumber", async (req, res) => {
    try {
      const result = await storage.deleteSupplierPaymentsByNumber(req.params.paymentNumber);
      if (result.deleted === 0) {
        return res.status(404).json({ error: "No se encontró el recibo de pago" });
      }
      res.json({ 
        message: "Recibo anulado exitosamente",
        deleted: result.deleted,
        invoicesUpdated: result.invoicesUpdated
      });
    } catch (error) {
      res.status(500).json({ error: "Error al anular el recibo de pago" });
    }
  });

  // ========== PAYMENT ACCOUNTS (CAJAS/BANCOS) ==========

  // Payment Accounts endpoints
  app.get("/api/payment-accounts", async (_req, res) => {
    try {
      const accounts = await storage.getPaymentAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment accounts" });
    }
  });

  app.get("/api/payment-accounts/:id", async (req, res) => {
    try {
      const account = await storage.getPaymentAccount(parseInt(req.params.id));
      if (!account) {
        return res.status(404).json({ error: "Payment account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment account" });
    }
  });

  app.post("/api/payment-accounts", async (req, res) => {
    try {
      const validation = insertPaymentAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const account = await storage.createPaymentAccount(validation.data);
      res.status(201).json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to create payment account" });
    }
  });

  app.patch("/api/payment-accounts/:id", async (req, res) => {
    try {
      const validation = insertPaymentAccountSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const account = await storage.updatePaymentAccount(parseInt(req.params.id), validation.data);
      if (!account) {
        return res.status(404).json({ error: "Payment account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment account" });
    }
  });

  app.delete("/api/payment-accounts/:id", async (req, res) => {
    try {
      const result = await storage.deletePaymentAccount(parseInt(req.params.id));
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment account" });
    }
  });

  // Account Transactions endpoints
  app.get("/api/payment-accounts/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAccountTransactions(parseInt(req.params.id));
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account transactions" });
    }
  });

  app.get("/api/account-transactions", async (_req, res) => {
    try {
      const transactions = await storage.getAllAccountTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account transactions" });
    }
  });

  app.post("/api/account-transactions", async (req, res) => {
    try {
      const validation = insertAccountTransactionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      
      // Update account balance
      const account = await storage.getPaymentAccount(validation.data.paymentAccountId);
      if (!account) {
        return res.status(400).json({ error: "Cuenta no encontrada" });
      }
      
      const currentBalance = parseFloat(String(account.currentBalance));
      const amount = parseFloat(String(validation.data.amount));
      let newBalance: number;
      
      if (validation.data.type === 'entrada') {
        newBalance = currentBalance + amount;
      } else if (validation.data.type === 'salida') {
        newBalance = currentBalance - amount;
      } else {
        return res.status(400).json({ error: "Tipo de transacción inválido" });
      }
      
      // Update balance in account
      await storage.updatePaymentAccountBalance(validation.data.paymentAccountId, newBalance.toFixed(2));
      
      // Create transaction with updated balance
      const transaction = await storage.createAccountTransaction({
        paymentAccountId: validation.data.paymentAccountId,
        type: validation.data.type,
        amount: validation.data.amount,
        date: validation.data.date,
        description: validation.data.description,
        receiptNumber: validation.data.receiptNumber,
        notes: validation.data.notes,
        referenceType: validation.data.referenceType,
        referenceId: validation.data.referenceId,
        relatedAccountId: validation.data.relatedAccountId
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to create account transaction" });
    }
  });

  // Delete account transaction
  app.delete("/api/account-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteAccountTransaction(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: "Transacción eliminada exitosamente" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete account transaction" });
    }
  });

  // Transfers endpoint
  app.post("/api/transfers", async (req, res) => {
    try {
      const { fromAccountId, toAccountId, amount, date, description, notes } = req.body;
      
      if (!fromAccountId || !toAccountId || !amount || !date) {
        return res.status(400).json({ error: "Cuenta origen, cuenta destino, monto y fecha son requeridos" });
      }
      
      if (fromAccountId === toAccountId) {
        return res.status(400).json({ error: "La cuenta origen y destino no pueden ser la misma" });
      }
      
      const result = await storage.createTransfer({
        fromAccountId,
        toAccountId,
        amount,
        date,
        description: description || "Transferencia entre cuentas",
        notes: notes || null,
      });
      
      res.status(201).json({ message: "Transferencia realizada exitosamente" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create transfer" });
    }
  });

  // Expense Categories endpoints
  app.get("/api/expense-categories", async (_req, res) => {
    try {
      const categories = await storage.getExpenseCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense categories" });
    }
  });

  app.get("/api/expense-categories/:id", async (req, res) => {
    try {
      const category = await storage.getExpenseCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense category" });
    }
  });

  app.post("/api/expense-categories", async (req, res) => {
    try {
      const validation = insertExpenseCategorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const category = await storage.createExpenseCategory(validation.data);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create expense category" });
    }
  });

  app.patch("/api/expense-categories/:id", async (req, res) => {
    try {
      const validation = insertExpenseCategorySchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const category = await storage.updateExpenseCategory(parseInt(req.params.id), validation.data);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to update expense category" });
    }
  });

  app.delete("/api/expense-categories/:id", async (req, res) => {
    try {
      const result = await storage.deleteExpenseCategory(parseInt(req.params.id));
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense category" });
    }
  });

  // Expense Subcategories endpoints
  app.get("/api/expense-subcategories", async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const subcategories = await storage.getExpenseSubcategories(categoryId);
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense subcategories" });
    }
  });

  app.get("/api/expense-subcategories/:id", async (req, res) => {
    try {
      const subcategory = await storage.getExpenseSubcategory(parseInt(req.params.id));
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.json(subcategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense subcategory" });
    }
  });

  app.post("/api/expense-subcategories", async (req, res) => {
    try {
      const validation = insertExpenseSubcategorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const subcategory = await storage.createExpenseSubcategory(validation.data);
      res.status(201).json(subcategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to create expense subcategory" });
    }
  });

  app.patch("/api/expense-subcategories/:id", async (req, res) => {
    try {
      const validation = insertExpenseSubcategorySchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      const subcategory = await storage.updateExpenseSubcategory(parseInt(req.params.id), validation.data);
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.json(subcategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to update expense subcategory" });
    }
  });

  app.delete("/api/expense-subcategories/:id", async (req, res) => {
    try {
      const success = await storage.deleteExpenseSubcategory(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense subcategory" });
    }
  });

  // Dashboard Statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Get all data
      const [accounts, transactions, salesInvoices, purchaseInvoicesData] = await Promise.all([
        storage.getPaymentAccounts(),
        storage.getAllAccountTransactions(),
        storage.getInvoices(),
        storage.getPurchaseInvoices(),
      ]);

      // Calculate total balance from all accounts
      const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(String(acc.currentBalance || 0)), 0);

      // Filter transactions by date range if provided
      let filteredTransactions = transactions;
      if (startDate && endDate) {
        filteredTransactions = transactions.filter(t => {
          const transDate = t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '';
          return transDate >= startDate && transDate <= endDate;
        });
      }

      // Filter invoices by date range
      let filteredSalesInvoices = salesInvoices;
      let filteredPurchaseInvoices = purchaseInvoicesData;
      if (startDate && endDate) {
        filteredSalesInvoices = salesInvoices.filter(inv => inv.date >= startDate && inv.date <= endDate);
        filteredPurchaseInvoices = purchaseInvoicesData.filter(inv => inv.date >= startDate && inv.date <= endDate);
      }

      // Calculate income from sales invoices (excluding cancelled)
      const income = filteredSalesInvoices
        .filter(inv => inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0);
      
      // Calculate expenses from purchase invoices (excluding cancelled)
      const expenses = filteredPurchaseInvoices
        .filter(inv => inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0);

      // Count pending invoices
      const pendingSalesInvoices = filteredSalesInvoices.filter(inv => inv.status === 'pending').length;
      const pendingPurchaseInvoices = filteredPurchaseInvoices.filter(inv => inv.status === 'pending').length;

      // Recent transactions for list
      const recentTransactions = filteredTransactions.slice(0, 10).map(t => ({
        id: t.id,
        description: t.description,
        amount: parseFloat(String(t.amount || 0)),
        type: t.type,
        date: t.createdAt,
      }));

      // Generate chart data based on selected date range
      const monthlyData = [];
      const weeklyData = [];
      const now = new Date();
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 7) {
          // Show daily data for short ranges (up to 7 days)
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayStr = d.toISOString().split('T')[0];
            const daySales = filteredSalesInvoices.filter(inv => inv.date === dayStr && inv.status !== 'cancelled');
            const dayPurchases = filteredPurchaseInvoices.filter(inv => inv.date === dayStr && inv.status !== 'cancelled');
            
            monthlyData.push({
              name: `${d.getDate()}/${d.getMonth() + 1}`,
              income: daySales.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
              expenses: dayPurchases.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
            });
            weeklyData.push({
              name: dayNames[d.getDay()],
              total: daySales.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
            });
          }
        } else if (daysDiff <= 31) {
          // Show weekly data for month ranges
          let weekStart = new Date(start);
          while (weekStart <= end) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const actualEnd = weekEnd > end ? end : weekEnd;
            
            const weekStartStr = weekStart.toISOString().split('T')[0];
            const weekEndStr = actualEnd.toISOString().split('T')[0];
            
            const weekSales = filteredSalesInvoices.filter(inv => inv.date >= weekStartStr && inv.date <= weekEndStr && inv.status !== 'cancelled');
            const weekPurchases = filteredPurchaseInvoices.filter(inv => inv.date >= weekStartStr && inv.date <= weekEndStr && inv.status !== 'cancelled');
            
            monthlyData.push({
              name: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
              income: weekSales.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
              expenses: weekPurchases.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
            });
            
            weekStart.setDate(weekStart.getDate() + 7);
          }
          // Weekly chart shows daily data
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayStr = d.toISOString().split('T')[0];
            const daySales = filteredSalesInvoices.filter(inv => inv.date === dayStr && inv.status !== 'cancelled');
            weeklyData.push({
              name: `${d.getDate()}`,
              total: daySales.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
            });
          }
        } else {
          // Show monthly data for year ranges
          const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
          const endMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
          
          for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
            const monthStart = m.toISOString().split('T')[0];
            const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0).toISOString().split('T')[0];
            
            const monthSales = filteredSalesInvoices.filter(inv => inv.date >= monthStart && inv.date <= monthEnd && inv.status !== 'cancelled');
            const monthPurchases = filteredPurchaseInvoices.filter(inv => inv.date >= monthStart && inv.date <= monthEnd && inv.status !== 'cancelled');
            
            monthlyData.push({
              name: monthNames[m.getMonth()],
              income: monthSales.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
              expenses: monthPurchases.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
            });
          }
          // Weekly chart shows last 7 days of selected period
          for (let i = 6; i >= 0; i--) {
            const dayDate = new Date(end);
            dayDate.setDate(end.getDate() - i);
            const dayStr = dayDate.toISOString().split('T')[0];
            const daySales = filteredSalesInvoices.filter(inv => inv.date === dayStr && inv.status !== 'cancelled');
            weeklyData.push({
              name: dayNames[dayDate.getDay()],
              total: daySales.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
            });
          }
        }
      } else {
        // Default: last 7 months for monthly chart
        for (let i = 6; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = monthDate.toISOString().split('T')[0];
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];
          
          const monthSalesInvoices = salesInvoices.filter(inv => inv.date >= monthStart && inv.date <= monthEnd && inv.status !== 'cancelled');
          const monthPurchaseInvoices = purchaseInvoicesData.filter(inv => inv.date >= monthStart && inv.date <= monthEnd && inv.status !== 'cancelled');
          
          monthlyData.push({
            name: monthNames[monthDate.getMonth()],
            income: monthSalesInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
            expenses: monthPurchaseInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
          });
        }
        // Default: last 7 days for weekly chart
        for (let i = 6; i >= 0; i--) {
          const dayDate = new Date(now);
          dayDate.setDate(now.getDate() - i);
          const dayStr = dayDate.toISOString().split('T')[0];
          const daySalesInvoices = salesInvoices.filter(inv => inv.date === dayStr && inv.status !== 'cancelled');
          weeklyData.push({
            name: dayNames[dayDate.getDay()],
            total: daySalesInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.total || 0)), 0),
          });
        }
      }

      res.json({
        totalBalance,
        income,
        expenses,
        pendingSalesInvoices,
        pendingPurchaseInvoices,
        recentTransactions,
        monthlyData,
        weeklyData,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Conduces endpoints
  app.get("/api/conduces", async (_req, res) => {
    try {
      const conducesList = await storage.getConduces();
      res.json(conducesList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conduces" });
    }
  });

  app.get("/api/conduces/next-number", async (_req, res) => {
    try {
      const nextNumber = await storage.getNextConduceNumber();
      res.json({ nextNumber: String(nextNumber).padStart(6, '0') });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next conduce number" });
    }
  });

  app.get("/api/conduces/:id", async (req, res) => {
    try {
      const conduce = await storage.getConduce(parseInt(req.params.id));
      if (!conduce) {
        return res.status(404).json({ error: "Conduce not found" });
      }
      res.json(conduce);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conduce" });
    }
  });

  app.get("/api/conduces/:id/items", async (req, res) => {
    try {
      const items = await storage.getConduceItems(parseInt(req.params.id));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conduce items" });
    }
  });

  app.post("/api/conduces", async (req, res) => {
    try {
      const { items, ...conduceData } = req.body;
      const validation = insertConduceClientSchema.safeParse(conduceData);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      
      const conduce = await storage.createConduce(validation.data);
      
      // Create conduce items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createConduceItem({
            conduceId: conduce.id,
            productId: item.productId || null,
            description: item.description,
            quantity: item.quantity,
          });
        }
      }
      
      const createdItems = await storage.getConduceItems(conduce.id);
      res.status(201).json({ ...conduce, items: createdItems });
    } catch (error) {
      console.error("Error creating conduce:", error);
      res.status(500).json({ error: "Failed to create conduce" });
    }
  });

  app.patch("/api/conduces/:id", async (req, res) => {
    try {
      const { items, ...conduceData } = req.body;
      const conduce = await storage.updateConduce(parseInt(req.params.id), conduceData);
      if (!conduce) {
        return res.status(404).json({ error: "Conduce not found" });
      }
      
      // Update items if provided
      if (items && Array.isArray(items)) {
        await storage.deleteConduceItems(conduce.id);
        for (const item of items) {
          await storage.createConduceItem({
            conduceId: conduce.id,
            productId: item.productId || null,
            description: item.description,
            quantity: item.quantity,
          });
        }
      }
      
      const updatedItems = await storage.getConduceItems(conduce.id);
      res.json({ ...conduce, items: updatedItems });
    } catch (error) {
      res.status(500).json({ error: "Failed to update conduce" });
    }
  });

  app.delete("/api/conduces/:id", async (req, res) => {
    try {
      const success = await storage.deleteConduce(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Conduce not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conduce" });
    }
  });

  // Unified search for customers and suppliers
  app.get("/api/recipients/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").toLowerCase();
      const customers = await storage.getCustomers();
      const suppliers = await storage.getSuppliers();
      
      const results = [
        ...customers
          .filter(c => c.name.toLowerCase().includes(query) || (c.rnc && c.rnc.includes(query)))
          .map(c => ({ id: c.id, name: c.name, rnc: c.rnc, type: 'customer' as const })),
        ...suppliers
          .filter(s => s.name.toLowerCase().includes(query) || (s.rnc && s.rnc.includes(query)))
          .map(s => ({ id: s.id, name: s.name, rnc: s.rnc, type: 'supplier' as const })),
      ];
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to search recipients" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
