export interface Role {
    role_id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface CreateRole {
    code: string;
    name: string;
    description?: string | null;
    is_active: boolean;
}

export interface UpdateRole {
    code?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
}

export interface RoleMenuItem {
    menu_item_id: number;
    parent_id: number | null;
    code: string;
    label: string;
    path: string | null;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
}

export interface SyncRoleMenuItems {
    menu_item_ids: number[];
}

export interface RolePermissionItem {
    permission_id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
}

export interface SyncRolePermissions {
    permission_ids: number[];
}
