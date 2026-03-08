
import React from 'react';
import { AppRoute, Receipt } from '../types';
import { GlassButton } from '../components/GlassComponents';
import { CheckCircle, ArrowLeft, Share2, ChefHat, Info } from 'lucide-react';

interface Props {
  receipt: Receipt | null;
  onBack: () => void;
  onNavigate: (route: AppRoute, productId?: number) => void;
  onAnalyze: (ingredients: string[]) => void;
}

const ReceiptView: React.FC<Props> = ({ receipt, onBack, onNavigate, onAnalyze }) => {
  if (!receipt) return null;

  const storeInfo = {
    name: "LOGISTORE MAŞTAĞA 11",
    address: "AZ1039 BAKI ŞƏHƏRİ SABUNÇU RAYONU MAŞTAĞA ŞTQ SOVXOZ (MAŞTAĞA QƏS.) ev.- m.TƏRƏVƏZ SÜDÇÜLÜK",
    code: "2903885001-18118",
    taxPayer: "\"LOGISTORE\" MƏHDUD MƏSULİYYƏTLİ CƏMİYYƏTİ",
    voen: "2903885001"
  };

  const formatReceiptDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatReceiptTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };

  const receiptInfo = {
    checkNo: receipt.id.replace(/\D/g, '').slice(0, 6) || '351900',
    cashier: "Türkan İsmayılova",
    date: formatReceiptDate(receipt.date),
    time: formatReceiptTime(receipt.date),
    nmq: "0000178561",
    fiscalId: receipt.fiscalId || "AdHYpwWpH1HQ",
    deviceModel: "NBA FiscalBox",
    deviceSerial: "900121030393"
  };

  const total = receipt.total;
  const vatAmount = (total * 0.1525).toFixed(2);
  const netAmount = (total - Number(vatAmount)).toFixed(2);
  const bonusPaid = receipt.bonusSpent || 0;
  const cardPaid = receipt.cardSpent ?? total;

  const handleSmartChef = () => {
    const ingredients = receipt.items.map(item => item.name);
    onAnalyze(ingredients);
  };

  const qrData = `https://www.e-kassa.gov.az/check?id=${receiptInfo.fiscalId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=000000&margin=0`;

  return (
    <div className="min-h-screen pb-32 pt-20 px-4 relative overflow-x-hidden">

      {/* Navigation Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between px-4 py-3 transition-all">
        <button onClick={onBack} className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Elektron Çek</h1>
        <button
          onClick={async () => {
            const shareData = {
              title: 'LogiStore Qəbzi',
              text: `LogiStore Qəbz №${receiptInfo.checkNo}\nTarix: ${receiptInfo.date}\nCəmi: ${total.toFixed(2)} ₼\n\nQəbzi yoxlamaq üçün: https://www.e-kassa.gov.az/check?id=${receiptInfo.fiscalId}`,
              url: `https://www.e-kassa.gov.az/check?id=${receiptInfo.fiscalId}`
            };

            try {
              if (navigator.share) {
                await navigator.share(shareData);
              } else {
                await navigator.clipboard.writeText(shareData.text);
                // Assuming we might not have access to showToast here easily without prop drilling or context, 
                // but standard alert is too intrusive. 
                // Let's use a temporary native alert or just rely on the user noticing the copy if we can't emit a toast.
                // Ideally, we'd pass showToast prop, but for now fallback alert is safer than silent fail.
                alert("Qəbz məlumatları kopyalandı!");
              }
            } catch (err) {
              console.error('Share error:', err);
            }
          }}
          className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Status Indicator */}
      <div className="flex flex-col items-center justify-center mb-6 animate-scaleIn relative z-10">
        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
          <CheckCircle className="w-6 h-6 text-white" />
        </div>
        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">Təsdiqləndi</p>
      </div>

      {/* REALISTIC THERMAL RECEIPT */}
      <div className="w-full max-w-[360px] mx-auto bg-white text-black p-5 shadow-2xl relative mb-8 font-mono text-[10px] leading-tight tracking-tight receipt-paper animate-slideUp">

        {/* Top jagged edge */}
        <div className="absolute top-0 left-0 w-full h-2 bg-slate-50 dark:bg-[#0f172a] [clip-path:polygon(0%_0%,5%_100%,10%_0%,15%_100%,20%_0%,25%_100%,30%_0%,35%_100%,40%_0%,45%_100%,50%_0%,55%_100%,60%_0%,65%_100%,70%_0%,75%_100%,80%_0%,85%_100%,90%_0%,95%_100%,100%_0%)]"></div>

        {/* Header Info */}
        <div className="text-center font-bold mb-3 uppercase mt-2">
          <p className="text-xs mb-1">Obyektin adı: {storeInfo.name}</p>
          <p className="font-normal mb-2 px-4">{storeInfo.address}</p>
          <p className="mb-1">Obyektin kodu: {storeInfo.code}</p>
          <p className="mb-1">Vergi ödəyicisinin adı: {storeInfo.taxPayer}</p>
          <p>VÖEN: {storeInfo.voen}</p>
        </div>

        <div className="flex justify-between font-bold mb-2 text-xs">
          <span>Satış çeki № {receiptInfo.checkNo}</span>
        </div>

        <div className="flex justify-between mb-1">
          <span>Kassir: {receiptInfo.cashier}</span>
          <div className="text-right">
            <p>Tarix: {receiptInfo.date}</p>
            <p>Vaxt: {receiptInfo.time}</p>
          </div>
        </div>

        <div className="text-center my-1 tracking-[0.2em]">***********************************</div>

        {/* Items Table Header */}
        <div className="flex font-bold mb-2 border-b border-black pb-1">
          <span className="flex-1">Məhsulun adı</span>
          <span className="w-8 text-right">Say</span>
          <span className="w-10 text-right">Qiymət</span>
          <span className="w-10 text-right">Cəmi</span>
        </div>

        {/* Items List */}
        <div className="mb-3 space-y-2">
          {receipt.items.map((item, i) => {
            const discountedPrice = item.discountedPrice ?? item.price;
            const lineTotal = discountedPrice * (item.quantity || 1);

            return (
              <div key={i}>
                <div className="flex justify-between items-start">
                  <span className="flex-1 pr-2 uppercase font-bold">{item.name}</span>
                  <span className="w-8 text-right">{(item.quantity || 0).toFixed(3)}</span>
                  <span className="w-10 text-right">{discountedPrice.toFixed(2)}</span>
                  <span className="w-10 text-right">{lineTotal.toFixed(2)}</span>
                </div>
                {item.discountLabel && (
                  <div className="text-[9px] mt-0.5 text-blue-700 font-semibold">🏷️ {item.discountLabel}</div>
                )}
                <div className="text-[9px] mt-0.5">*ƏDV: 18%</div>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-dashed border-black mb-2"></div>

        {/* Totals with Discount Details */}
        {receipt.originalTotal && receipt.discountTotal && receipt.discountTotal > 0 && (
          <div className="text-[10px] space-y-1 mb-2 bg-green-50 p-2 rounded border border-green-200">
            <div className="flex justify-between"><span>Orijinal cəmi:</span><span className="line-through">{receipt.originalTotal.toFixed(2)} ₼</span></div>
            <div className="flex justify-between text-green-700 font-bold">
              <span>🎉 Endirim:</span>
              <span>-{receipt.discountTotal.toFixed(2)} ₼</span>
            </div>
          </div>
        )}

        <div className="font-bold text-sm flex justify-between mt-2 mb-2 uppercase">
          <span>Cəmi</span>
          <span>{total.toFixed(2)}</span>
        </div>

        <div className="text-[9px] space-y-0.5 mb-4">
          <div className="flex justify-between"><span>*ƏDV 18% = {vatAmount}</span><span>{netAmount}</span></div>
          <div className="flex justify-between"><span>*ƏDV-dən azad</span><span>0.00</span></div>
          <div className="flex justify-between"><span>*Toplam vergi = {vatAmount}</span></div>
        </div>

        <div className="text-center my-1 tracking-[0.2em]">***********************************</div>

        {/* Payment Method */}
        <div className="mb-3 font-bold">
          <p className="mb-1 uppercase">Ödəniş növü</p>
          <div className="flex justify-between font-normal"><span>Nağdsız/Kart:</span><span>{cardPaid.toFixed(2)}</span></div>
          <div className="flex justify-between font-normal"><span>Nağd:</span><span>0.00</span></div>
          <div className="flex justify-between font-normal"><span>Bonus:</span><span>{bonusPaid.toFixed(2)}</span></div>
          {receipt.promoCodeUsed && (
            <div className="flex justify-between font-normal text-blue-700"><span>Promokod ({receipt.promoCodeUsed}):</span><span>tətbiq</span></div>
          )}
          <div className="flex justify-between font-normal"><span>Avans (beh):</span><span>0.00</span></div>
          <div className="flex justify-between font-normal"><span>Nisyə:</span><span>0.00</span></div>
        </div>

        <div className="text-center my-1 tracking-[0.2em]">***********************************</div>

        {/* Device Info */}
        <div className="text-left text-[9px] space-y-0.5 mt-2">
          <p>Növbə ərzində vurulmuş çek sayı: {Math.floor(Math.random() * 800)}</p>
          <p>NKA-nın modeli: {receiptInfo.deviceModel}</p>
          <p>NKA-nın zavod nömrəsi: {receiptInfo.deviceSerial}</p>
          <p>Fiskal İD: {receiptInfo.fiscalId}</p>
          <p>NMQ-nin qeydiyyat nömrəsi: {receiptInfo.nmq}</p>
        </div>

        {/* QR Code */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="p-1 bg-white">
            <img
              src={qrImageUrl}
              alt="Fiscal QR Code"
              className="w-24 h-24 object-contain mix-blend-multiply"
            />
          </div>
          <p className="mt-1 text-center font-bold">www.e-kassa.gov.az</p>
        </div>

        <div className="border-t-2 border-dashed border-black mb-2"></div>

        {/* VAT Refund */}
        <div className="text-center font-bold text-base uppercase mb-1">ƏDV-nin geri qaytarılması</div>
        <div className="text-center my-1 tracking-[0.2em]">***********************************</div>
        <div className="flex justify-between font-bold text-xs mb-1">
          <span>Geri qaytarılan məbləğ:</span>
          <span>{(total * 0.15 * 0.18).toFixed(2)} AZN</span>
        </div>
        <div className="flex justify-between text-xs mt-1 mb-2">
          <span>Geri qaytarılma tarixi:</span>
          <span>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('az-AZ')} 19:00</span>
        </div>

        {/* Bottom jagged edge */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-50 dark:bg-[#0f172a] [clip-path:polygon(0%_100%,5%_0%,10%_100%,15%_0%,20%_100%,25%_0%,30%_100%,35%_0%,40%_100%,45%_0%,50%_100%,55%_0%,60%_100%,65%_0%,70%_100%,75%_0%,80%_100%,85%_0%,90%_100%,95%_0%,100%_100%)]"></div>
      </div>

      {/* Smart AI Action */}
      <div className="relative z-10 pb-4 space-y-3">
        <div className="bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3 rounded-xl flex gap-3 items-start">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
            Bu çekin rəqəmsal surəti "Kölgə Eyniləşdirmə" sistemi ilə yaradılmışdır və məhsul adları avtomatik tanınmışdır.
          </p>
        </div>

        <GlassButton
          onClick={handleSmartChef}
          className="w-full py-4 flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/30 border border-white/20"
        >
          <ChefHat className="w-6 h-6 text-white" />
          <div className="text-left">
            <p className="text-sm font-bold text-white leading-none">Smart Chef (AI)</p>
            <p className="text-[10px] text-white/90 mt-0.5 opacity-80">Bu ərzaqlardan nə bişirə bilərəm?</p>
          </div>
        </GlassButton>
      </div>
    </div>
  );
};

export default ReceiptView;
