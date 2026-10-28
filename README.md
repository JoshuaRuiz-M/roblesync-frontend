<div align="center">

# 🅰️ Frontend Core Template

### Aplicación administrativa reutilizable con Angular 21, PrimeNG 21 y TypeScript

**Una base modular para desarrollar interfaces con autenticación JWT, autorización RBAC y navegación dinámica.**

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Tipado-3178C6?logo=typescript&logoColor=white)
![PrimeNG](https://img.shields.io/badge/PrimeNG-21-2563EB)
![RxJS](https://img.shields.io/badge/RxJS-Reactivo-B7178C?logo=reactivex&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-Producción-009639?logo=nginx&logoColor=white)

</div>

---

## 📖 Descripción

**Frontend Core Template** es una plantilla de aplicación web administrativa diseñada para reutilizar la infraestructura común de distintos proyectos. Incluye autenticación, autorización por permisos, menú dinámico, mantenimiento de usuarios y roles, y componentes de interfaz compartidos.

Las funcionalidades específicas de cada sistema pueden incorporarse como nuevas *features*, sin reconstruir la base de navegación, formularios y comunicación HTTP.

> **Alcance:** este repositorio contiene únicamente el frontend. Para utilizar las funcionalidades conectadas se requiere una API compatible con los contratos descritos en este documento.

## ✨ Funcionalidades principales

- 🔐 **Autenticación:** inicio de sesión con JWT, persistencia de sesión y protección de rutas.
- 👥 **Usuarios:** operaciones CRUD, asignación de roles y actualización de contraseñas.
- 🛡️ **Roles y permisos:** autorización RBAC y asignación de permisos a roles.
- 🧭 **Navegación dinámica:** menú autorizado por usuario y administración de elementos de menú.
- 🧩 **Componentes reutilizables:** `DataGrid` para tablas y `FormDialog` para formularios modales.
- 📝 **Validaciones:** formularios reactivos, reglas de contraseñas y errores de API mediante `ProblemDetails`.
- 🌐 **HTTP:** interceptores para JWT y tratamiento centralizado de errores.
- 🚦 **Navegación:** páginas de acceso denegado (403) y página no encontrada (404).
- 🐳 **Despliegue:** compilación de producción con Docker multietapa y Nginx.

## 🧰 Stack tecnológico

| Tecnología | Uso |
| --- | --- |
| Angular 21 | Framework frontend |
| TypeScript | Lenguaje de desarrollo |
| PrimeNG 21 / PrimeUIX Aura | Componentes y tema visual |
| RxJS | Gestión de flujos asíncronos |
| SCSS | Estilos |
| ESLint y Prettier | Análisis estático y formato |
| Docker y Nginx | Compilación y publicación del frontend |

## 📋 Requisitos

- Node.js y npm compatibles con la versión de Angular instalada (consultar `package.json` y la [compatibilidad oficial de Angular](https://angular.dev/reference/versions)).
- Acceso a una API backend compatible para autenticación y mantenimiento de datos.
- Docker, si se utilizará el despliegue mediante contenedores.

## 🚀 Instalación y ejecución local

Clona el repositorio e instala las dependencias:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <DIRECTORIO_DEL_REPOSITORIO>
npm ci
```

Configura la URL de la API en `src/environments/environment.ts`:

```typescript
export const environment = {
    appName: 'Template Frontend Angular PrimeNG',
    appDescription: 'Plataforma de administración y gestión.',
    production: false,
    apiUrl: 'http://localhost:3000/api',
} as const;
```

Inicia el servidor de desarrollo:

```bash
npm start
```

La dirección de acceso predeterminada de `ng serve` suele ser `http://localhost:4200/`.

> Si frontend y backend se ejecutan en orígenes distintos durante el desarrollo, el backend debe configurar CORS para permitir las solicitudes desde el frontend.

## 🏗️ Arquitectura

```text
src/
├── app/
│   ├── core/
│   │   ├── auth/            # Autenticación, guards y menú
│   │   ├── http/            # Modelos, interceptores y validaciones HTTP
│   │   └── services/        # Notificaciones y confirmaciones
│   ├── features/
│   │   ├── auth/
│   │   ├── forbidden/
│   │   ├── home/
│   │   ├── menu-items/
│   │   ├── not-found/
│   │   ├── permissions/
│   │   ├── roles/
│   │   └── users/
│   ├── layout/              # Layouts de autenticación y administración
│   ├── routes/              # Rutas administrativas
│   └── shared/              # Componentes y validadores reutilizables
└── environments/            # Configuración por entorno
```

La disponibilidad exacta de cada pantalla depende de las rutas y permisos definidos en la aplicación.

### Flujo de una solicitud

```text
┌───────────────────────┐
│     Navegador         │
│  Angular + PrimeNG    │
└───────────┬───────────┘
            │ Navegación y acciones
            ▼
┌───────────────────────┐
│   Rutas y Guards      │
│ authGuard / menuGuard │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Features y Servicios │
│ Users / Roles / Menús │
└───────────┬───────────┘
            │ HttpClient
            ▼
┌───────────────────────┐
│ Interceptores HTTP    │
│ JWT / 401 / Errores   │
└───────────┬───────────┘
            │ HTTPS / API REST
            ▼
┌───────────────────────┐
│    Backend externo    │
│ Autorización y datos  │
└───────────────────────┘
```

### Organización por capas

| Capa | Responsabilidad |
| --- | --- |
| `core/` | Autenticación, guards, interceptores y servicios globales |
| `features/` | Pantallas, modelos y servicios por funcionalidad |
| `shared/` | Componentes y validadores reutilizables |
| `layout/` | Estructuras visuales de autenticación y administración |
| `routes/` | Definición de rutas administrativas |


## 🔐 Autenticación y autorización

La aplicación consume una API que autentica usuarios mediante JWT. El frontend conserva el token y el perfil autenticado en `localStorage`, agrega el encabezado `Authorization: Bearer <token>` a las solicitudes dirigidas a la API y gestiona respuestas `401` cerrando la sesión.

Las rutas privadas utilizan `authGuard`; las rutas administrativas protegidas por permisos utilizan `menuGuard`. Las acciones disponibles en las pantallas se adaptan a los permisos del perfil autenticado. **La API debe validar el token y los permisos en el servidor**: las comprobaciones del frontend no sustituyen la autorización del backend.

El menú lateral se obtiene desde `GET /api/auth/menu` y se limpia al cerrar sesión.

### Flujo de autenticación

```text
Usuario ──► Formulario de login ──► POST /api/auth/login
                                          │
                                          ▼
                                  JWT + perfil + permisos
                                          │
                                          ▼
                                AuthService / localStorage
                                          │
                       ┌──────────────────┴──────────────────┐
                       ▼                                     ▼
                Guards de rutas                     Interceptor JWT
                       │                                     │
                       ▼                                     ▼
               Acceso autorizado                    Solicitudes a la API
```


## 🔌 Integración con la API

La URL base se define mediante `environment.apiUrl`. Entre los recursos consumidos por la plantilla se encuentran:

| Recurso | Finalidad |
| --- | --- |
| `POST /api/auth/login` | Inicio de sesión |
| `GET /api/auth/menu` | Navegación autorizada |
| `/api/users` | Mantenimiento de usuarios |
| `/api/users/:id/roles` | Consulta y sincronización de roles del usuario |
| `/api/roles` | Mantenimiento de roles |
| `/api/menu-items` | Mantenimiento de elementos de menú |

Los endpoints de asignación de permisos y menús a roles también deben estar disponibles conforme a los servicios del frontend. La estructura exacta de respuestas, filtros, paginación y permisos debe coincidir con el contrato de la API implementada.

Las validaciones del backend pueden devolver errores en formato `ProblemDetails`, incluidos errores asociados a campos de formularios. La complejidad de contraseña contempla entre 12 y 128 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.

## 🛠️ Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia el servidor de desarrollo |
| `npm run build` | Genera la compilación de producción |
| `npm run watch` | Compila en modo desarrollo y observa cambios |
| `npm run lint` | Ejecuta ESLint |
| `npm run lint:fix` | Aplica correcciones automáticas de ESLint |
| `npm run format` | Formatea el código con Prettier |
| `npm run format:check` | Comprueba el formato |
| `npm run typecheck` | Comprueba tipos TypeScript |
| `npm run check` | Ejecuta typecheck, lint y revisión de formato |

La compilación de producción está configurada para publicar los archivos estáticos directamente en `dist/`.

## 🐳 Docker y Nginx

El `Dockerfile` utiliza dos etapas: Node.js para compilar Angular y Nginx para servir el resultado.

```text
┌─────────────────────────────┐
│  Etapa 1: Node.js           │
│  npm ci + ng build          │
└──────────────┬──────────────┘
               │ dist/
               ▼
┌─────────────────────────────┐
│  Etapa 2: Nginx             │
│  Archivos estáticos Angular │
└──────────────┬──────────────┘
               │ /api (proxy opcional)
               ▼
┌─────────────────────────────┐
│  Backend Express            │
│  Servicio en red Docker     │
└─────────────────────────────┘
```


Construye la imagen:

```bash
docker build -t frontend-core:1.0.0 .
```

Si `nginx.conf` utiliza un proxy hacia `http://backend:3000`, el contenedor **debe** ejecutarse en una red donde el nombre `backend` sea resoluble, por ejemplo mediante Docker Compose. No bastará con ejecutar el frontend aislado si ese servicio no existe.

Con el backend conectado a la misma red, el frontend puede publicar el puerto 80 del contenedor en el 8080 del host:

```bash
docker run -d --name frontend-core --network <RED_COMPARTIDA> -p 8080:80 frontend-core:1.0.0
```

La aplicación estará disponible en `http://localhost:8080/`.

### Configuración de producción

El archivo `src/environments/environment.production.ts` utiliza `apiUrl: '/api'`. En `angular.json`, la configuración de producción debe reemplazar `environment.ts` por `environment.production.ts` mediante `fileReplacements`.

Nginx debe resolver las rutas de Angular con `try_files ... /index.html` y, cuando se use proxy, reenviar `/api/` al servicio backend sin eliminar el prefijo `/api`.

> Los archivos `environment` de Angular se incorporan durante la compilación. Cambiar variables de entorno del contenedor después de construir la imagen no modifica automáticamente `apiUrl`.

## ♻️ Adaptación de la plantilla

1. Modifica el nombre y la descripción de la aplicación en los archivos de entorno.
2. Ajusta `apiUrl` y verifica el contrato de la API.
3. Adapta las rutas, los permisos y el menú a los módulos del nuevo proyecto.
4. Reutiliza `DataGrid`, `FormDialog`, los servicios compartidos y los validadores para nuevas funcionalidades.
5. Configura el despliegue y las políticas de seguridad según el entorno de destino.

## 📄 Licencia

Este proyecto se distribuye bajo los términos del archivo [LICENSE](LICENSE), si está incluido en el repositorio.
