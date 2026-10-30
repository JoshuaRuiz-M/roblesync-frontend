export interface SaleTarget {
    sales_target_id: number;
    salesperson_id: number;
    target_year: number;
    target_month: number;
    target_amount: number;
    created_at: string;
    created_by: number;
    updated_at: Date | null;
    updated_by: number | null;
}

export interface CreateSalesTarget {
    salesperson_id: number;
    target_year: number;
    target_month: number;
    target_amount: number;
}

export interface UpdateSalesTarget {
    salesperson_id?: number;
    target_year?: number;
    target_month?: number;
    target_amount?: number;
}
