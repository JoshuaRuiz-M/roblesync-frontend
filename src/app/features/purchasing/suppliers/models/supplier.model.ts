export interface Supplier {
    supplier_id: number;
    tax_id: string;
    business_name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    credit_days: number;
    credit_limit: number;
    is_active: boolean;
    created_at: Date;
    created_by: number;
    updated_at: Date | null;
    updated_by: number | null;
}

export interface CreateSupplier {
    tax_id: string;
    business_name: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    credit_days: number;
    credit_limit: number;
    is_active: boolean;
}

export interface UpdateSupplier {
    tax_id?: string;
    business_name?: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    credit_days?: number;
    credit_limit?: number;
    is_active?: boolean;
}
