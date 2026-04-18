'use client';

import { useState } from 'react';

const COMMISSION_RATE = 0.12;

function formatArs(n: number) {
    return '$' + n.toLocaleString('es-AR');
}

export default function TecnicosGananciasCalculator() {
    const [price, setPrice] = useState(20_000);
    const commission = Math.round(price * COMMISSION_RATE);
    const finalAmount = price - commission;

    return (
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-200">
            <div className="mb-8">
                <label htmlFor="calculator-slider" className="block text-sm font-semibold text-slate-700 mb-4">
                    Precio del trabajo
                </label>
                <input
                    id="calculator-slider"
                    type="range"
                    min={5000}
                    max={50000}
                    step={1000}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full h-3 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-sm text-slate-500 mt-2">
                    <span>$5.000</span>
                    <span>$50.000</span>
                </div>
            </div>

            <div className="space-y-4 mb-6 p-6 bg-slate-50 rounded-2xl">
                <div className="flex justify-between items-center text-lg">
                    <span className="text-slate-700">Precio del trabajo:</span>
                    <span className="font-bold text-slate-900">{formatArs(price)}</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                    <span className="text-slate-700">Comisión Servy (12%):</span>
                    <span className="font-semibold text-red-600">-{formatArs(commission)}</span>
                </div>
                <div className="border-t border-slate-200 pt-4 mt-4"></div>
                <div className="flex justify-between items-center text-2xl">
                    <span className="font-bold text-slate-900">💰 Te quedás con:</span>
                    <span className="font-black text-blue-600">{formatArs(finalAmount)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-green-500 text-lg">✓</span>
                    Sin costo de alta
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-green-500 text-lg">✓</span>
                    Sin mensualidad
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-green-500 text-lg">✓</span>
                    Cobrás antes de salir
                </div>
            </div>
        </div>
    );
}
