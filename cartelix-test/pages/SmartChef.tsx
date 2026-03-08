
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AIRecipe, AppRoute } from '../types';
import { GlassCard, GlassButton } from '../components/GlassComponents';
import { ChefHat, Clock, Flame, ArrowLeft, Sparkles, AlertCircle, ShoppingBag, Coffee, Utensils, Timer } from 'lucide-react';

interface Props {
   onBack: () => void;
   onNavigate: (route: AppRoute) => void;
   ingredients: string[];
}

// Rate limiting - 1 request per minute
const AI_RATE_LIMIT_MS = 60000;
const RATE_LIMIT_KEY = 'logi_ai_last_request';
const CACHE_KEY = 'logi_smartchef_cache';

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

// Cache helper - store AI response for session
const getCachedRecipe = (ingredients: string[]): AIRecipe | null => {
   try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const data = JSON.parse(cached);
      // Check if same ingredients
      if (JSON.stringify(data.ingredients.sort()) === JSON.stringify(ingredients.sort())) {
         return data.recipe;
      }
   } catch { }
   return null;
};

const cacheRecipe = (ingredients: string[], recipe: AIRecipe) => {
   try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ingredients, recipe }));
   } catch { }
};

const SmartChef: React.FC<Props> = ({ onBack, onNavigate, ingredients }) => {
   const [recipe, setRecipe] = useState<AIRecipe | null>(null);
   const [loading, setLoading] = useState(true);
   const [rateLimited, setRateLimited] = useState(false);
   const [cooldown, setCooldown] = useState(0);

   useEffect(() => {
      const fetchRecipe = async () => {
         // Check cache first
         const cached = getCachedRecipe(ingredients);
         if (cached) {
            setRecipe(cached);
            setLoading(false);
            return;
         }

         // Check rate limit
         if (!canMakeAIRequest()) {
            setRateLimited(true);
            setCooldown(getRemainingCooldown());
            setLoading(false);
            return;
         }

         setLoading(true);
         const result = await api.getSmartChefRecipe(ingredients);
         if (result) {
            recordAIRequest();
            cacheRecipe(ingredients, result);
         }
         setRecipe(result);
         setLoading(false);
      };
      fetchRecipe();
   }, [ingredients]);

   // Countdown effect for rate limit
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

   const renderContent = () => {
      // Rate limit message
      if (rateLimited) {
         return (
            <div className="text-center py-10 animate-fadeIn">
               <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Timer className="w-10 h-10 text-orange-500 dark:text-orange-400" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Gözləyin</h3>
               <p className="text-slate-500 dark:text-white/60 mb-4 max-w-xs mx-auto">
                  AI sorğuları arasında 1 dəqiqə gözləməlisiniz.
               </p>
               <div className="text-3xl font-bold text-orange-500 dark:text-orange-400 mb-6">
                  {cooldown} saniyə
               </div>
               <GlassButton onClick={onBack} className="w-full">
                  Geri qayıt
               </GlassButton>
            </div>
         );
      }

      if (!recipe) return <div className="text-center text-slate-500 dark:text-white/50">Məlumat alınmadı.</div>;

      switch (recipe.status) {
         case 'INSUFFICIENT':
            return (
               <div className="text-center py-10 animate-fadeIn">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                     <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-white/30" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Təəssüf ki, ərzaq azdır</h3>
                  <p className="text-slate-500 dark:text-white/60 mb-6 max-w-xs mx-auto">
                     Siyahıdakı məhsullarla ({ingredients.join(', ') || 'boş siyahı'}) dadlı bir yemək hazırlamaq çətindir.
                  </p>
                  <GlassButton onClick={() => onNavigate(AppRoute.HOME)} className="w-full">
                     Alış-verişə davam et
                  </GlassButton>
               </div>
            );

         case 'SNACK':
            return (
               <div className="space-y-6 animate-fadeIn">
                  <GlassCard className="p-6 border-yellow-500/30 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                     <div className="flex items-center gap-3 mb-4">
                        <Coffee className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Qəlyanaltı Təklifi</h2>
                     </div>
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{recipe.title}</h3>
                     <p className="text-slate-600 dark:text-white/70 italic text-sm mb-4">"{recipe.description}"</p>

                     <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white/80 mb-2">İstifadə olunanlar:</h4>
                        <div className="flex flex-wrap gap-2">
                           {recipe.ingredients.map((ing, i) => (
                              <span key={i} className="px-2 py-1 bg-white dark:bg-white/10 rounded text-xs text-slate-700 dark:text-white">{ing}</span>
                           ))}
                        </div>
                     </div>
                  </GlassCard>
               </div>
            );

         case 'PARTIAL_MEAL':
            return (
               <div className="space-y-6 animate-fadeIn">
                  <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-4 rounded-xl flex gap-3">
                     <AlertCircle className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />
                     <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Demək olar ki, hazırdır!</h3>
                        <p className="text-xs text-slate-500 dark:text-white/60">Bu yeməyi bişirmək üçün 1-2 əlavə məhsul lazımdır.</p>
                     </div>
                  </div>

                  <GlassCard className="p-0 overflow-hidden">
                     <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900 p-5 flex flex-col justify-center">
                        <h2 className="text-2xl font-bold text-white">{recipe.title}</h2>
                        <p className="text-white/50 text-sm">{recipe.description}</p>
                     </div>
                     <div className="p-5">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                           <ShoppingBag className="w-4 h-4 text-red-500" /> Çatışmayanlar (Alınmalıdır):
                        </h4>
                        <ul className="space-y-2 mb-6">
                           {recipe.missingIngredients?.map((item, i) => (
                              <li key={i} className="flex items-center gap-2 text-red-600 dark:text-red-300 text-sm bg-red-50 dark:bg-red-500/10 p-2 rounded-lg border border-red-200 dark:border-red-500/20">
                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                 {item}
                              </li>
                           ))}
                        </ul>

                        <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm opacity-50">Sizdə olanlar:</h4>
                        <p className="text-xs text-slate-500 dark:text-white/40 mb-4">{recipe.ingredients.join(', ')}</p>

                        <GlassButton className="w-full text-sm">Çatışmayanları Səbətə At</GlassButton>
                     </div>
                  </GlassCard>
               </div>
            );

         case 'FULL_MEAL':
            return (
               <div className="space-y-6 animate-fadeIn">
                  <GlassCard className="p-0 overflow-hidden bg-white dark:bg-white/5 border-emerald-500/30">
                     <div className="h-48 bg-gradient-to-br from-emerald-800 to-teal-900 p-6 flex flex-col justify-end relative">
                        <div className="absolute top-0 right-0 p-6 opacity-20">
                           <Utensils className="w-32 h-32 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white relative z-10">{recipe.title}</h2>
                        <p className="text-white/80 text-sm mt-2 relative z-10">{recipe.description}</p>
                     </div>

                     <div className="p-5">
                        <div className="flex gap-4 mb-6">
                           <div className="flex items-center gap-2 text-slate-600 dark:text-white/70 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                              <Clock className="w-4 h-4 text-orange-500" />
                              <span className="text-sm">{recipe.cookingTime}</span>
                           </div>
                           <div className="flex items-center gap-2 text-slate-600 dark:text-white/70 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                              <Flame className="w-4 h-4 text-red-500" />
                              <span className="text-sm">{recipe.difficulty}</span>
                           </div>
                        </div>

                        <div className="mb-6">
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Hazırlanması</h3>
                           <div className="space-y-4">
                              {recipe.steps.map((step, idx) => (
                                 <div key={idx} className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                       {idx + 1}
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-white/70 leading-relaxed">{step}</p>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </GlassCard>
               </div>
            );

         default:
            return null;
      }
   };

   return (
      <div className="min-h-screen pb-32 pt-6 px-4 relative">
         <div className="flex items-center gap-3 mb-6">
            <button onClick={onBack} className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition">
               <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <Sparkles className="w-6 h-6 text-purple-500 dark:text-purple-400" /> Smart Chef
            </h1>
         </div>

         {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
               <div className="w-24 h-24 relative mb-6">
                  <div className="absolute inset-0 border-4 border-slate-200 dark:border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
                  <ChefHat className="absolute inset-0 m-auto w-10 h-10 text-slate-400 dark:text-white/50 animate-pulse" />
               </div>
               <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">Məhsullar analiz edilir...</p>
               <p className="text-sm text-slate-500 dark:text-white/50 text-center max-w-xs">
                  Gemini AI sizin çekinizdəki ({ingredients.length}) məhsula uyğun ən yaxşı təklifi hazırlayır.
               </p>
            </div>
         ) : (
            renderContent()
         )}
      </div>
   );
};

export default SmartChef;
