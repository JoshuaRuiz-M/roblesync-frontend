export interface Saleperson {
    salesperson_id: number;
    user_id: number;
    employee_code: string;
    phone: string | null;
    is_active: boolean;
    created_at: Date;
    created_by: number;
    updated_at: Date | null;
    updated_by: number | null;
}

export interface CreateSaleperson {
    user_id: number;
    employee_code: string;
    phone: string | null;
    is_active: boolean;
}

export interface UpdateSaleperson {
    user_id?: number;
    employee_code?: string;
    phone?: string | null;
    is_active?: boolean;
}
