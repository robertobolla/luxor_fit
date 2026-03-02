import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Guardamos el idioma en localStorage para persistencia básica
const savedLanguage = localStorage.getItem('luxor_admin_language') || 'es';

const resources = {
    es: {
        translation: {
            settings: {
                title: 'Configuraciones',
                language: 'Idioma',
                units: 'Sistema de Unidades',
                metric: 'Métrico (kg, cm, ml)',
                imperial: 'Imperial (lb, in, oz)',
                save: 'Guardar Cambios',
                saved: 'Configuración guardada correctamente',
                spanish: 'Español',
                english: 'Inglés'
            },
            sidebar: {
                general: 'GENERAL',
                admin: 'ADMINISTRACIÓN',
                business: 'MI NEGOCIO',
                gym: 'MI GIMNASIO',
                account: 'CUENTA',
                dashboard: 'Dashboard',
                users: 'Usuarios',
                partners: 'Socios',
                partner_list: 'Lista de Socios',
                partner_payments: 'Gestión de Pagos',
                empresarios: 'Empresarios',
                exercises: 'Ejercicios',
                foods: 'Alimentos',
                diets: 'Dietas',
                nutrition: 'Nutrición',
                messaging: 'Mensajería',
                settings: 'Configuraciones',
                tools: 'Herramientas',
                general_tools: 'General',
                organization: 'Mi Organización',
                stats: 'Estadísticas',
                my_sales: 'Mis Ventas',
                my_earnings: 'Mis Finanzas',
                my_users: 'Mis Usuarios',
                delete_account: 'Eliminar Cuenta',
                training: 'Entrenamiento',
                routines: 'Rutinas',
                routine_bank: 'Banco de Rutinas'
            },
            dashboard: {
                welcome_admin: 'Bienvenido, Admin',
                welcome_partner: 'Bienvenido, Socio',
                stats_users: 'Total Alumnos',
                stats_payments: 'Pagos Recientes',
                stats_earnings: 'Ingresos del Mes',
                stats_templates: 'Plantillas de Dietas',
                stats_trainers: 'Entrenadores Activos',
                recent_activity: 'Actividad Reciente',
                no_activity: 'No hay actividad reciente.',
                quick_actions: 'Acciones Rápidas',
                new_user: 'Nuevo Usuario',
                new_diet: 'Nueva Dieta',
                new_exercise: 'Nuevo Ejercicio',
                view_reports: 'Ver Reportes',
                admin_mode: 'Modo Administrador',
                kpis: 'Métricas Clave (Admin)',
                revenue_today: 'Ingresos Hoy',
                active_partners: 'Socios Activos',
                churn_rate: 'Tasa de Cancelación (Mes)',
                alerts: 'Alertas y Notificaciones',
                comparison: {
                    title: 'Comparativa Mes a Mes',
                    users: 'Usuarios',
                    active: 'Activos',
                    new: 'Nuevos',
                    revenue: 'Ingresos',
                    total: 'Total',
                    mrr: 'MRR',
                    sales: 'Ventas Directas vs Referidos',
                    growth: 'Crecimiento de Usuarios (6 Meses)'
                }
            },
            empresario_dashboard: {
                title: 'Dashboard de Tu Gimnasio',
                subtitle: 'Estadísticas y métricas de tus miembros',
                loading: 'Cargando estadísticas...',
                error: 'No se pudieron cargar las estadísticas',
                active_members: 'Miembros Activos',
                of_total: 'de {{total}} totales',
                workouts: 'Entrenamientos',
                last_month: 'Último mes',
                retention: 'Retención',
                retention_rate: 'Tasa de retención',
                expiring: 'Por Expirar',
                next_30d: 'Próximos 30 días',
                member_stats: 'Estadísticas de Miembros',
                new_7d: 'Nuevos (7 días)',
                new_30d: 'Nuevos (30 días)',
                expiring_7d: 'Expiran en 7 días',
                inactive_30d: 'Sin entrenar >30d',
                workout_activity: 'Actividad de Entrenamientos',
                workouts_by_day: 'Entrenamientos por Día de la Semana',
                top_active: 'Top 5 Miembros Más Activos',
                member: 'Miembro',
                no_name: 'Sin nombre',
                workouts_week: 'Entrenamientos (semana)',
                avg_workouts: 'Promedio por miembro',
                training_plans: 'Planes de Entrenamiento',
                with_plan: 'Con plan activo',
                without_plan: 'Sin plan asignado',
                plan_coverage: 'Cobertura de planes',
                adherence: 'Adherencia',
                goals_progress: 'Metas y Progreso',
                fitness_level: 'Nivel de Fitness',
                no_fitness_data: 'No hay datos de fitness disponibles',
                goals_distribution: 'Distribución de Objetivos',
                no_goals_data: 'No hay datos de objetivos disponibles'
            },
            users: {
                title: 'Mis Usuarios',
                loading: 'Cargando usuarios...',
                back: 'Volver',
                payment_history: 'Historial de Pagos',
                add_user: 'Agregar Usuario',
                email: 'Email',
                plan_price: 'Precio del plan actual',
                active_users: 'Usuarios activos',
                limit: 'Límite',
                gym_routines: 'Rutinas del Gym',
                gym_routines_desc: 'Habilita la biblioteca de rutinas del gimnasio para que tus usuarios puedan verlas en la app.',
                search: 'Buscar por nombre, usuario o email...',
                filter: {
                    all: 'Todos',
                    active: 'Activos',
                    inactive: 'Inactivos',
                    expired: 'Expirados'
                },
                table: {
                    name: 'Nombre',
                    username: 'Usuario',
                    email: 'Email',
                    age: 'Edad',
                    level: 'Nivel',
                    joined: 'Fecha Ingreso',
                    subscription: 'Suscripción',
                    plan: 'Plan Entrenamiento',
                    expiration: 'Expiración',
                    status: 'Estado',
                    actions: 'Acciones'
                }
            },
            foods: {
                title: 'Biblioteca de Nutrición',
                new_food: 'Nuevo Alimento',
                total_foods: 'Total Alimentos',
                my_gym: 'De mi Gimnasio',
                global: 'Globales',
                search: 'Buscar alimento...',
                all_categories: 'Todas las categorías',
                table: {
                    food: 'Alimento',
                    origin: 'Origen',
                    category: 'Categoría',
                    qty: 'Cant.',
                    macros: 'Macros',
                    actions: 'Acciones'
                },
                origin_gym: 'Mi Gimnasio',
                origin_global: 'Global',
                qty_grams: '100g',
                qty_unit: 'Por Unidad'
            },
            diets: {
                title: 'Plantillas de Dietas',
                new_template: 'Nueva Plantilla',
                total_templates: 'Total Plantillas',
                categories: 'Categorías',
                manage_categories: 'Gestionar Categorías',
                search: 'Buscar plantilla...',
                all_categories: 'Todas las categorías',
                table: {
                    name: 'Nombre / Descripción',
                    category: 'Categoría',
                    duration: 'Duración',
                    macros: 'Macros Objetivo (Promedio)',
                    actions: 'Acciones'
                },
                actions: {
                    preview: 'Vista previa',
                    send: 'Enviar a Alumno',
                    edit: 'Editar',
                    duplicate: 'Duplicar',
                    pdf: 'Exportar PDF',
                    history: 'Historial',
                    delete: 'Eliminar'
                }
            },
            exercises: {
                title: 'Catálogo de Ejercicios',
                subtitle: 'Busca un ejercicio y sube un video asociado con un clic',
                search: 'Buscar ejercicio...',
                reload: 'Recargar',
                upload_video: 'Subir video',
                replace_video: 'Reemplazar video',
                add_info: 'Agregar info',
                edit_info: 'Editar info',
                delete: 'Eliminar',
                table: {
                    exercise: 'Ejercicio',
                    category: 'Categoría',
                    muscles: 'Músculos',
                    zones: 'Zonas',
                    type: 'Tipo',
                    equipment: 'Equipamiento',
                    goals: 'Objetivos',
                    status: 'Estado',
                    actions: 'Acciones'
                }
            },
            partners: {
                title: 'Gestión de Socios',
                subtitle: 'Administra socios y sus códigos de descuento',
                loading: 'Cargando socios...',
                add_partner: 'Agregar Socio',
                add_new_partner: 'Agregar Nuevo Socio',
                edit_partner: 'Editar Socio',
                table: {
                    name: 'Nombre',
                    email: 'Email',
                    code_monthly: 'Código Mensual',
                    code_annual: 'Código Anual',
                    referred_by: 'Referido Por',
                    discount: 'Descuento',
                    commission: 'Comisión',
                    active: 'Activos',
                    earnings: 'Ganancias',
                    status: 'Estado',
                    actions: 'Acciones'
                },
                empty_state: 'No hay socios registrados. Agrega el primero.',
                badges: {
                    active: 'Activo',
                    inactive: 'Inactivo',
                    no_commission: 'Sin comisión'
                },
                form: {
                    parent_partner: 'Socio Padre (Quien lo invitó)',
                    parent_partner_none: '-- Ninguno (Directo) --',
                    parent_partner_desc: 'Si seleccionas un padre, este recibirá comisiones de Nivel 2 por las ventas de este nuevo socio.',
                    email: 'Email *',
                    name: 'Nombre',
                    discount_code: 'Código de Descuento *',
                    generate_random: 'Generar',
                    discount_code_secondary: 'Código Anual (Opcional)',
                    price_info_title: 'Precio para referidos (fijo - compatible con Apple):',
                    normal: 'normal',
                    expiration_date: 'Fecha de Expiración del Código',
                    expiration_desc: 'Fecha límite para usar el código. Después de esta fecha el código ya no funcionará. Dejar vacío si el código nunca expira.',
                    commission: 'Comisión por Suscripción Activa *',
                    level_1_monthly: 'Nivel 1 (Mensual)',
                    level_1_annual: 'Nivel 1 (Anual)',
                    level_2_monthly: 'Nivel 2 (Mensual)',
                    level_2_annual: 'Nivel 2 (Anual)',
                    commission_type_fixed: 'Fijo ($)',
                    commission_type_percentage: 'Porcentaje (%)',
                    commission_desc_fixed: 'Monto fijo: Se paga este monto por cada usuario con suscripción activa.',
                    commission_desc_percentage: 'Porcentaje: Se paga este porcentaje del precio mensual por cada suscripción activa.',
                    free_access_info: 'Los socios tienen acceso gratuito automático a la app. Cuando un usuario usa el código del socio, paga el precio con descuento a través de Apple. El socio gana comisión por cada suscripción activa.',
                    cancel: 'Cancelar',
                    save: 'Guardar',
                    add: 'Agregar Socio'
                },
                messages: {
                    delete_title: 'Eliminar Socio',
                    delete_desc: '¿Estás seguro de eliminar a',
                    delete_warning: 'Esta acción no se puede deshacer.',
                    toggle_title: 'Cambiar Estado',
                    toggle_desc: '¿Estás seguro de cambiar el estado de',
                    save_success: 'Socio guardado correctamente.',
                    save_error: 'Error al guardar socio.',
                    delete_success: 'Socio eliminado correctamente.',
                    delete_error: 'Error al eliminar socio.'
                }
            },
            partner_payments: {
                title: 'Control de Pagos y Comisiones',
                subtitle: 'Gestiona pagos y comisiones de socios',
                loading: 'Cargando...',
                register_payment: 'Registrar Pago',
                sidebar: {
                    title: 'Socios',
                    search: 'Buscar socio (nombre o email)...',
                    active: 'Activos:',
                    paid: 'Pagado:'
                },
                summary: {
                    title: 'Resumen de',
                    calculating: 'Calculando desglose...',
                    level_1: 'Nivel 1 (Directos)',
                    level_2: 'Nivel 2 (Referidos)',
                    monthly: 'Mensuales',
                    annual: 'Anuales',
                    total_subs: 'Total Suscripciones',
                    total_paid: 'Total Pagado Histórico',
                    monthly_generation: 'Generación Mensual Actual',
                    total_l1_l2: 'Total nivel 1 + nivel 2'
                },
                history_commissions: {
                    title: 'Historial de Transacciones (Comisiones)',
                    loading: 'Cargando historial...',
                    empty: 'No hay transacciones registradas.',
                    date: 'Fecha',
                    origin_user: 'Usuario Origen',
                    level: 'Nivel',
                    detail: 'Detalle',
                    commission: 'Comisión'
                },
                history_payments: {
                    title: 'Historial de Pagos Recibidos',
                    empty: 'No hay pagos registrados para este socio.',
                    period: 'Período',
                    date: 'Fecha Pago',
                    amount: 'Monto',
                    subs: 'Suscripciones',
                    ref: 'Referencia',
                    status: 'Estado',
                    actions: 'Acciones',
                    status_paid: 'Pagado',
                    status_pending: 'Pendiente',
                    status_cancelled: 'Cancelado'
                },
                form: {
                    title: 'Registrar Pago',
                    period_start: 'Período Inicio *',
                    period_end: 'Período Fin *',
                    amount: 'Monto ($) *',
                    amount_desc: 'Monto sugerido basado en la generación actual. Puedes ajustarlo manualmente si pagas un período parcial o diferente.',
                    method: 'Método de Pago',
                    select: 'Seleccionar...',
                    transfer: 'Transferencia Bancaria',
                    paypal: 'PayPal',
                    stripe: 'Stripe',
                    check: 'Cheque',
                    other: 'Otro',
                    ref: 'Referencia/Número de Transacción',
                    notes: 'Notas',
                    cancel: 'Cancelar',
                    register: 'Registrar Pago'
                }
            },
            partner_referrals: {
                title: 'Mis Referidos',
                loading: 'Cargando...',
                code_info: 'Tu código:',
                stats: {
                    sales: 'Mis Ventas (Nivel 1)',
                    team_sales: 'Ventas de Equipo (Nivel 2)',
                    earnings: 'Ganancia Mensual Est.',
                    direct: 'Directo',
                    team: 'Equipo'
                },
                tabs: {
                    sales: 'Mis Ventas',
                    team: 'Mi Equipo'
                },
                sales_tab: {
                    title: 'Usuarios que usaron tu código',
                    empty: 'Aún no hay usuarios que hayan usado tu código de descuento.',
                    table: {
                        user: 'Usuario',
                        email: 'Email',
                        type: 'Tipo',
                        discount: 'Descuento',
                        status: 'Estado',
                        date: 'Fecha'
                    },
                    free: 'Gratuito',
                    paid: 'Pago'
                },
                team_tab: {
                    title: 'Mi Equipo de Socios',
                    empty: 'Aún no tienes socios registrados bajo tu referencia.',
                    empty_desc: 'Invita a otros entrenadores o influencers para ganar comisiones de Nivel 2.',
                    table: {
                        partner: 'Socio',
                        email: 'Email',
                        joined: 'Se unió',
                        sales: 'Sus Ventas',
                        active: 'Activos (Comisionables)'
                    }
                }
            },
            admin_tools: {
                title: 'Admin Tools',
                subtitle: 'Herramientas de administración del sistema',
                loading: 'Cargando...',
                restricted: 'Acceso Restringido',
                restricted_desc: 'Esta sección solo está disponible para administradores.',
                role_view: {
                    title: '👁️ Vista de Rol',
                    change: 'Cambiar Vista',
                    desc: 'Simula la vista del dashboard como si fueras otro usuario. Útil para pruebas y debugging.',
                    viewing_as: '👁️ Viendo como',
                    role: 'Rol',
                    back: '🔙 Volver a Admin',
                    select_title: 'Selecciona un rol y usuario para ver el dashboard desde su perspectiva',
                    select_role: 'Seleccionar Rol',
                    search_user: 'Buscar Usuario',
                    search_placeholder: 'Nombre o email...',
                    users_with_role: 'Usuarios con rol',
                    loading_users: 'Cargando usuarios...',
                    no_users: 'No se encontraron usuarios con este rol',
                    inactive: 'Inactivo',
                    no_name: 'Sin nombre',
                    no_email: 'Sin email',
                    close: 'Cerrar'
                },
                admins: {
                    title: 'Administradores',
                    add: '+ Agregar Administrador',
                    desc: 'Solo los administradores pueden agregar nuevos administradores al sistema.',
                    add_title: 'Agregar Administrador',
                    by_email: 'Por Email',
                    search_user: 'Buscar Usuario',
                    email_label: 'Email *',
                    email_placeholder: 'email@ejemplo.com',
                    email_help: 'Ingresa el email del usuario registrado. El sistema verificará que existe antes de promoverlo.',
                    name_label: 'Nombre (opcional)',
                    name_placeholder: 'Nombre del administrador',
                    registered_notice_title: '✅ El usuario debe estar registrado en la app',
                    registered_notice_desc: 'Se verificará que el usuario existe antes de promoverlo a administrador. Tendrá acceso inmediato al cerrar y volver a abrir la app.',
                    cancel: 'Cancelar',
                    adding: 'Agregando...',
                    add_btn: 'Agregar Administrador',
                    search_label: 'Buscar Usuario por Email o Nombre',
                    search_btn: 'Buscar',
                    searching: 'Buscando...',
                    results: 'Resultados:',
                    no_results: 'No se encontraron usuarios. Asegúrate de que el usuario exista en el sistema.',
                    selected: 'Usuario seleccionado:',
                    change_user: 'Cambiar usuario',
                    warning: '⚠️ El usuario tendrá acceso completo al dashboard como administrador.'
                }
            },
            admin_org: {
                title: 'Mi Organización',
                subtitle: 'Gestiona los usuarios de tu organización',
                add: '+ Agregar Usuario',
                loading: 'Cargando organización...',
                stats: {
                    active: 'Miembros Activos',
                    total: 'Total Miembros'
                },
                table: {
                    user: 'Usuario',
                    email: 'Email',
                    joined: 'Fecha de Ingreso',
                    status: 'Estado',
                    actions: 'Acciones'
                },
                status: {
                    active: 'Activo',
                    inactive: 'Inactivo'
                },
                remove: 'Remover',
                empty: 'No tienes usuarios en tu organización',
                add_first: 'Agregar tu primer usuario',
                no_name: 'Sin nombre',
                add_modal: {
                    title: 'Agregar Usuario a Mi Organización',
                    desc: 'El usuario debe estar registrado en la app para poder añadirlo.',
                    email: 'Email del Usuario *',
                    email_placeholder: 'usuario@ejemplo.com',
                    name: 'Nombre (opcional)',
                    name_placeholder: 'Nombre del usuario',
                    duration: 'Duración de Suscripción',
                    months_1: '1 mes',
                    months_3: '3 meses',
                    months_6: '6 meses',
                    months_12: '12 meses',
                    cancel: 'Cancelar',
                    adding: 'Agregando...',
                    add: 'Agregar Usuario'
                },
                delete_modal: {
                    title: 'Remover Usuario',
                    desc: '¿Estás seguro de que quieres remover a',
                    from_org: 'de tu organización?',
                    warning: 'El usuario perderá acceso a los beneficios de tu organización.',
                    cancel: 'Cancelar',
                    removing: 'Removiendo...',
                    remove: 'Remover Usuario'
                }
            },
            stats: {
                title: 'Estadísticas Generales',
                subtitle: 'Vista detallada del rendimiento',
                loading: 'Cargando estadísticas...',
                error: 'Error al cargar estadísticas',
                time: {
                    days_7: '7D',
                    days_30: '30D',
                    months_3: '3M',
                    year_1: '1A',
                    all: 'Todo'
                },
                cards: {
                    revenue: 'Ingresos',
                    historic: 'Histórico',
                    collected: 'Recaudado en este periodo',
                    new_users: 'Nuevos Usuarios',
                    registered: 'Registrados en este periodo',
                    churn: 'Tasa de Cancelación',
                    cancellations: 'cancelaciones en periodo',
                    revenue_source: 'Origen de Ingresos',
                    direct: 'Directo',
                    referrals: 'Referidos'
                },
                global: {
                    total_users: 'Total de Usuarios',
                    last_7d: 'últimos 7 días',
                    last_30d: 'últimos 30 días',
                    active_subs: 'Suscripciones Activas',
                    conversion: 'Tasa de conversión',
                    monthly_revenue: 'Ingresos Mensuales',
                    total_accumulated: 'Total acumulado',
                    active_plans: 'Planes Activos',
                    of_users: 'de usuarios'
                },
                sections: {
                    subs_status: '📊 Estado de Suscripciones',
                    active: 'Activas',
                    trial: 'En prueba',
                    canceled: 'Canceladas',
                    past_due: 'Vencidas',
                    total: 'Total',
                    users_dist: '👥 Distribución de Usuarios',
                    normal_users: 'Usuarios normales',
                    admins: 'Administradores',
                    partners: 'Socios',
                    gym_owners: 'Empresarios',
                    gyms: '🏢 Gimnasios',
                    total_gyms: 'Total de gimnasios',
                    total_members: 'Miembros totales',
                    active_members: 'Miembros activos',
                    fitness_levels: '🎯 Niveles de Fitness',
                    beginner: 'Principiante',
                    intermediate: 'Intermedio',
                    advanced: 'Avanzado',
                    demographics: '📈 Demografía',
                    avg_age: 'Edad promedio',
                    years: 'años'
                }
            },
            empresarios: {
                title: 'Empresarios (Gimnasios)',
                add: '+ Agregar Empresario',
                loading: 'Cargando empresarios...',
                table: {
                    gym: 'Gimnasio',
                    contact: 'Contacto',
                    status: 'Estado',
                    expiration: 'Vencimiento',
                    pack_start: 'Inicio Pack',
                    users: 'Usuarios',
                    total_members: 'Total Miembros',
                    pack_value: 'Valor Pack',
                    actions: 'Acciones'
                },
                pack: 'Pack',
                no_limit: 'Sin límite',
                no_name: 'Sin nombre',
                active: 'Activo',
                inactive: 'Inactivo',
                click_deactivate: 'Click para desactivar',
                click_activate: 'Click para activar',
                view_users: 'Ver Usuarios',
                edit: 'Editar',
                empty: 'No hay empresarios registrados',
                status: {
                    no_expiration: 'Sin Vencimiento',
                    grace: 'Vencido (Gracia: {{days}}d restantes)',
                    expired: 'Vencido hace {{days}} días',
                    expires_in: 'Vence en {{days}} días',
                    expires_on: 'Vence: {{date}}'
                },
                edit_modal: {
                    title: 'Editar Empresario',
                    desc: 'Actualiza la información del empresario',
                    email: 'Email *',
                    name: 'Nombre del Empresario',
                    gym_name: 'Nombre del Gimnasio *',
                    pack_type: 'Tipo de Pack *',
                    monthly: 'Mensual',
                    annual: 'Anual',
                    pack_price: 'Precio del Pack',
                    user_limit: 'Límite de Usuarios (Pack)',
                    expiration_date: 'Fecha de Vencimiento de Servicio (Opcional)',
                    expiration_help: 'Si vence, hay 7 días de gracia antes del corte.',
                    address: 'Dirección del Gimnasio',
                    phone: 'Teléfono',
                    cancel: 'Cancelar',
                    save: 'Guardar Cambios'
                },
                add_modal: {
                    title: 'Agregar Empresario',
                    desc: 'Completa los datos básicos. El empresario podrá registrarse después con este email.',
                    email_help: 'El empresario deberá registrarse en la app con este email',
                    create: 'Crear Empresario'
                },
                confirm: {
                    deactivate_title: '¿Desactivar empresario?',
                    activate_title: '¿Activar empresario?',
                    deactivate_msg: '¿Estás seguro de desactivar a',
                    activate_msg: '¿Estás seguro de activar a',
                    cancel: 'Cancelar',
                    deactivate: 'Desactivar',
                    activate: 'Activar'
                }
            },
            admin_messaging: {
                title: 'Mensajería',
                subtitle: 'Envía mensajes a tus usuarios',
                compose: {
                    title: 'Nuevo Mensaje',
                    audience: 'Audiencia',
                    search_placeholder: 'Buscar usuario...',
                    select_all: 'Seleccionar todos',
                    deselect_all: 'Deseleccionar',
                    no_users: 'No se encontraron usuarios',
                    selected_count: '{{count}} usuario(s) seleccionado(s)',
                    message_title: 'Título del mensaje',
                    title_placeholder: 'Ej: Nuevo plan de entrenamiento disponible',
                    message_body: 'Mensaje',
                    body_placeholder: 'Escribe tu mensaje aquí...',
                    send_btn: 'Enviar a {{count}} usuario(s)'
                },
                history: {
                    title: 'Mensajes Enviados',
                    no_history: 'No has enviado mensajes aún',
                    sent_to: 'Enviado a {{count}} usuario(s)'
                },
                confirm: {
                    title: 'Confirmar Envío',
                    desc: 'Estás a punto de enviar un mensaje a:',
                    audience_label: 'Audiencia:',
                    recipients_label: 'Destinatarios:',
                    title_label: 'Título:',
                    cancel: 'Cancelar',
                    confirm: 'Confirmar Envío',
                    sending: 'Enviando...'
                },
                badges: {
                    my_org: 'Mi org',
                    no_name: 'Sin nombre'
                },
                alerts: {
                    required: 'El título y mensaje son requeridos',
                    no_recipients: 'No hay destinatarios seleccionados',
                    success_push: 'Mensaje enviado a {{count}} usuarios ({{push}} push enviados)',
                    success: 'Mensaje enviado a {{count}} usuarios',
                    success_no_push: 'Mensaje enviado a {{count}} usuarios (push notifications no disponibles)',
                    error: 'Error al enviar mensaje'
                },
                audience_labels: {
                    org_all: 'Todos los miembros de mi organización',
                    org_selected: 'Miembros seleccionados de mi organización',
                    app_all: 'Todos los usuarios de la app',
                    app_selected: 'Usuarios seleccionados de la app',
                    select_org: 'Seleccionar de mi org',
                    search_app: 'Buscar en toda la app'
                }
            },
            mensajeria: {
                title: '📧 Mensajería',
                subtitle: 'Envía mensajes a tus miembros',
                compose: {
                    title: '✉️ Nuevo Mensaje',
                    sender: 'Nombre del Remitente',
                    sender_placeholder: 'Ej: "Rocket Gym"',
                    sender_hint: 'Este nombre aparecerá como el remitente del mensaje',
                    msg_title: 'Título',
                    title_placeholder: 'Ej: "Horarios especiales esta semana"',
                    body: 'Mensaje',
                    body_placeholder: 'Escribe tu mensaje aquí...',
                    emojis: '😊 Emojis',
                    link: '🔗 Link',
                    chars: '{{count}} caracteres',
                    recipients: 'Destinatarios',
                    all_members: '👥 Todos los Miembros ({{count}})',
                    selected: '✅ Seleccionar',
                    search_placeholder: 'Buscar por nombre o email...',
                    select_all: 'Seleccionar Todos',
                    deselect_all: 'Deseleccionar Todos',
                    no_name: 'Sin nombre',
                    no_email: 'Sin email',
                    preview: '👁️ Vista Previa',
                    preview_footer: 'Ahora · {{count}} destinatario(s)',
                    send_btn: '📨 Enviar a {{count}} miembro(s)',
                    sending: '📤 Enviando...'
                },
                history: {
                    title: '📜 Historial de Mensajes',
                    hide: '🔽 Ocultar',
                    show: '🔼 Mostrar',
                    loading: 'Cargando historial...',
                    empty: 'No has enviado mensajes aún',
                    recipients: '👥 {{count}} destinatario(s)',
                    type_all: '📢 Todos',
                    type_selected: '✅ Seleccionados'
                },
                link_modal: {
                    title: '🔗 Insertar Link',
                    text_label: 'Texto del enlace',
                    text_placeholder: 'Ej: "Ver horarios"',
                    url_label: 'URL',
                    url_placeholder: 'https://ejemplo.com',
                    cancel: 'Cancelar',
                    insert: 'Insertar Link'
                },
                confirm: {
                    title: '📨 Confirmar Envío',
                    from: 'De:',
                    title_label: 'Título:',
                    recipients_label: 'Destinatarios:',
                    msg_label: 'Mensaje:',
                    warning: '⚠️ Este mensaje se enviará como notificación a los miembros seleccionados y no podrá ser eliminado.',
                    cancel: 'Cancelar',
                    confirm: 'Confirmar y Enviar'
                }
            },
            user_detail: {
                loading: 'Cargando...',
                not_found: 'Usuario no encontrado',
                back: '← Volver a usuarios',
                title: 'Detalles del Usuario',
                personal_info: {
                    title: 'Información Personal',
                    name: 'Nombre:',
                    email: 'Email:',
                    age: 'Edad:',
                    height: 'Altura:',
                    weight: 'Peso:',
                    no_name: 'Sin nombre',
                    no_email: 'Sin email',
                    na: 'N/A'
                },
                fitness: {
                    title: 'Fitness',
                    level: 'Nivel:',
                    days: 'Días disponibles:',
                    days_unit: 'días/semana',
                    duration: 'Duración de sesión:',
                    duration_unit: 'minutos',
                    unknown: 'unknown'
                },
                goals: {
                    title: 'Objetivos',
                    empty: 'Sin objetivos'
                },
                equipment: {
                    title: 'Equipamiento',
                    empty: 'Sin equipamiento'
                },
                metadata: {
                    title: 'Metadata',
                    user_id: 'ID de usuario:',
                    registered: 'Fecha de registro:',
                    updated: 'Última actualización:'
                }
            },
            gym_member_detail: {
                back: '← Volver',
                loading: 'Cargando estadísticas...',
                default_user: 'Usuario',
                period: 'Período:',
                periods: {
                    days_7: '7 días',
                    this_month: 'Este mes',
                    months_3: '3 meses',
                    months_6: '6 meses',
                    all: 'Todo'
                },
                stats_error: 'No se pudieron cargar las estadísticas del usuario',
                active_plan: {
                    title: '🏋️ Plan de Entrenamiento Activo',
                    weeks: '{{count}} semanas',
                    days_per_week: '{{count}} días/semana',
                    week: 'Semana:',
                    week_num: 'Semana {{num}}',
                    day: 'Día {{num}}',
                    exercise_summary: '{{sets}} series × {{reps}} reps',
                    exercise: 'Ejercicio {{num}}',
                    tabs: {
                        routine: '📋 Rutina',
                        records: '✅ Registros',
                        evolution: '📈 Evolución',
                        stats: '📊 Estadísticas'
                    },
                    routine: {
                        rest: 'Descanso:',
                        sets: 'Series:',
                        set_num: 'Serie {{num}}',
                        reps: '🔁 {{count}} reps',
                        rir: '💪 RIR {{count}}',
                        rir_default: '💪 RIR 2-3'
                    },
                    records: {
                        info: '📝 Aquí se mostrarán los registros completados de este ejercicio en este día',
                        empty: 'No hay registros de este ejercicio en el período seleccionado'
                    },
                    evolution: {
                        info: '📈 Progreso histórico del ejercicio "{{name}}"',
                        empty: 'No hay suficientes datos para mostrar la evolución'
                    },
                    stats: {
                        info: '📊 Estadísticas del ejercicio "{{name}}"',
                        orm: '1RM Estimado',
                        volume: 'Volumen Total',
                        completed: 'Veces Completado'
                    }
                },
                workout_stats: {
                    title: '📊 Estadísticas de Entrenamientos',
                    completed: 'Completados ({{period}})',
                    avg_min: 'Min. Promedio',
                    recent: 'Entrenamientos Recientes'
                },
                body_metrics: {
                    title: '📏 Evolución Corporal',
                    hide_chart: '📊 Ocultar Gráfica',
                    show_chart: '📈 Ver Gráfica',
                    show: 'Mostrar:',
                    metrics: {
                        weight: '⚖️ Peso',
                        fat: '📉 Grasa',
                        muscle: '💪 Músculo',
                        bmi: '📊 IMC',
                        lean: '🏋️ Masa Magra'
                    },
                    chart: {
                        weight: 'Peso (kg)',
                        fat: 'Grasa Corporal (%)',
                        muscle: 'Masa Muscular (%)',
                        bmi: 'IMC',
                        lean: 'Masa Magra (kg)'
                    },
                    current: {
                        weight: 'Peso Actual',
                        fat: 'Grasa Corporal',
                        muscle: 'Masa Muscular'
                    },
                    details: {
                        title: 'Última Medición',
                        date: '📅 Fecha:',
                        bmi: '📊 IMC:',
                        lean: '🏋️ Masa Magra:'
                    },
                    info: '💡 En el período seleccionado ({{period}})'
                },
                nutrition: {
                    title: '🍎 Nutrición (últimos 7 días)',
                    cal: 'Cal/día',
                    protein: 'Proteína',
                    carbs: 'Carbos',
                    fat: 'Grasas'
                },
                steps: {
                    title: '👟 Actividad Diaria ({{period}})',
                    avg: 'Promedio Diario',
                    total: 'Total de Pasos',
                    cal: 'Calorías/Día (est.)',
                    dist: 'Distancia/Día (est.)',
                    analysis: 'Análisis de Actividad',
                    target: '🎯 Objetivo Diario (10,000 pasos)',
                    vs_target: '📊 vs. Objetivo:',
                    level: '⚡ Nivel de Actividad:',
                    levels: {
                        sedentary: '🟡 Sedentario',
                        light: '🟢 Poco Activo',
                        moderate: '🔵 Moderado',
                        active: '🟣 Activo',
                        very_active: '🔴 Muy Activo'
                    },
                    info: '💡 Estimaciones basadas en: 0.7m por paso y 0.04 kcal por paso'
                },
                notes: {
                    title: '📝 Notas del Nutricionista',
                    placeholder: 'Notas internas sobre el alumno (ej: intolerante a lácteos, prefiere evitar gluten...)',
                    saved: '✅ Guardado',
                    saving: 'Guardando...',
                    save: 'Guardar Notas'
                },
                diet_history: {
                    title: '📋 Historial de Dietas Enviadas',
                    loading: 'Cargando...',
                    empty: 'No se han enviado dietas a este alumno.',
                    table: {
                        plan: 'Plan',
                        date: 'Fecha',
                        status: 'Estado',
                        message: 'Mensaje'
                    },
                    status: {
                        pending: 'Pendiente',
                        accepted: 'Aceptada',
                        rejected: 'Rechazada'
                    },
                    no_plan: 'Plan sin nombre',
                    no_message: '—'
                }
            },
            create_user: {
                title: 'Crear Usuario con Rol',
                subtitle: 'Asignar roles a usuarios existentes o pre-crear para nuevos',
                email_req: 'Email es requerido',
                confirm_change: 'Este usuario ya tiene el rol "{{current}}".\n\n¿Deseas cambiar su rol a "{{new}}"?',
                confirm_create: '⚠️ Este usuario no está registrado en la app.\n\nSe creará un registro PRE-ASIGNADO con rol "{{role}}".\n\nEl usuario deberá registrarse en la app con el email:\n{{email}}\n\nUna vez registrado, el sistema lo reconocerá automáticamente y le asignará el rol.\n\n¿Deseas continuar?',
                socio_req: 'Para crear un socio, debes completar: Código, Descuento y Comisión',
                code_used: 'Este código de descuento ya está en uso',
                gym_req: 'Para crear un miembro de gimnasio, debes especificar el Gimnasio y Fecha de expiración',
                success_update: '✅ Usuario actualizado exitosamente.\n\nRol: {{role}}\nEl cambio es inmediato.',
                success_create: '✅ Usuario pre-creado exitosamente.\n\nRol: {{role}}\nEmail: {{email}}\n\nCuando el usuario se registre con este email, se le asignará el rol automáticamente.',
                error: 'Error al crear usuario',
                form: {
                    email: 'Email *',
                    email_placeholder: 'usuario@ejemplo.com',
                    email_hint: 'Si el usuario existe, se le asignará el rol. Si no, se pre-creará.',
                    name: 'Nombre',
                    name_placeholder: 'Nombre completo',
                    role: 'Rol *',
                    roles: {
                        admin: 'Admin - Acceso completo',
                        socio: 'Socio - Con código de descuento',
                        empresario: 'Empresario - Gestiona gimnasios',
                        gym_member: 'Miembro de Gimnasio'
                    },
                    discount_code: 'Código de Descuento *',
                    discount_code_placeholder: 'CODIGO10',
                    discount_pct: 'Descuento (%) *',
                    commission_pct: 'Comisión (%) *',
                    gym_id: 'ID del Gimnasio *',
                    gym_id_placeholder: 'UUID del gimnasio',
                    exp_date: 'Fecha de Expiración *',
                    info_title: '✅ Proceso automático',
                    info_desc1: 'Si el usuario existe: Se actualiza inmediatamente.',
                    info_desc2: 'Si no existe: Se pre-crea y se activará al registrarse con el email.',
                    cancel: 'Cancelar',
                    processing: 'Procesando...',
                    submit: 'Crear Usuario'
                }
            },
            delete_account: {
                req_error: 'Debes escribir ELIMINAR para confirmar',
                success: 'Tu cuenta ha sido eliminada correctamente',
                error: 'Error al eliminar la cuenta. Contacta soporte.',
                title: 'Eliminar Mi Cuenta',
                warning_title: '⚠️ Advertencia',
                warning_desc1: 'Esta acción es permanente e irreversible.',
                warning_desc2: 'Al eliminar tu cuenta se borrarán:',
                warning_list: {
                    profile: 'Tu perfil y datos personales',
                    workouts: 'Todos tus planes de entrenamiento',
                    nutrition: 'Todos tus planes de nutrición',
                    history: 'Tu historial de ejercicios',
                    metrics: 'Tus métricas corporales',
                    photos: 'Tus fotos de progreso',
                    chats: 'Todas tus conversaciones'
                },
                account_label: 'Cuenta:',
                submit: 'Solicitar Eliminación de Cuenta',
                contact: 'Si tienes dudas, contacta a',
                modal: {
                    title: 'Confirmar Eliminación',
                    desc: 'Para confirmar que deseas eliminar tu cuenta permanentemente, escribe ELIMINAR en el campo de abajo:',
                    placeholder: 'Escribe ELIMINAR',
                    cancel: 'Cancelar',
                    confirming: 'Eliminando...',
                    confirm: 'Eliminar Permanentemente'
                }
            },
            notification_bell: {
                title: 'Notificaciones',
                mark_all_read: 'Marcar todas como leídas',
                loading: 'Cargando...',
                empty: 'No tienes notificaciones',
                view_all: 'Ver todas',
                time: {
                    now: 'Ahora',
                    mins_ago: 'Hace {{count}} min',
                    hours_ago: 'Hace {{count}}h',
                    days_ago: 'Hace {{count}}d'
                }
            },
            confirm_dialog: {
                confirm: 'Confirmar',
                cancel: 'Cancelar'
            },
            exercise_metadata: {
                step1: 'Paso 1: Categoría y Tipo de Ejercicio',
                category: 'Categoría Principal *',
                select_category: 'Selecciona una categoría',
                movement_type: 'Tipo de movimiento:',
                type: 'Tipo de Ejercicio *',
                type_compound: 'Compuesto',
                type_isolation: 'Aislado',
                type_tip: '💡 Si seleccionas 2 o más músculos en el siguiente paso, es recomendable marcar "Compuesto"',
                uses_time: 'Este ejercicio usa tiempo en lugar de repeticiones',
                uses_time_tip: '💡 Marca esto para ejercicios como battle ropes, plancha, cardio, etc. que se miden por tiempo (ej: 30s, 1min) en lugar de repeticiones',
                step2: 'Paso 2: Músculos y Zonas Musculares',
                muscles: 'Músculos Trabajados *',
                zones: 'Zonas Musculares (opcional)',
                step3: 'Paso 3: Equipamiento',
                equipment: 'Equipamiento Necesario * (puedes seleccionar múltiples)',
                step4: 'Paso 4: Objetivos y Actividad',
                goals: 'Objetivos *'
            }
        }
    },
    en: {
        translation: {
            settings: {
                title: 'Settings',
                language: 'Language',
                units: 'Unit System',
                metric: 'Metric (kg, cm, ml)',
                imperial: 'Imperial (lb, in, oz)',
                save: 'Save Changes',
                saved: 'Settings saved successfully',
                spanish: 'Spanish',
                english: 'English'
            },
            sidebar: {
                general: 'GENERAL',
                admin: 'ADMINISTRATION',
                business: 'MY BUSINESS',
                gym: 'MY GYM',
                account: 'ACCOUNT',
                dashboard: 'Dashboard',
                users: 'Users',
                partners: 'Partners',
                partner_list: 'Partner List',
                partner_payments: 'Payment Management',
                empresarios: 'Gym Owners',
                exercises: 'Exercises',
                foods: 'Foods',
                diets: 'Diets',
                nutrition: 'Nutrition',
                messaging: 'Messaging',
                settings: 'Settings',
                tools: 'Tools',
                general_tools: 'General',
                organization: 'My Organization',
                stats: 'Statistics',
                my_sales: 'My Sales',
                my_earnings: 'My Earnings',
                my_users: 'My Users',
                delete_account: 'Delete Account',
                training: 'Training',
                routines: 'Routines',
                routine_bank: 'Routine Bank'
            },
            dashboard: {
                welcome_admin: 'Welcome, Admin',
                welcome_partner: 'Welcome, Partner',
                stats_users: 'Total Members',
                stats_payments: 'Recent Payments',
                stats_earnings: 'Monthly Earnings',
                stats_templates: 'Diet Templates',
                stats_trainers: 'Active Trainers',
                recent_activity: 'Recent Activity',
                no_activity: 'No recent activity.',
                quick_actions: 'Quick Actions',
                new_user: 'New User',
                new_diet: 'New Diet',
                new_exercise: 'New Exercise',
                view_reports: 'View Reports',
                admin_mode: 'Administrator Mode',
                kpis: 'Key Metrics (Admin)',
                revenue_today: 'Revenue Today',
                active_partners: 'Active Partners',
                churn_rate: 'Churn Rate (Month)',
                alerts: 'Alerts & Notifications',
                comparison: {
                    title: 'Month over Month Comparison',
                    users: 'Users',
                    active: 'Active',
                    new: 'New',
                    revenue: 'Revenue',
                    total: 'Total',
                    mrr: 'MRR',
                    sales: 'Direct Sales vs Referrals',
                    growth: 'User Growth (6 Months)'
                }
            },
            empresario_dashboard: {
                title: 'Your Gym Dashboard',
                subtitle: 'Stats and metrics for your members',
                loading: 'Loading stats...',
                error: 'Could not load stats',
                active_members: 'Active Members',
                of_total: 'of {{total}} total',
                workouts: 'Workouts',
                last_month: 'Last month',
                retention: 'Retention',
                retention_rate: 'Retention rate',
                expiring: 'Expiring Soon',
                next_30d: 'Next 30 days',
                member_stats: 'Member Stats',
                new_7d: 'New (7 days)',
                new_30d: 'New (30 days)',
                expiring_7d: 'Expiring in 7 days',
                inactive_30d: 'No workouts >30d',
                workout_activity: 'Workout Activity',
                workouts_by_day: 'Workouts by Day of Week',
                top_active: 'Top 5 Most Active Members',
                member: 'Member',
                no_name: 'No name',
                workouts_week: 'Workouts (week)',
                avg_workouts: 'Avg per member',
                training_plans: 'Training Plans',
                with_plan: 'With active plan',
                without_plan: 'No plan assigned',
                plan_coverage: 'Plan coverage',
                adherence: 'Adherence',
                goals_progress: 'Goals & Progress',
                fitness_level: 'Fitness Level',
                no_fitness_data: 'No fitness data available',
                goals_distribution: 'Goals Distribution',
                no_goals_data: 'No goals data available'
            },
            users: {
                title: 'My Users',
                loading: 'Loading users...',
                back: 'Back',
                payment_history: 'Payment History',
                add_user: 'Add User',
                email: 'Email',
                plan_price: 'Current plan price',
                active_users: 'Active users',
                limit: 'Limit',
                gym_routines: 'Gym Routines',
                gym_routines_desc: 'Enable the gym routines library so your users can view them in the app.',
                search: 'Search by name, username or email...',
                filter: {
                    all: 'All',
                    active: 'Active',
                    inactive: 'Inactive',
                    expired: 'Expired'
                },
                table: {
                    name: 'Name',
                    username: 'Username',
                    email: 'Email',
                    age: 'Age',
                    level: 'Level',
                    joined: 'Joined Date',
                    subscription: 'Subscription',
                    plan: 'Training Plan',
                    expiration: 'Expiration',
                    status: 'Status',
                    actions: 'Actions'
                }
            },
            foods: {
                title: 'Nutrition Library',
                new_food: 'New Food',
                total_foods: 'Total Foods',
                my_gym: 'My Gym',
                global: 'Global',
                search: 'Search food...',
                all_categories: 'All Categories',
                table: {
                    food: 'Food',
                    origin: 'Origin',
                    category: 'Category',
                    qty: 'Qty.',
                    macros: 'Macros',
                    actions: 'Actions'
                },
                origin_gym: 'My Gym',
                origin_global: 'Global',
                qty_grams: '3.5 oz (100g)',
                qty_unit: 'Per Unit'
            },
            diets: {
                title: 'Diet Templates',
                new_template: 'New Template',
                total_templates: 'Total Templates',
                categories: 'Categories',
                manage_categories: 'Manage Categories',
                search: 'Search template...',
                all_categories: 'All Categories',
                table: {
                    name: 'Name / Description',
                    category: 'Category',
                    duration: 'Duration',
                    macros: 'Target Macros (Avg)',
                    actions: 'Actions'
                },
                actions: {
                    preview: 'Preview',
                    send: 'Send to Client',
                    edit: 'Edit',
                    duplicate: 'Duplicate',
                    pdf: 'Export PDF',
                    history: 'History',
                    delete: 'Delete'
                }
            },
            exercises: {
                title: 'Exercise Catalog',
                subtitle: 'Search for an exercise and upload an associated video',
                search: 'Search exercise...',
                reload: 'Reload',
                upload_video: 'Upload video',
                replace_video: 'Replace video',
                add_info: 'Add info',
                edit_info: 'Edit info',
                delete: 'Delete',
                table: {
                    exercise: 'Exercise',
                    category: 'Category',
                    muscles: 'Muscles',
                    zones: 'Zones',
                    type: 'Type',
                    equipment: 'Equipment',
                    goals: 'Goals',
                    status: 'Status',
                    actions: 'Actions'
                }
            },
            partners: {
                title: 'Partner Management',
                subtitle: 'Manage partners and their discount codes',
                loading: 'Loading partners...',
                add_partner: 'Add Partner',
                add_new_partner: 'Add New Partner',
                edit_partner: 'Edit Partner',
                table: {
                    name: 'Name',
                    email: 'Email',
                    code_monthly: 'Monthly Code',
                    code_annual: 'Annual Code',
                    referred_by: 'Referred By',
                    discount: 'Discount',
                    commission: 'Commission',
                    active: 'Active',
                    earnings: 'Earnings',
                    status: 'Status',
                    actions: 'Actions'
                },
                empty_state: 'No partners registered yet. Add the first one.',
                badges: {
                    active: 'Active',
                    inactive: 'Inactive',
                    no_commission: 'No commission'
                },
                form: {
                    parent_partner: 'Parent Partner (Who invited)',
                    parent_partner_none: '-- None (Direct) --',
                    parent_partner_desc: 'If you select a parent, they will receive Level 2 commissions for the sales of this new partner.',
                    email: 'Email *',
                    name: 'Name',
                    discount_code: 'Discount Code *',
                    generate_random: 'Generate',
                    discount_code_secondary: 'Annual Code (Optional)',
                    price_info_title: 'Price for referrals (fixed - compatible with Apple):',
                    normal: 'normal',
                    expiration_date: 'Code Expiration Date',
                    expiration_desc: 'Deadline to use the code. After this date the code will no longer work. Leave empty if the code never expires.',
                    commission: 'Commission per Active Subscription *',
                    level_1_monthly: 'Level 1 (Monthly)',
                    level_1_annual: 'Level 1 (Annual)',
                    level_2_monthly: 'Level 2 (Monthly)',
                    level_2_annual: 'Level 2 (Annual)',
                    commission_type_fixed: 'Fixed ($)',
                    commission_type_percentage: 'Percentage (%)',
                    commission_desc_fixed: 'Fixed amount: This amount is paid for each user with an active subscription.',
                    commission_desc_percentage: 'Percentage: This percentage of the monthly price is paid for each active subscription.',
                    free_access_info: 'Partners have automatic free access to the app. When a user uses the partner code, they pay the discounted price via Apple. The partner earns commission for each active subscription.',
                    cancel: 'Cancel',
                    save: 'Save',
                    add: 'Add Partner'
                },
                messages: {
                    delete_title: 'Delete Partner',
                    delete_desc: 'Are you sure you want to delete',
                    delete_warning: 'This action cannot be undone.',
                    toggle_title: 'Change Status',
                    toggle_desc: 'Are you sure you want to change the status of',
                    save_success: 'Partner saved successfully.',
                    save_error: 'Error saving partner.',
                    delete_success: 'Partner deleted successfully.',
                    delete_error: 'Error deleting partner.'
                }
            },
            partner_payments: {
                title: 'Payments and Commissions Control',
                subtitle: 'Manage payments and partner commissions',
                loading: 'Loading...',
                register_payment: 'Register Payment',
                sidebar: {
                    title: 'Partners',
                    search: 'Search partner (name or email)...',
                    active: 'Active:',
                    paid: 'Paid:'
                },
                summary: {
                    title: 'Summary of',
                    calculating: 'Calculating breakdown...',
                    level_1: 'Level 1 (Direct)',
                    level_2: 'Level 2 (Referrals)',
                    monthly: 'Monthly',
                    annual: 'Annual',
                    total_subs: 'Total Subscriptions',
                    total_paid: 'Total Paid (Historical)',
                    monthly_generation: 'Current Monthly Generation',
                    total_l1_l2: 'Total Level 1 + Level 2'
                },
                history_commissions: {
                    title: 'Transaction History (Commissions)',
                    loading: 'Loading history...',
                    empty: 'No transactions recorded.',
                    date: 'Date',
                    origin_user: 'Origin User',
                    level: 'Level',
                    detail: 'Detail',
                    commission: 'Commission'
                },
                history_payments: {
                    title: 'Payment Reception History',
                    empty: 'No payments registered for this partner.',
                    period: 'Period',
                    date: 'Payment Date',
                    amount: 'Amount',
                    subs: 'Subscriptions',
                    ref: 'Reference',
                    status: 'Status',
                    actions: 'Actions',
                    status_paid: 'Paid',
                    status_pending: 'Pending',
                    status_cancelled: 'Cancelled'
                },
                form: {
                    title: 'Register Payment',
                    period_start: 'Period Start *',
                    period_end: 'Period End *',
                    amount: 'Amount ($) *',
                    amount_desc: 'Suggested amount based on current generation. You can adjust it manually if paying for a partial or different period.',
                    method: 'Payment Method',
                    select: 'Select...',
                    transfer: 'Bank Transfer',
                    paypal: 'PayPal',
                    stripe: 'Stripe',
                    check: 'Check',
                    other: 'Other',
                    ref: 'Reference/Transaction Number',
                    notes: 'Notes',
                    cancel: 'Cancel',
                    register: 'Register Payment'
                }
            },
            partner_referrals: {
                title: 'My Referrals',
                loading: 'Loading...',
                code_info: 'Your code:',
                stats: {
                    sales: 'My Sales (Level 1)',
                    team_sales: 'Team Sales (Level 2)',
                    earnings: 'Est. Monthly Earnings',
                    direct: 'Direct',
                    team: 'Team'
                },
                tabs: {
                    sales: 'My Sales',
                    team: 'My Team'
                },
                sales_tab: {
                    title: 'Users who used your code',
                    empty: 'No users have used your discount code yet.',
                    table: {
                        user: 'User',
                        email: 'Email',
                        type: 'Type',
                        discount: 'Discount',
                        status: 'Status',
                        date: 'Date'
                    },
                    free: 'Free',
                    paid: 'Paid'
                },
                team_tab: {
                    title: 'My Partner Team',
                    empty: 'You have no partners registered under your referral yet.',
                    empty_desc: 'Invite other trainers or influencers to earn Level 2 commissions.',
                    table: {
                        partner: 'Partner',
                        email: 'Email',
                        joined: 'Joined',
                        sales: 'Their Sales',
                        active: 'Active (Commissionable)'
                    }
                }
            },
            admin_tools: {
                title: 'Admin Tools',
                subtitle: 'System administration tools',
                loading: 'Loading...',
                restricted: 'Restricted Access',
                restricted_desc: 'This section is only available to administrators.',
                role_view: {
                    title: '👁️ Role View',
                    change: 'Change View',
                    desc: 'Simulate the dashboard view as if you were another user. Useful for testing and debugging.',
                    viewing_as: '👁️ Viewing as',
                    role: 'Role',
                    back: '🔙 Back to Admin',
                    select_title: 'Select a role and user to view the dashboard from their perspective',
                    select_role: 'Select Role',
                    search_user: 'Search User',
                    search_placeholder: 'Name or email...',
                    users_with_role: 'Users with role',
                    loading_users: 'Loading users...',
                    no_users: 'No users found with this role',
                    inactive: 'Inactive',
                    no_name: 'No name',
                    no_email: 'No email',
                    close: 'Close'
                },
                admins: {
                    title: 'Administrators',
                    add: '+ Add Administrator',
                    desc: 'Only administrators can add new administrators to the system.',
                    add_title: 'Add Administrator',
                    by_email: 'By Email',
                    search_user: 'Search User',
                    email_label: 'Email *',
                    email_placeholder: 'email@example.com',
                    email_help: 'Enter the email of the registered user. The system will verify they exist before promoting them.',
                    name_label: 'Name (optional)',
                    name_placeholder: 'Administrator name',
                    registered_notice_title: '✅ The user must be registered in the app',
                    registered_notice_desc: 'It will be verified that the user exists before promoting them to administrator. They will have immediate access upon closing and reopening the app.',
                    cancel: 'Cancel',
                    adding: 'Adding...',
                    add_btn: 'Add Administrator',
                    search_label: 'Search User by Email or Name',
                    search_btn: 'Search',
                    searching: 'Searching...',
                    results: 'Results:',
                    no_results: 'No users found. Make sure the user exists in the system.',
                    selected: 'Selected user:',
                    change_user: 'Change user',
                    warning: '⚠️ The user will have full access to the dashboard as an administrator.'
                }
            },
            admin_org: {
                title: 'My Organization',
                subtitle: 'Manage the users in your organization',
                add: '+ Add User',
                loading: 'Loading organization...',
                stats: {
                    active: 'Active Members',
                    total: 'Total Members'
                },
                table: {
                    user: 'User',
                    email: 'Email',
                    joined: 'Joined Date',
                    status: 'Status',
                    actions: 'Actions'
                },
                status: {
                    active: 'Active',
                    inactive: 'Inactive'
                },
                remove: 'Remove',
                empty: 'You have no users in your organization',
                add_first: 'Add your first user',
                no_name: 'No name',
                add_modal: {
                    title: 'Add User to My Organization',
                    desc: 'The user must be registered in the app to be added.',
                    email: 'User Email *',
                    email_placeholder: 'user@example.com',
                    name: 'Name (optional)',
                    name_placeholder: 'User name',
                    duration: 'Subscription Duration',
                    months_1: '1 month',
                    months_3: '3 months',
                    months_6: '6 months',
                    months_12: '12 months',
                    cancel: 'Cancel',
                    adding: 'Adding...',
                    add: 'Add User'
                },
                delete_modal: {
                    title: 'Remove User',
                    desc: 'Are you sure you want to remove',
                    from_org: 'from your organization?',
                    warning: 'The user will lose access to your organization\'s benefits.',
                    cancel: 'Cancel',
                    removing: 'Removing...',
                    remove: 'Remove User'
                }
            },
            stats: {
                title: 'General Statistics',
                subtitle: 'Detailed performance view',
                loading: 'Loading statistics...',
                error: 'Error loading statistics',
                time: {
                    days_7: '7D',
                    days_30: '30D',
                    months_3: '3M',
                    year_1: '1Y',
                    all: 'All'
                },
                cards: {
                    revenue: 'Revenue',
                    historic: 'Historic',
                    collected: 'Collected in this period',
                    new_users: 'New Users',
                    registered: 'Registered in this period',
                    churn: 'Churn Rate',
                    cancellations: 'cancellations in period',
                    revenue_source: 'Revenue Source',
                    direct: 'Direct',
                    referrals: 'Referrals'
                },
                global: {
                    total_users: 'Total Users',
                    last_7d: 'last 7 days',
                    last_30d: 'last 30 days',
                    active_subs: 'Active Subscriptions',
                    conversion: 'Conversion rate',
                    monthly_revenue: 'Monthly Revenue',
                    total_accumulated: 'Total accumulated',
                    active_plans: 'Active Plans',
                    of_users: 'of users'
                },
                sections: {
                    subs_status: '📊 Subscription Status',
                    active: 'Active',
                    trial: 'Trialing',
                    canceled: 'Canceled',
                    past_due: 'Past Due',
                    total: 'Total',
                    users_dist: '👥 User Distribution',
                    normal_users: 'Regular users',
                    admins: 'Administrators',
                    partners: 'Partners',
                    gym_owners: 'Gym Owners',
                    gyms: '🏢 Gyms',
                    total_gyms: 'Total gyms',
                    total_members: 'Total members',
                    active_members: 'Active members',
                    fitness_levels: '🎯 Fitness Levels',
                    beginner: 'Beginner',
                    intermediate: 'Intermediate',
                    advanced: 'Advanced',
                    demographics: '📈 Demographics',
                    avg_age: 'Average age',
                    years: 'years'
                }
            },
            empresarios: {
                title: 'Gym Owners (Empresarios)',
                add: '+ Add Gym Owner',
                loading: 'Loading gym owners...',
                table: {
                    gym: 'Gym',
                    contact: 'Contact',
                    status: 'Status',
                    expiration: 'Expiration',
                    pack_start: 'Pack Start',
                    users: 'Users',
                    total_members: 'Total Members',
                    pack_value: 'Pack Value',
                    actions: 'Actions'
                },
                pack: 'Pack',
                no_limit: 'No limit',
                no_name: 'No name',
                active: 'Active',
                inactive: 'Inactive',
                click_deactivate: 'Click to deactivate',
                click_activate: 'Click to activate',
                view_users: 'View Users',
                edit: 'Edit',
                empty: 'No gym owners registered',
                status: {
                    no_expiration: 'No Expiration',
                    grace: 'Expired (Grace: {{days}}d left)',
                    expired: 'Expired {{days}} days ago',
                    expires_in: 'Expires in {{days}} days',
                    expires_on: 'Expires: {{date}}'
                },
                edit_modal: {
                    title: 'Edit Gym Owner',
                    desc: 'Update gym owner information',
                    email: 'Email *',
                    name: 'Gym Owner Name',
                    gym_name: 'Gym Name *',
                    pack_type: 'Pack Type *',
                    monthly: 'Monthly',
                    annual: 'Annual',
                    pack_price: 'Pack Price',
                    user_limit: 'User Limit (Pack)',
                    expiration_date: 'Service Expiration Date (Optional)',
                    expiration_help: 'If it expires, there is a 7-day grace period before cutoff.',
                    address: 'Gym Address',
                    phone: 'Phone',
                    cancel: 'Cancel',
                    save: 'Save Changes'
                },
                add_modal: {
                    title: 'Add Gym Owner',
                    desc: 'Complete basic details. The owner can register later with this email.',
                    email_help: 'The gym owner must register in the app with this email',
                    create: 'Create Gym Owner'
                },
                confirm: {
                    deactivate_title: 'Deactivate gym owner?',
                    activate_title: 'Activate gym owner?',
                    deactivate_msg: 'Are you sure you want to deactivate',
                    activate_msg: 'Are you sure you want to activate',
                    cancel: 'Cancel',
                    deactivate: 'Deactivate',
                    activate: 'Activate'
                }
            },
            admin_messaging: {
                title: 'Messaging',
                subtitle: 'Send messages to your users',
                compose: {
                    title: 'New Message',
                    audience: 'Audience',
                    search_placeholder: 'Search user...',
                    select_all: 'Select all',
                    deselect_all: 'Deselect',
                    no_users: 'No users found',
                    selected_count: '{{count}} user(s) selected',
                    message_title: 'Message title',
                    title_placeholder: 'Ex: New workout plan available',
                    message_body: 'Message',
                    body_placeholder: 'Type your message here...',
                    send_btn: 'Send to {{count}} user(s)'
                },
                history: {
                    title: 'Sent Messages',
                    no_history: 'No messages sent yet',
                    sent_to: 'Sent to {{count}} user(s)'
                },
                confirm: {
                    title: 'Confirm Sending',
                    desc: 'You are about to send a message to:',
                    audience_label: 'Audience:',
                    recipients_label: 'Recipients:',
                    title_label: 'Title:',
                    cancel: 'Cancel',
                    confirm: 'Confirm Sending',
                    sending: 'Sending...'
                },
                badges: {
                    my_org: 'My org',
                    no_name: 'No name'
                },
                alerts: {
                    required: 'Title and message are required',
                    no_recipients: 'No recipients selected',
                    success_push: 'Message sent to {{count}} users ({{push}} push sent)',
                    success: 'Message sent to {{count}} users',
                    success_no_push: 'Message sent to {{count}} users (push notifications unavailable)',
                    error: 'Error sending message'
                },
                audience_labels: {
                    org_all: 'All members of my organization',
                    org_selected: 'Selected members of my organization',
                    app_all: 'All app users',
                    app_selected: 'Selected app users',
                    select_org: 'Select from my org',
                    search_app: 'Search in whole app'
                }
            },
            mensajeria: {
                title: '📧 Messaging',
                subtitle: 'Send messages to your members',
                compose: {
                    title: '✉️ New Message',
                    sender: 'Sender Name',
                    sender_placeholder: 'Ex: "Rocket Gym"',
                    sender_hint: 'This name will appear as the sender of the message',
                    msg_title: 'Title',
                    title_placeholder: 'Ex: "Special hours this week"',
                    body: 'Message',
                    body_placeholder: 'Type your message here...',
                    emojis: '😊 Emojis',
                    link: '🔗 Link',
                    chars: '{{count}} characters',
                    recipients: 'Recipients',
                    all_members: '👥 All Members ({{count}})',
                    selected: '✅ Select',
                    search_placeholder: 'Search by name or email...',
                    select_all: 'Select All',
                    deselect_all: 'Deselect All',
                    no_name: 'No name',
                    no_email: 'No email',
                    preview: '👁️ Preview',
                    preview_footer: 'Now · {{count}} recipient(s)',
                    send_btn: '📨 Send to {{count}} member(s)',
                    sending: '📤 Sending...'
                },
                history: {
                    title: '📜 Message History',
                    hide: '🔽 Hide',
                    show: '🔼 Show',
                    loading: 'Loading history...',
                    empty: 'You have not sent messages yet',
                    recipients: '👥 {{count}} recipient(s)',
                    type_all: '📢 All',
                    type_selected: '✅ Selected'
                },
                link_modal: {
                    title: '🔗 Insert Link',
                    text_label: 'Link text',
                    text_placeholder: 'Ex: "View schedule"',
                    url_label: 'URL',
                    url_placeholder: 'https://example.com',
                    cancel: 'Cancel',
                    insert: 'Insert Link'
                },
                confirm: {
                    title: '📨 Confirm Send',
                    from: 'From:',
                    title_label: 'Title:',
                    recipients_label: 'Recipients:',
                    msg_label: 'Message:',
                    warning: '⚠️ This message will be sent as a notification to the selected members and cannot be deleted.',
                    cancel: 'Cancel',
                    confirm: 'Confirm & Send'
                }
            },
            user_detail: {
                loading: 'Loading...',
                not_found: 'User not found',
                back: '← Back to users',
                title: 'User Details',
                personal_info: {
                    title: 'Personal Information',
                    name: 'Name:',
                    email: 'Email:',
                    age: 'Age:',
                    height: 'Height:',
                    weight: 'Weight:',
                    no_name: 'No name',
                    no_email: 'No email',
                    na: 'N/A'
                },
                fitness: {
                    title: 'Fitness',
                    level: 'Level:',
                    days: 'Available days:',
                    days_unit: 'days/week',
                    duration: 'Session duration:',
                    duration_unit: 'minutes',
                    unknown: 'unknown'
                },
                goals: {
                    title: 'Goals',
                    empty: 'No goals'
                },
                equipment: {
                    title: 'Equipment',
                    empty: 'No equipment'
                },
                metadata: {
                    title: 'Metadata',
                    user_id: 'User ID:',
                    registered: 'Registration date:',
                    updated: 'Last updated:'
                }
            },
            gym_member_detail: {
                back: '← Back',
                loading: 'Loading statistics...',
                default_user: 'User',
                period: 'Period:',
                periods: {
                    days_7: '7 days',
                    this_month: 'This month',
                    months_3: '3 months',
                    months_6: '6 months',
                    all: 'All'
                },
                stats_error: 'Could not load user statistics',
                active_plan: {
                    title: '🏋️ Active Training Plan',
                    weeks: '{{count}} weeks',
                    days_per_week: '{{count}} days/week',
                    week: 'Week:',
                    week_num: 'Week {{num}}',
                    day: 'Day {{num}}',
                    exercise_summary: '{{sets}} sets × {{reps}} reps',
                    exercise: 'Exercise {{num}}',
                    tabs: {
                        routine: '📋 Routine',
                        records: '✅ Records',
                        evolution: '📈 Evolution',
                        stats: '📊 Statistics'
                    },
                    routine: {
                        rest: 'Rest:',
                        sets: 'Sets:',
                        set_num: 'Set {{num}}',
                        reps: '🔁 {{count}} reps',
                        rir: '💪 RIR {{count}}',
                        rir_default: '💪 RIR 2-3'
                    },
                    records: {
                        info: '📝 Here you will see the completed records of this exercise on this day',
                        empty: 'No records for this exercise in the selected period'
                    },
                    evolution: {
                        info: '📈 Historical progress of the exercise "{{name}}"',
                        empty: 'Not enough data to show evolution'
                    },
                    stats: {
                        info: '📊 Statistics of the exercise "{{name}}"',
                        orm: 'Estimated 1RM',
                        volume: 'Total Volume',
                        completed: 'Times Completed'
                    }
                },
                workout_stats: {
                    title: '📊 Workout Statistics',
                    completed: 'Completed ({{period}})',
                    avg_min: 'Avg. Min',
                    recent: 'Recent Workouts'
                },
                body_metrics: {
                    title: '📏 Body Evolution',
                    hide_chart: '📊 Hide Chart',
                    show_chart: '📈 View Chart',
                    show: 'Show:',
                    metrics: {
                        weight: '⚖️ Weight',
                        fat: '📉 Fat',
                        muscle: '💪 Muscle',
                        bmi: '📊 BMI',
                        lean: '🏋️ Lean Mass'
                    },
                    chart: {
                        weight: 'Weight (kg)',
                        fat: 'Body Fat (%)',
                        muscle: 'Muscle Mass (%)',
                        bmi: 'BMI',
                        lean: 'Lean Mass (kg)'
                    },
                    current: {
                        weight: 'Current Weight',
                        fat: 'Body Fat',
                        muscle: 'Muscle Mass'
                    },
                    details: {
                        title: 'Last Measurement',
                        date: '📅 Date:',
                        bmi: '📊 BMI:',
                        lean: '🏋️ Lean Mass:'
                    },
                    info: '💡 In the selected period ({{period}})'
                },
                nutrition: {
                    title: '🍎 Nutrition (last 7 days)',
                    cal: 'Cal/day',
                    protein: 'Protein',
                    carbs: 'Carbs',
                    fat: 'Fats'
                },
                steps: {
                    title: '👟 Daily Activity ({{period}})',
                    avg: 'Daily Average',
                    total: 'Total Steps',
                    cal: 'Calories/Day (est.)',
                    dist: 'Distance/Day (est.)',
                    analysis: 'Activity Analysis',
                    target: '🎯 Daily Target (10,000 steps)',
                    vs_target: '📊 vs. Target:',
                    level: '⚡ Activity Level:',
                    levels: {
                        sedentary: '🟡 Sedentary',
                        light: '🟢 Lightly Active',
                        moderate: '🔵 Moderate',
                        active: '🟣 Active',
                        very_active: '🔴 Very Active'
                    },
                    info: '💡 Estimates based on: 0.7m per step and 0.04 kcal per step'
                },
                notes: {
                    title: '📝 Nutritionist Notes',
                    placeholder: 'Internal notes about the student (e.g., lactose intolerant, prefers avoiding gluten...)',
                    saved: '✅ Saved',
                    saving: 'Saving...',
                    save: 'Save Notes'
                },
                diet_history: {
                    title: '📋 Sent Diets History',
                    loading: 'Loading...',
                    empty: 'No diets have been sent to this student.',
                    table: {
                        plan: 'Plan',
                        date: 'Date',
                        status: 'Status',
                        message: 'Message'
                    },
                    status: {
                        pending: 'Pending',
                        accepted: 'Accepted',
                        rejected: 'Rejected'
                    },
                    no_plan: 'Unnamed plan',
                    no_message: '—'
                }
            },
            create_user: {
                title: 'Create User with Role',
                subtitle: 'Assign roles to existing users or pre-create for new ones',
                email_req: 'Email is required',
                confirm_change: 'This user already has the role "{{current}}".\n\nDo you want to change their role to "{{new}}"?',
                confirm_create: '⚠️ This user is not registered in the app.\n\nA PRE-ASSIGNED record with role "{{role}}" will be created.\n\nThe user must register in the app with the email:\n{{email}}\n\nOnce registered, the system will recognize them automatically and assign the role.\n\nDo you want to continue?',
                socio_req: 'To create a partner, you must fill in: Code, Discount, and Commission',
                code_used: 'This discount code is already in use',
                gym_req: 'To create a gym member, you must specify the Gym and Expiration Date',
                success_update: '✅ User updated successfully.\n\nRole: {{role}}\nThe change is immediate.',
                success_create: '✅ User pre-created successfully.\n\nRole: {{role}}\nEmail: {{email}}\n\nWhen the user registers with this email, the role will be automatically assigned.',
                error: 'Error creating user',
                form: {
                    email: 'Email *',
                    email_placeholder: 'user@example.com',
                    email_hint: 'If the user exists, they will be assigned the role. If not, they will be pre-created.',
                    name: 'Name',
                    name_placeholder: 'Full name',
                    role: 'Role *',
                    roles: {
                        admin: 'Admin - Full access',
                        socio: 'Partner - With discount code',
                        empresario: 'Gym Owner - Manages gyms',
                        gym_member: 'Gym Member'
                    },
                    discount_code: 'Discount Code *',
                    discount_code_placeholder: 'CODE10',
                    discount_pct: 'Discount (%) *',
                    commission_pct: 'Commission (%) *',
                    gym_id: 'Gym ID *',
                    gym_id_placeholder: 'Gym UUID',
                    exp_date: 'Expiration Date *',
                    info_title: '✅ Automatic process',
                    info_desc1: 'If user exists: Updated immediately.',
                    info_desc2: 'If user does not exist: Pre-created and activated upon registration with email.',
                    cancel: 'Cancel',
                    processing: 'Processing...',
                    submit: 'Create User'
                }
            },
            delete_account: {
                req_error: 'You must type DELETE to confirm',
                success: 'Your account has been successfully deleted',
                error: 'Error deleting account. Contact support.',
                title: 'Delete My Account',
                warning_title: '⚠️ Warning',
                warning_desc1: 'This action is permanent and irreversible.',
                warning_desc2: 'Deleting your account will erase:',
                warning_list: {
                    profile: 'Your profile and personal data',
                    workouts: 'All your training plans',
                    nutrition: 'All your nutrition plans',
                    history: 'Your exercise history',
                    metrics: 'Your body metrics',
                    photos: 'Your progress photos',
                    chats: 'All your conversations'
                },
                account_label: 'Account:',
                submit: 'Request Account Deletion',
                contact: 'If you have questions, contact',
                modal: {
                    title: 'Confirm Deletion',
                    desc: 'To confirm that you want to permanently delete your account, type DELETE in the field below:',
                    placeholder: 'Type DELETE',
                    cancel: 'Cancel',
                    confirming: 'Deleting...',
                    confirm: 'Permanently Delete'
                }
            },
            notification_bell: {
                title: 'Notifications',
                mark_all_read: 'Mark all as read',
                loading: 'Loading...',
                empty: 'No notifications',
                view_all: 'View all',
                time: {
                    now: 'Just now',
                    mins_ago: '{{count}} min ago',
                    hours_ago: '{{count}}h ago',
                    days_ago: '{{count}}d ago'
                }
            },
            confirm_dialog: {
                confirm: 'Confirm',
                cancel: 'Cancel'
            },
            exercise_metadata: {
                step1: 'Step 1: Category and Exercise Type',
                category: 'Main Category *',
                select_category: 'Select a category',
                movement_type: 'Movement type:',
                type: 'Exercise Type *',
                type_compound: 'Compound',
                type_isolation: 'Isolation',
                type_tip: '💡 If you select 2 or more muscles in the next step, it is recommended to check "Compound"',
                uses_time: 'This exercise uses time instead of repetitions',
                uses_time_tip: '💡 Check this for exercises like battle ropes, planks, cardio, etc. that are measured by time (e.g. 30s, 1min) instead of reps',
                step2: 'Step 2: Muscles and Muscle Zones',
                muscles: 'Target Muscles *',
                zones: 'Muscle Zones (optional)',
                step3: 'Step 3: Equipment',
                equipment: 'Required Equipment * (you can select multiple)',
                step4: 'Step 4: Goals and Activity',
                goals: 'Goals *'
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: savedLanguage,
        fallbackLng: 'es',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
