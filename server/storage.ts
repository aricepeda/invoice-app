import {
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type CompanySettings,
  type InsertCompanySettings,
  type NcfSequence,
  type InsertNcfSequence,
  type Product,
  type InsertProduct,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type TaxSettings,
  type InsertTaxSettings,
  type Seller,
  type InsertSeller,
  type Payment,
  type InsertPayment,
  type InvoiceDesignSettings,
  type InsertInvoiceDesignSettings,
  type Supplier,
  type InsertSupplier,
  type PurchaseInvoice,
  type InsertPurchaseInvoice,
  type PurchaseInvoiceItem,
  type InsertPurchaseInvoiceItem,
  type SupplierPayment,
  type InsertSupplierPayment,
  type PaymentAccount,
  type InsertPaymentAccount,
  type AccountTransaction,
  type InsertAccountTransaction,
  type ExpenseCategory,
  type InsertExpenseCategory,
  type ExpenseSubcategory,
  type InsertExpenseSubcategory,
  type Conduce,
  type InsertConduce,
  type ConduceItem,
  type InsertConduceItem,
  type AdvanceApplication,
  type InsertAdvanceApplication,
  users,
  customers,
  companySettings,
  ncfSequences,
  products,
  invoices,
  invoiceItems,
  taxSettings,
  sellers,
  payments,
  invoiceDesignSettings,
  suppliers,
  purchaseInvoices,
  purchaseInvoiceItems,
  supplierPayments,
  paymentAccounts,
  accountTransactions,
  expenseCategories,
  expenseSubcategories,
  conduces,
  conduceItems,
  advanceApplications,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;

  // Company Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  createOrUpdateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings | { error: string }>;
  hasInvoices(): Promise<boolean>;
  hasConduces(): Promise<boolean>;

  // NCF Sequences
  getNcfSequences(): Promise<NcfSequence[]>;
  getNcfSequence(id: number): Promise<NcfSequence | undefined>;
  createNcfSequence(sequence: InsertNcfSequence): Promise<NcfSequence>;
  updateNcfSequence(id: number, sequence: Partial<InsertNcfSequence>): Promise<NcfSequence | undefined>;
  deleteNcfSequence(id: number): Promise<boolean>;
  getPreviewNcf(prefix: string): Promise<{ ncf: string } | { error: string }>;
  getNextNcf(prefix: string): Promise<{ ncf: string } | { error: string }>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<{ product?: Product; error?: string }>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<{ success: boolean; error?: string }>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getNextInvoiceNumber(): Promise<number>;
  createInvoice(invoice: Omit<InsertInvoice, 'invoiceNumber'>): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  // Invoice Items
  getAllInvoiceItems(): Promise<InvoiceItem[]>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItem(id: number): Promise<boolean>;

  // Tax Settings
  getTaxSettings(): Promise<TaxSettings | undefined>;
  createOrUpdateTaxSettings(settings: InsertTaxSettings): Promise<TaxSettings>;

  // Sellers
  getSellers(): Promise<Seller[]>;
  getSeller(id: number): Promise<Seller | undefined>;
  createSeller(seller: InsertSeller): Promise<Seller>;
  updateSeller(id: number, seller: Partial<InsertSeller>): Promise<Seller | undefined>;
  deleteSeller(id: number): Promise<boolean>;

  // Payments
  getPayment(id: number): Promise<Payment | undefined>;
  getPayments(invoiceId: number): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  getPaymentsByCustomer(customerId: number): Promise<Payment[]>;
  getNextReceiptNumber(): Promise<number>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  deletePayment(id: number): Promise<boolean>;
  getInvoiceBalance(invoiceId: number): Promise<string>;
  getCustomerBalance(customerId: number): Promise<string>;
  getCustomerPendingInvoices(customerId: number): Promise<(Invoice & { balance: string })[]>;
  getCustomerBalances(customerId: number, asOfDate: string): Promise<{ totalPending: string; totalOverdue: string }>;
  createBulkCustomerPayment(data: {
    customerId: number;
    amount: string;
    date: string;
    method: string;
    reference: string | null;
    notes: string | null;
    paymentAccountId: number | null;
    allocations: { invoiceId: number; amount: string }[];
  }): Promise<Payment[] | { error: string }>;
  deletePaymentsByReceiptNumber(receiptNumber: string): Promise<{ deleted: number; invoicesUpdated: number }>;

  // Customer Advances
  getCustomerAdvances(customerId?: number): Promise<Payment[]>;
  getAvailableAdvances(customerId: number): Promise<(Payment & { availableAmount: string })[]>;
  createAdvance(data: InsertPayment & { concept: string }): Promise<Payment>;
  updateAdvance(id: number, data: Partial<InsertPayment>): Promise<Payment | { error: string }>;
  deleteAdvance(id: number): Promise<{ success: boolean; error?: string }>;
  applyAdvanceToInvoice(advanceId: number, invoiceId: number, amount: string, date: string, notes?: string): Promise<AdvanceApplication | { error: string }>;
  getAdvanceApplications(advanceId: number): Promise<AdvanceApplication[]>;
  getInvoiceAdvanceApplications(invoiceId: number): Promise<(AdvanceApplication & { advance: Payment })[]>;
  getInvoiceAdvanceTotal(invoiceId: number): Promise<string>;

  // Invoice Design Settings
  getInvoiceDesignSettings(): Promise<InvoiceDesignSettings | undefined>;
  createOrUpdateInvoiceDesignSettings(settings: InsertInvoiceDesignSettings): Promise<InvoiceDesignSettings>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<{ success: boolean; error?: string }>;

  // Purchase Invoices
  getPurchaseInvoices(): Promise<PurchaseInvoice[]>;
  getPurchaseInvoice(id: number): Promise<PurchaseInvoice | undefined>;
  getPurchaseInvoiceByNumber(invoiceNumber: string, supplierId: number): Promise<PurchaseInvoice | undefined>;
  getNextPurchaseInvoiceNumber(): Promise<number>;
  createPurchaseInvoice(invoice: Omit<InsertPurchaseInvoice, 'internalNumber'>): Promise<PurchaseInvoice>;
  updatePurchaseInvoice(id: number, invoice: Partial<InsertPurchaseInvoice>): Promise<PurchaseInvoice | undefined>;
  deletePurchaseInvoice(id: number): Promise<boolean>;

  // Purchase Invoice Items
  getAllPurchaseInvoiceItems(): Promise<PurchaseInvoiceItem[]>;
  getPurchaseInvoiceItems(purchaseInvoiceId: number): Promise<PurchaseInvoiceItem[]>;
  createPurchaseInvoiceItem(item: InsertPurchaseInvoiceItem): Promise<PurchaseInvoiceItem>;
  deletePurchaseInvoiceItem(id: number): Promise<boolean>;

  // Supplier Payments
  getSupplierPayment(id: number): Promise<SupplierPayment | undefined>;
  getSupplierPayments(purchaseInvoiceId: number): Promise<SupplierPayment[]>;
  getAllSupplierPayments(): Promise<SupplierPayment[]>;
  getSupplierPaymentsBySupplier(supplierId: number): Promise<SupplierPayment[]>;
  getNextSupplierPaymentNumber(): Promise<number>;
  createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment>;
  deleteSupplierPayment(id: number): Promise<boolean>;
  getPurchaseInvoiceBalance(purchaseInvoiceId: number): Promise<string>;
  getSupplierBalance(supplierId: number): Promise<string>;
  getSupplierBalances(supplierId: number, asOfDate: string): Promise<{ totalPending: string; totalOverdue: string }>;
  getSupplierPendingInvoices(supplierId: number): Promise<(PurchaseInvoice & { balance: string })[]>;
  createBulkSupplierPayment(data: {
    supplierId: number;
    amount: string;
    date: string;
    method: string;
    reference: string | null;
    notes: string | null;
    paymentAccountId: number | null;
    allocations: { invoiceId: number; amount: string }[];
  }): Promise<SupplierPayment[] | { error: string }>;

  // Payment Accounts
  getPaymentAccounts(): Promise<PaymentAccount[]>;
  getPaymentAccount(id: number): Promise<PaymentAccount | undefined>;
  createPaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount>;
  updatePaymentAccount(id: number, account: Partial<InsertPaymentAccount>): Promise<PaymentAccount | undefined>;
  deletePaymentAccount(id: number): Promise<{ success: boolean; error?: string }>;

  // Account Transactions
  getAccountTransactions(paymentAccountId: number): Promise<AccountTransaction[]>;
  getAllAccountTransactions(): Promise<AccountTransaction[]>;
  createAccountTransaction(transaction: InsertAccountTransaction): Promise<AccountTransaction>;
  createTransfer(data: {
    fromAccountId: number;
    toAccountId: number;
    amount: string;
    date: string;
    description: string;
    notes: string | null;
  }): Promise<{ success: boolean; error?: string }>;

  // Expense Categories
  getExpenseCategories(): Promise<ExpenseCategory[]>;
  getExpenseCategory(id: number): Promise<ExpenseCategory | undefined>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: number, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: number): Promise<{ success: boolean; error?: string }>;

  // Expense Subcategories
  getExpenseSubcategories(categoryId?: number): Promise<ExpenseSubcategory[]>;
  getExpenseSubcategory(id: number): Promise<ExpenseSubcategory | undefined>;
  createExpenseSubcategory(subcategory: InsertExpenseSubcategory): Promise<ExpenseSubcategory>;
  updateExpenseSubcategory(id: number, subcategory: Partial<InsertExpenseSubcategory>): Promise<ExpenseSubcategory | undefined>;
  deleteExpenseSubcategory(id: number): Promise<boolean>;

  // Conduces
  getConduces(): Promise<Conduce[]>;
  getConduce(id: number): Promise<Conduce | undefined>;
  getNextConduceNumber(): Promise<number>;
  createConduce(conduce: Omit<InsertConduce, 'conduceNumber'>): Promise<Conduce>;
  updateConduce(id: number, conduce: Partial<InsertConduce>): Promise<Conduce | undefined>;
  deleteConduce(id: number): Promise<boolean>;

  // Conduce Items
  getConduceItems(conduceId: number): Promise<ConduceItem[]>;
  createConduceItem(item: InsertConduceItem): Promise<ConduceItem>;
  deleteConduceItems(conduceId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.id));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      sql`lower(${users.username}) = lower(${username})`
    );
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.id));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Company Settings
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings || undefined;
  }

  async hasInvoices(): Promise<boolean> {
    const [result] = await db.select({ id: invoices.id }).from(invoices).limit(1);
    return !!result;
  }

  async hasConduces(): Promise<boolean> {
    const [result] = await db.select({ id: conduces.id }).from(conduces).limit(1);
    return !!result;
  }

  async hasSupplierPayments(): Promise<boolean> {
    const [result] = await db.select({ id: supplierPayments.id }).from(supplierPayments).limit(1);
    return !!result;
  }

  async createOrUpdateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings | { error: string }> {
    const existingSettings = await this.getCompanySettings();
    const hasExistingInvoices = await this.hasInvoices();
    const hasExistingSupplierPayments = await this.hasSupplierPayments();
    
    if (hasExistingInvoices && existingSettings) {
      if (settings.invoiceStartNumber !== existingSettings.invoiceStartNumber) {
        return { error: "No se puede cambiar el número inicial de facturas porque ya existen facturas en el sistema." };
      }
    }

    if (hasExistingSupplierPayments && existingSettings) {
      if (settings.paymentReceiptStartNumber !== existingSettings.paymentReceiptStartNumber) {
        return { error: "No se puede cambiar el número inicial de recibos de pago porque ya existen pagos en el sistema." };
      }
    }

    const hasExistingConduces = await this.hasConduces();
    if (hasExistingConduces && existingSettings) {
      if (settings.conduceStartNumber !== existingSettings.conduceStartNumber) {
        return { error: "No se puede cambiar el número inicial de conduces porque ya existen conduces en el sistema." };
      }
    }

    // If existing record, update it using its actual id
    if (existingSettings) {
      const [updated] = await db
        .update(companySettings)
        .set(settings)
        .where(eq(companySettings.id, existingSettings.id))
        .returning();
      return updated;
    }
    
    // If no record exists, create one
    const [created] = await db.insert(companySettings).values(settings).returning();
    return created;
  }

  // NCF Sequences
  async getNcfSequences(): Promise<NcfSequence[]> {
    return await db.select().from(ncfSequences).orderBy(desc(ncfSequences.id));
  }

  async getNcfSequence(id: number): Promise<NcfSequence | undefined> {
    const [sequence] = await db.select().from(ncfSequences).where(eq(ncfSequences.id, id));
    return sequence || undefined;
  }

  async createNcfSequence(sequence: InsertNcfSequence): Promise<NcfSequence> {
    const [newSequence] = await db.insert(ncfSequences).values(sequence).returning();
    return newSequence;
  }

  async updateNcfSequence(id: number, sequence: Partial<InsertNcfSequence>): Promise<NcfSequence | undefined> {
    const [updated] = await db
      .update(ncfSequences)
      .set(sequence)
      .where(eq(ncfSequences.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteNcfSequence(id: number): Promise<boolean> {
    const result = await db.delete(ncfSequences).where(eq(ncfSequences.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getPreviewNcf(prefix: string): Promise<{ ncf: string } | { error: string }> {
    // Read-only preview of next NCF (does not increment counter)
    const today = new Date().toISOString().split('T')[0];
    
    const [sequence] = await db
      .select()
      .from(ncfSequences)
      .where(and(eq(ncfSequences.prefix, prefix), eq(ncfSequences.status, "active")))
      .limit(1);

    if (!sequence) {
      return { error: `No hay secuencia NCF configurada para el tipo ${prefix}. Configure una en Configuración > Secuencias NCF.` };
    }

    // Check if expired
    if (sequence.expirationDate < today) {
      return { error: `La secuencia NCF ${prefix} ha expirado (${sequence.expirationDate}). Actualice la fecha de vencimiento o cree una nueva secuencia.` };
    }

    // Check if within range
    if (sequence.currentNumber > sequence.endNumber) {
      return { error: `La secuencia NCF ${prefix} ha llegado a su límite (${sequence.endNumber}). Cree una nueva secuencia o aumente el límite.` };
    }

    const ncf = `${sequence.prefix}${sequence.currentNumber.toString().padStart(8, "0")}`;
    return { ncf };
  }

  async getNextNcf(prefix: string): Promise<{ ncf: string } | { error: string }> {
    // Get next NCF and increment counter (only called on save)
    const preview = await this.getPreviewNcf(prefix);
    if ('error' in preview) {
      return preview;
    }

    // Increment the current number atomically
    const [sequence] = await db
      .select()
      .from(ncfSequences)
      .where(and(eq(ncfSequences.prefix, prefix), eq(ncfSequences.status, "active")))
      .limit(1);

    if (sequence) {
      await db
        .update(ncfSequences)
        .set({ currentNumber: sequence.currentNumber + 1 })
        .where(eq(ncfSequences.id, sequence.id));
    }

    return preview;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.id));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getNextProductCode(): Promise<string> {
    const settings = await this.getCompanySettings();
    const currentCounter = settings?.productCodeCounter || 1000;
    
    // Update counter
    await db
      .update(companySettings)
      .set({ productCodeCounter: currentCounter + 1 })
      .where(eq(companySettings.id, 1));
    
    return String(currentCounter);
  }

  async createProduct(product: InsertProduct): Promise<{ product?: Product; error?: string }> {
    // Check if product with same name already exists
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.name, product.name));
    
    if (existingProduct) {
      return { error: `Ya existe un producto con el nombre "${product.name}". Por favor use un nombre diferente.` };
    }

    // Generate unique code starting from 1000
    const code = product.code && product.code.trim() ? product.code : await this.getNextProductCode();
    
    const [newProduct] = await db.insert(products).values({
      ...product,
      code
    }).returning();
    return { product: newProduct };
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProduct(id: number): Promise<{ success: boolean; error?: string }> {
    // Check if product is used in any invoice items
    const usedInItems = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.productId, id));
    
    if (usedInItems.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar este producto porque está siendo usado en ${usedInItems.length} factura(s). Elimine primero los items de las facturas.`
      };
    }

    const result = await db.delete(products).where(eq(products.id, id));
    return {
      success: result.rowCount !== null && result.rowCount > 0
    };
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getNextInvoiceNumber(): Promise<number> {
    // Generate next invoice number based on settings and existing invoices
    const settings = await this.getCompanySettings();
    const startNumber = settings?.invoiceStartNumber || 1;
    
    // Get the last invoice to determine next number
    const [lastInvoice] = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    
    let nextNumber = startNumber;
    
    if (lastInvoice) {
      // Extract number from invoice number (numeric format)
      const lastNumber = parseInt(lastInvoice.invoiceNumber, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = Math.max(lastNumber + 1, startNumber);
      }
    }
    
    return nextNumber;
  }

  async createInvoice(invoice: Omit<InsertInvoice, 'invoiceNumber'>): Promise<Invoice> {
    // Generate invoice number based on settings and existing invoices
    const nextNumber = await this.getNextInvoiceNumber();
    const invoiceNumber = nextNumber.toString();
    
    const [newInvoice] = await db
      .insert(invoices)
      .values({ ...invoice, invoiceNumber })
      .returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return updated || undefined;
  }

  async cancelInvoice(id: number): Promise<{ success: boolean; error?: string; invoice?: Invoice }> {
    // Check if invoice has any payments
    const invoicePayments = await this.getPayments(id);
    
    if (invoicePayments.length > 0) {
      const totalPaid = invoicePayments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
      return {
        success: false,
        error: `No se puede anular una factura con pagos realizados. Total pagado: RD$ ${totalPaid.toFixed(2)}`
      };
    }

    // Cancel invoice by setting total and status to cancelled
    const [updated] = await db
      .update(invoices)
      .set({
        status: "cancelled",
        total: "0.00"
      })
      .where(eq(invoices.id, id))
      .returning();

    return {
      success: true,
      invoice: updated || undefined
    };
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Invoice Items
  async getAllInvoiceItems(): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems);
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values(item).returning();
    return newItem;
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Tax Settings
  async getTaxSettings(): Promise<TaxSettings | undefined> {
    const [settings] = await db.select().from(taxSettings).limit(1);
    return settings || undefined;
  }

  async createOrUpdateTaxSettings(settings: InsertTaxSettings): Promise<TaxSettings> {
    const existing = await this.getTaxSettings();
    
    if (existing) {
      const [updated] = await db
        .update(taxSettings)
        .set(settings)
        .where(eq(taxSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(taxSettings).values(settings).returning();
      return created;
    }
  }

  // Sellers
  async getSellers(): Promise<Seller[]> {
    return await db.select().from(sellers).orderBy(desc(sellers.id));
  }

  async getSeller(id: number): Promise<Seller | undefined> {
    const [seller] = await db.select().from(sellers).where(eq(sellers.id, id));
    return seller || undefined;
  }

  async createSeller(seller: InsertSeller): Promise<Seller> {
    const [newSeller] = await db.insert(sellers).values(seller).returning();
    return newSeller;
  }

  async updateSeller(id: number, seller: Partial<InsertSeller>): Promise<Seller | undefined> {
    const [updated] = await db
      .update(sellers)
      .set(seller)
      .where(eq(sellers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSeller(id: number): Promise<boolean> {
    const result = await db.delete(sellers).where(eq(sellers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Payments
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPayments(invoiceId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.date));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPaymentsByCustomer(customerId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.customerId, customerId)).orderBy(desc(payments.date));
  }

  async getNextReceiptNumber(): Promise<number> {
    const allPayments = await db.select().from(payments).orderBy(desc(payments.id));
    if (allPayments.length === 0) {
      const settings = await this.getCompanySettings();
      return settings?.incomeReceiptStartNumber || 1;
    }
    const lastReceiptNum = allPayments[0].receiptNumber;
    const num = parseInt(lastReceiptNum.replace('REC-', '')) || 0;
    return num + 1;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const nextNumber = await this.getNextReceiptNumber();
    const receiptNumber = `REC-${String(nextNumber).padStart(4, '0')}`;
    const [newPayment] = await db.insert(payments).values({
      ...payment,
      receiptNumber,
    }).returning();
    return newPayment;
  }

  async deletePayment(id: number): Promise<boolean> {
    const payment = await this.getPayment(id);
    if (!payment) return false;

    // Restore payment account balance if paymentAccountId exists
    if (payment.paymentAccountId) {
      const account = await this.getPaymentAccount(payment.paymentAccountId);
      if (account) {
        const restoredBalance = parseFloat(String(account.currentBalance)) - parseFloat(String(payment.amount));
        await this.updatePaymentAccountBalance(payment.paymentAccountId, restoredBalance.toFixed(2));
        
        // Delete the corresponding account transaction
        await db.delete(accountTransactions).where(
          and(
            eq(accountTransactions.referenceType, 'customer_payment'),
            eq(accountTransactions.referenceId, id)
          )
        );
      }
    }

    const result = await db.delete(payments).where(eq(payments.id, id));
    
    // Recalculate invoice status
    if (payment?.invoiceId) {
      const balance = await this.getInvoiceBalance(payment.invoiceId);
      const invoice = await this.getInvoice(payment.invoiceId);
      if (invoice) {
        const newStatus = parseFloat(balance) <= 0 ? 'paid' : 'pending';
        await this.updateInvoice(payment.invoiceId, { status: newStatus });
      }
    }

    return result.rowCount !== null && result.rowCount > 0;
  }

  async getInvoiceBalance(invoiceId: number): Promise<string> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) {
      return "0";
    }

    // Get total of all payments for this invoice
    const result = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId));

    const totalPaid = parseFloat(String(result[0]?.total || 0));
    const invoiceTotal = parseFloat(String(invoice.total));
    const balance = Math.max(0, invoiceTotal - totalPaid);

    return balance.toFixed(2);
  }

  async getCustomerBalance(customerId: number): Promise<string> {
    // Get all advance payments (without invoice) for this customer
    const advanceResult = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(and(
        eq(payments.customerId, customerId),
        isNull(payments.invoiceId)
      ));

    const totalAdvances = parseFloat(String(advanceResult[0]?.total || 0));
    return totalAdvances.toFixed(2);
  }

  async getCustomerPendingInvoices(customerId: number): Promise<(Invoice & { balance: string })[]> {
    const customerInvoices = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.customerId, customerId),
        eq(invoices.status, 'pending')
      ))
      .orderBy(invoices.date);

    const invoicesWithBalance = await Promise.all(
      customerInvoices.map(async (invoice) => {
        const balance = await this.getInvoiceBalance(invoice.id);
        return { ...invoice, balance };
      })
    );

    return invoicesWithBalance.filter(inv => parseFloat(inv.balance) > 0);
  }

  async getCustomerBalances(customerId: number, asOfDate: string): Promise<{ totalPending: string; totalOverdue: string }> {
    const customerInvoices = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.customerId, customerId),
        eq(invoices.status, 'pending')
      ));

    let totalPending = 0;
    let totalOverdue = 0;

    for (const invoice of customerInvoices) {
      const balance = parseFloat(await this.getInvoiceBalance(invoice.id));
      if (balance > 0) {
        totalPending += balance;
        
        // Check if overdue (due date is before asOfDate)
        if (invoice.dueDate && invoice.dueDate < asOfDate) {
          totalOverdue += balance;
        }
      }
    }

    return {
      totalPending: totalPending.toFixed(2),
      totalOverdue: totalOverdue.toFixed(2)
    };
  }

  async createBulkCustomerPayment(data: {
    customerId: number;
    amount: string;
    date: string;
    method: string;
    reference: string | null;
    notes: string | null;
    paymentAccountId: number | null;
    allocations: { invoiceId: number; amount: string }[];
  }): Promise<Payment[] | { error: string }> {
    const { customerId, amount, date, method, reference, notes, paymentAccountId, allocations } = data;
    
    const totalPayment = parseFloat(amount);
    const totalAllocated = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0);
    
    if (totalAllocated > totalPayment) {
      return { error: "El total asignado excede el monto del cobro" };
    }

    // Verify balances for each invoice
    for (const alloc of allocations) {
      const balance = await this.getInvoiceBalance(alloc.invoiceId);
      if (parseFloat(alloc.amount) > parseFloat(balance)) {
        return { error: `El monto asignado a una factura excede su balance pendiente` };
      }
    }

    const nextNumber = await this.getNextReceiptNumber();
    const sharedReceiptNumber = `REC-${String(nextNumber).padStart(6, '0')}`;

    const createdPayments: Payment[] = [];

    // Create payments for each allocation
    for (const alloc of allocations) {
      if (parseFloat(alloc.amount) > 0) {
        const [payment] = await db.insert(payments).values({
          receiptNumber: sharedReceiptNumber,
          customerId,
          invoiceId: alloc.invoiceId,
          paymentAccountId,
          amount: alloc.amount,
          date,
          method,
          reference,
          notes,
        }).returning();
        
        createdPayments.push(payment);

        // Update invoice status
        const newBalance = await this.getInvoiceBalance(alloc.invoiceId);
        const invoice = await this.getInvoice(alloc.invoiceId);
        if (invoice) {
          const newStatus = parseFloat(newBalance) <= 0 ? 'paid' : 'pending';
          await this.updateInvoice(alloc.invoiceId, { status: newStatus });
        }
      }
    }

    // Handle unallocated amount as advance payment
    const unallocated = totalPayment - totalAllocated;
    if (unallocated > 0.01) {
      const [advancePayment] = await db.insert(payments).values({
        receiptNumber: sharedReceiptNumber,
        customerId,
        invoiceId: null,
        paymentAccountId,
        amount: unallocated.toFixed(2),
        date,
        method,
        reference,
        notes: notes ? `${notes} (Anticipo)` : "Anticipo",
      }).returning();
      
      createdPayments.push(advancePayment);
    }

    // Create account transaction if paymentAccountId is provided (Treasury integration)
    if (paymentAccountId && createdPayments.length > 0) {
      const account = await this.getPaymentAccount(paymentAccountId);
      if (account) {
        const newBalance = parseFloat(String(account.currentBalance)) + totalPayment;
        await this.updatePaymentAccountBalance(paymentAccountId, newBalance.toFixed(2));
        
        const customer = await this.getCustomer(customerId);
        await this.createAccountTransaction({
          paymentAccountId,
          type: 'entrada',
          amount: amount,
          date,
          description: `Cobro de cliente: ${customer?.name || 'Desconocido'}`,
          referenceType: 'customer_payment',
          referenceId: createdPayments[0].id,
          receiptNumber: sharedReceiptNumber,
          notes,
        });
      }
    }

    return createdPayments;
  }

  async deletePaymentsByReceiptNumber(receiptNumber: string): Promise<{ deleted: number; invoicesUpdated: number }> {
    const paymentsToDelete = await db
      .select()
      .from(payments)
      .where(eq(payments.receiptNumber, receiptNumber))
      .orderBy(payments.id);

    if (paymentsToDelete.length === 0) {
      return { deleted: 0, invoicesUpdated: 0 };
    }

    const invoiceIds = new Set<number>();
    const paymentAccountRestores = new Map<number, number>();

    for (const payment of paymentsToDelete) {
      if (payment.invoiceId) {
        invoiceIds.add(payment.invoiceId);
      }
      
      // Track payment account balance restoration (subtract from entrada = restore means decrease)
      if (payment.paymentAccountId) {
        const currentTotal = paymentAccountRestores.get(payment.paymentAccountId) || 0;
        paymentAccountRestores.set(payment.paymentAccountId, currentTotal + parseFloat(String(payment.amount)));
      }
    }

    // Restore payment account balances (decrease for customer payments which were entrada)
    for (const [accountId, totalToRestore] of Array.from(paymentAccountRestores.entries())) {
      const account = await this.getPaymentAccount(accountId);
      if (account) {
        const restoredBalance = parseFloat(String(account.currentBalance)) - totalToRestore;
        await this.updatePaymentAccountBalance(accountId, restoredBalance.toFixed(2));
      }
    }

    // Delete all account transactions linked to this receipt number
    await db.delete(accountTransactions).where(
      eq(accountTransactions.receiptNumber, receiptNumber)
    );

    const result = await db
      .delete(payments)
      .where(eq(payments.receiptNumber, receiptNumber));

    const invoiceIdsArray = Array.from(invoiceIds);
    for (let i = 0; i < invoiceIdsArray.length; i++) {
      const invoiceId = invoiceIdsArray[i];
      const balance = await this.getInvoiceBalance(invoiceId);
      const invoice = await this.getInvoice(invoiceId);
      if (invoice) {
        const newStatus = parseFloat(balance) <= 0 ? 'paid' : 'pending';
        await this.updateInvoice(invoiceId, { status: newStatus });
      }
    }

    return { 
      deleted: result.rowCount || 0, 
      invoicesUpdated: invoiceIdsArray.length 
    };
  }

  // Customer Advances
  async getCustomerAdvances(customerId?: number): Promise<Payment[]> {
    if (customerId) {
      return await db.select().from(payments)
        .where(and(
          eq(payments.customerId, customerId),
          isNull(payments.invoiceId)
        ))
        .orderBy(desc(payments.createdAt));
    }
    return await db.select().from(payments)
      .where(isNull(payments.invoiceId))
      .orderBy(desc(payments.createdAt));
  }

  async getAvailableAdvances(customerId: number): Promise<(Payment & { availableAmount: string })[]> {
    const advances = await this.getCustomerAdvances(customerId);
    return advances.map(advance => {
      const amount = parseFloat(String(advance.amount));
      const applied = parseFloat(String(advance.appliedAmount));
      const available = amount - applied;
      return {
        ...advance,
        availableAmount: available.toFixed(2)
      };
    }).filter(a => parseFloat(a.availableAmount) > 0);
  }

  async createAdvance(data: InsertPayment & { concept: string }): Promise<Payment> {
    const nextNumber = await this.getNextReceiptNumber();
    const receiptNumber = `REC-${String(nextNumber).padStart(4, '0')}`;
    const [newPayment] = await db.insert(payments).values({
      ...data,
      receiptNumber,
      invoiceId: null,
    }).returning();
    return newPayment;
  }

  async updateAdvance(id: number, data: Partial<InsertPayment>): Promise<Payment | { error: string }> {
    const advance = await this.getPayment(id);
    if (!advance) {
      return { error: "Anticipo no encontrado" };
    }

    // Check if advance has applications
    const applications = await this.getAdvanceApplications(id);
    if (applications.length > 0 && data.amount && data.amount !== advance.amount) {
      return { error: "No se puede modificar el monto de un anticipo que ya ha sido aplicado a facturas" };
    }

    const [updatedAdvance] = await db.update(payments)
      .set(data)
      .where(eq(payments.id, id))
      .returning();

    return updatedAdvance;
  }

  async deleteAdvance(id: number): Promise<{ success: boolean; error?: string }> {
    const advance = await this.getPayment(id);
    if (!advance) {
      return { success: false, error: "Anticipo no encontrado" };
    }

    // Check if advance has been applied to any invoices
    const applications = await this.getAdvanceApplications(id);
    if (applications.length > 0) {
      return { success: false, error: "No se puede eliminar un anticipo que ya ha sido aplicado a facturas" };
    }

    // Delete account transactions associated with this advance
    await db.delete(accountTransactions).where(
      eq(accountTransactions.receiptNumber, advance.receiptNumber)
    );

    // Delete the advance
    await db.delete(payments).where(eq(payments.id, id));

    return { success: true };
  }

  async applyAdvanceToInvoice(advanceId: number, invoiceId: number, amount: string, date: string, notes?: string): Promise<AdvanceApplication | { error: string }> {
    const advance = await this.getPayment(advanceId);
    if (!advance) {
      return { error: "Anticipo no encontrado" };
    }

    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) {
      return { error: "Factura no encontrada" };
    }

    // Check if the advance belongs to the same customer as the invoice
    if (advance.customerId !== invoice.customerId) {
      return { error: "El anticipo no pertenece al mismo cliente de la factura" };
    }

    // Check available amount
    const amountNum = parseFloat(amount);
    const advanceAmount = parseFloat(String(advance.amount));
    const appliedAmount = parseFloat(String(advance.appliedAmount));
    const available = advanceAmount - appliedAmount;

    if (amountNum > available) {
      return { error: `El monto excede el saldo disponible del anticipo (${available.toFixed(2)})` };
    }

    // Create the application record
    const [application] = await db.insert(advanceApplications).values({
      advancePaymentId: advanceId,
      invoiceId,
      amount,
      date,
      notes: notes || null,
    }).returning();

    // Update the advance's applied amount
    const newAppliedAmount = (appliedAmount + amountNum).toFixed(2);
    await db.update(payments)
      .set({ appliedAmount: newAppliedAmount })
      .where(eq(payments.id, advanceId));

    // Recalculate invoice status (the applied advance counts as payment)
    const invoiceBalance = await this.getInvoiceBalance(invoiceId);
    const advanceApplied = await this.getInvoiceAdvanceTotal(invoiceId);
    const totalPaid = parseFloat(invoiceBalance) + parseFloat(advanceApplied);
    const invoiceTotal = parseFloat(String(invoice.total));
    
    if (invoiceTotal - totalPaid <= 0.01) {
      await this.updateInvoice(invoiceId, { status: 'paid' });
    }

    return application;
  }

  async getInvoiceAdvanceTotal(invoiceId: number): Promise<string> {
    const result = await db
      .select({ total: sum(advanceApplications.amount) })
      .from(advanceApplications)
      .where(eq(advanceApplications.invoiceId, invoiceId));
    return result[0]?.total || "0";
  }

  async getAdvanceApplications(advanceId: number): Promise<AdvanceApplication[]> {
    return await db.select().from(advanceApplications)
      .where(eq(advanceApplications.advancePaymentId, advanceId))
      .orderBy(desc(advanceApplications.createdAt));
  }

  async getInvoiceAdvanceApplications(invoiceId: number): Promise<(AdvanceApplication & { advance: Payment })[]> {
    const applications = await db.select().from(advanceApplications)
      .where(eq(advanceApplications.invoiceId, invoiceId))
      .orderBy(desc(advanceApplications.createdAt));
    
    const result: (AdvanceApplication & { advance: Payment })[] = [];
    for (const app of applications) {
      const advance = await this.getPayment(app.advancePaymentId);
      if (advance) {
        result.push({ ...app, advance });
      }
    }
    return result;
  }

  // Invoice Design Settings
  async getInvoiceDesignSettings(): Promise<InvoiceDesignSettings | undefined> {
    const [settings] = await db.select().from(invoiceDesignSettings);
    return settings || undefined;
  }

  async createOrUpdateInvoiceDesignSettings(settings: InsertInvoiceDesignSettings): Promise<InvoiceDesignSettings> {
    const existing = await this.getInvoiceDesignSettings();
    if (existing) {
      const [updated] = await db
        .update(invoiceDesignSettings)
        .set(settings)
        .where(eq(invoiceDesignSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(invoiceDesignSettings).values(settings).returning();
      return created;
    }
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(desc(suppliers.id));
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updated] = await db
      .update(suppliers)
      .set(supplier)
      .where(eq(suppliers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSupplier(id: number): Promise<{ success: boolean; error?: string }> {
    // Check if supplier has purchase invoices
    const [hasInvoices] = await db
      .select()
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.supplierId, id))
      .limit(1);
    
    if (hasInvoices) {
      return {
        success: false,
        error: "No se puede eliminar este suplidor porque tiene facturas de compra asociadas."
      };
    }

    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return { success: result.rowCount !== null && result.rowCount > 0 };
  }

  // Purchase Invoices
  async getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    return await db.select().from(purchaseInvoices).orderBy(desc(purchaseInvoices.createdAt));
  }

  async getPurchaseInvoice(id: number): Promise<PurchaseInvoice | undefined> {
    const [invoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    return invoice || undefined;
  }

  async getPurchaseInvoiceByNumber(invoiceNumber: string, supplierId: number): Promise<PurchaseInvoice | undefined> {
    const [invoice] = await db
      .select()
      .from(purchaseInvoices)
      .where(
        and(
          eq(purchaseInvoices.invoiceNumber, invoiceNumber),
          eq(purchaseInvoices.supplierId, supplierId)
        )
      );
    return invoice || undefined;
  }

  async getNextPurchaseInvoiceNumber(): Promise<number> {
    const [lastInvoice] = await db
      .select()
      .from(purchaseInvoices)
      .orderBy(desc(purchaseInvoices.id))
      .limit(1);
    
    if (!lastInvoice) return 1;
    
    const lastNumber = parseInt(lastInvoice.internalNumber.replace('FC-', ''), 10);
    return isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  async createPurchaseInvoice(invoice: Omit<InsertPurchaseInvoice, 'internalNumber'>): Promise<PurchaseInvoice> {
    const nextNumber = await this.getNextPurchaseInvoiceNumber();
    const internalNumber = `FC-${String(nextNumber).padStart(6, '0')}`;
    
    const [newInvoice] = await db
      .insert(purchaseInvoices)
      .values({ ...invoice, internalNumber })
      .returning();
    return newInvoice;
  }

  async updatePurchaseInvoice(id: number, invoice: Partial<InsertPurchaseInvoice>): Promise<PurchaseInvoice | undefined> {
    const [updated] = await db
      .update(purchaseInvoices)
      .set(invoice)
      .where(eq(purchaseInvoices.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePurchaseInvoice(id: number): Promise<boolean> {
    // Delete items first
    await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, id));
    // Delete payments
    await db.delete(supplierPayments).where(eq(supplierPayments.purchaseInvoiceId, id));
    // Delete invoice
    const result = await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Purchase Invoice Items
  async getAllPurchaseInvoiceItems(): Promise<PurchaseInvoiceItem[]> {
    return await db.select().from(purchaseInvoiceItems);
  }

  async getPurchaseInvoiceItems(purchaseInvoiceId: number): Promise<PurchaseInvoiceItem[]> {
    return await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, purchaseInvoiceId));
  }

  async createPurchaseInvoiceItem(item: InsertPurchaseInvoiceItem): Promise<PurchaseInvoiceItem> {
    const [newItem] = await db.insert(purchaseInvoiceItems).values(item).returning();
    return newItem;
  }

  async deletePurchaseInvoiceItem(id: number): Promise<boolean> {
    const result = await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Supplier Payments
  async getSupplierPayment(id: number): Promise<SupplierPayment | undefined> {
    const [payment] = await db.select().from(supplierPayments).where(eq(supplierPayments.id, id));
    return payment || undefined;
  }

  async getSupplierPayments(purchaseInvoiceId: number): Promise<SupplierPayment[]> {
    return await db.select().from(supplierPayments).where(eq(supplierPayments.purchaseInvoiceId, purchaseInvoiceId)).orderBy(desc(supplierPayments.date));
  }

  async getAllSupplierPayments(): Promise<SupplierPayment[]> {
    return await db.select().from(supplierPayments).orderBy(desc(supplierPayments.createdAt));
  }

  async getSupplierPaymentsBySupplier(supplierId: number): Promise<SupplierPayment[]> {
    return await db.select().from(supplierPayments).where(eq(supplierPayments.supplierId, supplierId)).orderBy(desc(supplierPayments.date));
  }

  async getNextSupplierPaymentNumber(): Promise<number> {
    const [lastPayment] = await db
      .select()
      .from(supplierPayments)
      .orderBy(desc(supplierPayments.id))
      .limit(1);
    
    if (!lastPayment) {
      const settings = await this.getCompanySettings();
      return settings?.paymentReceiptStartNumber || 1;
    }
    
    const num = parseInt(lastPayment.paymentNumber, 10) || 0;
    return num + 1;
  }

  async createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment> {
    const nextNumber = await this.getNextSupplierPaymentNumber();
    const paymentNumber = String(nextNumber).padStart(4, '0');
    
    const [newPayment] = await db.insert(supplierPayments).values({
      ...payment,
      paymentNumber,
    }).returning();

    // Update invoice status if payment is linked to an invoice
    if (payment.purchaseInvoiceId) {
      const balance = await this.getPurchaseInvoiceBalance(payment.purchaseInvoiceId);
      const invoice = await this.getPurchaseInvoice(payment.purchaseInvoiceId);
      if (invoice) {
        const newStatus = parseFloat(balance) <= 0 ? 'paid' : 'pending';
        await this.updatePurchaseInvoice(payment.purchaseInvoiceId, { status: newStatus });
      }
    }

    return newPayment;
  }

  async deleteSupplierPayment(id: number): Promise<boolean> {
    const payment = await this.getSupplierPayment(id);
    if (!payment) return false;

    // Restore payment account balance if paymentAccountId exists
    if (payment.paymentAccountId) {
      const account = await this.getPaymentAccount(payment.paymentAccountId);
      if (account) {
        const currentBalance = parseFloat(String(account.currentBalance));
        const paymentAmount = parseFloat(String(payment.amount));
        // For credit cards: paying increased debt, so deleting should decrease debt (subtract)
        // For bank/cash: paying decreased balance, so deleting should increase balance (add)
        const restoredBalance = account.type === "tarjeta_credito"
          ? currentBalance - paymentAmount
          : currentBalance + paymentAmount;
        await this.updatePaymentAccountBalance(payment.paymentAccountId, restoredBalance.toFixed(2));
        
        // Delete the corresponding account transaction
        await db.delete(accountTransactions).where(
          and(
            eq(accountTransactions.referenceType, 'supplier_payment'),
            eq(accountTransactions.referenceId, id)
          )
        );
      }
    }

    const result = await db.delete(supplierPayments).where(eq(supplierPayments.id, id));
    
    // Recalculate invoice status
    if (payment?.purchaseInvoiceId) {
      const balance = await this.getPurchaseInvoiceBalance(payment.purchaseInvoiceId);
      const invoice = await this.getPurchaseInvoice(payment.purchaseInvoiceId);
      if (invoice) {
        const newStatus = parseFloat(balance) <= 0 ? 'paid' : 'pending';
        await this.updatePurchaseInvoice(payment.purchaseInvoiceId, { status: newStatus });
      }
    }

    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteSupplierPaymentsByNumber(paymentNumber: string): Promise<{ deleted: number; invoicesUpdated: number }> {
    const paymentsToDelete = await db
      .select()
      .from(supplierPayments)
      .where(eq(supplierPayments.paymentNumber, paymentNumber))
      .orderBy(supplierPayments.id);

    if (paymentsToDelete.length === 0) {
      return { deleted: 0, invoicesUpdated: 0 };
    }

    const invoiceIds = new Set<number>();
    const paymentAccountRestores = new Map<number, number>();

    for (const payment of paymentsToDelete) {
      if (payment.purchaseInvoiceId) {
        invoiceIds.add(payment.purchaseInvoiceId);
      }
      
      // Track payment account balance restoration
      if (payment.paymentAccountId) {
        const currentTotal = paymentAccountRestores.get(payment.paymentAccountId) || 0;
        paymentAccountRestores.set(payment.paymentAccountId, currentTotal + parseFloat(String(payment.amount)));
      }
    }

    // Restore payment account balances
    for (const [accountId, totalToRestore] of Array.from(paymentAccountRestores.entries())) {
      const account = await this.getPaymentAccount(accountId);
      if (account) {
        const currentBalance = parseFloat(String(account.currentBalance));
        // For credit cards: paying increased debt, so deleting should decrease debt (subtract)
        // For bank/cash: paying decreased balance, so deleting should increase balance (add)
        const restoredBalance = account.type === "tarjeta_credito"
          ? currentBalance - totalToRestore
          : currentBalance + totalToRestore;
        await this.updatePaymentAccountBalance(accountId, restoredBalance.toFixed(2));
      }
    }

    // Delete all account transactions linked to this payment number
    await db.delete(accountTransactions).where(
      eq(accountTransactions.receiptNumber, paymentNumber)
    );

    const result = await db
      .delete(supplierPayments)
      .where(eq(supplierPayments.paymentNumber, paymentNumber));

    const invoiceIdsArray = Array.from(invoiceIds);
    for (let i = 0; i < invoiceIdsArray.length; i++) {
      const invoiceId = invoiceIdsArray[i];
      const balance = await this.getPurchaseInvoiceBalance(invoiceId);
      const invoice = await this.getPurchaseInvoice(invoiceId);
      if (invoice) {
        const newStatus = parseFloat(balance) <= 0 ? 'paid' : 'pending';
        await this.updatePurchaseInvoice(invoiceId, { status: newStatus });
      }
    }

    return { 
      deleted: result.rowCount || 0, 
      invoicesUpdated: invoiceIds.size 
    };
  }

  async getPurchaseInvoiceBalance(purchaseInvoiceId: number): Promise<string> {
    const invoice = await this.getPurchaseInvoice(purchaseInvoiceId);
    if (!invoice) return "0";

    const result = await db
      .select({ total: sum(supplierPayments.amount) })
      .from(supplierPayments)
      .where(eq(supplierPayments.purchaseInvoiceId, purchaseInvoiceId));

    const totalPaid = parseFloat(String(result[0]?.total || 0));
    const invoiceTotal = parseFloat(String(invoice.total));
    const balance = Math.max(0, invoiceTotal - totalPaid);

    return balance.toFixed(2);
  }

  async getSupplierBalance(supplierId: number): Promise<string> {
    const invoicesResult = await db
      .select()
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.supplierId, supplierId),
        eq(purchaseInvoices.status, 'pending')
      ));

    let totalPending = 0;
    for (const inv of invoicesResult) {
      const balance = await this.getPurchaseInvoiceBalance(inv.id);
      totalPending += parseFloat(balance);
    }

    return totalPending.toFixed(2);
  }

  async getSupplierBalances(supplierId: number, asOfDate: string): Promise<{ totalPending: string; totalOverdue: string }> {
    const invoicesResult = await db
      .select()
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.supplierId, supplierId),
        eq(purchaseInvoices.status, 'pending')
      ));

    let totalPending = 0;
    let totalOverdue = 0;
    const paymentDate = new Date(asOfDate);

    for (const inv of invoicesResult) {
      const balance = parseFloat(await this.getPurchaseInvoiceBalance(inv.id));
      if (balance > 0) {
        totalPending += balance;
        
        const invoiceDate = new Date(inv.date);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + inv.paymentTermsDays);
        
        if (paymentDate > dueDate) {
          totalOverdue += balance;
        }
      }
    }

    return {
      totalPending: totalPending.toFixed(2),
      totalOverdue: totalOverdue.toFixed(2),
    };
  }

  async getSupplierPendingInvoices(supplierId: number): Promise<(PurchaseInvoice & { balance: string })[]> {
    const invoicesResult = await db
      .select({
        invoice: purchaseInvoices,
        totalPaid: sum(supplierPayments.amount),
      })
      .from(purchaseInvoices)
      .leftJoin(supplierPayments, eq(supplierPayments.purchaseInvoiceId, purchaseInvoices.id))
      .where(and(
        eq(purchaseInvoices.supplierId, supplierId),
        eq(purchaseInvoices.status, 'pending')
      ))
      .groupBy(purchaseInvoices.id)
      .orderBy(desc(purchaseInvoices.id));

    const invoicesWithBalance: (PurchaseInvoice & { balance: string })[] = [];
    
    for (const row of invoicesResult) {
      const invoiceTotal = parseFloat(String(row.invoice.total));
      const paid = parseFloat(String(row.totalPaid || 0));
      const balance = Math.max(0, invoiceTotal - paid);
      
      if (balance > 0) {
        invoicesWithBalance.push({ 
          ...row.invoice, 
          balance: balance.toFixed(2) 
        });
      }
    }

    return invoicesWithBalance;
  }

  async createSupplierPaymentWithNumber(payment: InsertSupplierPayment, paymentNumber: string): Promise<SupplierPayment> {
    const [newPayment] = await db.insert(supplierPayments).values({
      ...payment,
      paymentNumber,
    }).returning();

    if (payment.purchaseInvoiceId) {
      const balance = await this.getPurchaseInvoiceBalance(payment.purchaseInvoiceId);
      const invoice = await this.getPurchaseInvoice(payment.purchaseInvoiceId);
      if (invoice) {
        const newStatus = parseFloat(balance) <= 0 ? 'paid' : 'pending';
        await this.updatePurchaseInvoice(payment.purchaseInvoiceId, { status: newStatus });
      }
    }

    return newPayment;
  }

  async createBulkSupplierPayment(data: {
    supplierId: number;
    amount: string;
    date: string;
    method: string;
    reference: string | null;
    notes: string | null;
    paymentAccountId: number | null;
    allocations: { invoiceId: number; amount: string }[];
  }): Promise<SupplierPayment[] | { error: string }> {
    const { supplierId, amount, date, method, reference, notes, paymentAccountId, allocations } = data;
    
    const totalPayment = parseFloat(amount);
    const totalAllocated = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0);
    
    if (totalAllocated > totalPayment) {
      return { error: "El total asignado excede el monto del pago" };
    }

    for (const alloc of allocations) {
      const balance = await this.getPurchaseInvoiceBalance(alloc.invoiceId);
      if (parseFloat(alloc.amount) > parseFloat(balance)) {
        return { error: `El monto asignado a una factura excede su balance pendiente` };
      }
    }

    const nextNumber = await this.getNextSupplierPaymentNumber();
    const sharedPaymentNumber = String(nextNumber).padStart(4, '0');

    const createdPayments: SupplierPayment[] = [];

    for (const alloc of allocations) {
      if (parseFloat(alloc.amount) > 0) {
        const payment = await this.createSupplierPaymentWithNumber({
          supplierId,
          purchaseInvoiceId: alloc.invoiceId,
          paymentAccountId,
          amount: alloc.amount,
          date,
          method,
          reference,
          notes,
        }, sharedPaymentNumber);
        createdPayments.push(payment);
      }
    }

    const unallocated = totalPayment - totalAllocated;
    if (unallocated > 0.01) {
      const advancePayment = await this.createSupplierPaymentWithNumber({
        supplierId,
        purchaseInvoiceId: null,
        paymentAccountId,
        amount: unallocated.toFixed(2),
        date,
        method,
        reference,
        notes: notes ? `${notes} (Anticipo)` : "Anticipo",
      }, sharedPaymentNumber);
      createdPayments.push(advancePayment);
    }

    // Create account transaction if paymentAccountId is provided
    if (paymentAccountId && createdPayments.length > 0) {
      const account = await this.getPaymentAccount(paymentAccountId);
      if (account) {
        // For credit cards: paying with card increases debt (add to balance)
        // For bank/cash: paying decreases balance (subtract from balance)
        const currentBalance = parseFloat(String(account.currentBalance));
        const newBalance = account.type === "tarjeta_credito"
          ? currentBalance + totalPayment  // Credit card: debt increases
          : currentBalance - totalPayment; // Bank/cash: balance decreases
        await this.updatePaymentAccountBalance(paymentAccountId, newBalance.toFixed(2));
        
        const supplier = await this.getSupplier(supplierId);
        await this.createAccountTransaction({
          paymentAccountId,
          type: 'salida',
          amount: amount,
          date,
          description: `Pago a proveedor: ${supplier?.name || 'Desconocido'}`,
          referenceType: 'supplier_payment',
          referenceId: createdPayments[0].id,
          receiptNumber: sharedPaymentNumber,
          notes,
        });
      }
    }

    return createdPayments;
  }

  // Payment Accounts
  async getPaymentAccounts(): Promise<PaymentAccount[]> {
    return await db.select().from(paymentAccounts).orderBy(desc(paymentAccounts.id));
  }

  async getPaymentAccount(id: number): Promise<PaymentAccount | undefined> {
    const [account] = await db.select().from(paymentAccounts).where(eq(paymentAccounts.id, id));
    return account || undefined;
  }

  async createPaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount> {
    const [newAccount] = await db.insert(paymentAccounts).values({
      ...account,
      currentBalance: account.initialBalance,
    }).returning();
    return newAccount;
  }

  async updatePaymentAccount(id: number, account: Partial<InsertPaymentAccount>): Promise<PaymentAccount | undefined> {
    const [updated] = await db
      .update(paymentAccounts)
      .set(account)
      .where(eq(paymentAccounts.id, id))
      .returning();
    return updated || undefined;
  }

  async updatePaymentAccountBalance(id: number, newBalance: string): Promise<void> {
    await db
      .update(paymentAccounts)
      .set({ currentBalance: newBalance })
      .where(eq(paymentAccounts.id, id));
  }

  async deletePaymentAccount(id: number): Promise<{ success: boolean; error?: string }> {
    // Check if account has transactions
    const transactions = await db
      .select()
      .from(accountTransactions)
      .where(eq(accountTransactions.paymentAccountId, id))
      .limit(1);
    
    if (transactions.length > 0) {
      return {
        success: false,
        error: "No se puede eliminar esta cuenta porque tiene movimientos registrados."
      };
    }

    const result = await db.delete(paymentAccounts).where(eq(paymentAccounts.id, id));
    return {
      success: result.rowCount !== null && result.rowCount > 0
    };
  }

  // Account Transactions
  async getAccountTransactions(paymentAccountId: number): Promise<AccountTransaction[]> {
    return await db
      .select()
      .from(accountTransactions)
      .where(eq(accountTransactions.paymentAccountId, paymentAccountId))
      .orderBy(desc(accountTransactions.createdAt));
  }

  async getAllAccountTransactions(): Promise<AccountTransaction[]> {
    return await db.select().from(accountTransactions).orderBy(desc(accountTransactions.createdAt));
  }

  async createAccountTransaction(transaction: InsertAccountTransaction): Promise<AccountTransaction> {
    const account = await this.getPaymentAccount(transaction.paymentAccountId);
    const balanceAfter = account?.currentBalance || "0";
    
    const [newTransaction] = await db.insert(accountTransactions).values({
      ...transaction,
      balanceAfter,
    }).returning();
    return newTransaction;
  }

  async getAccountTransaction(id: number): Promise<AccountTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(accountTransactions)
      .where(eq(accountTransactions.id, id));
    return transaction;
  }

  async deleteAccountTransaction(id: number): Promise<{ success: boolean; error?: string }> {
    const transaction = await this.getAccountTransaction(id);
    if (!transaction) {
      return { success: false, error: "Transacción no encontrada" };
    }

    const account = await this.getPaymentAccount(transaction.paymentAccountId);
    if (!account) {
      return { success: false, error: "Cuenta no encontrada" };
    }

    const amount = parseFloat(String(transaction.amount));
    const currentBalance = parseFloat(String(account.currentBalance));

    // If this is a transfer, handle both accounts atomically
    if (transaction.referenceType === 'transfer' && transaction.relatedAccountId) {
      const relatedAccount = await this.getPaymentAccount(transaction.relatedAccountId);
      if (!relatedAccount) {
        return { success: false, error: "Cuenta relacionada no encontrada" };
      }

      // Find the related transaction - match by date, amount, and related account references
      const relatedTransactions = await db
        .select()
        .from(accountTransactions)
        .where(
          and(
            eq(accountTransactions.paymentAccountId, transaction.relatedAccountId),
            eq(accountTransactions.relatedAccountId, transaction.paymentAccountId),
            eq(accountTransactions.referenceType, 'transfer'),
            eq(accountTransactions.amount, transaction.amount),
            eq(accountTransactions.date, transaction.date)
          )
        );

      const relatedTransaction = relatedTransactions[0];
      const relatedBalance = parseFloat(String(relatedAccount.currentBalance));

      // Determine which account is the sender and which is the receiver based on transaction type
      if (transaction.type === 'transferencia_salida') {
        // Current account was the sender (money left), related account was receiver (money came in)
        // Reversal: add money back to sender, remove from receiver
        const newSenderBalance = currentBalance + amount;
        await this.updatePaymentAccountBalance(transaction.paymentAccountId, newSenderBalance.toFixed(2));
        
        // For receiver: if credit card, original transfer subtracted (paid debt), so reversal adds back
        // For normal account: original transfer added, so reversal subtracts
        const newReceiverBalance = relatedAccount.type === "tarjeta_credito"
          ? relatedBalance + amount  // Credit card: was subtracted, now add back (increase debt)
          : relatedBalance - amount; // Normal: was added, now subtract
        await this.updatePaymentAccountBalance(transaction.relatedAccountId, newReceiverBalance.toFixed(2));
      } else {
        // transaction.type === 'transferencia_entrada'
        // Current account was the receiver, related account was sender
        // Reversal: remove money from receiver, add back to sender
        
        // For current account (receiver):
        const newReceiverBalance = account.type === "tarjeta_credito"
          ? currentBalance + amount  // Credit card: was subtracted, now add back (increase debt)
          : currentBalance - amount; // Normal: was added, now subtract
        await this.updatePaymentAccountBalance(transaction.paymentAccountId, newReceiverBalance.toFixed(2));
        
        // For related account (sender): add money back
        const newSenderBalance = relatedBalance + amount;
        await this.updatePaymentAccountBalance(transaction.relatedAccountId, newSenderBalance.toFixed(2));
      }

      // Delete both transactions
      if (relatedTransaction) {
        await db.delete(accountTransactions).where(eq(accountTransactions.id, relatedTransaction.id));
      }
      await db.delete(accountTransactions).where(eq(accountTransactions.id, id));
    } else {
      // Regular transaction (not a transfer)
      let newBalance: number;
      
      if (transaction.type === 'entrada') {
        // Entry was added, reversal subtracts
        newBalance = currentBalance - amount;
      } else if (transaction.type === 'salida') {
        // Exit was subtracted, reversal adds
        newBalance = currentBalance + amount;
      } else {
        // Unknown type, just delete without balance change
        await db.delete(accountTransactions).where(eq(accountTransactions.id, id));
        return { success: true };
      }
      
      await this.updatePaymentAccountBalance(transaction.paymentAccountId, newBalance.toFixed(2));
      await db.delete(accountTransactions).where(eq(accountTransactions.id, id));
    }

    return { success: true };
  }

  async createTransfer(data: {
    fromAccountId: number;
    toAccountId: number;
    amount: string;
    date: string;
    description: string;
    notes: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    const { fromAccountId, toAccountId, amount, date, description, notes } = data;
    
    const fromAccount = await this.getPaymentAccount(fromAccountId);
    const toAccount = await this.getPaymentAccount(toAccountId);
    
    if (!fromAccount || !toAccount) {
      return { success: false, error: "Cuenta no encontrada" };
    }

    const transferAmount = parseFloat(amount);
    const fromBalance = parseFloat(String(fromAccount.currentBalance));
    
    const newFromBalance = fromBalance - transferAmount;
    const toBalance = parseFloat(String(toAccount.currentBalance));
    const newToBalance = toAccount.type === "tarjeta_credito" 
      ? toBalance - transferAmount 
      : toBalance + transferAmount;

    // Update balances
    await this.updatePaymentAccountBalance(fromAccountId, newFromBalance.toFixed(2));
    await this.updatePaymentAccountBalance(toAccountId, newToBalance.toFixed(2));

    // Create transaction records
    await this.createAccountTransaction({
      paymentAccountId: fromAccountId,
      type: 'transferencia_salida',
      amount,
      date,
      description: `Transferencia a: ${toAccount.name}`,
      referenceType: 'transfer',
      relatedAccountId: toAccountId,
      notes,
    });

    await this.createAccountTransaction({
      paymentAccountId: toAccountId,
      type: 'transferencia_entrada',
      amount,
      date,
      description: `Transferencia desde: ${fromAccount.name}`,
      referenceType: 'transfer',
      relatedAccountId: fromAccountId,
      notes,
    });

    return { success: true };
  }

  // Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).orderBy(desc(expenseCategories.id));
  }

  async getExpenseCategory(id: number): Promise<ExpenseCategory | undefined> {
    const [category] = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));
    return category || undefined;
  }

  async createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [newCategory] = await db.insert(expenseCategories).values(category).returning();
    return newCategory;
  }

  async updateExpenseCategory(id: number, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const [updated] = await db
      .update(expenseCategories)
      .set(category)
      .where(eq(expenseCategories.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExpenseCategory(id: number): Promise<{ success: boolean; error?: string }> {
    // Check if category has subcategories
    const subcats = await db.select().from(expenseSubcategories).where(eq(expenseSubcategories.categoryId, id));
    if (subcats.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar esta categoría porque tiene ${subcats.length} subcategoría(s). Elimine primero las subcategorías.`
      };
    }

    // Check if category is used in any purchase invoice
    const usedInInvoices = await db
      .select()
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.expenseCategoryId, id));
    
    if (usedInInvoices.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar esta categoría porque está siendo usada en ${usedInInvoices.length} factura(s) de compra.`
      };
    }

    const result = await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
    return { success: result.rowCount !== null && result.rowCount > 0 };
  }

  // Expense Subcategories
  async getExpenseSubcategories(categoryId?: number): Promise<ExpenseSubcategory[]> {
    if (categoryId) {
      return await db.select().from(expenseSubcategories)
        .where(eq(expenseSubcategories.categoryId, categoryId))
        .orderBy(desc(expenseSubcategories.id));
    }
    return await db.select().from(expenseSubcategories).orderBy(desc(expenseSubcategories.id));
  }

  async getExpenseSubcategory(id: number): Promise<ExpenseSubcategory | undefined> {
    const [subcategory] = await db.select().from(expenseSubcategories).where(eq(expenseSubcategories.id, id));
    return subcategory || undefined;
  }

  async createExpenseSubcategory(subcategory: InsertExpenseSubcategory): Promise<ExpenseSubcategory> {
    const [newSubcategory] = await db.insert(expenseSubcategories).values(subcategory).returning();
    return newSubcategory;
  }

  async updateExpenseSubcategory(id: number, subcategory: Partial<InsertExpenseSubcategory>): Promise<ExpenseSubcategory | undefined> {
    const [updated] = await db
      .update(expenseSubcategories)
      .set(subcategory)
      .where(eq(expenseSubcategories.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExpenseSubcategory(id: number): Promise<boolean> {
    const result = await db.delete(expenseSubcategories).where(eq(expenseSubcategories.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Conduces
  async getConduces(): Promise<Conduce[]> {
    return await db.select().from(conduces).orderBy(desc(conduces.id));
  }

  async getConduce(id: number): Promise<Conduce | undefined> {
    const [conduce] = await db.select().from(conduces).where(eq(conduces.id, id));
    return conduce || undefined;
  }

  async getNextConduceNumber(): Promise<number> {
    const settings = await this.getCompanySettings();
    const startNumber = settings?.conduceStartNumber || 1;
    
    const [result] = await db
      .select({ maxNumber: conduces.conduceNumber })
      .from(conduces)
      .orderBy(desc(conduces.id))
      .limit(1);
    
    if (!result) {
      return startNumber;
    }
    
    const lastNumber = parseInt(result.maxNumber.replace(/\D/g, '')) || 0;
    return Math.max(lastNumber + 1, startNumber);
  }

  async createConduce(conduce: Omit<InsertConduce, 'conduceNumber'>): Promise<Conduce> {
    const nextNumber = await this.getNextConduceNumber();
    const conduceNumber = String(nextNumber).padStart(6, '0');
    
    const [newConduce] = await db
      .insert(conduces)
      .values({ ...conduce, conduceNumber })
      .returning();
    return newConduce;
  }

  async updateConduce(id: number, conduce: Partial<InsertConduce>): Promise<Conduce | undefined> {
    const [updated] = await db
      .update(conduces)
      .set(conduce)
      .where(eq(conduces.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteConduce(id: number): Promise<boolean> {
    // First delete all items
    await db.delete(conduceItems).where(eq(conduceItems.conduceId, id));
    // Then delete the conduce
    const result = await db.delete(conduces).where(eq(conduces.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Conduce Items
  async getConduceItems(conduceId: number): Promise<ConduceItem[]> {
    return await db.select().from(conduceItems).where(eq(conduceItems.conduceId, conduceId));
  }

  async createConduceItem(item: InsertConduceItem): Promise<ConduceItem> {
    const [newItem] = await db.insert(conduceItems).values(item).returning();
    return newItem;
  }

  async deleteConduceItems(conduceId: number): Promise<boolean> {
    const result = await db.delete(conduceItems).where(eq(conduceItems.conduceId, conduceId));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
