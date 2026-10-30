export interface Customer {
    customer_id: number;
    customer_code: string;
    tax_id: string;
    business_name: string;
    customer_type: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    salesperson_id: number;
    price_list_id: number;
    credit_days: number;
    credit_limit: number;
    is_credit_blocked: boolean;
    is_active?: boolean;
    created_at: Date;
    created_by: number;
    updated_at: Date | null;
    updated_by: number | null;
}

export interface CreateCustomer {
    customer_code: string;
    tax_id: string;
    business_name: string;
    customer_type: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    salesperson_id: number;
    price_list_id: number;
    credit_days: number;
    credit_limit: number;
    is_credit_blocked: boolean;
    is_active: boolean;
}

export interface UpdateCustomer {
    customer_code?: string;
    tax_id?: string;
    business_name?: string;
    customer_type?: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    salesperson_id?: number;
    price_list_id?: number;
    credit_days?: number;
    credit_limit?: number;
    is_credit_blocked?: boolean;
    is_active?: boolean;
}
