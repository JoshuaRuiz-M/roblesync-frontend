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
    ProductLine,
    CreateProductLine,
    UpdateProductLine,
} from '../../models/product-line.model';
import { Category } from '../../../categories/models/category.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { TextareaModule } from 'primeng/textarea';

interface CategoryOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-product-lines-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
        TextareaModule,
    ],
    templateUrl: './product-lines-form.html',
    styleUrl: './product-lines-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductLinesForm {
    private readonly fb = inject(FormBuilder);

    readonly productLine = input<ProductLine | null>(null);
    readonly categoryItems = input<Category[]>([]);

    readonly formChange = output<boolean>();

    readonly categoryOptions = computed<CategoryOption[]>(() => {
        const items = this.categoryItems();

        return items.map((item) => ({
            label: item.name,
            value: item.category_id,
        }));
    });

    readonly form = this.fb.nonNullable.group({
        category_id: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
        code: ['', [Validators.required, Validators.maxLength(50)]],
        name: ['', [Validators.required, Validators.maxLength(150)]],
        description: ['', [Validators.maxLength(500)]],
        is_active: [true],
    });

    readonly validationMessages = {
        category_id: {
            required: 'La categoría es obligatoria.',
        },
        code: {
            required: 'El código es obligatorio.',
            maxlength: 'El código no puede superar los 50 caracteres.',
        },
        name: {
            required: 'El nombre es obligatorio.',
            maxlength: 'El nombre no puede superar los 150 caracteres.',
        },
        description: {
            maxlength: 'La descripción no puede superar los 500 caracteres.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.productLine());
        });
    }

    resetForm(productLine: ProductLine | null): void {
        this.form.reset({
            category_id: productLine?.category_id ?? null,
            name: productLine?.name ?? '',
            code: productLine?.code ?? '',
            description: productLine?.description ?? '',
            is_active: productLine?.is_active ?? true,
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    getPayload(): CreateProductLine | UpdateProductLine | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateProductLine = {
            category_id: value.category_id ?? undefined,
            code: value.code,
            name: value.name,
            description: value.description,
            is_active: value.is_active,
        };

        if (this.productLine()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
