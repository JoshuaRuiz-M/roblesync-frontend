export interface SupplierInvoice {
    supplier_invoice_id: number;
    supplier_id: number;
    purchase_order_id: number;
    invoice_number: string;
    invoice_date: Date | string;
    due_date: Date | string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'REGISTERED' | 'CANCELLED';
    notes: string | null;
    created_at: Date | string;
    created_by: number;
    updated_at: Date | null;
    updated_by: number | null;
}

export interface CreateSupplierInvoice {
    supplier_id: number;
    purchase_order_id: number;
    invoice_number: string;
    invoice_date: Date | string;
    due_date: Date | string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'REGISTERED' | 'CANCELLED';
    notes?: string | null;
}

export interface UpdateSupplierInvoice {
    supplier_id?: number;
    purchase_order_id?: number;
    invoice_number?: string;
    invoice_date?: Date | string;
    due_date?: Date | string;
    subtotal?: number;
    tax_amount?: number;
    total_amount?: number;
    status?: 'REGISTERED' | 'CANCELLED';
    notes?: string | null;
}
