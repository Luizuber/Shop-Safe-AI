import { ArrowLeft, Clock, ExternalLink, Minus, ShieldCheck, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { AnalysisHistoryItem } from '../../types/AnalysisResult';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../themeColors';

interface HistoryProps {
    items: AnalysisHistoryItem[];
    onBack: () => void;
    onClear: () => void;
    onMinimize: () => void;
    onOpenAnalysis: (item: AnalysisHistoryItem) => void;
}

export function History({ items, onBack, onClear, onMinimize, onOpenAnalysis }: HistoryProps) {
    const { theme } = useTheme();
    const c = getColors(theme);

    const hoverBtn = (e: MouseEvent<HTMLButtonElement>, enter: boolean) => {
        e.currentTarget.style.background = enter ? c.accentSubtle : 'transparent';
    };

    const getRiskLabel = (riskLevel: AnalysisHistoryItem['riskLevel']) => {
        switch (riskLevel) {
            case 'risk':
                return 'Risco';
            case 'caution':
                return 'Cautela';
            default:
                return 'Seguro';
        }
    };

    const getRiskColor = (riskLevel: AnalysisHistoryItem['riskLevel']) => {
        switch (riskLevel) {
            case 'risk':
                return c.scoreRed;
            case 'caution':
                return c.scoreYellow;
            default:
                return c.scoreGreen;
        }
    };

    const formatDate = (value: string) => {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'Data indisponível';
        }

        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="h-full flex flex-col transition-colors" style={{ background: c.bgPrimary, color: c.textPrimary }}>
            <div className="flex items-center justify-between px-4 py-3 ssa-drag-handle cursor-grab active:cursor-grabbing relative overflow-hidden" style={{ background: c.bgHeader, borderBottom: `1px solid ${c.borderPrimary}` }}>

                <div className="flex items-center gap-3 relative z-10">
                    <button onClick={onBack} className="p-2 rounded-lg transition-all" style={{ color: theme === 'dark' ? '#ffffff' : c.textMuted }} onMouseEnter={e => hoverBtn(e, true)} onMouseLeave={e => hoverBtn(e, false)} aria-label="Voltar">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h1 className="font-semibold" style={{ color: theme === 'dark' ? '#ffffff' : c.textLabel }}>Histórico</h1>
                </div>

                <div className="flex items-center gap-1 relative z-10">
                    {items.length > 0 && (
                        <button onClick={onClear} className="p-2 rounded-lg transition-all" style={{ color: c.scoreRed }} onMouseEnter={e => hoverBtn(e, true)} onMouseLeave={e => hoverBtn(e, false)} aria-label="Limpar histórico">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={onMinimize} className="p-2 rounded-lg transition-all" style={{ color: theme === 'dark' ? '#ffffff' : c.textMuted }} onMouseEnter={e => hoverBtn(e, true)} onMouseLeave={e => hoverBtn(e, false)} aria-label="Minimizar">
                        <Minus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-semibold" style={{ color: c.textLabel }}>Últimas análises</h2>
                        <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>{items.length} registro(s) salvos neste navegador</p>
                    </div>
                    <div className="p-2 rounded-xl" style={{ background: c.accentSubtle }}>
                        <Clock className="w-4 h-4" style={{ color: c.accent }} />
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="h-[360px] flex flex-col items-center justify-center text-center rounded-2xl p-6" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
                        <ShieldCheck className="w-10 h-10 mb-4" style={{ color: c.borderAccent }} />
                        <h3 className="text-sm font-semibold mb-2" style={{ color: c.textPrimary }}>Nenhuma análise salva</h3>
                        <p className="text-xs leading-relaxed" style={{ color: c.textMuted }}>
                            As próximas análises de produtos aparecerão aqui automaticamente.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => {
                            const riskColor = getRiskColor(item.riskLevel);

                            return (
                                <div key={item.id} className="rounded-2xl p-3 transition-all" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
                                    <button onClick={() => onOpenAnalysis(item)} className="w-full text-left">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: c.textPrimary }}>{item.productName}</h3>
                                                <p className="text-[10px] mt-1 truncate" style={{ color: c.textMuted }}>{item.storeName} - {formatDate(item.analyzedAt)}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="text-xl font-black leading-none" style={{ color: riskColor }}>{item.trustScore}</div>
                                                <div className="text-[9px] font-bold uppercase mt-1" style={{ color: riskColor }}>{getRiskLabel(item.riskLevel)}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-black" style={{ color: c.textPrimary }}>R$ {item.currentPrice.toFixed(2)}</span>
                                            <span className="text-[10px] font-medium truncate" style={{ color: c.textMuted }}>{item.reviewSummary || item.aiSummary}</span>
                                        </div>
                                    </button>

                                    {item.productUrl && (
                                        <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black uppercase tracking-wider transition-all" style={{ background: c.accentSubtle, color: c.accent, border: `1px solid ${c.borderAccent}` }}>
                                            Abrir produto
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
