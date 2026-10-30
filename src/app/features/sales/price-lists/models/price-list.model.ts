export interface PriceList {
    price_list_id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    created_by: number;
    updated_at: string | null;
    updated_by: number | null;
}

export interface PriceListDetail {
    price_list_detail_id: number;
    price_list_id: number;
    product_id: number;
    unit_price: number;
    created_at: string;
    created_by: number;
    updated_at: string | null;
    updated_by: number | null;
}

export interface PriceListWithDetails extends PriceList {
    details: PriceListDetail[];
}

export interface CreatePriceListDetail {
    product_id: number;
    unit_price: number;
}

export interface CreatePriceList {
    code: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
    details: CreatePriceListDetail[];
}

export interface UpdatePriceList {
    code?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
    details?: CreatePriceListDetail[];
}
