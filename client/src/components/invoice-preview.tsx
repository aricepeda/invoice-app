import React from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Customer, Product, InvoiceDesignSettings } from "@shared/schema";

interface InvoiceItem {
  productId: string;
  productName?: string;
  quantity: number;
  price: number;
  tax: number;
}

interface CompanyInfo {
  name?: string;
  rnc?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

interface InvoicePreviewProps {
  invoiceNumber?: number | string;
  customer?: Customer;
  customerName?: string;
  customerRnc?: string;
  customerAddress?: string;
  customerPhone?: string;
  ncfType: string;
  ncfNumber?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  sellerName?: string;
  products?: Product[];
  companyInfo?: CompanyInfo;
  designSettings?: InvoiceDesignSettings | null;
  paymentMethod?: string;
}

export function InvoicePreview({
  invoiceNumber,
  customerName,
  customerRnc,
  customerAddress,
  customerPhone,
  ncfType,
  ncfNumber,
  date,
  dueDate,
  items,
  subtotal,
  tax,
  discount,
  total,
  notes,
  sellerName,
  products = [],
  companyInfo,
  designSettings,
  paymentMethod
}: InvoicePreviewProps) {
  
  const getProductName = (productId: string) => {
    const product = products.find(p => String(p.id) === productId);
    return product?.name || 'Producto no seleccionado';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getNcfLabel = (type: string) => {
    const labels: Record<string, string> = {
      'B01': 'B01 - Crédito Fiscal',
      'B02': 'B02 - Consumidor Final',
      'B11': 'B11 - Nota de Crédito',
      'B14': 'B14 - Gubernamental',
      'B15': 'B15 - Regímenes Especiales'
    };
    return labels[type] || type;
  };

  const primaryColor = designSettings?.primaryColor || '#111826';
  const fontFamily = designSettings?.fontFamily || 'Inter';
  const headerText = designSettings?.headerText || 'FACTURA';
  const footerText = designSettings?.footerText || 'Gracias por su preferencia';
  const showNotes = designSettings?.showNotes ?? true;
  const showSignature = designSettings?.showSignature ?? true;
  const showPaymentMethod = designSettings?.showPaymentMethod ?? true;
  const showDueDate = designSettings?.showDueDate ?? true;

  const logoSizeMap = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };
  const logoSize = logoSizeMap[designSettings?.logoSize as keyof typeof logoSizeMap] || 'w-12 h-12';

  // Paper size dimensions in pixels (assuming 96 DPI)
  const paperSizeMap: Record<string, { width: number; height: number }> = {
    letter: { width: 816, height: 1056 }, // 8.5 x 11 inches (portrait)
  };

  const paperDimensions = paperSizeMap[designSettings?.paperSize || 'letter'];
  const previewWidth = paperDimensions.width;
  const previewHeight = paperDimensions.height;

  // Standard layout for Carta (letter) paper
  return (
    <div className="p-8 bg-white" id="invoice-preview" style={{
      backgroundColor: 'white',
      padding: '48px',
      width: `${previewWidth}px`,
      height: `${previewHeight}px`,
      margin: '0 auto',
      fontFamily: fontFamily,
      overflow: 'auto',
      boxSizing: 'border-box'
    }}>
      {/* Header with Logo/Brand Area */}
      <div className="flex justify-between items-start mb-12">
        <div>
          {companyInfo?.logoUrl ? (
            <img 
              src={companyInfo.logoUrl} 
              alt="Logo" 
              className={`${logoSize} object-contain rounded-lg mb-3`}
            />
          ) : (
            <div className={`${logoSize} bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg mb-3`}></div>
          )}
          <h1 className="text-4xl font-bold mb-1" style={{ color: primaryColor }}>{headerText}</h1>
          <p className="text-lg font-semibold text-gray-700">{companyInfo?.name || 'Tu Empresa S.R.L.'}</p>
          <div className="mt-4 space-y-1">
            <p className="text-sm text-gray-600">RNC: {companyInfo?.rnc || '000-0000000-0'}</p>
            <p className="text-sm text-gray-600">{companyInfo?.address || 'Calle Principal #123'}</p>
            {companyInfo?.phone && <p className="text-sm text-gray-600">Tel: {companyInfo.phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="rounded-lg p-6 border" style={{ 
            backgroundColor: `${primaryColor}10`,
            borderColor: `${primaryColor}30`
          }}>
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: primaryColor }}>Invoice No.</div>
            <div className="text-4xl font-bold mb-4" style={{ color: primaryColor }}>
              {invoiceNumber ? `#${invoiceNumber}` : '#----'}
            </div>
            {ncfType && (
              <div className="pt-3 border-t" style={{ borderColor: `${primaryColor}30` }}>
                <span className="text-xs font-medium" style={{ color: primaryColor }}>NCF: {getNcfLabel(ncfType)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client & Date Info */}
      <div className="grid grid-cols-2 gap-12 mb-12 pb-12 border-b border-gray-200">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Facturar A</h3>
          <p className="text-lg font-semibold text-gray-900 mb-1">{customerName || 'Cliente no seleccionado'}</p>
          {customerRnc && <p className="text-sm text-gray-600">RNC/Cédula: {customerRnc}</p>}
          {customerAddress && <p className="text-sm text-gray-600 mt-2">{customerAddress}</p>}
          {customerPhone && <p className="text-sm text-gray-600">Tel: {customerPhone}</p>}
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fecha de Emisión</p>
            <p className="text-sm font-semibold text-gray-900">{formatDate(date) || 'No especificada'}</p>
          </div>
          {showDueDate && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fecha de Vencimiento</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(dueDate) || 'No especificada'}</p>
            </div>
          )}
          {showPaymentMethod && paymentMethod && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Método de Pago</p>
              <p className="text-sm font-semibold text-gray-900">{paymentMethod}</p>
            </div>
          )}
          {sellerName && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Vendedor</p>
              <p className="text-sm font-semibold text-gray-900">{sellerName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-12">
        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-200" style={{ backgroundColor: `${primaryColor}08` }}>
              <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wide" style={{ color: primaryColor }}>Descripción</th>
              <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wide w-20" style={{ color: primaryColor }}>Cant.</th>
              <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wide w-32" style={{ color: primaryColor }}>Precio Unit.</th>
              <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wide w-32" style={{ color: primaryColor }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 text-sm text-gray-900">
                    {getProductName(item.productId)}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900 text-center font-medium">
                    {item.quantity || 0}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900 text-right font-mono">
                    RD$ {(item.price || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900 text-right font-mono font-semibold">
                    RD$ {((item.quantity || 0) * (item.price || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                  No hay productos agregados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-12">
        <div className="w-96">
          <div className="rounded-lg p-6 border" style={{ 
            backgroundColor: `${primaryColor}08`,
            borderColor: `${primaryColor}20`
          }}>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-mono text-gray-900">RD$ {subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ITBIS (18%)</span>
                <span className="text-sm font-mono text-gray-900">RD$ {tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Descuento</span>
                  <span className="text-sm font-mono text-green-600">- RD$ {discount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
            <Separator className="my-4 bg-gray-300" />
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total a Pagar</span>
              <span className="text-3xl font-bold font-mono" style={{ color: primaryColor }}>RD$ {total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {showNotes && notes && (
        <div className="mb-8 p-4 rounded-lg border" style={{
          backgroundColor: `${primaryColor}08`,
          borderColor: `${primaryColor}20`
        }}>
          <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: primaryColor }}>Notas</h4>
          <p className="text-sm text-gray-700 whitespace-pre-line">{notes}</p>
        </div>
      )}

      {/* Signature Area */}
      {showSignature && (
        <div className="mb-8 flex justify-end">
          <div className="w-64">
            <div className="border-b border-gray-300 mb-2 h-12"></div>
            <p className="text-xs text-gray-500 text-center">Firma Autorizada</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-8 border-t border-gray-200 text-center">
        <p className="text-xs font-medium" style={{ color: primaryColor }}>{footerText}</p>
        <p className="text-xs text-gray-400 mt-2">Este documento es válido para fines fiscales | Sistema de Facturación Electrónica</p>
      </div>
    </div>
  );
}
