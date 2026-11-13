import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { RiskLevel } from '../../types/AnalysisResult';
import { ThemeColors } from '../themeColors';

interface TrustScoreProps {
    score: number;
    riskLevel: RiskLevel;
    size?: 'small' | 'large';
    colors: ThemeColors;
}

export function TrustScore({ score, riskLevel, size = 'large', colors }: TrustScoreProps) {
    const scoreColor = score >= 70
        ? colors.scoreGreen
        : score >= 40
            ? colors.scoreYellow
            : colors.scoreRed;
    const progressColor = score >= 70
        ? colors.progressGradientGreen
        : score >= 40
            ? colors.progressGradientYellow
            : colors.progressGradientRed;
    const label = riskLevel === 'safe'
        ? 'Baixo risco'
        : riskLevel === 'caution'
            ? 'Atenção recomendada'
            : 'Alto risco';
    const Icon = riskLevel === 'safe' ? ShieldCheck : AlertTriangle;

    return (
        <div
            className={`border ${size === 'large' ? 'rounded-xl p-4' : 'rounded-lg p-3'}`}
            style={{ background: colors.bgCard, borderColor: colors.borderPrimary }}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg" style={{ background: colors.bgSecondary, color: scoreColor }}>
                        <Icon className={size === 'large' ? 'w-5 h-5' : 'w-4 h-4'} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium" style={{ color: colors.textMuted }}>Pontuação da análise</p>
                        <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{label}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <span className={size === 'large' ? 'text-3xl font-semibold' : 'text-2xl font-semibold'} style={{ color: scoreColor }}>{score}</span>
                    <span className="text-xs" style={{ color: colors.textMuted }}>/100</span>
                </div>
            </div>
            <div className="w-full rounded-full h-1.5 overflow-hidden mt-3" style={{ background: colors.progressTrack }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: progressColor }} />
            </div>
        </div>
    );
}
