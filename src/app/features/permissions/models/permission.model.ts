export interface Permission {
    permission_id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface CreatePermission {
    code: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
}

export interface UpdatePermission {
    code?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
}
