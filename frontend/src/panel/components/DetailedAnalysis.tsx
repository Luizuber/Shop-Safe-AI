import { ArrowLeft, Star, Shield, TrendingDown, TrendingUp, DollarSign, Minus, CheckCircle2, AlertOctagon, Info } from 'lucide-react';
import { TrustScore } from './TrustScore';
import { StoreAnalysis } from '../../types/AnalysisResult';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../themeColors';

interface DetailedAnalysisProps {
    analysis: StoreAnalysis;
    onBack: () => void;
    onMinimize: () => void;
}

export function DetailedAnalysis({ analysis, onBack, onMinimize }: DetailedAnalysisProps) {
    const { theme } = useTheme();
    const c = getColors(theme);

    const hoverBtn = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
        e.currentTarget.style.background = enter ? c.accentSubtle : 'transparent';
    };

    return (
        <div className="h-full flex flex-col overflow-hidden transition-colors" style={{ background: c.bgPrimary, color: c.textPrimary }}>
            <div className="flex items-center justify-between px-4 py-3 ssa-drag-handle cursor-grab active:cursor-grabbing relative overflow-hidden" style={{ background: c.bgHeader, borderBottom: `1px solid ${c.borderPrimary}` }}>
                <div className="flex items-center gap-3 relative z-10">
                    <button onClick={onBack} className="p-2 rounded-lg transition-all" style={{ color: theme === 'dark' ? '#ffffff' : c.textMuted }} onMouseEnter={e => hoverBtn(e, true)} onMouseLeave={e => hoverBtn(e, false)} aria-label="Voltar"><ArrowLeft className="w-4 h-4" /></button>
                    <h1 className="font-bold uppercase tracking-tight" style={{ color: theme === 'dark' ? '#ffffff' : c.textLabel }}>Análise Detalhada</h1>
                </div>
                <button onClick={onMinimize} className="p-2 rounded-lg transition-all relative z-10" style={{ color: theme === 'dark' ? '#ffffff' : c.textMuted }} onMouseEnter={e => hoverBtn(e, true)} onMouseLeave={e => hoverBtn(e, false)} aria-label="Minimizar"><Minus className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
                <div className="mb-6"><TrustScore score={analysis.trustScore} riskLevel={analysis.riskLevel} size="small" colors={c} /></div>

                {analysis.machineLearning && (
                    <div className="mb-6 rounded-xl p-4 text-xs leading-relaxed" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
                        <h3 className="font-semibold mb-2">Análise por machine learning</h3>
                        <p><strong>URL:</strong> {analysis.machineLearning.security.status !== 'ready'
                            ? 'Sem previsão disponível.'
                            : analysis.machineLearning.security.assessment === 'conflicting_evidence'
                                ? 'Resultado inconclusivo: o modelo divergiu dos sinais do domínio e não alterou a pontuação.'
                            : analysis.machineLearning.security.label === 'suspicious_url'
                                ? analysis.machineLearning.security.scoreAdjustment
                                    ? 'Sinal de phishing com indícios independentes na URL.'
                                    : 'Sinal isolado do modelo, sem confirmação independente. Não alterou a pontuação.'
                                : 'Sem sinal alto de phishing no modelo. A oferta ainda precisa ser verificada.'}</p>
                        <p className="mt-2"><strong>Preço:</strong> {analysis.machineLearning.pricing.status !== 'ready'
                            ? `Dados insuficientes (${analysis.machineLearning.pricing.referenceCount} lojas independentes).`
                            : `Faixa estimada: ${analysis.machineLearning.pricing.lowerBound?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a ${analysis.machineLearning.pricing.upperBound?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, com ${analysis.machineLearning.pricing.referenceCount} lojas. ${analysis.machineLearning.pricing.anomalous ? 'Preço atual fora da faixa estimada.' : ''}`}</p>
                        <p className="mt-2"><strong>Comentários:</strong> {analysis.machineLearning.reviews.status !== 'ready'
                            ? 'Sem previsão de sentimento disponível.'
                            : `${analysis.machineLearning.reviews.positive} positivos, ${analysis.machineLearning.reviews.negative} negativos e ${analysis.machineLearning.reviews.uncertain} inconclusivos. Não verifica autenticidade.`}</p>
                    </div>
                )}

                {analysis.analysisDetails && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold mb-3" style={{ color: c.textMuted }}>Métricas principais</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <MetricCard icon={<Star className="w-4 h-4" />} label="Avaliação média" value={analysis.analysisDetails.averageRating > 0 ? `${analysis.analysisDetails.averageRating}/5` : 'Não encontrada'} colors={c} />
                            <MetricCard icon={<Star className="w-4 h-4" />} label="Total de avaliações" value={analysis.analysisDetails.reviewCount > 0 ? analysis.analysisDetails.reviewCount.toLocaleString('pt-BR') : 'Não encontrado'} colors={c} />
                            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Preço na página" value={analysis.currentPrice > 0 ? `R$ ${analysis.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Não encontrado'} colors={c} />
                            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Comparação de preço" value={analysis.analysisDetails.priceComparison} colors={c} />
                        </div>
                    </div>
                )}

                {/* Decision Factors */}
                {analysis.decisions && analysis.decisions.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2" style={{ color: c.textMuted }}>
                            <div className="p-1.5 rounded-lg" style={{ background: 'var(--host-accent, #00b8d4)1a' }}>
                                <Shield className="w-3.5 h-3.5" style={{ color: c.accent }} />
                            </div>
                            Fatores considerados
                        </h3>
                        <div className="space-y-2">
                            {analysis.decisions.map((d, idx) => {
                                const isPos = d.type === 'positive';
                                const isNeg = d.type === 'negative';
                                const dColor = isPos ? c.priceGreen : isNeg ? c.scoreRed : c.textMuted;
                                const Icon = isPos ? CheckCircle2 : isNeg ? AlertOctagon : Info;

                                return (
                                    <div key={idx} className="flex gap-3 p-3 rounded-xl backdrop-blur-sm relative overflow-hidden" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
                                        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: dColor }}></div>

                                        <div className="mt-0.5 ml-1 relative z-10"><Icon className="w-4 h-4" style={{ color: dColor }} /></div>
                                        <div className="relative z-10">
                                            <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: dColor }}>{d.label}</p>
                                            <p className="text-[10px] leading-relaxed" style={{ color: c.textSecondary }}>{d.description}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {(analysis as any).detailedAnalysis && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold mb-3" style={{ color: c.textMuted }}>Análise técnica</h3>
                        <div className="rounded-2xl p-4" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
                            <p className="text-xs leading-relaxed font-medium" style={{ color: c.textSecondary }}>{(analysis as any).detailedAnalysis}</p>
                        </div>
                    </div>
                )}

                {(analysis as any).publicEvaluation && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold mb-3" style={{ color: c.textMuted }}>Avaliação pública</h3>
                        <div className="rounded-2xl p-4" style={{ background: c.accentSubtle, border: `1px solid ${c.borderSubtle}` }}>
                            <p className="text-xs leading-relaxed font-medium" style={{ color: c.textSecondary }}>{(analysis as any).publicEvaluation}</p>
                        </div>
                    </div>
                )}

                {analysis.analysisDetails?.securityFeatures && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold mb-3" style={{ color: c.textMuted }}>Segurança</h3>
                        <div className="rounded-2xl p-4" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
                            {analysis.analysisDetails.securityFeatures.map((feature, index) => (
                                <div key={index} className="flex items-center gap-3 mb-3 last:mb-0">
                                    <div className="p-1.5 rounded-lg" style={{ background: `${c.scoreGreen}1a` }}><Shield className="w-3.5 h-3.5" style={{ color: c.scoreGreen }} /></div>
                                    <span className="text-xs font-medium" style={{ color: c.textSecondary }}>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {analysis.analysisDetails?.reviewSummary && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold mb-3" style={{ color: c.textMuted }}>Resumo das avaliações</h3>
                        <div className="rounded-2xl p-4" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
                            <p className="text-xs leading-relaxed font-medium mb-3" style={{ color: c.textSecondary }}>{analysis.analysisDetails.reviewSummary}</p>
                            {analysis.analysisDetails.reviewSamples && analysis.analysisDetails.reviewSamples.length > 0 && (
                                <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${c.borderSubtle}` }}>
                                    {analysis.analysisDetails.reviewSamples.slice(0, 3).map((sample, index) => (
                                        <p key={index} className="text-[10px] leading-relaxed italic" style={{ color: c.textMuted }}>&quot;{sample}&quot;</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {analysis.analysisDetails && (analysis.analysisDetails.topPositives || analysis.analysisDetails.topNegatives) && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold mb-3" style={{ color: c.textMuted }}>Opinião dos clientes</h3>
                        {analysis.analysisDetails.topPositives && analysis.analysisDetails.topPositives.length > 0 && (
                            <div className="mb-3">
                                <div className="rounded-2xl p-4" style={{ background: `${c.scoreGreen}0d`, border: `1px solid ${c.scoreGreen}33` }}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg" style={{ background: `${c.scoreGreen}33` }}><TrendingUp className="w-3.5 h-3.5" style={{ color: c.scoreGreen }} /></div>
                                        <span className="text-xs font-black uppercase tracking-wider" style={{ color: c.scoreGreen }}>Pontos Fortes</span>
                                    </div>
                                    <ul className="space-y-2.5">
                                        {analysis.analysisDetails.topPositives.map((positive, index) => (
                                            <li key={index} className="text-xs flex items-start gap-2.5 leading-relaxed" style={{ color: c.textSecondary }}>
                                                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.scoreGreen }} /><span>{positive}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        {analysis.analysisDetails.topNegatives && analysis.analysisDetails.topNegatives.length > 0 && (
                            <div>
                                <div className="rounded-2xl p-4" style={{ background: `${c.scoreRed}0d`, border: `1px solid ${c.scoreRed}33` }}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg" style={{ background: `${c.scoreRed}33` }}><TrendingDown className="w-3.5 h-3.5" style={{ color: c.scoreRed }} /></div>
                                        <span className="text-xs font-black uppercase tracking-wider" style={{ color: c.scoreRed }}>Pontos Negativos</span>
                                    </div>
                                    <ul className="space-y-2.5">
                                        {analysis.analysisDetails.topNegatives.map((negative, index) => (
                                            <li key={index} className="text-xs flex items-start gap-2.5 leading-relaxed" style={{ color: c.textSecondary }}>
                                                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.scoreRed }} /><span>{negative}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {analysis.analysisDetails?.returnPolicy && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold mb-3" style={{ color: c.textMuted }}>Política de retorno</h3>
                        <div className="rounded-2xl p-4" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
                            <p className="text-xs leading-relaxed font-medium" style={{ color: c.textSecondary }}>{analysis.analysisDetails.returnPolicy}</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

import { ThemeColors } from '../themeColors';

function MetricCard({ icon, label, value, colors: c }: { icon: React.ReactNode; label: string; value: string; colors: ThemeColors }) {
    return (
        <div className="rounded-xl p-3" style={{ background: c.bgCard, border: `1px solid ${c.borderSubtle}` }}>
            <div className="flex items-center gap-2 mb-1.5" style={{ color: c.textMuted }}>{icon}<span className="text-xs">{label}</span></div>
            <p className="font-bold" style={{ color: c.textPrimary }}>{value}</p>
        </div>
    );
}
