import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ProductsService } from '../../services/products.service';

import type { ProductSupplierDetail } from '../../models/product.model';
import { TooltipModule } from 'primeng/tooltip';

@Component({
    selector: 'app-product-suppliers',
    imports: [ButtonModule, TagModule, ProgressSpinnerModule, TooltipModule],
    templateUrl: './product-suppliers.html',
    styleUrl: './product-suppliers.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSuppliers {
    private readonly productsService = inject(ProductsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly productId = input.required<number>();
    readonly canManage = input(false);
    readonly refreshKey = input(0);

    readonly associate = output<void>();
    readonly edit = output<ProductSupplierDetail>();

    readonly suppliers = signal<ProductSupplierDetail[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly preferred = output<ProductSupplierDetail>();
    readonly remove = output<ProductSupplierDetail>();

    constructor() {
        effect((onCleanup) => {
            const productId = this.productId();
            this.refreshKey();

            this.suppliers.set([]);
            this.error.set(false);
            this.loading.set(true);

            const subscription = this.productsService
                .getSuppliers(productId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (response) => {
                        this.suppliers.set(response.data);
                        this.loading.set(false);
                    },
                    error: () => {
                        this.error.set(true);
                        this.loading.set(false);
                    },
                });

            onCleanup(() => subscription.unsubscribe());
        });
    }

    onAssociate(): void {
        if (!this.canManage()) {
            return;
        }

        this.associate.emit();
    }

    onEdit(supplier: ProductSupplierDetail): void {
        if (!this.canManage()) {
            return;
        }

        this.edit.emit(supplier);
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(false);

        this.productsService
            .getSuppliers(this.productId())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.suppliers.set(response.data);
                    this.loading.set(false);
                },
                error: () => {
                    this.error.set(true);
                    this.loading.set(false);
                },
            });
    }

    onSetPreferred(supplier: ProductSupplierDetail): void {
        if (!this.canManage() || !supplier.is_active || supplier.is_preferred) {
            return;
        }

        this.preferred.emit(supplier);
    }

    onRemove(supplier: ProductSupplierDetail): void {
        if (!this.canManage()) {
            return;
        }

        this.remove.emit(supplier);
    }
}
