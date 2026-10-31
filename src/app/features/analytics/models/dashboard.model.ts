export interface DashboardDateFilters {
    start_date?: string;
    end_date?: string;
}

export interface DashboardTopProductsFilters extends DashboardDateFilters {
    top?: number;
}

export interface DashboardInventoryAlertsFilters {
    expiration_days?: number;
    top?: number;
}

export interface DashboardOverview {
    sales_total: number;
    purchases_total: number;
    active_customers: number;
    low_stock_products: number;
}

export interface DashboardSalesTrend {
    year: number;
    month: number;
    period: string;
    total_sales: number;
    invoice_count: number;
}

export interface DashboardTopProduct {
    product_id: number;
    sku: string;
    product_name: string;
    quantity_sold: number;
    total_sales: number;
    invoice_count: number;
    average_unit_price: number | null;
}

export interface DashboardSalesByCategory {
    category_id: number;
    category_name: string;
    total_sales: number;
    quantity_sold: number;
    invoice_count: number;
    percentage: number;
}

export type DashboardAlertType = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRED' | 'EXPIRING_SOON';

export type DashboardAlertPriority = 'HIGH' | 'MEDIUM';

export interface DashboardInventoryAlert {
    alert_type: DashboardAlertType;
    priority: DashboardAlertPriority;
    product_id: number;
    sku: string;
    product_name: string;
    warehouse_id: number | null;
    warehouse_name: string | null;
    batch_id: number | null;
    batch_number: string | null;
    expiration_date: string | null;
    available_quantity: number;
    reorder_point: number;
    days_until_expiration: number | null;
}
