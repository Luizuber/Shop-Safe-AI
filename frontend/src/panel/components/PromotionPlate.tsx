interface PromotionPlateProps {
    messages?: string[];
    speed?: number;
}

export function PromotionPlate(_props: PromotionPlateProps) {
    return (
        <div className="ssa-promo-plate" aria-label="Shop Safe">
            <span className="ssa-brand-name">Shop Safe</span>
            <span className="ssa-brand-caption">Análise de compras</span>
        </div>
    );
}
