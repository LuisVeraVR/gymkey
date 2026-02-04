'use client';

import { useState } from 'react';

type ActionType = 'user_created' | 'user_updated' | 'user_deleted' | 'access_granted' | 'access_denied' | 'payment_received' | 'subscription_created' | 'subscription_expired' | 'settings_changed' | 'login' | 'logout';

interface AuditEvent {
  id: string;
  action: ActionType;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  target?: {
    type: string;
    name: string;
    id: string;
  };
  details?: string;
  timestamp: string;
  date: string;
}

const actionConfig: Record<ActionType, { icon: React.ReactNode; label: string; color: string }> = {
  user_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
    label: 'Usuario creado',
    color: 'bg-success/10 text-success',
  },
  user_updated: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    label: 'Usuario actualizado',
    color: 'bg-info/10 text-info',
  },
  user_deleted: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    label: 'Usuario eliminado',
    color: 'bg-destructive/10 text-destructive',
  },
  access_granted: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Acceso permitido',
    color: 'bg-success/10 text-success',
  },
  access_denied: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    label: 'Acceso denegado',
    color: 'bg-destructive/10 text-destructive',
  },
  payment_received: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Pago recibido',
    color: 'bg-success/10 text-success',
  },
  subscription_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Membresia creada',
    color: 'bg-primary/10 text-primary',
  },
  subscription_expired: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    label: 'Membresia vencida',
    color: 'bg-warning/10 text-warning',
  },
  settings_changed: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Config. modificada',
    color: 'bg-muted text-muted-foreground',
  },
  login: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
    label: 'Inicio de sesion',
    color: 'bg-info/10 text-info',
  },
  logout: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    label: 'Cierre de sesion',
    color: 'bg-muted text-muted-foreground',
  },
};

// Sample audit data
const sampleAuditEvents: AuditEvent[] = [
  {
    id: '1',
    action: 'access_granted',
    actor: { name: 'Sistema', email: 'system@gymkey.com', role: 'SYSTEM' },
    target: { type: 'user', name: 'Carlos Rodriguez', id: 'usr_1' },
    details: 'Acceso al gimnasio validado correctamente',
    timestamp: '10:45',
    date: 'Hoy',
  },
  {
    id: '2',
    action: 'user_created',
    actor: { name: 'Admin Principal', email: 'admin@gimnasio.com', role: 'GYM_ADMIN' },
    target: { type: 'user', name: 'Maria Garcia', id: 'usr_2' },
    details: 'Nuevo miembro registrado con plan mensual',
    timestamp: '10:32',
    date: 'Hoy',
  },
  {
    id: '3',
    action: 'payment_received',
    actor: { name: 'Sistema', email: 'system@gymkey.com', role: 'SYSTEM' },
    target: { type: 'user', name: 'Juan Martinez', id: 'usr_3' },
    details: 'Pago de membresia mensual - $50.00',
    timestamp: '10:15',
    date: 'Hoy',
  },
  {
    id: '4',
    action: 'access_denied',
    actor: { name: 'Sistema', email: 'system@gymkey.com', role: 'SYSTEM' },
    target: { type: 'user', name: 'Pedro Sanchez', id: 'usr_4' },
    details: 'Membresia vencida - Ultimo pago hace 35 dias',
    timestamp: '09:58',
    date: 'Hoy',
  },
  {
    id: '5',
    action: 'login',
    actor: { name: 'Staff Recepcion', email: 'staff@gimnasio.com', role: 'STAFF' },
    timestamp: '09:30',
    date: 'Hoy',
  },
  {
    id: '6',
    action: 'user_updated',
    actor: { name: 'Admin Principal', email: 'admin@gimnasio.com', role: 'GYM_ADMIN' },
    target: { type: 'user', name: 'Ana Lopez', id: 'usr_5' },
    details: 'Actualizado rol de MEMBER a COACH',
    timestamp: '09:15',
    date: 'Hoy',
  },
  {
    id: '7',
    action: 'subscription_expired',
    actor: { name: 'Sistema', email: 'system@gymkey.com', role: 'SYSTEM' },
    target: { type: 'user', name: 'Roberto Diaz', id: 'usr_6' },
    details: 'Membresia trimestral vencida',
    timestamp: '00:00',
    date: 'Hoy',
  },
  {
    id: '8',
    action: 'settings_changed',
    actor: { name: 'Admin Principal', email: 'admin@gimnasio.com', role: 'GYM_ADMIN' },
    details: 'Horario de apertura modificado: 6:00 AM - 10:00 PM',
    timestamp: '18:45',
    date: 'Ayer',
  },
  {
    id: '9',
    action: 'subscription_created',
    actor: { name: 'Staff Recepcion', email: 'staff@gimnasio.com', role: 'STAFF' },
    target: { type: 'user', name: 'Laura Torres', id: 'usr_7' },
    details: 'Nueva membresia anual activada',
    timestamp: '16:30',
    date: 'Ayer',
  },
  {
    id: '10',
    action: 'logout',
    actor: { name: 'Admin Principal', email: 'admin@gimnasio.com', role: 'GYM_ADMIN' },
    timestamp: '20:00',
    date: 'Ayer',
  },
];

function AuditEventCard({ event }: { event: AuditEvent }) {
  const config = actionConfig[event.action];

  return (
    <div className="flex gap-4 p-4 hover:bg-muted/20 transition-colors rounded-lg group">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {config.label}
              {event.target && (
                <span className="text-muted-foreground font-normal">
                  {' - '}{event.target.name}
                </span>
              )}
            </p>
            {event.details && (
              <p className="text-sm text-muted-foreground mt-0.5">{event.details}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Por <span className="font-medium text-foreground">{event.actor.name}</span>
              {event.actor.role !== 'SYSTEM' && (
                <span className="text-muted-foreground"> ({event.actor.email})</span>
              )}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{event.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

type FilterType = 'all' | 'users' | 'access' | 'payments' | 'system';

export default function AuditPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filterEvents = (events: AuditEvent[]) => {
    return events.filter(event => {
      const matchesSearch = searchQuery === '' || 
        event.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.target?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.details?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = filter === 'all' ||
        (filter === 'users' && ['user_created', 'user_updated', 'user_deleted'].includes(event.action)) ||
        (filter === 'access' && ['access_granted', 'access_denied'].includes(event.action)) ||
        (filter === 'payments' && ['payment_received', 'subscription_created', 'subscription_expired'].includes(event.action)) ||
        (filter === 'system' && ['settings_changed', 'login', 'logout'].includes(event.action));

      return matchesSearch && matchesFilter;
    });
  };

  const filteredEvents = filterEvents(sampleAuditEvents);

  // Group events by date
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, AuditEvent[]>);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
          <p className="text-muted-foreground mt-1">Registro de todas las actividades del sistema</p>
        </div>
        <button className="h-9 px-4 bg-secondary hover:bg-secondary-hover text-secondary-foreground text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar Log
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar en el log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-4 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Todo' },
            { value: 'users', label: 'Usuarios' },
            { value: 'access', label: 'Accesos' },
            { value: 'payments', label: 'Pagos' },
            { value: 'system', label: 'Sistema' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as FilterType)}
              className={`h-9 px-4 text-sm font-medium rounded-lg transition-colors ${
                filter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary-hover text-secondary-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total eventos hoy', value: '47', color: 'text-foreground' },
          { label: 'Accesos permitidos', value: '38', color: 'text-success' },
          { label: 'Accesos denegados', value: '3', color: 'text-destructive' },
          { label: 'Usuarios activos', value: '12', color: 'text-primary' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Sin resultados</h3>
            <p className="text-muted-foreground text-sm">
              No se encontraron eventos con los filtros seleccionados
            </p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, events]) => (
            <div key={date}>
              <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">{date}</h3>
              </div>
              <div className="divide-y divide-border">
                {events.map((event) => (
                  <AuditEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredEvents.length > 0 && (
        <div className="flex justify-center">
          <button className="h-9 px-6 bg-secondary hover:bg-secondary-hover text-secondary-foreground text-sm font-medium rounded-lg transition-colors">
            Cargar mas eventos
          </button>
        </div>
      )}
    </div>
  );
}
