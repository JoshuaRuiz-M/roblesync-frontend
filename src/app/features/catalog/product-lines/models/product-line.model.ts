export interface ProductLine {
    product_line_id: number;
    category_id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date | null;
    created_by: number;
    updated_by: number | null;
}

export interface CreateProductLine {
    category_id: number;
    code: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
}

export interface UpdateProductLine {
    category_id?: number;
    code?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
}
