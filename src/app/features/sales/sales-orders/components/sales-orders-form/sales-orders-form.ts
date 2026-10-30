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

import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';

import type { Customer } from '../../../customers/models/customer.model';
import type { Saleperson } from '../../../salespersons/models/salesperson.model';
import type { Product } from '../../../../catalog/products/models/product.model';

import type {
    CreateSalesOrder,
    CreateSalesOrderDetail,
    SalesOrderWithDetails,
} from '../../models/sales-order.model';
import { Warehouse } from '../../../../inventory/warehouse/models/warehouse.model';

type DetailForm = FormGroup<{
    product_id: FormControl<number | null>;
    quantity: FormControl<number>;
    unit_price: FormControl<number>;
    discount_amount: FormControl<number>;
}>;

type SalesOrderFormGroup = FormGroup<{
    customer_id: FormControl<number | null>;
    salesperson_id: FormControl<number | null>;
    warehouse_id: FormControl<number | null>;
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
    selector: 'app-sales-orders-form',
    imports: [
        ReactiveFormsModule,
        InputNumberModule,
        SelectModule,
        TextareaModule,
        ButtonModule,
        MessageModule,
        TooltipModule,
    ],
    templateUrl: './sales-orders-form.html',
    styleUrl: './sales-orders-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesOrdersForm {
    private readonly fb = inject(FormBuilder);

    readonly order = input<SalesOrderWithDetails | null>(null);
    readonly customers = input<Customer[]>([]);
    readonly salespersons = input<Saleperson[]>([]);
    readonly warehouses = input<Warehouse[]>([]);
    readonly products = input<Product[]>([]);

    readonly submitted = signal(false);
    readonly formVersion = signal(0);

    readonly taxRate = 0.12;

    readonly form: SalesOrderFormGroup = this.fb.group({
        customer_id: this.fb.control<number | null>(null, {
            validators: [Validators.required],
        }),
        salesperson_id: this.fb.control<number | null>(null, {
            validators: [Validators.required],
        }),
        warehouse_id: this.fb.control<number | null>(null, {
            validators: [Validators.required],
        }),
        notes: this.fb.nonNullable.control('', {
            validators: [Validators.maxLength(500)],
        }),
        details: this.fb.array<DetailForm>([]),
    });

    readonly customerOptions = computed(() =>
        this.customers()
            .filter(
                (customer) =>
                    customer.is_active !== false ||
                    customer.customer_id === this.order()?.customer_id,
            )
            .map((customer) => ({
                label: `${customer.customer_code} - ${customer.business_name}`,
                value: customer.customer_id,
            })),
    );

    readonly salespersonOptions = computed(() =>
        this.salespersons()
            .filter(
                (salesperson) =>
                    salesperson.is_active ||
                    salesperson.salesperson_id === this.order()?.salesperson_id,
            )
            .map((salesperson) => ({
                label: salesperson.employee_code,
                value: salesperson.salesperson_id,
            })),
    );

    readonly warehouseOptions = computed(() =>
        this.warehouses()
            .filter(
                (warehouse) =>
                    warehouse.is_active || warehouse.warehouse_id === this.order()?.warehouse_id,
            )
            .map((warehouse) => ({
                label: `${warehouse.code} - ${warehouse.name}`,
                value: warehouse.warehouse_id,
            })),
    );

    get details(): FormArray<DetailForm> {
        return this.form.controls.details;
    }

    get detailControls(): DetailForm[] {
        return this.details.controls;
    }

    readonly totals = computed(() => {
        this.formVersion();

        return this.details.controls.reduce(
            (accumulator, _, index) => {
                const item = this.calculateDetail(index);

                return {
                    subtotal: accumulator.subtotal + item.subtotal,
                    discount: accumulator.discount + item.discount,
                    taxableAmount: accumulator.taxableAmount + item.taxableAmount,
                    tax: accumulator.tax + item.tax,
                    total: accumulator.total + item.total,
                };
            },
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

    private createDetail(detail?: Partial<CreateSalesOrderDetail>): DetailForm {
        return this.fb.group({
            product_id: this.fb.control<number | null>(detail?.product_id ?? null, {
                validators: [Validators.required],
            }),
            quantity: this.fb.nonNullable.control(detail?.quantity ?? 1, {
                validators: [Validators.required, Validators.min(0.001)],
            }),
            unit_price: this.fb.nonNullable.control(detail?.unit_price ?? 0, {
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

    onCustomerChange(customerId: number | null): void {
        if (customerId === null) {
            this.form.controls.salesperson_id.setValue(null);
            return;
        }

        const customer = this.customers().find((item) => item.customer_id === customerId);

        if (customer) {
            this.form.controls.salesperson_id.setValue(customer.salesperson_id);
        }
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

        const unitPrice = Number(detail.controls.unit_price.value) || 0;

        const discount = Number(detail.controls.discount_amount.value) || 0;

        const subtotal = this.roundMoney(quantity * unitPrice);
        const taxableAmount = Math.max(0, this.roundMoney(subtotal - discount));
        const tax = this.roundMoney(taxableAmount * this.taxRate);

        return {
            subtotal,
            discount: this.roundMoney(discount),
            taxableAmount,
            tax,
            total: this.roundMoney(taxableAmount + tax),
        };
    }

    getPayload(): CreateSalesOrder | null {
        this.submitted.set(true);
        this.form.markAllAsTouched();

        if (this.form.invalid || this.details.length === 0) {
            return null;
        }

        const detailValues = this.details.getRawValue();
        const productIds = detailValues.map((detail) => detail.product_id);

        if (new Set(productIds).size !== productIds.length) {
            this.details.setErrors({ duplicateProducts: true });
            return null;
        }

        const invalidDiscount = detailValues.some((detail) => {
            const subtotal = detail.quantity * detail.unit_price;
            return detail.discount_amount > subtotal;
        });

        if (invalidDiscount) {
            this.details.setErrors({ invalidDiscount: true });
            return null;
        }

        const value = this.form.getRawValue();

        if (
            value.customer_id === null ||
            value.salesperson_id === null ||
            value.warehouse_id === null
        ) {
            return null;
        }

        return {
            customer_id: value.customer_id,
            salesperson_id: value.salesperson_id,
            warehouse_id: value.warehouse_id,
            notes: value.notes.trim() || null,
            details: detailValues.map((detail) => ({
                product_id: detail.product_id!,
                quantity: detail.quantity,
                unit_price: detail.unit_price,
                discount_amount: detail.discount_amount,
            })),
        };
    }

    resetForm(order: SalesOrderWithDetails | null): void {
        this.submitted.set(false);
        this.details.clear();

        if (order) {
            this.form.patchValue({
                customer_id: order.customer_id,
                salesperson_id: order.salesperson_id,
                warehouse_id: order.warehouse_id,
                notes: order.notes ?? '',
            });

            for (const detail of order.details) {
                this.details.push(
                    this.createDetail({
                        product_id: detail.product_id,
                        quantity: Number(detail.quantity),
                        unit_price: Number(detail.unit_price),
                        discount_amount: Number(detail.discount_amount),
                    }),
                );
            }
        } else {
            this.form.reset({
                customer_id: null,
                salesperson_id: null,
                warehouse_id: null,
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

            if (!control || !Array.isArray(messages) || messages.length === 0) {
                continue;
            }

            control.setErrors({ server: messages[0] });
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
}
