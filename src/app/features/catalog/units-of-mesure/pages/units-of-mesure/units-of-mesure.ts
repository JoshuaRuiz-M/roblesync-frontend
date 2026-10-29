import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
    viewChild,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import type { DataGridColumn } from '../../../../../shared/components/data-grid/models/data-grid-column.model';
import type { DataGridConfig } from '../../../../../shared/components/data-grid/models/data-grid-config.model';
import type {
    DataGridAction,
    DataGridActionEvent,
} from '../../../../../shared/components/data-grid/models/data-grid-action.model';
import type { DataGridQuery } from '../../../../../shared/components/data-grid/models/data-grid-query.model';

import type {
    PaginationMeta,
    PaginationParams,
} from '../../../../../core/http/models/pagination.model';

import { PAGINATION_DEFAULTS } from '../../../../../core/http/models/pagination.model';

import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';

import { UnitsOfMeasureService } from '../../services/units-of-mesure.service';
import type { CreateUnitOfMeasure, UnitOfMeasure } from '../../models/unit-of-mesure.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import { UnitOfMeasureForm } from '../../components/unit-of-mesure-form/unit-of-mesure-form';
import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';

@Component({
    selector: 'app-units-of-measure',
    imports: [DataGrid, FormDialog, UnitOfMeasureForm],
    templateUrl: './units-of-mesure.html',
    styleUrl: './units-of-mesure.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitsOfMeasure {
    private readonly authService = inject(AuthService);
    private readonly unitsOfMeasureService = inject(UnitsOfMeasureService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly unitsOfMeasure = signal<UnitOfMeasure[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedUnitOfMeasure = signal<UnitOfMeasure | null>(null);

    readonly unitsOfMeasureForm = viewChild(UnitOfMeasureForm);
    readonly saving = signal(false);
    readonly dialogTitle = computed(() =>
        this.selectedUnitOfMeasure() ? 'Editar unidad de medida' : 'Nueva unidad de medida',
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<UnitOfMeasure>[] = [
        {
            field: 'code',
            header: 'Código',
            width: '150px',
        },
        {
            field: 'name',
            header: 'Nombre',
            width: '250px',
        },
        {
            field: 'description',
            header: 'Descripción',
            width: '300px',
        },
        {
            field: 'is_active',
            header: 'Estado',
            type: 'boolean',
            width: '110px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<UnitOfMeasure>>(() => ({
        dataKey: 'unit_of_measure_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('UNIT_OF_MEASURE_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay unidades de medida registradas',
    }));

    readonly actions = computed<DataGridAction<UnitOfMeasure>[]>(() => {
        const actions: DataGridAction<UnitOfMeasure>[] = [];

        if (this.authService.hasPermission('UNIT_OF_MEASURE_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('UNIT_OF_MEASURE_DELETE')) {
            actions.push({
                id: 'delete',
                label: 'Eliminar',
                icon: 'pi pi-trash',
                severity: 'danger',
            });
        }

        return actions;
    });

    constructor() {
        this.loadunitsOfMeasure();
    }

    loadunitsOfMeasure(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.unitsOfMeasureService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.unitsOfMeasure.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener las unidades de medida.',
                    );
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadunitsOfMeasure({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadunitsOfMeasure();
    }

    onAction(event: DataGridActionEvent<UnitOfMeasure>): void {
        switch (event.action) {
            case 'edit':
                this.onEdit(event.row);
                break;
            case 'delete':
                this.onDelete(event.row);
                break;
        }
    }

    onCreate(): void {
        this.selectedUnitOfMeasure.set(null);
        this.dialogVisible.set(true);

        this.unitsOfMeasureForm()?.resetForm(null);
    }

    private onEdit(unitOfMeasure: UnitOfMeasure): void {
        this.selectedUnitOfMeasure.set(unitOfMeasure);
        this.dialogVisible.set(true);

        this.unitsOfMeasureForm()?.resetForm(unitOfMeasure);
    }

    private onDelete(unitOfMeasure: UnitOfMeasure): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar la unidad de medida "${unitOfMeasure.name}"?`,
            () => this.deleteUnitOfMeasure(unitOfMeasure.unit_of_measure_id),
        );
    }

    private deleteUnitOfMeasure(unitOfMeasureId: number): void {
        this.unitsOfMeasureService
            .delete(unitOfMeasureId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Unidad de medida eliminada',
                        'La unidad de medida se eliminó correctamente.',
                    );

                    this.loadunitsOfMeasure();
                },
                error: () => {
                    this.toast.error(
                        'Error al eliminar',
                        'No fue posible eliminar la unidad de medida.',
                    );
                },
            });
    }

    saveUnitOfMeasure(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.unitsOfMeasureForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedUnitOfMeasure();

        this.saving.set(true);

        const request$ = selected
            ? this.unitsOfMeasureService.update(selected.unit_of_measure_id, payload)
            : this.unitsOfMeasureService.create(payload as CreateUnitOfMeasure);

        request$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Operación exitosa',
                        selected
                            ? 'La unidad de medida se actualizó correctamente.'
                            : 'La unidad de medida se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedUnitOfMeasure.set(null);

                    this.loadunitsOfMeasure();
                },
                error: (error) => {
                    const applied = this.unitsOfMeasureForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error(
                        'Error al guardar',
                        'No fue posible guardar la unidad de medida.',
                    );
                },
            });
    }
}
