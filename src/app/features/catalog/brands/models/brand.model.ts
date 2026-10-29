export interface Brand {
    brand_id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date | null;
    created_by: number;
    updated_by: number | null;
}

export interface CreateBrand {
    code: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
}

export interface UpdateBrand {
    code?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
}
