import { AnalysisRequest } from '../types/AnalysisResult';

type ProductDataListener = (data: AnalysisRequest) => void;
type ToggleListener = () => void;

const productDataListeners = new Set<ProductDataListener>();
const toggleListeners = new Set<ToggleListener>();

export function publishProductData(data: AnalysisRequest): void {
    productDataListeners.forEach((listener) => listener(data));
}

export function subscribeToProductData(listener: ProductDataListener): () => void {
    productDataListeners.add(listener);
    return () => productDataListeners.delete(listener);
}

export function publishToggle(): void {
    toggleListeners.forEach((listener) => listener());
}

export function subscribeToToggle(listener: ToggleListener): () => void {
    toggleListeners.add(listener);
    return () => toggleListeners.delete(listener);
}
