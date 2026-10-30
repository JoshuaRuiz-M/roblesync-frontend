export type SalesOrderStatus =
    | 'DRAFT'
    | 'PENDING'
    | 'APPROVED'
    | 'RESERVED'
    | 'COMPLETED'
    | 'CANCELLED';

export type SalesOrderCreditStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SalesOrder {
    sales_order_id: number;
    order_number: string;
    customer_id: number;
    salesperson_id: number;
    warehouse_id: number;
    order_date: string;
    status: SalesOrderStatus;
    credit_status: SalesOrderCreditStatus;
    credit_authorized_at: string | null;
    credit_authorized_by: number | null;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    notes: string | null;
    created_at: string;
    created_by: number;
    updated_at: string | null;
    updated_by: number | null;
}

export interface SalesOrderDetail {
    sales_order_detail_id: number;
    sales_order_id: number;
    product_id: number;
    quantity: number;
    quantity_reserved: number;
    unit_price: number;
    discount_amount: number;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    created_at: string;
    created_by: number;
    updated_at: string | null;
    updated_by: number | null;
}

export interface SalesOrderWithDetails extends SalesOrder {
    details: SalesOrderDetail[];
}

export interface CreateSalesOrderDetail {
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
}

export interface CreateSalesOrder {
    customer_id: number;
    salesperson_id: number;
    warehouse_id: number;
    notes?: string | null;
    details: CreateSalesOrderDetail[];
}

export interface UpdateSalesOrder {
    customer_id?: number;
    salesperson_id?: number;
    warehouse_id?: number;
    notes?: string | null;
    details?: CreateSalesOrderDetail[];
}
