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

import type {
    CreateGoodsReceipt,
    CreateGoodsReceiptDetail,
    GoodsReceiptWithDetails,
} from '../../models/goods-receipt.model';

import type { PurchaseOrderWithDetails } from '../../../purchase-orders/models/purchase-order.model';

import type { Product } from '../../../../catalog/products/models/product.model';
import { Warehouse } from '../../../../inventory/warehouse/models/warehouse.model';

type DetailForm = FormGroup<{
    purchase_order_detail_id: FormControl<number>;
    quantity_received: FormControl<number>;
    batch_number: FormControl<string>;
    manufacturing_date: FormControl<Date | null>;
    expiration_date: FormControl<Date | null>;
}>;

type GoodsReceiptFormGroup = FormGroup<{
    purchase_order_id: FormControl<number | null>;
    warehouse_id: FormControl<number | null>;
    notes: FormControl<string>;
    details: FormArray<DetailForm>;
}>;

@Component({
    selector: 'app-goods-receipts-form',
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
    templateUrl: './goods-receipts-form.html',
    styleUrl: './goods-receipts-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoodsReceiptsForm {
    private readonly fb = inject(FormBuilder);

    readonly receipt = input<GoodsReceiptWithDetails | null>(null);
    readonly orders = input<PurchaseOrderWithDetails[]>([]);
    readonly warehouses = input<Warehouse[]>([]);
    readonly products = input<Product[]>([]);

    readonly submitted = signal(false);
    readonly formVersion = signal(0);
    readonly selectedOrder = signal<PurchaseOrderWithDetails | null>(null);

    readonly form: GoodsReceiptFormGroup = this.fb.group({
        purchase_order_id: this.fb.control<number | null>(null, {
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

    readonly orderOptions = computed(() => {
        const orders = this.orders();
        const selectedReceipt = this.receipt();

        return orders
            .filter((order) => {
                const isAvailable =
                    order.status === 'APPROVED' || order.status === 'PARTIALLY_RECEIVED';

                const isSelected =
                    selectedReceipt !== null &&
                    Number(order.purchase_order_id) === Number(selectedReceipt.purchase_order_id);

                return isAvailable || isSelected;
            })
            .map((order) => ({
                label: order.order_number,
                value: Number(order.purchase_order_id),
            }));
    });

    readonly warehouseOptions = computed(() =>
        this.warehouses()
            .filter(
                (warehouse) =>
                    warehouse.is_active || warehouse.warehouse_id === this.receipt()?.warehouse_id,
            )
            .map((warehouse) => ({
                label: `${warehouse.code} - ${warehouse.name}`,
                value: Number(warehouse.warehouse_id),
            })),
    );

    readonly totalQuantity = computed(() => {
        this.formVersion();

        return this.details.controls.reduce(
            (total, detail) => total + Number(detail.controls.quantity_received.value || 0),
            0,
        );
    });

    get details(): FormArray<DetailForm> {
        return this.form.controls.details;
    }

    get detailControls(): DetailForm[] {
        return this.details.controls;
    }

    constructor() {
        this.form.valueChanges.subscribe(() => {
            this.formVersion.update((version) => version + 1);
        });

        effect(() => {
            const receipt = this.receipt();

            this.resetForm(receipt);
        });

        effect(() => {
            const orders = this.orders();
            const orderId = this.form.controls.purchase_order_id.value;

            if (orderId === null) {
                return;
            }

            const order = orders.find((item) => Number(item.purchase_order_id) === Number(orderId));

            this.selectedOrder.set(order ?? null);
        });
    }

    onOrderChange(orderId: number | string | null): void {
        this.details.clear();

        if (orderId === null || orderId === '') {
            this.selectedOrder.set(null);
            return;
        }

        const id = Number(orderId);

        const order = this.orders().find((item) => Number(item.purchase_order_id) === id);

        this.selectedOrder.set(order ?? null);

        if (!order) {
            return;
        }

        for (const detail of order.details) {
            this.details.push(
                this.createDetail({
                    purchase_order_detail_id: Number(detail.purchase_order_detail_id),
                    quantity_received: Number(detail.quantity),
                }),
            );
        }
    }

    private createDetail(detail: CreateGoodsReceiptDetail): DetailForm {
        return this.fb.group({
            purchase_order_detail_id: this.fb.nonNullable.control(detail.purchase_order_detail_id),
            quantity_received: this.fb.nonNullable.control(detail.quantity_received, {
                validators: [Validators.required, Validators.min(0.001)],
            }),
            batch_number: this.fb.nonNullable.control(detail.batch_number ?? ''),
            manufacturing_date: this.fb.control<Date | null>(
                detail.manufacturing_date ? this.parseDate(detail.manufacturing_date) : null,
            ),
            expiration_date: this.fb.control<Date | null>(
                detail.expiration_date ? this.parseDate(detail.expiration_date) : null,
            ),
        });
    }

    getOrderDetail(index: number) {
        const order = this.selectedOrder();
        const detail = this.details.at(index);

        if (!order || !detail) {
            return null;
        }

        return (
            order.details.find(
                (item) =>
                    item.purchase_order_detail_id ===
                    detail.controls.purchase_order_detail_id.value,
            ) ?? null
        );
    }

    getProductName(index: number): string {
        const detail = this.getOrderDetail(index);

        if (!detail) {
            return 'Producto no disponible';
        }

        const product = this.products().find((item) => item.product_id === detail.product_id);

        return product ? `${product.sku} - ${product.name}` : `Producto #${detail.product_id}`;
    }

    getOrderedQuantity(index: number): number {
        return Number(this.getOrderDetail(index)?.quantity ?? 0);
    }

    removeDetail(index: number): void {
        this.details.removeAt(index);
    }

    getPayload(): CreateGoodsReceipt | null {
        this.submitted.set(true);
        this.form.markAllAsTouched();

        if (this.form.invalid || this.details.length === 0) {
            return null;
        }

        const value = this.form.getRawValue();

        if (value.purchase_order_id === null || value.warehouse_id === null) {
            return null;
        }

        const invalidDates = value.details.some(
            (detail) =>
                detail.manufacturing_date &&
                detail.expiration_date &&
                detail.expiration_date < detail.manufacturing_date,
        );

        if (invalidDates) {
            this.details.setErrors({ invalidDates: true });
            return null;
        }

        return {
            purchase_order_id: Number(value.purchase_order_id),
            warehouse_id: Number(value.warehouse_id),
            notes: value.notes.trim() || null,
            details: value.details.map((detail) => ({
                purchase_order_detail_id: Number(detail.purchase_order_detail_id),
                quantity_received: Number(detail.quantity_received),
                batch_number: detail.batch_number.trim() || null,
                manufacturing_date: detail.manufacturing_date
                    ? this.formatDateForApi(detail.manufacturing_date)
                    : null,
                expiration_date: detail.expiration_date
                    ? this.formatDateForApi(detail.expiration_date)
                    : null,
            })),
        };
    }

    resetForm(
        receipt: GoodsReceiptWithDetails | null,
        orders: PurchaseOrderWithDetails[] = this.orders(),
    ): void {
        this.submitted.set(false);
        this.details.clear();

        if (receipt) {
            this.form.patchValue({
                purchase_order_id: receipt.purchase_order_id,
                warehouse_id: receipt.warehouse_id,
                notes: receipt.notes ?? '',
            });

            for (const detail of receipt.details) {
                this.details.push(
                    this.createDetail({
                        purchase_order_detail_id: detail.purchase_order_detail_id,
                        quantity_received: Number(detail.quantity_received),
                    }),
                );
            }

            this.selectedOrder.set(
                orders.find((order) => order.purchase_order_id === receipt.purchase_order_id) ??
                    null,
            );
        } else {
            this.form.reset({
                purchase_order_id: null,
                warehouse_id: null,
                notes: '',
            });

            this.selectedOrder.set(null);
        }

        this.form.markAsPristine();
        this.form.markAsUntouched();

        this.formVersion.update((version) => version + 1);
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
            return 'La cantidad debe ser mayor que cero.';
        }

        if (control.hasError('maxlength')) {
            return 'Se ha superado la longitud máxima permitida.';
        }

        return 'El valor ingresado no es válido.';
    }

    formatQuantity(value: number): string {
        return new Intl.NumberFormat('es-GT', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }).format(Number(value));
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
