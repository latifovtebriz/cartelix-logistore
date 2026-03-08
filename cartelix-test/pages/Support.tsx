
import React, { useState } from 'react';
import { GlassCard, GlassButton } from '../components/GlassComponents';
import { ChevronLeft, HelpCircle, MessageCircle, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
   onBack: () => void;
}

const Support: React.FC<Props> = ({ onBack }) => {
   const [openFaq, setOpenFaq] = useState<number | null>(null);

   const faqs = [
      { id: 1, q: "Bonusları necə istifadə edim?", a: "Səbət səhifəsində 'Bonusları istifadə et' xanasını işarələməklə topladığınız xalları ödənişə çevirə bilərsiniz." },
      { id: 2, q: "Scan & Go necə işləyir?", a: "Mağazaya daxil olarkən məhsulların barkodunu kameranızla oxudun, səbətə əlavə edin və kassada növbə gözləmədən tətbiq üzərindən ödəyin." },
      { id: 3, q: "Fiskal çekimi harada görə bilərəm?", a: "Profil bölməsində 'Alış Tarixçəsi' menyusuna daxil olaraq bütün elektron çeklərinizi görə bilərsiniz." }
   ];

   return (
      <div className="pb-32 pt-6 px-4 space-y-6 animate-fadeIn">
         <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition">
               <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dəstək</h1>
         </div>

         {/* Contact Channels */}
         <div className="grid grid-cols-2 gap-3">
            <GlassCard
               onClick={() => window.location.href = 'tel:*7777'}
               className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 transition active:scale-95 border-emerald-500/20"
            >
               <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <Phone className="w-6 h-6" />
               </div>
               <span className="text-sm font-bold text-slate-900 dark:text-white">*7777</span>
               <span className="text-[10px] text-slate-500 dark:text-white/50">Qaynar Xətt (Zəng)</span>
            </GlassCard>
            <GlassCard
               onClick={() => alert("Canlı çat operatorları hal-hazırda məşğuldur. Zəhmət olmasa biraz sonra yoxlayın.")}
               className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 transition active:scale-95 border-blue-500/20"
            >
               <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                  <MessageCircle className="w-6 h-6" />
               </div>
               <span className="text-sm font-bold text-slate-900 dark:text-white">Canlı Çat</span>
               <span className="text-[10px] text-slate-500 dark:text-white/50">7/24 Dəstək</span>
            </GlassCard>
         </div>

         {/* FAQ Section */}
         <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
               <HelpCircle className="w-5 h-5 text-slate-400 dark:text-white/60" /> Tez-tez verilən suallar
            </h3>

            {faqs.map(faq => (
               <GlassCard key={faq.id} className="p-0 overflow-hidden">
                  <button
                     onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                     className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                     <span className="font-medium text-sm text-slate-800 dark:text-white">{faq.q}</span>
                     {openFaq === faq.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {openFaq === faq.id && (
                     <div className="p-4 pt-0 text-xs text-slate-600 dark:text-white/60 leading-relaxed bg-black/5 dark:bg-black/10 border-t border-black/5 dark:border-white/5">
                        {faq.a}
                     </div>
                  )}
               </GlassCard>
            ))}
         </div>

         <GlassCard className="p-6 text-center space-y-3 mt-4">
            <Mail className="w-8 h-8 text-slate-400 dark:text-white/40 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white">Sualınız qaldı?</h4>
            <p className="text-xs text-slate-500 dark:text-white/50">Bizə yazın, qısa zamanda geri dönüş edək.</p>
            <GlassButton onClick={() => window.location.href = 'mailto:destek@logistore.az'} className="w-full shadow-emerald-500/20">
               Email Göndər
            </GlassButton>
         </GlassCard>
      </div>
   );
};

export default Support;
