'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type GymClass = {
  id: string;
  name: string;
  description?: string | null;
  coachId: string;
  coach: { id: string; name: string | null; email: string };
  capacity: number;
  duration: number;
  dayOfWeek: number[];
  startTime: string;
  active: boolean;
  nextDate?: string | null;
  occupied?: number;
  available?: number;
};

type Booking = {
  id: string;
  status: string;
  date: string;
  user: { id: string; name: string | null; email: string; role?: string };
};

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mie' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sab' },
];

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'text-info',
  CANCELED: 'text-destructive',
  ATTENDED: 'text-success',
  NO_SHOW: 'text-warning',
};

function dayLabel(values: number[]) {
  return values
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAYS.find((x) => x.value === d)?.label || d)
    .join(', ');
}

export default function ClassesPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    coachId: '',
    capacity: 15,
    duration: 60,
    dayOfWeek: [1, 3, 5] as number[],
    startTime: '07:00',
    active: true,
  });

  const [bookingsModal, setBookingsModal] = useState<{
    classId: string;
    className: string;
  } | null>(null);
  const [bookingsDate, setBookingsDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [classesRes, usersRes] = await Promise.all([
        api.get<GymClass[]>('/classes'),
        api.get<User[]>('/users'),
      ]);
      setClasses(classesRes.data);
      setCoaches(usersRes.data.filter((u) => u.role === 'COACH'));
    } catch {
      showAlert('error', 'Error al cargar clases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.coach?.name || c.coach?.email || '').toLowerCase().includes(q),
    );
  }, [search, classes]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      coachId: coaches[0]?.id || '',
      capacity: 15,
      duration: 60,
      dayOfWeek: [1, 3, 5],
      startTime: '07:00',
      active: true,
    });
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (row: GymClass) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description || '',
      coachId: row.coachId,
      capacity: row.capacity,
      duration: row.duration,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      active: row.active,
    });
    setShowModal(true);
  };

  const saveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        duration: Number(form.duration),
      };
      if (editingId) {
        await api.patch(`/classes/${editingId}`, payload);
        showAlert('success', 'Clase actualizada');
      } else {
        await api.post('/classes', payload);
        showAlert('success', 'Clase creada');
      }
      setShowModal(false);
      await fetchAll();
    } catch {
      showAlert('error', 'No se pudo guardar la clase');
    } finally {
      setSaving(false);
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm('Eliminar esta clase?')) return;
    try {
      await api.delete(`/classes/${id}`);
      setClasses((prev) => prev.filter((x) => x.id !== id));
      showAlert('success', 'Clase eliminada');
    } catch {
      showAlert('error', 'No se pudo eliminar la clase');
    }
  };

  const loadBookings = async (classId: string, dateStr: string) => {
    try {
      const { data } = await api.get<Booking[]>(
        `/classes/${classId}/bookings?date=${encodeURIComponent(dateStr)}`,
      );
      setBookings(data);
    } catch {
      setBookings([]);
      showAlert('error', 'No se pudieron cargar reservas');
    }
  };

  const openBookings = async (row: GymClass) => {
    const defaultDate = row.nextDate
      ? new Date(row.nextDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    setBookingsDate(defaultDate);
    setBookingsModal({ classId: row.id, className: row.name });
    await loadBookings(row.id, defaultDate);
  };

  const updateBookingStatus = async (
    classId: string,
    bookingId: string,
    status: 'ATTENDED' | 'NO_SHOW',
  ) => {
    try {
      await api.patch(`/classes/${classId}/bookings/${bookingId}/status`, {
        status,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b)),
      );
      showAlert('success', 'Asistencia actualizada');
    } catch {
      showAlert('error', 'No se pudo actualizar estado');
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clases</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestion de clases, horarios y reservas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium rounded-md transition-colors"
        >
          Nueva clase
        </button>
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por clase o coach..."
          className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Cargando clases...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sin clases registradas.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((row) => {
            const occupancy = `${row.occupied || 0}/${row.capacity}`;
            const pct = Math.min(
              100,
              Math.round(((row.occupied || 0) / Math.max(row.capacity, 1)) * 100),
            );
            return (
              <div key={row.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{row.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Coach: {row.coach?.name || row.coach?.email}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full ${
                      row.active
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {row.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="mt-3 text-sm text-muted-foreground space-y-1">
                  <p>{dayLabel(row.dayOfWeek)} · {row.startTime}</p>
                  <p>{row.duration} min · capacidad {row.capacity}</p>
                  <p>
                    Proxima: {row.nextDate ? new Date(row.nextDate).toLocaleString('es') : 'N/D'}
                  </p>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Ocupacion</span>
                    <span>{occupancy}</span>
                  </div>
                  <div className="h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openEdit(row)}
                    className="h-8 px-3 text-xs rounded-md border border-border hover:bg-muted/40"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => openBookings(row)}
                    className="h-8 px-3 text-xs rounded-md border border-border hover:bg-muted/40"
                  >
                    Reservas
                  </button>
                  <button
                    onClick={() => deleteClass(row.id)}
                    className="h-8 px-3 text-xs rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">
              {editingId ? 'Editar clase' : 'Nueva clase'}
            </h2>
            <form onSubmit={saveClass} className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nombre</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Descripcion</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full min-h-20 p-3 text-sm bg-card border border-border rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Coach</label>
                <CustomSelect
                  options={coaches.map((c) => ({
                    value: c.id,
                    label: c.name || c.email,
                  }))}
                  value={form.coachId}
                  onChange={(value) => setForm((f) => ({ ...f, coachId: value }))}
                  placeholder="Selecciona coach"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Capacidad</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, capacity: Number(e.target.value) || 1 }))
                    }
                    className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Duracion (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duration: Number(e.target.value) || 1 }))
                    }
                    className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Hora inicio</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground mt-5">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, active: e.target.checked }))
                    }
                  />
                  Clase activa
                </label>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Dias de semana</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const selected = form.dayOfWeek.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            dayOfWeek: selected
                              ? f.dayOfWeek.filter((x) => x !== d.value)
                              : [...f.dayOfWeek, d.value],
                          }))
                        }
                        className={`px-3 py-1.5 text-xs rounded-full border ${
                          selected
                            ? 'bg-primary/10 text-primary border-primary/40'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-8 px-3 text-xs rounded-md border border-border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bookingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Reservas - {bookingsModal.className}
              </h2>
              <button
                onClick={() => {
                  setBookingsModal(null);
                  setBookings([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                x
              </button>
            </div>

            <div className="flex items-end gap-3 mb-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Fecha</label>
                <input
                  type="date"
                  value={bookingsDate}
                  onChange={(e) => setBookingsDate(e.target.value)}
                  className="h-9 px-3 text-sm bg-card border border-border rounded-md"
                />
              </div>
              <button
                onClick={() => loadBookings(bookingsModal.classId, bookingsDate)}
                className="h-9 px-3 text-xs rounded-md border border-border"
              >
                Cargar
              </button>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-auto">
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay reservas para esa fecha.</p>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {b.user.name || b.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{b.user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(b.date).toLocaleString('es')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${STATUS_COLORS[b.status] || 'text-muted-foreground'}`}>
                          {b.status}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() =>
                              updateBookingStatus(
                                bookingsModal.classId,
                                b.id,
                                'ATTENDED',
                              )
                            }
                            className="h-7 px-2 text-[11px] rounded border border-success/30 text-success"
                          >
                            ATTENDED
                          </button>
                          <button
                            onClick={() =>
                              updateBookingStatus(
                                bookingsModal.classId,
                                b.id,
                                'NO_SHOW',
                              )
                            }
                            className="h-7 px-2 text-[11px] rounded border border-warning/30 text-warning"
                          >
                            NO_SHOW
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
