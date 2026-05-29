'use client';

import React, { useReducer, useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard, Car, ClipboardList, Wrench, Package, CreditCard,
  Plus, CheckCircle2, XCircle, AlertTriangle, ArrowRight, DollarSign,
  Calendar, Search, Menu, X, ChevronRight, FileText, Clock
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
type JobType = 'MOT Test' | 'Full Service' | 'General Repair';
type Stage = 'queued' | 'mot-lane' | 'repair-bay' | 'ready-invoice' | 'invoiced';
type MotStatus = 'pass' | 'fail' | 'advisory';

interface VehicleJob {
  id: string;
  vrm: string;
  customerName: string;
  phone: string;
  jobType: JobType;
  stage: Stage;
  technician?: string;
  motResults: Record<string, MotStatus>;
  partsLabor: { id: string; name: string; unitCost: number; hours: number }[];
  createdAt: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
  unitCost: number;
}

type View = 'dashboard' | 'reception' | 'workshop' | 'mechanic' | 'inventory' | 'billing';

interface AppState {
  vehicles: VehicleJob[];
  inventory: InventoryItem[];
  activeView: View;
  revenue: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. INITIAL STATE & MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_STATE: AppState = {
  vehicles: [
    {
      id: 'v1', vrm: 'AB12 XYZ', customerName: 'James Carter', phone: '07700 900001',
      jobType: 'MOT Test', stage: 'queued', motResults: {}, partsLabor: [], createdAt: '2026-05-26T09:15:00'
    },
    {
      id: 'v2', vrm: 'CD34 LMN', customerName: 'Elena Rossi', phone: '07700 900002',
      jobType: 'Full Service', stage: 'mot-lane', technician: 'Mike T.',
      motResults: { Brakes: 'pass', Lights: 'advisory', Emissions: 'pass', Suspension: 'pass' },
      partsLabor: [], createdAt: '2026-05-26T08:45:00'
    },
    {
      id: 'v3', vrm: 'EF56 OPQ', customerName: 'David Chen', phone: '07700 900003',
      jobType: 'General Repair', stage: 'repair-bay', technician: 'Sarah L.',
      motResults: { Brakes: 'fail', Lights: 'pass', Emissions: 'pass', Suspension: 'pass' },
      partsLabor: [
        { id: 'p1', name: 'Brake Pads (Front)', unitCost: 45.00, hours: 1.5 },
        { id: 'p2', name: 'Discs Resurfacing', unitCost: 20.00, hours: 1.0 }
      ],
      createdAt: '2026-05-26T10:30:00'
    },
    {
      id: 'v4', vrm: 'GH78 RST', customerName: 'Priya Sharma', phone: '07700 900004',
      jobType: 'MOT Test', stage: 'ready-invoice', technician: 'Alex D.',
      motResults: { Brakes: 'pass', Lights: 'pass', Emissions: 'pass', Suspension: 'pass' },
      partsLabor: [], createdAt: '2026-05-26T07:00:00'
    }
  ],
  inventory: [
    { id: 'i1', name: 'Brake Pads (Universal)', quantity: 14, threshold: 10, unitCost: 42.50 },
    { id: 'i2', name: 'Engine Oil 5W-30 (5L)', quantity: 3, threshold: 5, unitCost: 28.00 },
    { id: 'i3', name: 'Wiper Blades (Pair)', quantity: 22, threshold: 10, unitCost: 9.99 },
    { id: 'i4', name: 'Tyre 205/55 R16', quantity: 4, threshold: 6, unitCost: 85.00 },
    { id: 'i5', name: 'Cabin Air Filter', quantity: 11, threshold: 10, unitCost: 14.50 }
  ],
  activeView: 'dashboard',
  revenue: 0 // Will be calculated dynamically
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. REDUCER & STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_VIEW'; payload: View }
  | { type: 'CHECK_IN'; payload: Omit<VehicleJob, 'id' | 'stage' | 'createdAt' | 'motResults' | 'partsLabor'> }
  | { type: 'MOVE_STAGE'; payload: { id: string; stage: Stage } }
  | { type: 'UPDATE_MOT_RESULT'; payload: { id: string; category: string; status: MotStatus } }
  | { type: 'ADD_PART_LABOR'; payload: { id: string; item: { name: string; unitCost: number; hours: number } } }
  | { type: 'COMPLETE_PAYMENT'; payload: { id: string } };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, activeView: action.payload };
    case 'CHECK_IN':
      return {
        ...state,
        vehicles: [
          {
            id: `v${Date.now()}`,
            ...action.payload,
            stage: 'queued',
            createdAt: new Date().toISOString(),
            motResults: {},
            partsLabor: []
          },
          ...state.vehicles
        ]
      };
    case 'MOVE_STAGE':
      return {
        ...state,
        vehicles: state.vehicles.map(v => v.id === action.payload.id ? { ...v, stage: action.payload.stage } : v)
      };
    case 'UPDATE_MOT_RESULT':
      return {
        ...state,
        vehicles: state.vehicles.map(v =>
          v.id === action.payload.id
            ? { ...v, motResults: { ...v.motResults, [action.payload.category]: action.payload.status } }
            : v
        )
      };
    case 'ADD_PART_LABOR':
      return {
        ...state,
        vehicles: state.vehicles.map(v =>
          v.id === action.payload.id
            ? { ...v, partsLabor: [...v.partsLabor, action.payload.item] }
            : v
        )
      };
    case 'COMPLETE_PAYMENT': {
      const vehicle = state.vehicles.find(v => v.id === action.payload.id);
      if (!vehicle) return state;

      const motFee = 54.85;
      const partsTotal = vehicle.partsLabor.reduce((sum, pl) => sum + pl.unitCost, 0);
      const laborTotal = vehicle.partsLabor.reduce((sum, pl) => sum + (pl.hours * 50), 0); // £50/hr labor rate
      const subtotal = motFee + partsTotal + laborTotal;
      const tax = subtotal * 0.2; // 20% VAT
      const total = subtotal + tax;

      return {
        ...state,
        vehicles: state.vehicles.map(v =>
          v.id === action.payload.id ? { ...v, stage: 'invoiced' as Stage, invoiceTotal: total } : v
        ),
        revenue: state.revenue + total
      };
    }
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN APPLICATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AutomotiveERP() {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VehicleJob | null>(null);

  // Derived Metrics
  const kpis = useMemo(() => ({
    revenue: state.revenue,
    activeBays: state.vehicles.filter(v => v.stage === 'mot-lane' || v.stage === 'repair-bay').length,
    pendingMots: state.vehicles.filter(v => v.jobType === 'MOT Test' && v.stage !== 'invoiced').length,
    completed: state.vehicles.filter(v => v.stage === 'invoiced').length
  }), [state.vehicles, state.revenue]);

  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'reception', label: 'Reception & Booking', icon: <Car size={18} /> },
    { id: 'workshop', label: 'Live Board', icon: <Wrench size={18} /> },
    { id: 'mechanic', label: 'Mechanic Portal', icon: <ClipboardList size={18} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
    { id: 'billing', label: 'Billing & Invoicing', icon: <CreditCard size={18} /> }
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 shadow-xl z-20">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 text-white font-bold text-xl">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Wrench size={20} className="text-white" /></div>
            AutoERP Pro
          </div>
          <p className="text-xs text-slate-400 mt-1">Workshop & MOT Centre</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => dispatch({ type: 'SET_VIEW', payload: item.id })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${state.activeView === item.id ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                  {item.icon} {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          System v2.4.1 • Online
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white shadow-lg">
          <div className="flex items-center gap-2 font-bold"><Wrench size={18} /> AutoERP Pro</div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded hover:bg-slate-800">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-800 border-t border-slate-700 p-2 shadow-lg z-10">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { dispatch({ type: 'SET_VIEW', payload: item.id }); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all mb-1
                  ${state.activeView === item.id ? 'bg-blue-600/30 text-blue-300' : 'hover:bg-slate-700 text-slate-300'}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          {state.activeView === 'dashboard' && <DashboardView kpis={kpis} vehicles={state.vehicles} />}
          {state.activeView === 'reception' && <ReceptionView dispatch={dispatch} />}
          {state.activeView === 'workshop' && <WorkshopView vehicles={state.vehicles} dispatch={dispatch} />}
          {state.activeView === 'mechanic' && <MechanicView vehicles={state.vehicles} dispatch={dispatch} />}
          {state.activeView === 'inventory' && <InventoryView items={state.inventory} />}
          {state.activeView === 'billing' && <BillingView vehicles={state.vehicles} onSelect={setSelectedInvoice} />}
        </main>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal vehicle={selectedInvoice} onClose={() => setSelectedInvoice(null)} onPay={() => dispatch({ type: 'COMPLETE_PAYMENT', payload: { id: selectedInvoice.id } })} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. VIEWS & COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function DashboardView({ kpis, vehicles }: { kpis: any; vehicles: VehicleJob[] }) {
  const upcoming = vehicles.filter(v => v.stage !== 'invoiced').slice(0, 3);
  const KPICard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1 text-slate-800">{value}</p>
      </div>
      <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Today's Revenue" value={`£${kpis.revenue.toFixed(2)}`} icon={<DollarSign className="text-emerald-600" />} color="bg-emerald-100" />
        <KPICard title="Active Bays Utilized" value={`${kpis.activeBays} / 3`} icon={<Wrench className="text-blue-600" />} color="bg-blue-100" />
        <KPICard title="Pending MOTs" value={kpis.pendingMots} icon={<AlertTriangle className="text-amber-600" />} color="bg-amber-100" />
        <KPICard title="Completed Jobs" value={kpis.completed} icon={<CheckCircle2 className="text-emerald-600" />} color="bg-emerald-100" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Calendar size={18} /> Upcoming Appointments</h3>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Next 3 in queue</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-4 font-medium">VRM</th>
                <th className="text-left p-4 font-medium">Customer</th>
                <th className="text-left p-4 font-medium">Job Type</th>
                <th className="text-left p-4 font-medium">Stage</th>
                <th className="text-left p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcoming.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No pending vehicles</td></tr>
              ) : upcoming.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-bold text-slate-800">{v.vrm}</td>
                  <td className="p-4">{v.customerName}</td>
                  <td className="p-4"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{v.jobType}</span></td>
                  <td className="p-4 capitalize text-slate-500">{v.stage.replace('-', ' ')}</td>
                  <td className="p-4"><span className="text-emerald-600 font-medium">On Track</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReceptionView({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const [form, setForm] = useState({ vrm: '', customerName: '', phone: '', jobType: 'MOT Test' as JobType });
  const [success, setSuccess] = useState(false);

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vrm || !form.customerName) return;
    dispatch({ type: 'CHECK_IN', payload: form });
    setForm({ vrm: '', customerName: '', phone: '', jobType: 'MOT Test' });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Car /> Reception & Vehicle Check-In</h2>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-2"><CheckCircle2 size={16} /> Vehicle successfully queued!</div>}
        <form onSubmit={handleCheckIn} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Registration Plate (VRM)</label>
              <input required type="text" value={form.vrm} onChange={e => setForm({ ...form, vrm: e.target.value.toUpperCase() })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono uppercase" placeholder="AB12 CDE" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Customer Name</label>
              <input required type="text" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Smith" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="07700 900000" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Job Type</label>
              <select value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value as JobType })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option>MOT Test</option>
                <option>Full Service</option>
                <option>General Repair</option>
              </select>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Plus size={18} /> Check In Vehicle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkshopView({ vehicles, dispatch }: { vehicles: VehicleJob[]; dispatch: React.Dispatch<Action> }) {
  const columns: { key: Stage; title: string; color: string }[] = [
    { key: 'queued', title: 'Queued', color: 'border-slate-300' },
    { key: 'mot-lane', title: 'In MOT Lane', color: 'border-blue-400' },
    { key: 'repair-bay', title: 'In Repair Bay', color: 'border-amber-400' },
    { key: 'ready-invoice', title: 'Ready for Invoice', color: 'border-emerald-400' }
  ];

  const nextStage: Record<Stage, Stage | null> = {
    queued: 'mot-lane', 'mot-lane': 'repair-bay', 'repair-bay': 'ready-invoice', 'ready-invoice': null, 'invoiced': null
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Wrench /> Workshop Live Board</h2>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[500px]">
        {columns.map(col => (
          <div key={col.key} className="bg-slate-100 rounded-xl p-3 flex flex-col">
            <h3 className={`font-semibold text-sm mb-3 pb-2 border-b-2 ${col.color} px-2 flex justify-between items-center`}>
              {col.title}
              <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full shadow-sm">
                {vehicles.filter(v => v.stage === col.key).length}
              </span>
            </h3>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {vehicles.filter(v => v.stage === col.key).map(v => (
                <div key={v.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-lg text-slate-800">{v.vrm}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.jobType === 'MOT Test' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{v.jobType}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 truncate">{v.customerName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{v.technician || 'Unassigned'}</p>
                  {nextStage[v.stage] && (
                    <button onClick={() => dispatch({ type: 'MOVE_STAGE', payload: { id: v.id, stage: nextStage[v.stage] as Stage } })}
                      className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 rounded transition-colors">
                      Move Next <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MechanicView({ vehicles, dispatch }: { vehicles: VehicleJob[]; dispatch: React.Dispatch<Action> }) {
  const [activeId, setActiveId] = useState('');
  const [newPart, setNewPart] = useState({ name: '', unitCost: '', hours: '' });

  const activeVehicle = vehicles.find(v => v.id === activeId);
  const categories = ['Brakes', 'Suspension', 'Lights', 'Emissions'];

  if (!activeVehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Wrench size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-medium">Select an active vehicle to begin diagnostics</p>
        <select onChange={e => setActiveId(e.target.value)} className="mt-4 p-3 border border-slate-300 rounded-lg w-full max-w-xs bg-white text-slate-700">
          <option value="">-- Choose Vehicle --</option>
          {vehicles.filter(v => v.stage === 'mot-lane' || v.stage === 'repair-bay').map(v => (
            <option key={v.id} value={v.id}>{v.vrm} ({v.customerName})</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left: Checklist */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><ClipboardList /> MOT Checklist: {activeVehicle.vrm}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map(cat => (
            <div key={cat} className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-semibold text-slate-700 mb-3">{cat}</h4>
              <div className="flex gap-2">
                {(['pass', 'fail', 'advisory'] as MotStatus[]).map(status => (
                  <label key={status} className={`flex-1 text-center p-2 rounded-md cursor-pointer border transition-all text-sm font-medium
                    ${activeVehicle.motResults[cat] === status
                      ? status === 'pass' ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : status === 'fail' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-amber-100 border-amber-300 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                    <input type="radio" name={`${activeVehicle.id}-${cat}`} className="hidden"
                      onChange={() => dispatch({ type: 'UPDATE_MOT_RESULT', payload: { id: activeVehicle.id, category: cat, status } })} />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Parts & Labor */}
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Package /> Add Parts & Labor</h3>
          <div className="space-y-2">
            <input type="text" placeholder="Item Name / Service" value={newPart.name} onChange={e => setNewPart({ ...newPart, name: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded text-sm" />
            <div className="flex gap-2">
              <input type="number" placeholder="£ Cost" value={newPart.unitCost} onChange={e => setNewPart({ ...newPart, unitCost: e.target.value })} className="w-1/2 p-2 border border-slate-300 rounded text-sm" />
              <input type="number" placeholder="Hours" value={newPart.hours} onChange={e => setNewPart({ ...newPart, hours: e.target.value })} className="w-1/2 p-2 border border-slate-300 rounded text-sm" />
            </div>
            <button onClick={() => {
              if (!newPart.name) return;
              dispatch({ type: 'ADD_PART_LABOR', payload: { id: activeVehicle.id, item: { id: Date.now().toString(), name: newPart.name, unitCost: parseFloat(newPart.unitCost) || 0, hours: parseFloat(newPart.hours) || 0 } } });
              setNewPart({ name: '', unitCost: '', hours: '' });
            }} className="w-full bg-slate-800 text-white text-sm py-2 rounded hover:bg-slate-900 transition">Add Line</button>
          </div>
          <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
            {activeVehicle.partsLabor.map(pl => (
              <div key={pl.id} className="flex justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100">
                <span className="truncate w-24">{pl.name}</span>
                <span className="text-slate-500">{pl.hours}h</span>
                <span className="font-medium">£{pl.unitCost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => dispatch({ type: 'MOVE_STAGE', payload: { id: activeVehicle.id, stage: 'ready-invoice' } })}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
          <CheckCircle2 size={18} /> Submit Job Sheet & Send to Invoice
        </button>
      </div>
    </div>
  );
}

function InventoryView({ items }: { items: InventoryItem[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package /> Inventory Management</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 font-medium">Item Name</th>
              <th className="text-center p-4 font-medium">Qty</th>
              <th className="text-center p-4 font-medium">Unit Cost</th>
              <th className="text-center p-4 font-medium">Status</th>
              <th className="text-center p-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-700">{item.name}</td>
                <td className="p-4 text-center">{item.quantity}</td>
                <td className="p-4 text-center">£{item.unitCost.toFixed(2)}</td>
                <td className="p-4 text-center">
                  {item.quantity <= item.threshold ? (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center justify-center gap-1 w-fit mx-auto">
                      <AlertTriangle size={12} /> Low Stock
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center justify-center gap-1 w-fit mx-auto">
                      <CheckCircle2 size={12} /> In Stock
                    </span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-3 py-1.5 rounded transition-colors">Restock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingView({ vehicles, onSelect }: { vehicles: VehicleJob[]; onSelect: (v: VehicleJob) => void }) {
  const pending = vehicles.filter(v => v.stage === 'ready-invoice');
  const invoiced = vehicles.filter(v => v.stage === 'invoiced');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CreditCard /> Billing & Invoicing</h2>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-4">Pending Payment ({pending.length})</h3>
        {pending.length === 0 ? <p className="text-slate-400 text-sm">All caught up!</p> : (
          <div className="space-y-3">
            {pending.map(v => (
              <button key={v.id} onClick={() => onSelect(v)} className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all bg-slate-50 text-left">
                <div className="flex items-center gap-4">
                  <div className="bg-amber-100 p-2 rounded-lg"><FileText size={20} className="text-amber-600" /></div>
                  <div>
                    <p className="font-bold text-slate-800">{v.vrm} - {v.customerName}</p>
                    <p className="text-xs text-slate-500">{v.jobType} • {v.partsLabor.length} line items</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 opacity-75">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 size={16} /> Recently Invoiced</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {invoiced.length === 0 ? <p className="text-slate-400 text-sm">No completed payments today.</p> : invoiced.map(v => (
            <div key={v.id} className="flex justify-between text-sm p-2 bg-emerald-50 rounded border border-emerald-100">
              <span className="font-medium text-emerald-800">{v.vrm} ({v.customerName})</span>
              <span className="font-bold text-emerald-700">£{((v as any).invoiceTotal || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({ vehicle, onClose, onPay }: { vehicle: VehicleJob; onClose: () => void; onPay: () => void }) {
  const motFee = 54.85;
  const partsTotal = vehicle.partsLabor.reduce((sum, pl) => sum + pl.unitCost, 0);
  const laborTotal = vehicle.partsLabor.reduce((sum, pl) => sum + (pl.hours * 50), 0);
  const subtotal = motFee + partsTotal + laborTotal;
  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Professional Invoice Preview</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full transition"><X size={20} className="text-slate-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AutoERP Garage Ltd.</h1>
              <p className="text-slate-500 text-sm">123 Workshop Lane, MOT Approved Centre</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice #INV-{vehicle.id}</p>
              <p className="text-sm font-medium text-slate-700">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="bg-slate-100 p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block text-xs">Bill To</span>
              <p className="font-bold">{vehicle.customerName}</p>
              <p className="text-slate-600">{vehicle.phone}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-xs">Vehicle</span>
              <p className="font-mono font-bold text-slate-800">{vehicle.vrm}</p>
              <p className="text-slate-600">{vehicle.jobType}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr><th className="text-left pb-2">Description</th><th className="text-right pb-2">Qty</th><th className="text-right pb-2">Unit</th><th className="text-right pb-2">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="py-2">Statutory MOT Test Fee</td><td className="text-right">1</td><td className="text-right">Fixed</td><td className="text-right">£{motFee.toFixed(2)}</td></tr>
              {vehicle.partsLabor.map(pl => (
                <tr key={pl.id}>
                  <td className="py-2">{pl.name}</td>
                  <td className="text-right">{pl.hours}</td>
                  <td className="text-right">£{pl.unitCost.toFixed(2)}</td>
                  <td className="text-right">£{(pl.unitCost + (pl.hours * 50)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-sm text-right pt-2 border-t border-slate-200">
            <p className="text-slate-600">Subtotal: <span className="font-medium ml-4">£{subtotal.toFixed(2)}</span></p>
            <p className="text-slate-600">VAT (20%): <span className="font-medium ml-4">£{tax.toFixed(2)}</span></p>
            <p className="text-xl font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">Total Due: <span className="ml-4">£{total.toFixed(2)}</span></p>
          </div>
        </div>
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-200 font-medium transition">Cancel</button>
          <button onClick={onPay} className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition flex items-center gap-2">
            <DollarSign size={18} /> Complete Payment
          </button>
        </div>
      </div>
    </div>
  );
}