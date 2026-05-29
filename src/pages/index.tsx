'use client';

import React, { useReducer, useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Car, ClipboardList, Wrench, Package, CreditCard,
  Plus, CheckCircle2, XCircle, AlertTriangle, ArrowRight, DollarSign,
  Calendar, Menu, X, ChevronRight, FileText, Clock, Bot, Send,
  TrendingUp, Activity, Zap, Shield, BarChart2, ChevronDown, Loader2,
  CircleDot, ArrowUpRight, Settings
} from 'lucide-react';

/* ─── TYPES ───────────────────────────────────────────────────────────────── */
type JobType = 'MOT Test' | 'Full Service' | 'General Repair';
type Stage = 'queued' | 'mot-lane' | 'repair-bay' | 'ready-invoice' | 'invoiced';
type MotStatus = 'pass' | 'fail' | 'advisory';

interface VehicleJob {
  id: string; vrm: string; customerName: string; phone: string;
  jobType: JobType; stage: Stage; technician?: string;
  motResults: Record<string, MotStatus>;
  partsLabor: { id: string; name: string; unitCost: number; hours: number }[];
  createdAt: string; invoiceTotal?: number;
}

interface InventoryItem {
  id: string; name: string; quantity: number; threshold: number; unitCost: number;
}

type View = 'dashboard' | 'reception' | 'workshop' | 'mechanic' | 'inventory' | 'billing' | 'ai-diagnostics';

interface AppState {
  vehicles: VehicleJob[]; inventory: InventoryItem[];
  activeView: View; revenue: number;
}

/* ─── INITIAL DATA ────────────────────────────────────────────────────────── */
const INITIAL_STATE: AppState = {
  vehicles: [
    { id: 'v1', vrm: 'AB12 XYZ', customerName: 'James Carter', phone: '07700 900001', jobType: 'MOT Test', stage: 'queued', motResults: {}, partsLabor: [], createdAt: '2026-05-26T09:15:00' },
    { id: 'v2', vrm: 'CD34 LMN', customerName: 'Elena Rossi', phone: '07700 900002', jobType: 'Full Service', stage: 'mot-lane', technician: 'Mike T.', motResults: { Brakes: 'pass', Lights: 'advisory', Emissions: 'pass', Suspension: 'pass' }, partsLabor: [], createdAt: '2026-05-26T08:45:00' },
    { id: 'v3', vrm: 'EF56 OPQ', customerName: 'David Chen', phone: '07700 900003', jobType: 'General Repair', stage: 'repair-bay', technician: 'Sarah L.', motResults: { Brakes: 'fail', Lights: 'pass', Emissions: 'pass', Suspension: 'pass' }, partsLabor: [{ id: 'p1', name: 'Brake Pads (Front)', unitCost: 45.00, hours: 1.5 }, { id: 'p2', name: 'Discs Resurfacing', unitCost: 20.00, hours: 1.0 }], createdAt: '2026-05-26T10:30:00' },
    { id: 'v4', vrm: 'GH78 RST', customerName: 'Priya Sharma', phone: '07700 900004', jobType: 'MOT Test', stage: 'ready-invoice', technician: 'Alex D.', motResults: { Brakes: 'pass', Lights: 'pass', Emissions: 'pass', Suspension: 'pass' }, partsLabor: [], createdAt: '2026-05-26T07:00:00' }
  ],
  inventory: [
    { id: 'i1', name: 'Brake Pads (Universal)', quantity: 14, threshold: 10, unitCost: 42.50 },
    { id: 'i2', name: 'Engine Oil 5W-30 (5L)', quantity: 3, threshold: 5, unitCost: 28.00 },
    { id: 'i3', name: 'Wiper Blades (Pair)', quantity: 22, threshold: 10, unitCost: 9.99 },
    { id: 'i4', name: 'Tyre 205/55 R16', quantity: 4, threshold: 6, unitCost: 85.00 },
    { id: 'i5', name: 'Cabin Air Filter', quantity: 11, threshold: 10, unitCost: 14.50 }
  ],
  activeView: 'dashboard', revenue: 0
};

/* ─── REDUCER ─────────────────────────────────────────────────────────────── */
type Action =
  | { type: 'SET_VIEW'; payload: View }
  | { type: 'CHECK_IN'; payload: Omit<VehicleJob, 'id' | 'stage' | 'createdAt' | 'motResults' | 'partsLabor'> }
  | { type: 'MOVE_STAGE'; payload: { id: string; stage: Stage } }
  | { type: 'UPDATE_MOT_RESULT'; payload: { id: string; category: string; status: MotStatus } }
  | { type: 'ADD_PART_LABOR'; payload: { id: string; item: { id: string; name: string; unitCost: number; hours: number } } }
  | { type: 'COMPLETE_PAYMENT'; payload: { id: string } };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW': return { ...state, activeView: action.payload };
    case 'CHECK_IN': return { ...state, vehicles: [{ id: `v${Date.now()}`, ...action.payload, stage: 'queued', createdAt: new Date().toISOString(), motResults: {}, partsLabor: [] }, ...state.vehicles] };
    case 'MOVE_STAGE': return { ...state, vehicles: state.vehicles.map(v => v.id === action.payload.id ? { ...v, stage: action.payload.stage } : v) };
    case 'UPDATE_MOT_RESULT': return { ...state, vehicles: state.vehicles.map(v => v.id === action.payload.id ? { ...v, motResults: { ...v.motResults, [action.payload.category]: action.payload.status } } : v) };
    case 'ADD_PART_LABOR': return { ...state, vehicles: state.vehicles.map(v => v.id === action.payload.id ? { ...v, partsLabor: [...v.partsLabor, action.payload.item] } : v) };
    case 'COMPLETE_PAYMENT': {
      const vehicle = state.vehicles.find(v => v.id === action.payload.id);
      if (!vehicle) return state;
      const motFee = 54.85, partsTotal = vehicle.partsLabor.reduce((s, p) => s + p.unitCost, 0);
      const laborTotal = vehicle.partsLabor.reduce((s, p) => s + p.hours * 50, 0);
      const subtotal = motFee + partsTotal + laborTotal, total = subtotal * 1.2;
      return { ...state, vehicles: state.vehicles.map(v => v.id === action.payload.id ? { ...v, stage: 'invoiced', invoiceTotal: total } : v), revenue: state.revenue + total };
    }
    default: return state;
  }
}

/* ─── SHARED STYLES ───────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg0: #0c0e13;
    --bg1: #12151c;
    --bg2: #181c26;
    --bg3: #1e2330;
    --bg4: #252c3d;
    --surface: #1a1f2e;
    --border: rgba(255,255,255,0.07);
    --border-accent: rgba(255,165,0,0.35);
    --amber: #f59e0b;
    --amber-dim: rgba(245,158,11,0.12);
    --amber-glow: rgba(245,158,11,0.08);
    --text-primary: #e8eaf0;
    --text-secondary: #8892a4;
    --text-muted: #4a5568;
    --green: #10b981;
    --green-dim: rgba(16,185,129,0.12);
    --red: #ef4444;
    --red-dim: rgba(239,68,68,0.12);
    --blue: #3b82f6;
    --blue-dim: rgba(59,130,246,0.12);
    --purple: #8b5cf6;
    --purple-dim: rgba(139,92,246,0.12);
    --radius: 10px;
    --radius-lg: 14px;
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--bg0); color: var(--text-primary); }

  .erp-root { display: flex; height: 100vh; overflow: hidden; background: var(--bg0); }

  /* ── Sidebar ── */
  .sidebar {
    width: 240px; min-width: 240px; background: var(--bg1);
    border-right: 1px solid var(--border); display: flex;
    flex-direction: column; z-index: 30;
  }
  .sidebar-logo {
    padding: 22px 20px 18px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
  }
  .logo-icon {
    width: 36px; height: 36px; background: var(--amber);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .logo-title { font-size: 15px; font-weight: 600; color: var(--text-primary); letter-spacing: 0.3px; }
  .logo-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; font-family: 'IBM Plex Mono', monospace; }

  .nav { flex: 1; padding: 12px 10px; overflow-y: auto; }
  .nav-section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-muted); padding: 8px 10px 4px; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 12px;
    border-radius: 8px; font-size: 13.5px; font-weight: 400; color: var(--text-secondary);
    cursor: pointer; transition: all 0.15s; border: none; background: transparent;
    width: 100%; text-align: left; margin-bottom: 1px;
  }
  .nav-item:hover { background: var(--bg3); color: var(--text-primary); }
  .nav-item.active { background: var(--amber-dim); color: var(--amber); border: 1px solid var(--border-accent); }
  .nav-item.active svg { color: var(--amber); }
  .nav-item svg { flex-shrink: 0; opacity: 0.7; }
  .nav-item.active svg { opacity: 1; }
  .nav-badge { margin-left: auto; background: var(--amber); color: #000; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 99px; font-family: 'IBM Plex Mono', monospace; }
  .nav-badge.red { background: var(--red); color: #fff; }

  .sidebar-footer {
    padding: 14px 16px; border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  .status-dot { width: 8px; height: 8px; background: var(--green); border-radius: 50%; box-shadow: 0 0 6px rgba(16,185,129,0.6); flex-shrink: 0; }
  .status-text { font-size: 11px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
  .topbar {
    height: 58px; min-height: 58px; background: var(--bg1);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 24px;
    justify-content: space-between; gap: 12px;
  }
  .topbar-title { font-size: 16px; font-weight: 500; color: var(--text-primary); }
  .topbar-right { display: flex; align-items: center; gap: 10px; }
  .topbar-chip {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 99px; padding: 5px 14px; font-size: 12px; color: var(--text-secondary);
    display: flex; align-items: center; gap: 6px;
  }
  .topbar-chip.amber { background: var(--amber-dim); border-color: var(--border-accent); color: var(--amber); }

  .content { flex: 1; overflow-y: auto; padding: 24px; background: var(--bg0); }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--bg4); border-radius: 99px; }

  /* ── KPI Cards ── */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
  .kpi-card {
    background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: 18px 20px; position: relative; overflow: hidden;
    transition: border-color 0.2s;
  }
  .kpi-card:hover { border-color: var(--border-accent); }
  .kpi-label { font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; font-weight: 500; }
  .kpi-value { font-size: 28px; font-weight: 600; color: var(--text-primary); margin: 6px 0 2px; font-family: 'IBM Plex Mono', monospace; letter-spacing: -1px; }
  .kpi-sub { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
  .kpi-icon { position: absolute; right: 16px; top: 16px; opacity: 0.15; }
  .kpi-trend-up { color: var(--green); }
  .kpi-trend-dn { color: var(--red); }

  /* ── Cards ── */
  .card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius-lg); overflow: hidden;
  }
  .card-header {
    padding: 16px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-size: 14px; font-weight: 500; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
  .card-body { padding: 20px; }

  /* ── Table ── */
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table th { background: var(--bg3); color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 500; padding: 10px 16px; text-align: left; }
  .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--bg3); }
  .vrm-badge { font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; color: var(--text-primary); background: var(--bg4); padding: 3px 8px; border-radius: 5px; border: 1px solid var(--border); }

  /* ── Pill badges ── */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 500; }
  .pill-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,158,11,0.25); }
  .pill-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(16,185,129,0.25); }
  .pill-red { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,0.25); }
  .pill-blue { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(59,130,246,0.25); }
  .pill-purple { background: var(--purple-dim); color: var(--purple); border: 1px solid rgba(139,92,246,0.25); }
  .pill-gray { background: var(--bg4); color: var(--text-secondary); border: 1px solid var(--border); }

  /* ── Stage Lane Board ── */
  .lane-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .lane-col { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px; min-height: 400px; display: flex; flex-direction: column; }
  .lane-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; }
  .lane-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px; }
  .lane-count { font-family: 'IBM Plex Mono', monospace; font-size: 12px; background: var(--bg4); color: var(--text-secondary); padding: 1px 8px; border-radius: 99px; }
  .lane-border-queued { border-top: 2px solid var(--text-muted); }
  .lane-border-mot { border-top: 2px solid var(--blue); }
  .lane-border-repair { border-top: 2px solid var(--amber); }
  .lane-border-ready { border-top: 2px solid var(--green); }
  .lane-card {
    background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 12px 14px; margin-bottom: 10px; transition: all 0.15s;
  }
  .lane-card:hover { border-color: rgba(255,255,255,0.14); background: var(--bg4); }
  .lane-vrm { font-family: 'IBM Plex Mono', monospace; font-size: 17px; font-weight: 600; color: var(--text-primary); letter-spacing: 0.5px; }
  .lane-customer { font-size: 12.5px; color: var(--text-secondary); margin: 4px 0 2px; }
  .lane-tech { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
  .move-btn {
    width: 100%; margin-top: 10px; padding: 7px; border-radius: 7px;
    background: transparent; border: 1px solid var(--border);
    color: var(--text-secondary); font-size: 12px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .move-btn:hover { background: var(--amber-dim); border-color: var(--border-accent); color: var(--amber); }

  /* ── Forms ── */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
  .form-input, .form-select {
    background: var(--bg3); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 14px; color: var(--text-primary); font-size: 13.5px;
    font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s;
  }
  .form-input:focus, .form-select:focus { border-color: var(--amber); }
  .form-input::placeholder { color: var(--text-muted); }
  .form-select option { background: var(--bg3); }
  .form-input.vrm-input { font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; }

  /* ── Buttons ── */
  .btn-primary {
    background: var(--amber); color: #000; border: none; border-radius: 8px;
    padding: 11px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.15s; font-family: 'DM Sans', sans-serif; width: 100%;
  }
  .btn-primary:hover { background: #f6ad14; transform: translateY(-1px); }
  .btn-secondary {
    background: var(--bg4); color: var(--text-secondary); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 20px; font-size: 13px; font-weight: 500; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .btn-secondary:hover { background: var(--bg3); color: var(--text-primary); border-color: rgba(255,255,255,0.15); }
  .btn-green {
    background: var(--green); color: #000; border: none; border-radius: 8px;
    padding: 11px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.15s; font-family: 'DM Sans', sans-serif; width: 100%;
  }
  .btn-green:hover { background: #0fa371; }

  /* ── MOT Checklist ── */
  .mot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .mot-item { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
  .mot-cat-title { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 10px; }
  .mot-btns { display: flex; gap: 6px; }
  .mot-btn {
    flex: 1; padding: 7px 0; border-radius: 7px; font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1px solid var(--border); background: var(--bg4); color: var(--text-muted);
    transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .mot-btn:hover { border-color: rgba(255,255,255,0.2); color: var(--text-primary); }
  .mot-btn.pass { background: var(--green-dim); border-color: rgba(16,185,129,0.4); color: var(--green); }
  .mot-btn.fail { background: var(--red-dim); border-color: rgba(239,68,68,0.4); color: var(--red); }
  .mot-btn.advisory { background: var(--amber-dim); border-color: var(--border-accent); color: var(--amber); }

  /* ── Invoice Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px;
    backdrop-filter: blur(4px);
  }
  .modal-box {
    background: var(--bg2); border: 1px solid var(--border); border-radius: 16px;
    width: 100%; max-width: 640px; max-height: 90vh; display: flex; flex-direction: column;
    overflow: hidden;
  }
  .modal-header {
    padding: 18px 22px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between; background: var(--bg3);
  }
  .modal-body { flex: 1; overflow-y: auto; padding: 28px; }
  .modal-footer { padding: 16px 22px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }

  /* ── Invoice line items ── */
  .inv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .inv-table th { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; padding: 8px 0; border-bottom: 1px solid var(--border); text-align: left; }
  .inv-table td { padding: 10px 0; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
  .inv-table tr:last-child td { border-bottom: none; }
  .inv-total-section { border-top: 1px solid var(--border); padding-top: 16px; margin-top: 8px; text-align: right; }
  .inv-total-row { display: flex; justify-content: flex-end; gap: 24px; font-size: 13px; color: var(--text-secondary); padding: 3px 0; }
  .inv-total-final { font-size: 20px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; color: var(--amber); margin-top: 8px; }

  /* ── AI Diagnostics ── */
  .ai-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; height: calc(100vh - 58px - 48px); }
  .chat-container { display: flex; flex-direction: column; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 0 4px 16px; display: flex; flex-direction: column; gap: 14px; }
  .chat-msg { max-width: 85%; }
  .chat-msg.user { align-self: flex-end; }
  .chat-msg.assistant { align-self: flex-start; }
  .chat-bubble {
    padding: 12px 16px; border-radius: 12px; font-size: 13.5px; line-height: 1.6;
    word-break: break-word;
  }
  .chat-bubble.user { background: var(--amber); color: #000; font-weight: 500; border-bottom-right-radius: 4px; }
  .chat-bubble.assistant { background: var(--bg3); color: var(--text-primary); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
  .chat-bubble.assistant.loading { display: flex; align-items: center; gap: 8px; color: var(--text-muted); }
  .chat-name { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
  .chat-input-row {
    display: flex; gap: 10px; padding: 14px 0 0;
    border-top: 1px solid var(--border); margin-top: 12px;
  }
  .chat-input {
    flex: 1; background: var(--bg3); border: 1px solid var(--border);
    border-radius: 10px; padding: 11px 16px; color: var(--text-primary);
    font-size: 13.5px; outline: none; font-family: 'DM Sans', sans-serif; resize: none;
    transition: border-color 0.15s;
  }
  .chat-input:focus { border-color: var(--amber); }
  .chat-input::placeholder { color: var(--text-muted); }
  .send-btn {
    background: var(--amber); color: #000; border: none; border-radius: 10px;
    width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; flex-shrink: 0; align-self: flex-end;
  }
  .send-btn:hover { background: #f6ad14; }
  .send-btn:disabled { background: var(--bg4); color: var(--text-muted); cursor: not-allowed; }
  .ai-sidebar-panel { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
  .quick-prompt-btn {
    width: 100%; text-align: left; padding: 10px 14px; background: var(--bg3);
    border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer;
    font-size: 12.5px; color: var(--text-secondary); transition: all 0.15s;
    font-family: 'DM Sans', sans-serif; line-height: 1.4;
  }
  .quick-prompt-btn:hover { border-color: var(--border-accent); color: var(--amber); background: var(--amber-glow); }

  /* ── Inventory ── */
  .stock-bar-bg { height: 4px; background: var(--bg4); border-radius: 99px; overflow: hidden; margin-top: 6px; }
  .stock-bar { height: 100%; border-radius: 99px; transition: width 0.3s; }

  /* ── Success Alert ── */
  .alert-success {
    background: var(--green-dim); border: 1px solid rgba(16,185,129,0.3); color: var(--green);
    border-radius: var(--radius); padding: 10px 14px; font-size: 13px;
    display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
  }

  /* ── Divider ── */
  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  /* Mobile sidebar */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .sidebar.open { display: flex; position: fixed; inset: 0; width: 260px; z-index: 100; }
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .lane-grid { grid-template-columns: 1fr; }
    .mot-grid { grid-template-columns: 1fr; }
    .form-grid { grid-template-columns: 1fr; }
    .ai-layout { grid-template-columns: 1fr; height: auto; }
  }
`;

/* ─── APP ─────────────────────────────────────────────────────────────────── */
export default function AutomotiveERP() {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VehicleJob | null>(null);

  const kpis = useMemo(() => ({
    revenue: state.revenue,
    activeBays: state.vehicles.filter(v => v.stage === 'mot-lane' || v.stage === 'repair-bay').length,
    pendingMots: state.vehicles.filter(v => v.jobType === 'MOT Test' && v.stage !== 'invoiced').length,
    completed: state.vehicles.filter(v => v.stage === 'invoiced').length,
    readyBilling: state.vehicles.filter(v => v.stage === 'ready-invoice').length
  }), [state.vehicles, state.revenue]);

  const navItems: { id: View; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'reception', label: 'Reception', icon: <Car size={16} /> },
    { id: 'workshop', label: 'Live Board', icon: <Activity size={16} /> },
    { id: 'mechanic', label: 'Mechanic Portal', icon: <ClipboardList size={16} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={16} />, badge: state.inventory.filter(i => i.quantity <= i.threshold).length > 0 ? String(state.inventory.filter(i => i.quantity <= i.threshold).length) : undefined, badgeColor: 'red' },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={16} />, badge: kpis.readyBilling > 0 ? String(kpis.readyBilling) : undefined },
    { id: 'ai-diagnostics', label: 'AI Diagnostics', icon: <Bot size={16} /> }
  ];

  const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard Overview',
    reception: 'Reception & Check-In',
    workshop: 'Workshop Live Board',
    mechanic: 'Mechanic Portal',
    inventory: 'Parts & Inventory',
    billing: 'Billing & Invoicing',
    'ai-diagnostics': 'AI Diagnostics Assistant'
  };

  return (
    <>
      <style>{css}</style>
      <div className="erp-root">
        {/* Sidebar */}
        <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <div className="logo-icon"><Wrench size={18} color="#000" /></div>
            <div>
              <div className="logo-title">AutoERP Pro</div>
              <div className="logo-sub">MOT & WORKSHOP</div>
            </div>
          </div>
          <nav className="nav">
            <div className="nav-section-label">Navigation</div>
            {navItems.map(item => (
              <button key={item.id} className={`nav-item ${state.activeView === item.id ? 'active' : ''}`}
                onClick={() => { dispatch({ type: 'SET_VIEW', payload: item.id }); setMobileOpen(false); }}>
                {item.icon}
                {item.label}
                {item.badge && <span className={`nav-badge ${item.badgeColor || ''}`}>{item.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="status-dot" />
            <span className="status-text">SYSTEM v2.5.0 · ONLINE</span>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'none' }} onClick={() => setMobileOpen(!mobileOpen)}>
                <Menu size={20} />
              </button>
              <span className="topbar-title">{viewTitles[state.activeView]}</span>
            </div>
            <div className="topbar-right">
              <div className="topbar-chip"><CircleDot size={10} style={{ color: 'var(--green)' }} />26 May 2026</div>
              {kpis.readyBilling > 0 && (
                <div className="topbar-chip amber" style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_VIEW', payload: 'billing' })}>
                  <AlertTriangle size={12} />{kpis.readyBilling} awaiting payment
                </div>
              )}
            </div>
          </div>

          <div className="content">
            {state.activeView === 'dashboard' && <DashboardView kpis={kpis} vehicles={state.vehicles} dispatch={dispatch} />}
            {state.activeView === 'reception' && <ReceptionView dispatch={dispatch} />}
            {state.activeView === 'workshop' && <WorkshopView vehicles={state.vehicles} dispatch={dispatch} />}
            {state.activeView === 'mechanic' && <MechanicView vehicles={state.vehicles} dispatch={dispatch} />}
            {state.activeView === 'inventory' && <InventoryView items={state.inventory} />}
            {state.activeView === 'billing' && <BillingView vehicles={state.vehicles} onSelect={setSelectedInvoice} />}
            {state.activeView === 'ai-diagnostics' && <AIDiagnosticsView vehicles={state.vehicles} />}
          </div>
        </div>
      </div>

      {selectedInvoice && (
        <InvoiceModal vehicle={selectedInvoice} onClose={() => setSelectedInvoice(null)}
          onPay={() => { dispatch({ type: 'COMPLETE_PAYMENT', payload: { id: selectedInvoice.id } }); setSelectedInvoice(null); }} />
      )}
    </>
  );
}

/* ─── DASHBOARD ───────────────────────────────────────────────────────────── */
function DashboardView({ kpis, vehicles, dispatch }: { kpis: any; vehicles: VehicleJob[]; dispatch: React.Dispatch<Action> }) {
  const upcoming = vehicles.filter(v => v.stage !== 'invoiced').slice(0, 5);
  const stageLabels: Record<Stage, string> = { queued: 'Queued', 'mot-lane': 'MOT Lane', 'repair-bay': 'Repair Bay', 'ready-invoice': 'Ready', invoiced: 'Invoiced' };

  return (
    <div>
      <div className="kpi-grid">
        {[
          { label: "Today's Revenue", value: `£${kpis.revenue.toFixed(2)}`, sub: '+0% vs yesterday', icon: <DollarSign size={32} color="var(--amber)" />, trend: 'up' },
          { label: 'Active Bays', value: `${kpis.activeBays} / 3`, sub: 'bays in use', icon: <Wrench size={32} color="var(--blue)" />, trend: kpis.activeBays > 0 ? 'up' : null },
          { label: 'Pending MOTs', value: kpis.pendingMots, sub: 'awaiting test', icon: <Shield size={32} color="var(--purple)" />, trend: null },
          { label: 'Completed Today', value: kpis.completed, sub: 'jobs invoiced', icon: <CheckCircle2 size={32} color="var(--green)" />, trend: 'up' }
        ].map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className={`kpi-sub ${k.trend === 'up' ? 'kpi-trend-up' : ''}`}>
              {k.trend === 'up' && <ArrowUpRight size={12} />}{k.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title"><Calendar size={15} />Active Jobs</span>
          <span className="pill pill-gray">{upcoming.length} vehicles</span>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>VRM</th><th>Customer</th><th>Job Type</th><th>Stage</th><th>Technician</th><th>Action</th></tr>
          </thead>
          <tbody>
            {upcoming.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No active vehicles</td></tr>
            ) : upcoming.map(v => (
              <tr key={v.id}>
                <td><span className="vrm-badge">{v.vrm}</span></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.customerName}</td>
                <td>
                  <span className={`pill ${v.jobType === 'MOT Test' ? 'pill-purple' : v.jobType === 'Full Service' ? 'pill-blue' : 'pill-amber'}`}>
                    {v.jobType}
                  </span>
                </td>
                <td><span className={`pill ${v.stage === 'ready-invoice' ? 'pill-green' : v.stage === 'repair-bay' ? 'pill-amber' : v.stage === 'mot-lane' ? 'pill-blue' : 'pill-gray'}`}>{stageLabels[v.stage]}</span></td>
                <td>{v.technician || <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unassigned</span>}</td>
                <td>
                  <button className="btn-secondary" style={{ padding: '6px 12px', width: 'auto', fontSize: 12 }}
                    onClick={() => dispatch({ type: 'SET_VIEW', payload: 'workshop' })}>
                    View <ChevronRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── RECEPTION ───────────────────────────────────────────────────────────── */
function ReceptionView({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const [form, setForm] = useState({ vrm: '', customerName: '', phone: '', jobType: 'MOT Test' as JobType });
  const [success, setSuccess] = useState(false);

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vrm || !form.customerName) return;
    dispatch({ type: 'CHECK_IN', payload: form });
    setForm({ vrm: '', customerName: '', phone: '', jobType: 'MOT Test' });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Car size={15} />New Vehicle Check-In</span>
          <span className="pill pill-amber">Reception</span>
        </div>
        <div className="card-body">
          {success && (
            <div className="alert-success"><CheckCircle2 size={16} />Vehicle successfully added to queue.</div>
          )}
          <form onSubmit={handleCheckIn}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Registration Plate (VRM)</label>
              <input required type="text" className="form-input vrm-input" value={form.vrm}
                onChange={e => setForm({ ...form, vrm: e.target.value.toUpperCase() })} placeholder="AB12 CDE" />
            </div>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input required type="text" className="form-input" value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="John Smith" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07700 900000" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Job Type</label>
              <select className="form-select" value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value as JobType })}>
                <option>MOT Test</option>
                <option>Full Service</option>
                <option>General Repair</option>
              </select>
            </div>
            <button type="submit" className="btn-primary"><Plus size={16} />Check In Vehicle</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── WORKSHOP BOARD ──────────────────────────────────────────────────────── */
function WorkshopView({ vehicles, dispatch }: { vehicles: VehicleJob[]; dispatch: React.Dispatch<Action> }) {
  const cols: { key: Stage; title: string; color: string; cls: string }[] = [
    { key: 'queued', title: 'Queued', color: 'var(--text-muted)', cls: 'lane-border-queued' },
    { key: 'mot-lane', title: 'MOT Lane', color: 'var(--blue)', cls: 'lane-border-mot' },
    { key: 'repair-bay', title: 'Repair Bay', color: 'var(--amber)', cls: 'lane-border-repair' },
    { key: 'ready-invoice', title: 'Ready', color: 'var(--green)', cls: 'lane-border-ready' }
  ];
  const nextStage: Record<Stage, Stage | null> = { queued: 'mot-lane', 'mot-lane': 'repair-bay', 'repair-bay': 'ready-invoice', 'ready-invoice': null, invoiced: null };

  return (
    <div className="lane-grid">
      {cols.map(col => (
        <div key={col.key} className={`lane-col ${col.cls}`}>
          <div className="lane-header" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="lane-title" style={{ color: col.color }}><CircleDot size={10} />{col.title}</span>
            <span className="lane-count">{vehicles.filter(v => v.stage === col.key).length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
            {vehicles.filter(v => v.stage === col.key).map(v => (
              <div key={v.id} className="lane-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="lane-vrm">{v.vrm}</span>
                  <span className={`pill ${v.jobType === 'MOT Test' ? 'pill-purple' : v.jobType === 'Full Service' ? 'pill-blue' : 'pill-amber'}`} style={{ fontSize: 10 }}>{v.jobType}</span>
                </div>
                <div className="lane-customer">{v.customerName}</div>
                <div className="lane-tech"><Settings size={10} />{v.technician || 'Unassigned'}</div>
                {nextStage[v.stage] && (
                  <button className="move-btn" onClick={() => dispatch({ type: 'MOVE_STAGE', payload: { id: v.id, stage: nextStage[v.stage] as Stage } })}>
                    Move to Next <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
            {vehicles.filter(v => v.stage === col.key).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 12 }}>Empty</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── MECHANIC PORTAL ─────────────────────────────────────────────────────── */
function MechanicView({ vehicles, dispatch }: { vehicles: VehicleJob[]; dispatch: React.Dispatch<Action> }) {
  const [activeId, setActiveId] = useState('');
  const [newPart, setNewPart] = useState({ name: '', unitCost: '', hours: '' });
  const activeVehicle = vehicles.find(v => v.id === activeId);
  const categories = ['Brakes', 'Suspension', 'Lights', 'Emissions'];

  if (!activeVehicle) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', paddingTop: 40, textAlign: 'center' }}>
        <Bot size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 16 }} />
        <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 20, fontWeight: 500 }}>Select a vehicle to begin inspection</div>
        <select className="form-select" onChange={e => setActiveId(e.target.value)} style={{ maxWidth: 360 }}>
          <option value="">-- Choose Active Vehicle --</option>
          {vehicles.filter(v => v.stage === 'mot-lane' || v.stage === 'repair-bay').map(v => (
            <option key={v.id} value={v.id}>{v.vrm} · {v.customerName}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
      <div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title"><ClipboardList size={15} />MOT Checklist · <span className="vrm-badge">{activeVehicle.vrm}</span></span>
            <button className="btn-secondary" style={{ padding: '5px 10px', width: 'auto', fontSize: 12 }} onClick={() => setActiveId('')}>Change</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="mot-grid">
              {categories.map(cat => (
                <div key={cat} className="mot-item">
                  <div className="mot-cat-title">{cat}</div>
                  <div className="mot-btns">
                    {(['pass', 'fail', 'advisory'] as MotStatus[]).map(s => (
                      <button key={s} className={`mot-btn ${activeVehicle.motResults[cat] === s ? s : ''}`}
                        onClick={() => dispatch({ type: 'UPDATE_MOT_RESULT', payload: { id: activeVehicle.id, category: cat, status: s } })}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card">
          <div className="card-header"><span className="card-title"><Package size={15} />Parts & Labour</span></div>
          <div className="card-body" style={{ padding: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <input type="text" className="form-input" placeholder="Part / Service name" value={newPart.name} onChange={e => setNewPart({ ...newPart, name: e.target.value })} style={{ fontSize: 13 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" className="form-input" placeholder="£ Cost" value={newPart.unitCost} onChange={e => setNewPart({ ...newPart, unitCost: e.target.value })} style={{ fontSize: 13 }} />
                <input type="number" className="form-input" placeholder="Hrs" value={newPart.hours} onChange={e => setNewPart({ ...newPart, hours: e.target.value })} style={{ fontSize: 13 }} />
              </div>
              <button className="btn-secondary" style={{ fontSize: 12, padding: '8px' }}
                onClick={() => {
                  if (!newPart.name) return;
                  dispatch({ type: 'ADD_PART_LABOR', payload: { id: activeVehicle.id, item: { id: Date.now().toString(), name: newPart.name, unitCost: parseFloat(newPart.unitCost) || 0, hours: parseFloat(newPart.hours) || 0 } } });
                  setNewPart({ name: '', unitCost: '', hours: '' });
                }}>
                <Plus size={13} />Add Line
              </button>
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeVehicle.partsLabor.map(pl => (
                <div key={pl.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--bg3)', borderRadius: 7, fontSize: 12, border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</span>
                  <span style={{ color: 'var(--amber)', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>£{pl.unitCost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button className="btn-green" onClick={() => dispatch({ type: 'MOVE_STAGE', payload: { id: activeVehicle.id, stage: 'ready-invoice' } })}>
          <CheckCircle2 size={16} />Send to Billing
        </button>
      </div>
    </div>
  );
}

/* ─── INVENTORY ───────────────────────────────────────────────────────────── */
function InventoryView({ items }: { items: InventoryItem[] }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><Package size={15} />Parts & Inventory</span>
        <span className="pill pill-amber">{items.filter(i => i.quantity <= i.threshold).length} low stock alerts</span>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Unit Cost</th><th>Stock Level</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          {items.map(item => {
            const pct = Math.min(100, (item.quantity / (item.threshold * 2)) * 100);
            const isLow = item.quantity <= item.threshold;
            return (
              <tr key={item.id}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: isLow ? 'var(--red)' : 'var(--text-primary)' }}>{item.quantity}</td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace' }}>£{item.unitCost.toFixed(2)}</td>
                <td style={{ width: 120 }}>
                  <div className="stock-bar-bg">
                    <div className="stock-bar" style={{ width: `${pct}%`, background: isLow ? 'var(--red)' : 'var(--green)' }} />
                  </div>
                </td>
                <td>
                  <span className={`pill ${isLow ? 'pill-red' : 'pill-green'}`}>
                    {isLow ? <><AlertTriangle size={10} />Low Stock</> : <><CheckCircle2 size={10} />In Stock</>}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ padding: '5px 12px', width: 'auto', fontSize: 12 }}>Restock</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── BILLING ─────────────────────────────────────────────────────────────── */
function BillingView({ vehicles, onSelect }: { vehicles: VehicleJob[]; onSelect: (v: VehicleJob) => void }) {
  const pending = vehicles.filter(v => v.stage === 'ready-invoice');
  const invoiced = vehicles.filter(v => v.stage === 'invoiced');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title"><FileText size={15} />Pending Payment</span>
          <span className="pill pill-amber">{pending.length}</span>
        </div>
        <div className="card-body" style={{ padding: '10px 14px' }}>
          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>All caught up · no pending invoices</div>
          ) : pending.map(v => (
            <button key={v.id} onClick={() => onSelect(v)} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--amber)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="vrm-badge">{v.vrm}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{v.customerName}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{v.jobType} · {v.partsLabor.length} line items</div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title"><CheckCircle2 size={15} />Completed Today</span>
          <span className="pill pill-green">{invoiced.length}</span>
        </div>
        <div className="card-body" style={{ padding: '10px 14px' }}>
          {invoiced.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>No completed payments yet</div>
          ) : invoiced.map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--green-dim)', borderRadius: 8, marginBottom: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="vrm-badge">{v.vrm}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{v.customerName}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{v.jobType}</div>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: 'var(--green)', fontSize: 15, alignSelf: 'center' }}>£{((v.invoiceTotal || 0).toFixed(2))}</span>
            </div>
          ))}
          {invoiced.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Collected</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--amber)' }}>£{invoiced.reduce((s, v) => s + (v.invoiceTotal || 0), 0).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── AI DIAGNOSTICS ──────────────────────────────────────────────────────── */
function AIDiagnosticsView({ vehicles }: { vehicles: VehicleJob[] }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: `Hello! I'm your AI Diagnostics Assistant. I can help you:\n\n• Diagnose fault codes and symptoms\n• Recommend repair procedures\n• Estimate labour times and parts costs\n• Advise on MOT failure categories\n• Look up technical service bulletins\n\nDescribe a fault, symptom, or ask me anything about the vehicles in the workshop.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const vehicleContext = vehicles.filter(v => v.stage !== 'invoiced').map(v =>
    `${v.vrm} (${v.customerName}) - ${v.jobType}, stage: ${v.stage}, MOT results: ${JSON.stringify(v.motResults)}`
  ).join('\n');

  const sendMessage = async (text?: string) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert automotive technician AI assistant integrated into an MOT centre ERP system. 
You specialise in vehicle diagnostics, MOT regulations (UK), repair procedures, parts identification, and labour time estimates.

Current vehicles in the workshop:
${vehicleContext || 'No active vehicles.'}

Keep responses concise, practical, and professional. Use UK English. When diagnosing, ask clarifying questions if needed. Format lists with bullet points when helpful.`,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      const reply = data.content?.map((c: any) => c.text || '').join('') || 'Sorry, I could not process that request.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your API configuration and try again.' }]);
    }
    setLoading(false);
  };

  const quickPrompts = [
    `What MOT advisories should I check for on ${vehicles.find(v => v.stage === 'mot-lane')?.vrm || 'a 5-year-old saloon'}?`,
    'Diagnose: engine shudders on cold start, clears after 2 minutes. 2018 Ford Focus 1.5 diesel.',
    'What is the standard labour time for replacing front brake pads and discs?',
    'Customer says EML light came on. Code P0420 — what does this mean and is it an MOT fail?',
    'List the top 10 reasons for MOT failure in the UK.',
    `Estimate total repair cost for ${vehicles.find(v => v.stage === 'repair-bay')?.vrm || 'a vehicle'} with failed brakes advisory.`
  ];

  return (
    <div className="ai-layout">
      <div className="card chat-container">
        <div className="card-header">
          <span className="card-title"><Bot size={16} />AI Diagnostics Assistant</span>
          <span className="pill pill-green"><CircleDot size={8} />AI Online</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'hidden' }}>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'assistant' && <div className="chat-name">AI Technician</div>}
                <div className={`chat-bubble ${m.role}`} style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-name">AI Technician</div>
                <div className="chat-bubble assistant loading"><Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />Analysing...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-row">
            <textarea className="chat-input" rows={2} placeholder="Describe a fault code, symptom, or ask a technical question..." value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
            <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="ai-sidebar-panel">
        <div className="card">
          <div className="card-header"><span className="card-title"><Zap size={14} />Quick Prompts</span></div>
          <div className="card-body" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickPrompts.map((p, i) => (
              <button key={i} className="quick-prompt-btn" onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title"><Activity size={14} />Active Vehicles Context</span></div>
          <div className="card-body" style={{ padding: '10px 14px' }}>
            {vehicles.filter(v => v.stage !== 'invoiced').length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active vehicles</div>
            ) : vehicles.filter(v => v.stage !== 'invoiced').map(v => (
              <div key={v.id} style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="vrm-badge" style={{ fontSize: 12 }}>{v.vrm}</span>
                  <span className={`pill ${v.stage === 'repair-bay' ? 'pill-amber' : v.stage === 'mot-lane' ? 'pill-blue' : 'pill-gray'}`} style={{ fontSize: 10 }}>{v.stage}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                  {Object.entries(v.motResults).map(([cat, res]) => (
                    <span key={cat} style={{ marginRight: 6, color: res === 'fail' ? 'var(--red)' : res === 'advisory' ? 'var(--amber)' : 'var(--green)' }}>
                      {cat}: {res}
                    </span>
                  ))}
                  {Object.keys(v.motResults).length === 0 && 'No MOT results yet'}
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

/* ─── INVOICE MODAL ───────────────────────────────────────────────────────── */
function InvoiceModal({ vehicle, onClose, onPay }: { vehicle: VehicleJob; onClose: () => void; onPay: () => void }) {
  const motFee = 54.85;
  const partsTotal = vehicle.partsLabor.reduce((s, p) => s + p.unitCost, 0);
  const laborTotal = vehicle.partsLabor.reduce((s, p) => s + p.hours * 50, 0);
  const subtotal = motFee + partsTotal + laborTotal;
  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} color="var(--amber)" />Invoice Preview</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, borderRadius: 6 }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>AutoERP Garage Ltd.</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>123 Workshop Lane · MOT Approved</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>INV-{vehicle.id.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, background: 'var(--bg3)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bill To</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vehicle.customerName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{vehicle.phone}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Vehicle</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: 'var(--amber)', fontSize: 16 }}>{vehicle.vrm}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{vehicle.jobType}</div>
            </div>
          </div>
          <table className="inv-table">
            <thead>
              <tr><th style={{ width: '50%' }}>Description</th><th>Qty</th><th style={{ textAlign: 'right' }}>Unit</th><th style={{ textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-primary)' }}>Statutory MOT Test Fee</td>
                <td>1</td><td style={{ textAlign: 'right' }}>Fixed</td>
                <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>£{motFee.toFixed(2)}</td>
              </tr>
              {vehicle.partsLabor.map(pl => (
                <tr key={pl.id}>
                  <td style={{ color: 'var(--text-primary)' }}>{pl.name}</td>
                  <td>{pl.hours}h</td>
                  <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>£{pl.unitCost.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>£{(pl.unitCost + pl.hours * 50).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="inv-total-section">
            <div className="inv-total-row"><span>Subtotal</span><span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>£{subtotal.toFixed(2)}</span></div>
            <div className="inv-total-row"><span>VAT (20%)</span><span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>£{tax.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Total Due</span>
              <span className="inv-total-final">£{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" style={{ width: 'auto', padding: '9px 18px' }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ width: 'auto', padding: '9px 20px' }} onClick={onPay}>
            <DollarSign size={15} />Complete Payment
          </button>
        </div>
      </div>
    </div>
  );
}