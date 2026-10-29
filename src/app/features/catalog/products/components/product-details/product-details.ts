import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { DatePipe, DecimalPipe } from '@angular/common';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import type { Product } from '../../models/product.model';
import type { Brand } from '../../../brands/models/brand.model';
import type { ProductLine } from '../../../product-lines/models/product-line.model';

import { ProductBarcode } from '../product-barcode/product-barcode';
import { UnitOfMeasure } from '../../../units-of-mesure/models/unit-of-mesure.model';

@Component({
    selector: 'app-product-details',
    imports: [DatePipe, DecimalPipe, DrawerModule, ButtonModule, TagModule, ProductBarcode],
    templateUrl: './product-details.html',
    styleUrl: './product-details.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetails {
    readonly visible = input(false);
    readonly visibleChange = output<boolean>();

    readonly product = input<Product | null>(null);

    readonly brandItems = input<Brand[]>([]);
    readonly productLineItems = input<ProductLine[]>([]);
    readonly unitItems = input<UnitOfMeasure[]>([]);

    readonly canEdit = input(false);
    readonly edit = output<Product>();

    readonly brandName = computed(() => {
        const product = this.product();

        if (!product) {
            return '—';
        }

        return (
            this.brandItems().find((item) => item.brand_id === product.brand_id)?.name ??
            `Marca #${product.brand_id}`
        );
    });

    readonly productLineName = computed(() => {
        const product = this.product();

        if (!product) {
            return '—';
        }

        return (
            this.productLineItems().find((item) => item.product_line_id === product.product_line_id)
                ?.name ?? `Línea #${product.product_line_id}`
        );
    });

    readonly unitName = computed(() => {
        const product = this.product();

        if (!product) {
            return '—';
        }

        const unit = this.unitItems().find(
            (item) => item.unit_of_measure_id === product.unit_of_measure_id,
        );

        return unit
            ? `${unit.name} (${unit.abbreviation})`
            : `Unidad #${product.unit_of_measure_id}`;
    });

    readonly profitMargin = computed<number | null>(() => {
        const product = this.product();

        if (!product) {
            return null;
        }

        const price = Number(product.list_price);
        const cost = Number(product.average_cost);

        if (!Number.isFinite(price) || !Number.isFinite(cost) || price <= 0) {
            return null;
        }

        return ((price - cost) / price) * 100;
    });

    readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    formatCurrency(value: number): string {
        return this.currencyFormatter.format(Number(value));
    }

    close(): void {
        this.visibleChange.emit(false);
    }

    onEdit(): void {
        const product = this.product();

        if (!product || !this.canEdit()) {
            return;
        }

        this.close();
        this.edit.emit(product);
    }
}
