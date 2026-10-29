import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';

import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TextareaModule } from 'primeng/textarea';

import type { Product, CreateProduct, UpdateProduct } from '../../models/product.model';

import type { Brand } from '../../../brands/models/brand.model';
import type { ProductLine } from '../../../product-lines/models/product-line.model';

import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { UnitOfMeasure } from '../../../units-of-mesure/models/unit-of-mesure.model';

interface SelectOption {
    label: string;
    value: number;
}

function stockRangeValidator(control: AbstractControl): ValidationErrors | null {
    const minimum = control.get('minimum_stock')?.value;
    const maximum = control.get('maximum_stock')?.value;

    if (typeof minimum !== 'number' || typeof maximum !== 'number') {
        return null;
    }

    return minimum > maximum ? { invalidStockRange: true } : null;
}

@Component({
    selector: 'app-products-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
        TextareaModule,
    ],
    templateUrl: './products-form.html',
    styleUrl: './products-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsForm {
    private readonly fb = inject(FormBuilder);

    readonly product = input<Product | null>(null);

    readonly brandItems = input<Brand[]>([]);
    readonly productLineItems = input<ProductLine[]>([]);
    readonly unitItems = input<UnitOfMeasure[]>([]);

    readonly brandOptions = computed<SelectOption[]>(() =>
        this.brandItems().map((item) => ({
            label: item.name,
            value: item.brand_id,
        })),
    );

    readonly productLineOptions = computed<SelectOption[]>(() =>
        this.productLineItems().map((item) => ({
            label: item.name,
            value: item.product_line_id,
        })),
    );

    readonly unitOptions = computed<SelectOption[]>(() =>
        this.unitItems().map((item) => ({
            label: `${item.name} (${item.abbreviation})`,
            value: item.unit_of_measure_id,
        })),
    );

    readonly form = this.fb.nonNullable.group(
        {
            brand_id: this.fb.control<number | null>(null, Validators.required),
            product_line_id: this.fb.control<number | null>(null, Validators.required),
            unit_of_measure_id: this.fb.control<number | null>(null, Validators.required),

            sku: ['', [Validators.required, Validators.maxLength(50)]],
            barcode: ['', [Validators.required, Validators.maxLength(100)]],
            name: ['', [Validators.required, Validators.maxLength(200)]],
            description: ['', [Validators.maxLength(1000)]],

            weight: this.fb.control<number | null>(null, Validators.min(0)),

            average_cost: [0, [Validators.required, Validators.min(0)]],
            list_price: [0, [Validators.required, Validators.min(0)]],
            minimum_stock: [0, [Validators.required, Validators.min(0)]],
            maximum_stock: [0, [Validators.required, Validators.min(0)]],
            reorder_point: [0, [Validators.required, Validators.min(0)]],

            tracks_expiration: [false],
            is_active: [true],
        },
        {
            validators: [stockRangeValidator],
        },
    );

    readonly validationMessages = {
        brand_id: {
            required: 'La marca es obligatoria.',
        },
        product_line_id: {
            required: 'La línea de producto es obligatoria.',
        },
        unit_of_measure_id: {
            required: 'La unidad de medida es obligatoria.',
        },
        sku: {
            required: 'El SKU es obligatorio.',
            maxlength: 'El SKU no puede superar los 50 caracteres.',
        },
        barcode: {
            required: 'El código de barras es obligatorio.',
            maxlength: 'El código de barras no puede superar los 100 caracteres.',
        },
        name: {
            required: 'El nombre es obligatorio.',
            maxlength: 'El nombre no puede superar los 200 caracteres.',
        },
        description: {
            maxlength: 'La descripción no puede superar los 1000 caracteres.',
        },
        weight: {
            min: 'El peso no puede ser negativo.',
        },
        average_cost: {
            required: 'El costo promedio es obligatorio.',
            min: 'El costo no puede ser negativo.',
        },
        list_price: {
            required: 'El precio de venta es obligatorio.',
            min: 'El precio no puede ser negativo.',
        },
        minimum_stock: {
            required: 'El stock mínimo es obligatorio.',
            min: 'El stock mínimo no puede ser negativo.',
        },
        maximum_stock: {
            required: 'El stock máximo es obligatorio.',
            min: 'El stock máximo no puede ser negativo.',
        },
        reorder_point: {
            required: 'El punto de reorden es obligatorio.',
            min: 'El punto de reorden no puede ser negativo.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.product());
        });
    }

    resetForm(product: Product | null): void {
        this.form.reset({
            brand_id: product?.brand_id ?? null,
            product_line_id: product?.product_line_id ?? null,
            unit_of_measure_id: product?.unit_of_measure_id ?? null,
            sku: product?.sku ?? '',
            barcode: product?.barcode ?? '',
            name: product?.name ?? '',
            description: product?.description ?? '',
            weight: product?.weight ?? null,
            average_cost: product?.average_cost ?? 0,
            list_price: product?.list_price ?? 0,
            minimum_stock: product?.minimum_stock ?? 0,
            maximum_stock: product?.maximum_stock ?? 0,
            reorder_point: product?.reorder_point ?? 0,
            tracks_expiration: product?.tracks_expiration ?? false,
            is_active: product?.is_active ?? true,
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    get stockRangeError(): string | null {
        if (this.form.hasError('invalidStockRange') && (this.form.touched || this.form.dirty)) {
            return 'El stock mínimo no puede superar el stock máximo.';
        }

        return null;
    }

    getPayload(): CreateProduct | UpdateProduct | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        if (
            value.brand_id === null ||
            value.product_line_id === null ||
            value.unit_of_measure_id === null
        ) {
            return null;
        }

        const payload: CreateProduct = {
            brand_id: value.brand_id,
            product_line_id: value.product_line_id,
            unit_of_measure_id: value.unit_of_measure_id,
            sku: value.sku.trim(),
            barcode: value.barcode.trim(),
            name: value.name.trim(),
            description: value.description?.trim() || null,
            weight: value.weight,
            average_cost: value.average_cost,
            list_price: value.list_price,
            minimum_stock: value.minimum_stock,
            maximum_stock: value.maximum_stock,
            reorder_point: value.reorder_point,
            tracks_expiration: value.tracks_expiration,
            is_active: value.is_active,
        };

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
