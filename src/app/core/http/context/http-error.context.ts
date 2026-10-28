import { HttpContextToken } from '@angular/common/http';

export const SKIP_GLOBAL_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
