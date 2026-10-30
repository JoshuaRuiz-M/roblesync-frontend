export type SalesInvoiceStatus = 'ISSUED' | 'CANCELLED';

export interface SalesInvoice {
    sales_invoice_id: number;
    sales_order_id: number;
    customer_id: number;
    salesperson_id: number;
    invoice_series: string;
    invoice_number: string;
    dte_uuid: string | null;
    invoice_date: string;
    due_date: string;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    status: SalesInvoiceStatus;
    cancellation_reason: string | null;
    cancelled_at: string | null;
    cancelled_by: number | null;
    created_at: string;
    created_by: number;
    updated_at: string | null;
    updated_by: number | null;
}

export interface SalesInvoiceDetail {
    sales_invoice_detail_id: number;
    sales_invoice_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    discount_amount: number;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    created_at: string;
    created_by: number;
}

export interface SalesInvoiceWithDetails extends SalesInvoice {
    details: SalesInvoiceDetail[];
}

export interface CreateSalesInvoice {
    sales_order_id: number;
    invoice_series: string;
    invoice_number: string;
    dte_uuid?: string | null;
}

export interface CancelSalesInvoice {
    cancellation_reason: string;
}
