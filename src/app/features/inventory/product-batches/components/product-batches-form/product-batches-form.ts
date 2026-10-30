import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    output,
    inject,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type {
    ProductBatch,
    CreateProductBatch,
    UpdateProductBatch,
} from '../../models/product-batche.model';

import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { TextareaModule } from 'primeng/textarea';
import { Product } from '../../../../catalog/products/models/product.model';

interface batchOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-product-batches-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
        TextareaModule,
    ],
    templateUrl: './product-batches-form.html',
    styleUrl: './product-batches-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBatchesForm {
    private readonly fb = inject(FormBuilder);

    readonly productBatches = input<ProductBatch | null>(null);
    readonly productItems = input<Product[]>([]);

    readonly formChange = output<boolean>();

    readonly productsOptions = computed<batchOption[]>(() => {
        const items = this.productItems();

        return items.map((item) => ({
            label: item.name,
            value: item.product_id,
        }));
    });

    readonly form = this.fb.nonNullable.group({
        product_id: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
        batch_number: this.fb.nonNullable.control<string>('', [
            Validators.required,
            Validators.maxLength(50),
        ]),
        manufacturing_date: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
        expiration_date: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
        received_at: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
        is_active: this.fb.nonNullable.control<boolean>(true),
    });

    readonly validationMessages = {
        product_id: {
            required: 'El campo producto es obligatorio.',
        },
        batch_number: {
            required: 'El campo número de lote es obligatorio.',
            maxlength: 'El campo número de lote no puede tener más de 50 caracteres.',
        },
        manufacturing_date: {
            required: 'El campo fecha de fabricación es obligatorio.',
        },
        expiration_date: {
            required: 'El campo fecha de vencimiento es obligatorio.',
        },
        is_active: {
            required: 'El campo activo es obligatorio.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.productBatches());
        });
    }

    resetForm(productBatch: ProductBatch | null): void {
        this.form.reset({
            product_id: productBatch?.product_id ?? null,
            batch_number: productBatch?.batch_number ?? '',
            manufacturing_date: productBatch?.manufacturing_date ?? null,
            expiration_date: productBatch?.expiration_date ?? null,
            is_active: productBatch?.is_active ?? true,
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    getPayload(): CreateProductBatch | UpdateProductBatch | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateProductBatch = {
            product_id: value.product_id ?? undefined,
            batch_number: value.batch_number,
            manufacturing_date: value.manufacturing_date,
            expiration_date: value.expiration_date,
            is_active: value.is_active,
        };

        if (this.productBatches()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
