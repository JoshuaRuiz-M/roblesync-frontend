import { Component, effect, inject, input } from '@angular/core';

import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';

import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import {
    CreateWarehouseTransfer,
    CreateWarehouseTransferDetail,
    WarehouseTransferWithDetails,
} from '../../models/warehouse-transfer.model';

export interface TransferCatalogItem {
    label: string;
    value: number;
}

export interface TransferBatchItem extends TransferCatalogItem {
    product_id: number;
    is_active: boolean;
}

type DetailForm = FormGroup<{
    product_id: FormControl<number | null>;
    batch_id: FormControl<number | null>;
    quantity: FormControl<number | null>;
}>;

function differentWarehousesValidator(control: AbstractControl): ValidationErrors | null {
    const source = control.get('source_warehouse_id')?.value;
    const destination = control.get('destination_warehouse_id')?.value;

    if (
        source !== null &&
        source !== undefined &&
        destination !== null &&
        destination !== undefined &&
        source === destination
    ) {
        return { sameWarehouse: true };
    }

    return null;
}

function quantityPrecisionValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        Math.abs(Math.round(value * 1000) / 1000 - value) > 0.000001
    ) {
        return { precision: true };
    }

    return null;
}

@Component({
    selector: 'app-warehouse-transfers-form',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        SelectModule,
        InputNumberModule,
        TextareaModule,
        ButtonModule,
        MessageModule,
    ],
    templateUrl: './warehouse-transfers-form.html',
    styleUrl: './warehouse-transfers-form.scss',
})
export class WarehouseTransfersForm {
    private readonly fb = inject(FormBuilder);

    readonly transfer = input<WarehouseTransferWithDetails | null>(null);

    readonly warehouses = input<TransferCatalogItem[]>([]);
    readonly products = input<TransferCatalogItem[]>([]);
    readonly batches = input<TransferBatchItem[]>([]);

    readonly form = this.fb.group(
        {
            source_warehouse_id: this.fb.control<number | null>(null, Validators.required),

            destination_warehouse_id: this.fb.control<number | null>(null, Validators.required),

            notes: this.fb.control<string | null>(null, [Validators.maxLength(500)]),

            details: this.fb.array<DetailForm>([]),
        },
        {
            validators: [differentWarehousesValidator],
        },
    );

    constructor() {
        effect(() => {
            const transfer = this.transfer();

            if (transfer) {
                this.loadTransfer(transfer);
            } else {
                this.resetForm();
            }
        });
    }

    get details(): FormArray<DetailForm> {
        return this.form.controls.details;
    }

    get notesLength(): number {
        return this.form.controls.notes.value?.length ?? 0;
    }

    get duplicateBatches(): boolean {
        return this.hasDuplicateBatches();
    }

    private createDetail(detail?: Partial<CreateWarehouseTransferDetail>): DetailForm {
        return this.fb.group({
            product_id: this.fb.control<number | null>(
                detail?.product_id ?? null,
                Validators.required,
            ),

            batch_id: this.fb.control<number | null>(detail?.batch_id ?? null, Validators.required),

            quantity: this.fb.control<number | null>(detail?.quantity ?? null, [
                Validators.required,
                Validators.min(0.001),
                quantityPrecisionValidator,
            ]),
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

    onProductChange(index: number): void {
        const detail = this.details.at(index);

        detail.controls.batch_id.setValue(null);
        detail.controls.batch_id.markAsUntouched();
        detail.controls.batch_id.markAsPristine();
    }

    getBatchesForProduct(productId: number | null): TransferBatchItem[] {
        if (productId === null) {
            return [];
        }

        return this.batches().filter((batch) => batch.product_id === productId && batch.is_active);
    }

    isInvalid(control: AbstractControl): boolean {
        return control.invalid && (control.dirty || control.touched);
    }

    private loadTransfer(transfer: WarehouseTransferWithDetails): void {
        this.form.patchValue({
            source_warehouse_id: transfer.source_warehouse_id,
            destination_warehouse_id: transfer.destination_warehouse_id,
            notes: transfer.notes,
        });

        this.details.clear();

        for (const detail of transfer.details) {
            this.details.push(
                this.createDetail({
                    product_id: detail.product_id,
                    batch_id: detail.batch_id,
                    quantity: detail.quantity,
                }),
            );
        }

        if (this.details.length === 0) {
            this.addDetail();
        }

        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    resetForm(): void {
        this.form.reset({
            source_warehouse_id: null,
            destination_warehouse_id: null,
            notes: null,
        });

        this.details.clear();
        this.addDetail();

        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    private hasDuplicateBatches(): boolean {
        const batchIds = this.details.controls
            .map((detail) => detail.controls.batch_id.value)
            .filter((id): id is number => id !== null);

        return new Set(batchIds).size !== batchIds.length;
    }

    private hasInvalidBatchSelection(): boolean {
        return this.details.controls.some((detail) => {
            const productId = detail.controls.product_id.value;
            const batchId = detail.controls.batch_id.value;

            if (productId === null || batchId === null) {
                return true;
            }

            return !this.getBatchesForProduct(productId).some((batch) => batch.value === batchId);
        });
    }

    getPayload(): CreateWarehouseTransfer | null {
        this.form.markAllAsTouched();

        if (
            this.form.invalid ||
            this.details.length === 0 ||
            this.hasDuplicateBatches() ||
            this.hasInvalidBatchSelection()
        ) {
            return null;
        }

        const value = this.form.getRawValue();

        return {
            source_warehouse_id: value.source_warehouse_id!,
            destination_warehouse_id: value.destination_warehouse_id!,
            notes: value.notes?.trim() || null,

            details: value.details.map((detail) => ({
                product_id: Number(detail.product_id),
                batch_id: Number(detail.batch_id),
                quantity: Number(detail.quantity),
            })),
        };
    }
}
