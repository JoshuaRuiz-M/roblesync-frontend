import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import type { PriceListWithDetails } from '../../models/price-list.model';
import type { Product } from '../../../../catalog/products/models/product.model';

@Component({
    selector: 'app-price-list-details',
    imports: [DrawerModule, ButtonModule, TagModule, DividerModule],
    templateUrl: './price-list-details.html',
    styleUrl: './price-list-details.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceListDetails {
    readonly visible = model(false);

    readonly priceList = input<PriceListWithDetails | null>(null);
    readonly products = input<Product[]>([]);

    readonly canEdit = input(false);
    readonly processing = input(false);

    readonly edit = output<PriceListWithDetails>();

    readonly status = computed(() => {
        const priceList = this.priceList();

        return priceList?.is_active
            ? {
                  label: 'Activa',
                  severity: 'success' as const,
                  icon: 'pi pi-check-circle',
              }
            : {
                  label: 'Inactiva',
                  severity: 'secondary' as const,
                  icon: 'pi pi-ban',
              };
    });

    readonly totalProducts = computed(() => this.priceList()?.details.length ?? 0);

    readonly canEditPriceList = computed(() => this.canEdit() && this.priceList() !== null);

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    private readonly unitPriceFormatter = new Intl.NumberFormat('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    });

    getProductName(productId: number): string {
        return (
            this.products().find((product) => product.product_id === productId)?.name ??
            `Producto #${productId}`
        );
    }

    getProductSku(productId: number): string {
        return (
            this.products().find((product) => product.product_id === productId)?.sku ??
            'Sin SKU disponible'
        );
    }

    getProductBasePrice(productId: number): number | null {
        const product = this.products().find((item) => item.product_id === productId);

        return product ? Number(product.list_price) : null;
    }

    formatCurrency(value: number): string {
        return this.currencyFormatter.format(Number(value));
    }

    formatUnitPrice(value: number): string {
        return `Q ${this.unitPriceFormatter.format(Number(value))}`;
    }

    formatDate(value: string | null): string {
        if (!value) {
            return 'Sin modificaciones';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'Fecha no disponible';
        }

        return new Intl.DateTimeFormat('es-GT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        }).format(date);
    }

    onEdit(): void {
        const priceList = this.priceList();

        if (!priceList || !this.canEditPriceList() || this.processing()) {
            return;
        }

        this.edit.emit(priceList);
    }
}
