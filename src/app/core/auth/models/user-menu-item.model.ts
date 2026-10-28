export interface UserMenuItem {
    id: number;
    label: string;
    icon?: string;
    routerLink?: string;
    items?: UserMenuItem[];
}
