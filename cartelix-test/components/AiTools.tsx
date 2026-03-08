import React, { useState, useEffect } from 'react';
import { ChefHat, HeartPulse, Activity, Sparkles, AlertCircle, Timer } from 'lucide-react';
import { AIRecipe } from '../types';

// Shared rate limiting - 1 request per minute (shared with SmartChef)
const AI_RATE_LIMIT_MS = 60000;
const RATE_LIMIT_KEY = 'logi_ai_last_request';
const HEALTH_CACHE_KEY = 'logi_health_cache';

const canMakeAIRequest = (): boolean => {
    const lastRequest = parseInt(sessionStorage.getItem(RATE_LIMIT_KEY) || '0');
    return (Date.now() - lastRequest) >= AI_RATE_LIMIT_MS;
};

const getRemainingCooldown = (): number => {
    const lastRequest = parseInt(sessionStorage.getItem(RATE_LIMIT_KEY) || '0');
    const remaining = AI_RATE_LIMIT_MS - (Date.now() - lastRequest);
    return Math.max(0, Math.ceil(remaining / 1000));
};

const recordAIRequest = () => {
    sessionStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
};

// --- Health Analyzer Component ---

interface HealthAnalyzerProps {
    productName: string;
    productId: number;
    ingredients: string;
    onAnalyze: () => Promise<string>;
}

export const HealthAnalyzer: React.FC<HealthAnalyzerProps> = ({ productName, productId, ingredients, onAnalyze }) => {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [rateLimited, setRateLimited] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Check for cached result on mount
    useEffect(() => {
        const cached = sessionStorage.getItem(`${HEALTH_CACHE_KEY}_${productId}`);
        if (cached) {
            setResult(cached);
        }
    }, [productId]);

    // Countdown timer for rate limit
    useEffect(() => {
        if (!rateLimited || cooldown <= 0) return;
        const timer = setInterval(() => {
            const remaining = getRemainingCooldown();
            setCooldown(remaining);
            if (remaining <= 0) {
                setRateLimited(false);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [rateLimited, cooldown]);

    const handleAnalyze = async () => {
        // Check rate limit
        if (!canMakeAIRequest()) {
            setRateLimited(true);
            setCooldown(getRemainingCooldown());
            return;
        }

        setAnalyzing(true);
        try {
            const data = await onAnalyze();
            recordAIRequest();
            // Cache result
            sessionStorage.setItem(`${HEALTH_CACHE_KEY}_${productId}`, data);
            setResult(data);
        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="mt-4">
            {rateLimited ? (
                <div className="w-full py-3 bg-orange-100 dark:bg-orange-500/10 border border-orange-300 dark:border-orange-500/30 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400">
                        <Timer className="w-5 h-5" />
                        <span className="font-medium">{cooldown} saniyə gözləyin</span>
                    </div>
                </div>
            ) : !result ? (
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="w-full py-3 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20 hover:from-emerald-200 hover:to-teal-200 dark:hover:from-emerald-500/30 dark:hover:to-teal-500/30 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                    {analyzing ? (
                        <>
                            <Activity className="w-5 h-5 animate-spin" />
                            Süni İntellekt Analiz Edir...
                        </>
                    ) : (
                        <>
                            <HeartPulse className="w-5 h-5" />
                            Sağlamlıq Analizi Et
                        </>
                    )}
                </button>
            ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Sparkles className="w-4 h-4" />
                        AI Sağlamlıq Analizi
                    </div>
                    {(() => {
                        try {
                            const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                            const riskColors: Record<string, string> = {
                                'LOW': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                                'MEDIUM': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
                                'HIGH': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            };
                            return (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskColors[parsed.riskLevel] || riskColors['MEDIUM']}`}>
                                            {parsed.riskLevel === 'LOW' ? '✅ Aşağı Risk' : parsed.riskLevel === 'HIGH' ? '⚠️ Yüksək Risk' : '⚡ Orta Risk'}
                                        </span>
                                    </div>
                                    <p className="text-emerald-800 dark:text-emerald-100/90 text-sm font-medium">
                                        {parsed.summary}
                                    </p>
                                    {parsed.advice && (
                                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300">
                                            <span className="font-semibold">💡 Məsləhət: </span>
                                            {parsed.advice}
                                        </div>
                                    )}
                                </div>
                            );
                        } catch {
                            return (
                                <p className="text-emerald-800 dark:text-emerald-100/90 text-sm leading-relaxed whitespace-pre-line">
                                    {result}
                                </p>
                            );
                        }
                    })()}
                </div>
            )}
        </div>
    );
};


// --- Smart Chef Component ---

interface SmartChefProps {
    receiptId: string;
    items: string[];
    onGenerateRecipe: () => Promise<AIRecipe>;
}

export const SmartChef: React.FC<SmartChefProps> = ({ receiptId, items, onGenerateRecipe }) => {
    const [generating, setGenerating] = useState(false);
    const [recipe, setRecipe] = useState<AIRecipe | null>(null);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const data = await onGenerateRecipe();
            setRecipe(data);
        } catch (error) {
            console.error("Recipe generation failed", error);
        } finally {
            setGenerating(false);
        }
    };

    if (recipe) {
        return (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-6 mt-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ChefHat size={120} />
                </div>

                <h3 className="text-2xl font-bold text-orange-700 dark:text-orange-200 mb-2 font-display">{recipe.title}</h3>
                <p className="text-slate-600 dark:text-white/60 mb-6 italic">{recipe.description}</p>

                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-orange-50 dark:bg-black/20 rounded-xl p-4">
                        <h4 className="text-orange-600 dark:text-orange-400 mb-3 font-semibold uppercase text-xs tracking-wider">İnqrediyentlər</h4>
                        <ul className="space-y-1">
                            {recipe.ingredients.map((ing, i) => (
                                <li key={i} className="text-sm text-slate-700 dark:text-white/80 flex items-start gap-2">
                                    <span className="text-orange-400 dark:text-orange-500/50">•</span> {ing}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-orange-50 dark:bg-black/20 rounded-xl p-4">
                        <h4 className="text-orange-600 dark:text-orange-400 mb-3 font-semibold uppercase text-xs tracking-wider">Hazırlanması</h4>
                        <ol className="space-y-2">
                            {recipe.steps.map((step, i) => (
                                <li key={i} className="text-sm text-slate-700 dark:text-white/80 flex items-start gap-2">
                                    <span className="font-bold text-orange-600 dark:text-orange-500/80">{i + 1}.</span> {step}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-600 dark:text-red-300 text-sm font-medium">Çatışmayan məhsullar:</p>
                            <p className="text-red-500 dark:text-red-200/60 text-xs">{recipe.missingIngredients.join(', ')}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="mt-6">
            <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full relative group overflow-hidden rounded-2xl p-1"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-white dark:bg-[#1a1c2e] rounded-xl py-4 px-6 flex items-center justify-between group-hover:bg-opacity-90 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg text-orange-500 dark:text-orange-400">
                            {generating ? <Activity className="animate-spin" /> : <ChefHat />}
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-slate-800 dark:text-white text-lg">Smart Chef</div>
                            <div className="text-xs text-slate-500 dark:text-white/50">Məhsullarınızdan resept hazırla</div>
                        </div>
                    </div>
                    <Sparkles className={`text-orange-500 dark:text-orange-400 ${generating ? 'animate-pulse' : ''}`} />
                </div>
            </button>
        </div>
    );
};

