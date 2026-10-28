export interface MenuItem {
    menu_item_id: number;
    parent_id: number | null;
    code: string;
    label: string;
    path: string | null;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface CreateMenuItem {
    parent_id?: number | null;
    code: string;
    label: string;
    path?: string | null;
    icon?: string | null;
    sort_order: number;
    is_active: boolean;
}

export interface UpdateMenuItem {
    parent_id?: number | null;
    code?: string;
    label?: string;
    path?: string | null;
    icon?: string | null;
    sort_order?: number;
    is_active?: boolean;
}
