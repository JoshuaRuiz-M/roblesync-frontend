import type { SupplierInvoice } from './supplier-invoice.model';

export type SupplierInvoiceStatus = SupplierInvoice['status'];

export const SUPPLIER_INVOICE_STATUS_OPTIONS: {
    label: string;
    value: SupplierInvoiceStatus;
}[] = [
    { label: 'Registrada', value: 'REGISTERED' },
    { label: 'Anulada', value: 'CANCELLED' },
];

export const SUPPLIER_INVOICE_STATUS_LABELS: Record<SupplierInvoiceStatus, string> = {
    REGISTERED: 'Registrada',
    CANCELLED: 'Anulada',
};
