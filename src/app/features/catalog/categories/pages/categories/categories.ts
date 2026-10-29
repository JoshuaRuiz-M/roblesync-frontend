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

import { CategoriesService } from '../../services/categories.service';
import type { CreateCategory, Category } from '../../models/category.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import { CategoryForm } from '../../components/category-form/category-form';
import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';

@Component({
    selector: 'app-categories',
    imports: [DataGrid, FormDialog, CategoryForm],
    templateUrl: './categories.html',
    styleUrl: './categories.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Categories {
    private readonly authService = inject(AuthService);
    private readonly categoriesService = inject(CategoriesService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly categories = signal<Category[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedCategory = signal<Category | null>(null);

    readonly saving = signal(false);
    readonly categoryForm = viewChild(CategoryForm);
    readonly dialogTitle = computed(() =>
        this.selectedCategory() ? 'Editar categoría' : 'Nueva categoría',
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<Category>[] = [
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

    readonly gridConfig = computed<DataGridConfig<Category>>(() => ({
        dataKey: 'category_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('CATEGORY_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay categorías registradas',
    }));

    readonly actions = computed<DataGridAction<Category>[]>(() => {
        const actions: DataGridAction<Category>[] = [];

        if (this.authService.hasPermission('CATEGORY_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('CATEGORY_DELETE')) {
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
        this.loadcategories();
    }

    loadcategories(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.categoriesService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.categories.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener las categorías.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadcategories({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadcategories();
    }

    onAction(event: DataGridActionEvent<Category>): void {
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
        this.selectedCategory.set(null);
        this.dialogVisible.set(true);

        this.categoryForm()?.resetForm(null);
    }

    private onEdit(category: Category): void {
        this.selectedCategory.set(category);
        this.dialogVisible.set(true);

        this.categoryForm()?.resetForm(category);
    }

    private onDelete(category: Category): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar la categoría "${category.name}"?`,
            () => this.deleteCategory(category.category_id),
        );
    }

    private deleteCategory(categoryId: number): void {
        this.categoriesService
            .delete(categoryId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Categoría eliminada',
                        'La categoría se eliminó correctamente.',
                    );

                    this.loadcategories();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar la categoría.');
                },
            });
    }

    saveCategory(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.categoryForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedCategory();

        this.saving.set(true);

        const request$ = selected
            ? this.categoriesService.update(selected.category_id, payload)
            : this.categoriesService.create(payload as CreateCategory);

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
                            ? 'La categoría se actualizó correctamente.'
                            : 'La categoría se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedCategory.set(null);

                    this.loadcategories();
                },
                error: (error) => {
                    const applied = this.categoryForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar la categoría.');
                },
            });
    }
}
