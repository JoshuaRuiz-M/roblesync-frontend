export interface Category {
    category_id: number;
    code: string;
    name: string;
    description?: string | null;
    is_active: boolean;
    created_at: Date;
    created_by: number;
    updated_at?: Date | null;
    updated_by?: number | null;
}

export interface CreateCategory {
    code: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
}

export interface UpdateCategory {
    code?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
}
