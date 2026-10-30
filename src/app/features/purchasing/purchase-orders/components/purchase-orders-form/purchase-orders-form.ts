import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    signal,
} from '@angular/core';

import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import type { Supplier } from '../../../suppliers/models/supplier.model';
import type { Product } from '../../../../catalog/products/models/product.model';

import type {
    CreatePurchaseOrder,
    CreatePurchaseOrderDetail,
    PurchaseOrderWithDetails,
} from '../../models/purchase-order.model';

type DetailForm = FormGroup<{
    product_id: FormControl<number | null>;
    quantity: FormControl<number>;
    unit_cost: FormControl<number>;
    discount_amount: FormControl<number>;
}>;

type PurchaseOrderFormGroup = FormGroup<{
    supplier_id: FormControl<number | null>;
    expected_date: FormControl<Date | null>;
    notes: FormControl<string>;
    details: FormArray<DetailForm>;
}>;

interface DetailCalculation {
    subtotal: number;
    discount: number;
    taxableAmount: number;
    tax: number;
    total: number;
}

@Component({
    selector: 'app-purchase-orders-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        DatePickerModule,
        TextareaModule,
        ButtonModule,
        MessageModule,
    ],
    templateUrl: './purchase-orders-form.html',
    styleUrl: './purchase-orders-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrdersForm {
    private readonly fb = inject(FormBuilder);

    readonly order = input<PurchaseOrderWithDetails | null>(null);
    readonly suppliers = input<Supplier[]>([]);
    readonly products = input<Product[]>([]);

    readonly submitted = signal(false);
    readonly formVersion = signal(0);

    readonly taxRate = 0.12;

    readonly form: PurchaseOrderFormGroup = this.fb.group({
        supplier_id: this.fb.control<number | null>(null, {
            validators: [Validators.required],
        }),
        expected_date: this.fb.control<Date | null>(null),
        notes: this.fb.nonNullable.control('', {
            validators: [Validators.maxLength(500)],
        }),
        details: this.fb.array<DetailForm>([]),
    });

    readonly supplierOptions = computed(() =>
        this.suppliers()
            .filter((supplier) => supplier.is_active)
            .map((supplier) => ({
                label: supplier.business_name,
                value: supplier.supplier_id,
            })),
    );

    readonly productOptions = computed(() =>
        this.products()
            .filter((product) => product.is_active)
            .map((product) => ({
                label: `${product.sku} - ${product.name}`,
                value: product.product_id,
            })),
    );

    readonly today = new Date();

    get details(): FormArray<DetailForm> {
        return this.form.controls.details;
    }

    get detailControls(): DetailForm[] {
        return this.details.controls;
    }

    readonly totals = computed(() => {
        this.formVersion();

        const calculations = this.details.controls.map((_, index) => this.calculateDetail(index));

        return calculations.reduce(
            (accumulator, item) => ({
                subtotal: accumulator.subtotal + item.subtotal,
                discount: accumulator.discount + item.discount,
                taxableAmount: accumulator.taxableAmount + item.taxableAmount,
                tax: accumulator.tax + item.tax,
                total: accumulator.total + item.total,
            }),
            {
                subtotal: 0,
                discount: 0,
                taxableAmount: 0,
                tax: 0,
                total: 0,
            },
        );
    });

    constructor() {
        this.form.valueChanges.subscribe(() => {
            this.formVersion.update((value) => value + 1);
        });

        effect(() => {
            this.resetForm(this.order());
        });
    }

    private createDetail(detail?: Partial<CreatePurchaseOrderDetail>): DetailForm {
        return this.fb.group({
            product_id: this.fb.control<number | null>(detail?.product_id ?? null, {
                validators: [Validators.required],
            }),
            quantity: this.fb.nonNullable.control(detail?.quantity ?? 1, {
                validators: [Validators.required, Validators.min(0.001)],
            }),
            unit_cost: this.fb.nonNullable.control(detail?.unit_cost ?? 0, {
                validators: [Validators.required, Validators.min(0)],
            }),
            discount_amount: this.fb.nonNullable.control(detail?.discount_amount ?? 0, {
                validators: [Validators.required, Validators.min(0)],
            }),
        });
    }

    addDetail(): void {
        this.details.push(this.createDetail());
    }

    removeDetail(index: number): void {
        if (this.details.length <= 1) {
            return;
        }

        this.details.removeAt(index);
    }

    onProductChange(index: number, productId: number | null): void {
        const detail = this.details.at(index);

        if (!detail || productId === null) {
            return;
        }

        const product = this.products().find((item) => item.product_id === productId);

        if (!product) {
            return;
        }

        detail.controls.unit_cost.setValue(Number(product.average_cost ?? 0));
    }

    getAvailableProducts(index: number): {
        label: string;
        value: number;
    }[] {
        const selectedIds = this.details.controls
            .filter((_, detailIndex) => detailIndex !== index)
            .map((detail) => detail.controls.product_id.value)
            .filter((value): value is number => value !== null);

        const currentId = this.details.at(index)?.controls.product_id.value;

        return this.products()
            .filter((product) => product.is_active || product.product_id === currentId)
            .filter((product) => !selectedIds.includes(product.product_id))
            .map((product) => ({
                label: `${product.sku} - ${product.name}`,
                value: product.product_id,
            }));
    }

    calculateDetail(index: number): DetailCalculation {
        const detail = this.details.at(index);

        if (!detail) {
            return {
                subtotal: 0,
                discount: 0,
                taxableAmount: 0,
                tax: 0,
                total: 0,
            };
        }

        const quantity = Number(detail.controls.quantity.value) || 0;
        const unitCost = Number(detail.controls.unit_cost.value) || 0;
        const discount = Number(detail.controls.discount_amount.value) || 0;

        const subtotal = quantity * unitCost;
        const taxableAmount = Math.max(0, subtotal - discount);
        const tax = this.roundMoney(taxableAmount * this.taxRate);

        return {
            subtotal: this.roundMoney(subtotal),
            discount: this.roundMoney(discount),
            taxableAmount: this.roundMoney(taxableAmount),
            tax,
            total: this.roundMoney(taxableAmount + tax),
        };
    }

    getPayload(): CreatePurchaseOrder | null {
        this.submitted.set(true);

        this.form.markAllAsTouched();

        if (this.form.invalid || this.details.length === 0) {
            return null;
        }

        const detailValues = this.details.getRawValue();

        const productIds = detailValues.map((detail) => detail.product_id);

        const uniqueProductIds = new Set(productIds);

        if (uniqueProductIds.size !== productIds.length) {
            this.details.setErrors({
                duplicateProducts: true,
            });

            return null;
        }

        const invalidDiscount = detailValues.some((detail) => {
            const subtotal = detail.quantity * detail.unit_cost;

            return detail.discount_amount > subtotal;
        });

        if (invalidDiscount) {
            this.details.setErrors({
                invalidDiscount: true,
            });

            return null;
        }

        const value = this.form.getRawValue();

        if (value.supplier_id === null) {
            return null;
        }

        return {
            supplier_id: value.supplier_id,
            expected_date: value.expected_date ? this.formatDateForApi(value.expected_date) : null,
            notes: value.notes.trim() || null,
            details: detailValues.map((detail) => ({
                product_id: detail.product_id!,
                quantity: detail.quantity,
                unit_cost: detail.unit_cost,
                discount_amount: detail.discount_amount,
            })),
        };
    }

    resetForm(order: PurchaseOrderWithDetails | null): void {
        this.submitted.set(false);

        this.details.clear();

        if (order) {
            this.form.patchValue({
                supplier_id: order.supplier_id,
                expected_date: order.expected_date ? this.parseDate(order.expected_date) : null,
                notes: order.notes ?? '',
            });

            for (const detail of order.details) {
                this.details.push(
                    this.createDetail({
                        product_id: detail.product_id,
                        quantity: Number(detail.quantity),
                        unit_cost: Number(detail.unit_cost),
                        discount_amount: Number(detail.discount_amount),
                    }),
                );
            }
        } else {
            this.form.reset({
                supplier_id: null,
                expected_date: null,
                notes: '',
            });
        }

        if (this.details.length === 0) {
            this.addDetail();
        }

        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.formVersion.update((value) => value + 1);
    }

    applyValidationErrors(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const response = error as {
            error?: {
                errors?: Record<string, string[]>;
            };
        };

        const errors = response.error?.errors;

        if (!errors || typeof errors !== 'object') {
            return false;
        }

        let applied = false;

        for (const [field, messages] of Object.entries(errors)) {
            const control = this.form.get(field);

            if (!control || !Array.isArray(messages) || !messages.length) {
                continue;
            }

            control.setErrors({
                server: messages[0],
            });

            control.markAsTouched();
            applied = true;
        }

        return applied;
    }

    getFieldError(control: AbstractControl): string | null {
        if (!control.invalid || (!control.touched && !this.submitted())) {
            return null;
        }

        if (control.hasError('server')) {
            return String(control.getError('server'));
        }

        if (control.hasError('required')) {
            return 'Este campo es obligatorio.';
        }

        if (control.hasError('min')) {
            return 'El valor debe ser mayor al mínimo permitido.';
        }

        if (control.hasError('maxlength')) {
            return 'Se ha superado la longitud máxima permitida.';
        }

        return 'El valor ingresado no es válido.';
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    }

    private roundMoney(value: number): number {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    private formatDateForApi(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    private parseDate(value: string): Date {
        const [year, month, day] = value.slice(0, 10).split('-').map(Number);

        return new Date(year, month - 1, day);
    }
}
