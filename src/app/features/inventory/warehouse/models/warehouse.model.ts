export interface Warehouse {
    warehouse_id: number;
    code: string;
    name: string;
    description: string | null;
    address: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date | null;
    created_by: number;
    updated_by: number | null;
}

export interface CreateWarehouse {
    code: string;
    name: string;
    description?: string | null;
    address?: string | null;
    is_active?: boolean;
}

export interface UpdateWarehouse {
    code?: string;
    name?: string;
    description?: string | null;
    address?: string | null;
    is_active?: boolean;
}
