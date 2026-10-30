import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';

import type {
    ProductSupplierDetail,
    CreateProductSupplier,
    UpdateProductSupplier,
} from '../../models/product.model';
import { Supplier } from '../../../../purchasing/suppliers/models/supplier.model';

export type ProductSupplierFormSave =
    | {
          mode: 'create';
          payload: CreateProductSupplier;
      }
    | {
          mode: 'edit';
          supplierId: number;
          payload: UpdateProductSupplier;
      };

@Component({
    selector: 'app-product-supplier-form',
    imports: [ReactiveFormsModule, ButtonModule, DialogModule, SelectModule, CheckboxModule],
    templateUrl: './product-supplier-form.html',
    styleUrl: './product-supplier-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSupplierForm {
    private readonly fb = inject(FormBuilder);

    readonly visible = input(false);
    readonly visibleChange = output<boolean>();

    readonly suppliers = input<Supplier[]>([]);
    readonly association = input<ProductSupplierDetail | null>(null);
    readonly productName = input('');

    readonly saving = input(false);
    readonly save = output<ProductSupplierFormSave>();

    readonly submitted = signal(false);

    readonly isEditing = computed(() => this.association() !== null);

    readonly loadingSuppliers = input(false);
    readonly suppliersError = input(false);
    readonly associatedSupplierIds = input<number[]>([]);

    readonly supplierOptions = computed(() =>
        this.suppliers()
            .filter(
                (supplier) =>
                    supplier.is_active &&
                    !this.associatedSupplierIds().includes(supplier.supplier_id),
            )
            .map((supplier) => ({
                label: supplier.business_name,
                value: supplier.supplier_id,
            })),
    );

    readonly form = this.fb.nonNullable.group({
        supplier_id: [0, [Validators.required, Validators.min(1)]],
        is_preferred: [false],
        is_active: [true],
    });

    constructor() {
        effect(() => {
            const association = this.association();

            this.submitted.set(false);

            this.form.reset({
                supplier_id: association?.supplier_id ?? 0,
                is_preferred: association?.is_preferred ?? false,
                is_active: association?.is_active ?? true,
            });
        });
    }

    onSave(): void {
        this.submitted.set(true);

        if (
            this.form.invalid ||
            this.saving() ||
            (!this.isEditing() && (this.loadingSuppliers() || this.suppliersError()))
        ) {
            this.form.markAllAsTouched();
            return;
        }

        const value = this.form.getRawValue();
        const association = this.association();

        if (association) {
            this.save.emit({
                mode: 'edit',
                supplierId: association.supplier_id,
                payload: {
                    is_preferred: value.is_preferred,
                    is_active: value.is_active,
                },
            });

            return;
        }

        this.save.emit({
            mode: 'create',
            payload: {
                supplier_id: value.supplier_id,
                is_preferred: value.is_preferred,
                is_active: value.is_active,
            },
        });
    }

    close(): void {
        if (this.saving()) {
            return;
        }

        this.visibleChange.emit(false);
    }
}
