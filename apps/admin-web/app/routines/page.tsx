'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface Routine {
  id: string;
  name: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  content: {
    exercises: Exercise[];
  };
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  notes?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function RoutinesPage() {
  const { showAlert } = useAlert();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    userId: '',
    exercises: [] as Exercise[]
  });
  
  // New Exercise State
  const [newExercise, setNewExercise] = useState<Exercise>({
    name: '',
    sets: 3,
    reps: '10',
    weight: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [routinesRes, usersRes] = await Promise.all([
        api.get('/routines'),
        api.get('/users')
      ]);
      setRoutines(routinesRes.data);
      setUsers(usersRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addExercise = () => {
    if (!newExercise.name) return;
    setFormData({
      ...formData,
      exercises: [...formData.exercises, newExercise]
    });
    setNewExercise({
      name: '',
      sets: 3,
      reps: '10',
      weight: '',
      notes: ''
    });
  };

  const removeExercise = (index: number) => {
    const newExercises = [...formData.exercises];
    newExercises.splice(index, 1);
    setFormData({ ...formData, exercises: newExercises });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      await api.post('/routines', {
        name: formData.name,
        userId: formData.userId,
        content: { exercises: formData.exercises }
      });
      setShowModal(false);
      setFormData({ name: '', userId: '', exercises: [] });
      fetchData();
      showAlert('success', 'Rutina creada exitosamente');
    } catch (e) {
      showAlert('error', 'Error al crear rutina');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta rutina?')) return;
    try {
      await api.delete(`/routines/${id}`);
      setRoutines(routines.filter(r => r.id !== id));
      showAlert('success', 'Rutina eliminada');
    } catch (e) {
      showAlert('error', 'Error al eliminar rutina');
    }
  };

  const filteredRoutines = routines.filter(routine => 
    routine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    routine.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rutinas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Asigna rutinas de entrenamiento a los usuarios</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium rounded-md transition-colors flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Rutina
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoutines.map((routine) => (
          <div key={routine.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-foreground">{routine.name}</h3>
                <p className="text-xs text-muted-foreground">Para: {routine.user.name}</p>
              </div>
              <button 
                onClick={() => handleDelete(routine.id)}
                className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2 mt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ejercicios</p>
              <div className="space-y-1">
                {routine.content.exercises?.slice(0, 3).map((ex, i) => (
                  <div key={i} className="text-sm flex justify-between">
                    <span>{ex.name}</span>
                    <span className="text-muted-foreground text-xs">{ex.sets}x{ex.reps}</span>
                  </div>
                ))}
                {(routine.content.exercises?.length || 0) > 3 && (
                  <p className="text-xs text-muted-foreground italic">+ {(routine.content.exercises?.length || 0) - 3} más...</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
              <span>{new Date(routine.createdAt).toLocaleDateString()}</span>
              <span>{routine.content.exercises?.length || 0} ejercicios</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-slideInUp">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Nueva Rutina</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Nombre de la Rutina</label>
                  <input 
                    type="text" 
                    className="w-full h-8 px-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Rutina de Fuerza A"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Usuario</label>
                  <CustomSelect
                    options={users.map(u => ({ value: u.id, label: u.name }))}
                    value={formData.userId}
                    onChange={(val) => setFormData({...formData, userId: val})}
                    placeholder="Seleccionar usuario..."
                  />
                </div>
              </div>

              <div className="border border-border rounded-lg p-3 bg-muted/10">
                <h3 className="text-sm font-medium mb-3">Agregar Ejercicio</h3>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-muted-foreground">Nombre</label>
                    <input 
                      type="text"
                      className="w-full h-8 px-2 bg-background border border-border rounded-md text-sm"
                      value={newExercise.name}
                      onChange={e => setNewExercise({...newExercise, name: e.target.value})}
                      placeholder="Ej: Press Banca"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Series</label>
                    <input 
                      type="number"
                      className="w-full h-8 px-2 bg-background border border-border rounded-md text-sm"
                      value={newExercise.sets}
                      onChange={e => setNewExercise({...newExercise, sets: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Reps</label>
                    <input 
                      type="text"
                      className="w-full h-8 px-2 bg-background border border-border rounded-md text-sm"
                      value={newExercise.reps}
                      onChange={e => setNewExercise({...newExercise, reps: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Peso</label>
                    <input 
                      type="text"
                      className="w-full h-8 px-2 bg-background border border-border rounded-md text-sm"
                      value={newExercise.weight}
                      onChange={e => setNewExercise({...newExercise, weight: e.target.value})}
                      placeholder="Kg/Lbs"
                    />
                  </div>
                  <div className="col-span-2">
                    <button 
                      type="button"
                      onClick={addExercise}
                      className="w-full h-8 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium rounded-md transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Ejercicios ({formData.exercises.length})</h3>
                {formData.exercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No hay ejercicios agregados aún.</p>
                ) : (
                  <div className="space-y-2">
                    {formData.exercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-card border border-border rounded-md">
                        <div>
                          <p className="text-sm font-medium">{ex.name}</p>
                          <p className="text-xs text-muted-foreground">{ex.sets} series x {ex.reps} reps {ex.weight && `@ ${ex.weight}`}</p>
                        </div>
                        <button 
                          onClick={() => removeExercise(i)}
                          className="text-destructive hover:text-destructive/80 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
              <button 
                onClick={() => setShowModal(false)}
                className="h-8 px-3 bg-secondary hover:bg-secondary-hover text-secondary-foreground text-xs font-medium rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={actionLoading || !formData.name || !formData.userId || formData.exercises.length === 0}
                className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Guardando...' : 'Crear Rutina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}