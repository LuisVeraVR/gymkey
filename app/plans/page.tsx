'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    durationDays: 30,
    description: ''
  });

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/plans');
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/plans', {
        ...formData,
        price: parseFloat(formData.price),
        durationDays: parseInt(formData.durationDays.toString())
      });
      setShowModal(false);
      setFormData({ name: '', price: '', durationDays: 30, description: '' });
      fetchPlans();
    } catch (e) {
      alert('Error al crear plan');
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      await api.delete(`/plans/${id}`);
      fetchPlans();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  if (loading) return <div className="p-8">Cargando planes...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Planes y Membresías</h1>
            <p className="text-slate-500 mt-1">Gestiona los precios y duración de las suscripciones</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors flex items-center"
        >
          <span className="mr-2">+</span> Nuevo Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-900">{plan.name}</h3>
                    <p className="text-slate-500 text-sm">{plan.durationDays} días</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">${plan.price}</span>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 min-h-[40px]">{plan.description || 'Sin descripción'}</p>
            
            <div className="flex gap-2 border-t pt-4 border-slate-100">
                <button 
                    onClick={() => deletePlan(plan.id)}
                    className="flex-1 text-red-600 hover:bg-red-50 py-2 rounded text-sm font-medium transition-colors"
                >
                    Eliminar
                </button>
                <button className="flex-1 text-blue-600 hover:bg-blue-50 py-2 rounded text-sm font-medium transition-colors">
                    Editar
                </button>
            </div>
          </div>
        ))}
        
        {plans.length === 0 && (
            <div className="col-span-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <p className="text-slate-500 mb-4">No has creado ningún plan todavía.</p>
                <button 
                  onClick={() => setShowModal(true)}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Crear mi primer plan
                </button>
            </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nuevo Plan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Plan</label>
                <input 
                  type="text" 
                  placeholder="Ej: Mensual Premium"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio ($)</label>
                    <input 
                    type="number" 
                    placeholder="29.99"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duración (días)</label>
                    <input 
                    type="number" 
                    placeholder="30"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.durationDays}
                    onChange={e => setFormData({...formData, durationDays: parseInt(e.target.value)})}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
