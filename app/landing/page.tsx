"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";

// Algerian Wilayas (58) - Data for the dropdown
const WILAYAS = [
  { code: "01", name: "Adrar", nameAr: "أدرار" },
  { code: "02", name: "Chlef", nameAr: "الشلف" },
  { code: "03", name: "Laghouat", nameAr: "الأغواط" },
  { code: "04", name: "Oum El Bouaghi", nameAr: "أم البواقي" },
  { code: "05", name: "Batna", nameAr: "باتنة" },
  { code: "06", name: "Béjaïa", nameAr: "بجاية" },
  { code: "07", name: "Biskra", nameAr: "بسكرة" },
  { code: "08", name: "Béchar", nameAr: "بشار" },
  { code: "09", name: "Blida", nameAr: "البليدة" },
  { code: "10", name: "Bouira", nameAr: "البويرة" },
  { code: "11", name: "Tamanrasset", nameAr: "تمنراست" },
  { code: "12", name: "Tébessa", nameAr: "تبسة" },
  { code: "13", name: "Tlemcen", nameAr: "تلمسان" },
  { code: "14", name: "Tiaret", nameAr: "تيارت" },
  { code: "15", name: "Tizi Ouzou", nameAr: "تيزي وزو" },
  { code: "16", name: "Alger", nameAr: "الجزائر" },
  { code: "17", name: "Djelfa", nameAr: "الجلفة" },
  { code: "18", name: "Jijel", nameAr: "جيجل" },
  { code: "19", name: "Sétif", nameAr: "سطيف" },
  { code: "20", name: "Saïda", nameAr: "سعيدة" },
  { code: "21", name: "Skikda", nameAr: "سكيكدة" },
  { code: "22", name: "Sidi Bel Abbès", nameAr: "سيدي بلعباس" },
  { code: "23", name: "Annaba", nameAr: "عنابة" },
  { code: "24", name: "Guelma", nameAr: "قالمة" },
  { code: "25", name: "Constantine", nameAr: "قسنطينة" },
  { code: "26", name: "Médéa", nameAr: "المدية" },
  { code: "27", name: "Mostaganem", nameAr: "مستغانم" },
  { code: "28", name: "M'Sila", nameAr: "المسيلة" },
  { code: "29", name: "Mascara", nameAr: "معسكر" },
  { code: "30", name: "Ouargla", nameAr: "ورقلة" },
  { code: "31", name: "Oran", nameAr: "وهران" },
  { code: "32", name: "El Bayadh", nameAr: "البيض" },
  { code: "33", name: "Illizi", nameAr: "إليزي" },
  { code: "34", name: "Bordj Bou Arreridj", nameAr: "برج بوعريريج" },
  { code: "35", name: "Boumerdès", nameAr: "بومرداس" },
  { code: "36", name: "El Tarf", nameAr: "الطارف" },
  { code: "37", name: "Tindouf", nameAr: "تندوف" },
  { code: "38", name: "Tissemsilt", nameAr: "تيسمسيلت" },
  { code: "39", name: "El Oued", nameAr: "الوادي" },
  { code: "40", name: "Khenchela", nameAr: "خنشلة" },
  { code: "41", name: "Souk Ahras", nameAr: "سوق أهراس" },
  { code: "42", name: "Tipaza", nameAr: "تيبازة" },
  { code: "43", name: "Mila", nameAr: "ميلة" },
  { code: "44", name: "Aïn Defla", nameAr: "عين الدفلى" },
  { code: "45", name: "Naâma", nameAr: "النعامة" },
  { code: "46", name: "Aïn Témouchent", nameAr: "عين تموشنت" },
  { code: "47", name: "Ghardaïa", nameAr: "غرداية" },
  { code: "48", name: "Relizane", nameAr: "غليزان" },
  { code: "49", name: "El M'Ghair", nameAr: "المغير" },
  { code: "50", name: "El Meniaa", nameAr: "المنيعة" },
  { code: "51", name: "Ouled Djellal", nameAr: "أولاد جلال" },
  { code: "52", name: "Bordj Baji Mokhtar", nameAr: "برج باجي مختار" },
  { code: "53", name: "Béni Abbès", nameAr: "بني عباس" },
  { code: "54", name: "Timimoun", nameAr: "تيميمون" },
  { code: "55", name: "Touggourt", nameAr: "تقرت" },
  { code: "56", name: "Djanet", nameAr: "جانت" },
  { code: "57", name: "In Salah", nameAr: "عين صالح" },
  { code: "58", name: "In Guezzam", nameAr: "عين قزام" }
];

const PRODUCT = {
  name: "SmartWatch Ultra S8 Pro",
  price: 6500, // DA
  oldPrice: 9500, // DA
  shippingFee: 600, // DA (Fixed for simplicity)
  image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=1000&auto=format&fit=crop",
};

export default function AlgerianLandingPage() {
  const [quantity, setQuantity] = useState(1);
  const [wilaya, setWilaya] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [commune, setCommune] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const totalPrice = useMemo(() => {
    return (PRODUCT.price * quantity) + PRODUCT.shippingFee;
  }, [quantity]);

  const handleScrollToForm = () => {
    const formElement = document.getElementById("order-form-container");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] p-10 text-center border border-gray-100 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Commande Confirmée !</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Merci <span className="font-bold text-gray-900">{fullName}</span>, votre commande a été enregistrée avec succès. Notre équipe vous appellera au <span className="font-bold text-gray-900">{phone}</span> pour confirmer l'envoi.
          </p>
          
          <div className="bg-gray-50 rounded-2xl p-6 text-left mb-8 space-y-4 border border-gray-100">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Résumé de commande</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Produit</span>
              <span className="font-bold text-gray-900">{PRODUCT.name} <span className="text-blue-600">x{quantity}</span></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Destination</span>
              <span className="font-bold text-gray-900">{commune}, {wilaya}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-gray-900">Total à payer</span>
              <span className="font-black text-2xl text-blue-600">{totalPrice} DA</span>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-gray-900 text-white font-bold py-5 rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white rotate-3 shadow-lg shadow-blue-200">DZ</div>
            <span className="hidden sm:block">STORE</span>
          </div>
          <button 
            onClick={handleScrollToForm}
            className="bg-gray-900 text-white px-8 py-3 rounded-full text-sm font-black hover:bg-blue-600 transition-all shadow-lg shadow-gray-200 active:scale-95"
          >
            Acheter Maintenant
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-52 lg:pb-40 px-6">
        {/* Background Decorative Blur */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-[40rem] h-[40rem] bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 space-y-10 animate-in fade-in slide-in-from-left duration-700">
            <div className="flex flex-wrap gap-2">
              <span className="bg-blue-50 text-blue-600 border border-blue-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                🚚 Livraison 58 Wilayas
              </span>
              <span className="bg-green-50 text-green-600 border border-green-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                💵 Paiement à la livraison
              </span>
            </div>
            
            <h1 className="text-6xl lg:text-8xl font-black leading-[0.95] tracking-tight text-gray-900">
              Vivez l'Instant <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-400">Connecté.</span>
            </h1>
            
            <p className="text-lg text-gray-500 max-w-lg leading-relaxed font-medium">
              Découvrez la SmartWatch Ultra S8 Pro. Performance inégalée, design premium et fonctionnalités avancées pour votre quotidien en Algérie.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
              <button 
                onClick={handleScrollToForm}
                className="group w-full sm:w-auto bg-blue-600 text-white text-xl font-black px-12 py-6 rounded-[2rem] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-4"
              >
                Acheter Maintenant
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              </button>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-400 line-through">{PRODUCT.oldPrice} DA</p>
                  <p className="text-3xl font-black text-gray-900">{PRODUCT.price} DA</p>
                </div>
                <div className="bg-orange-500 text-white px-3 py-1.5 rounded-xl font-black text-xs animate-pulse">
                  -35%
                </div>
              </div>
            </div>
          </div>

          <div className="relative animate-in fade-in zoom-in duration-1000 delay-200">
            <div className="absolute inset-0 bg-blue-100 rounded-[4rem] rotate-6 scale-95 opacity-40"></div>
            <div className="relative aspect-square rounded-[3.5rem] overflow-hidden shadow-2xl group border-8 border-white">
              <Image 
                src={PRODUCT.image}
                alt={PRODUCT.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-[2s]"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-gray-900">Pourquoi nous choisir ?</h2>
            <p className="text-gray-500 text-lg font-medium">Une technologie de pointe alliée à un service client exceptionnel.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Écran HD Retina", desc: "Une clarté exceptionnelle sous tous les angles avec des couleurs vives.", icon: "📱" },
              { title: "Résistance Totale", desc: "Certifiée IP68, elle résiste à l'eau, à la poussière et aux chocs.", icon: "🛡️" },
              { title: "Suivi Santé 24/7", desc: "Surveillance cardiaque, sommeil et oxygène sanguin en temps réel.", icon: "❤️" },
              { title: "Autonomie Longue", desc: "Jusqu'à 7 jours d'utilisation intensive avec une seule charge rapide.", icon: "🔋" },
              { title: "Appels Bluetooth", desc: "Passez et recevez vos appels directement depuis votre poignet.", icon: "📞" },
              { title: "Mode Sport Pro", desc: "Plus de 100 modes sportifs pour suivre vos performances.", icon: "🏃" }
            ].map((benefit, i) => (
              <div key={i} className="group bg-white p-10 rounded-[2.5rem] border border-gray-100 hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(37,99,235,0.08)] transition-all duration-500">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:bg-blue-50 group-hover:scale-110 transition-all">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-black mb-4 text-gray-900">{benefit.title}</h3>
                <p className="text-gray-500 leading-relaxed font-medium">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checkout Form Section */}
      <section id="order-form-container" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-900 rounded-[4rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row border border-gray-100">
            {/* Form Info Left */}
            <div className="lg:w-2/5 p-12 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full"></div>
              <div className="relative z-10 space-y-8">
                <h2 className="text-4xl font-black leading-tight">Prêt à Commander ?</h2>
                <p className="text-gray-400 font-medium">Remplissez le formulaire. Notre équipe vous contactera pour confirmer la livraison à votre porte.</p>
                
                <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:bg-blue-600 transition-colors">📍</div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider">Livraison Rapide</h4>
                      <p className="text-xs text-gray-500">Chez vous en 48-72h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:bg-blue-600 transition-colors">💵</div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider">Paiement Cash</h4>
                      <p className="text-xs text-gray-500">À la réception du colis</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 p-8 bg-blue-600 rounded-[2.5rem] shadow-xl shadow-blue-900/20">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-blue-100 text-xs font-black uppercase mb-1">Total à payer</p>
                      <p className="text-4xl font-black">{totalPrice} DA</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-200 text-sm italic">Livraison incluse</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Right */}
            <div className="lg:w-3/5 bg-white p-12 lg:p-16">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">01</div>
                <h3 className="text-2xl font-black text-gray-900">Formulaire d'Achat</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nom Complet</label>
                    <input 
                      type="text" 
                      required 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Votre nom et prénom"
                      className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:bg-white outline-none transition-all bg-gray-50 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Numéro de Téléphone</label>
                    <input 
                      type="tel" 
                      required 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05 / 06 / 07 -- -- -- --"
                      className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:bg-white outline-none transition-all bg-gray-50 font-bold"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Wilaya (58)</label>
                      <select 
                        required 
                        value={wilaya}
                        onChange={(e) => setWilaya(e.target.value)}
                        className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:bg-white outline-none transition-all bg-gray-50 font-bold appearance-none cursor-pointer"
                      >
                        <option value="">Sélectionner</option>
                        {WILAYAS.map(w => <option key={w.code} value={w.name}>{w.code} - {w.nameAr} ({w.name})</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Commune</label>
                      <input 
                        type="text" 
                        required 
                        value={commune}
                        onChange={(e) => setCommune(e.target.value)}
                        placeholder="Ex: Alger Centre"
                        className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:bg-white outline-none transition-all bg-gray-50 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border-2 border-gray-100">
                      <button 
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-12 h-12 rounded-xl bg-white text-gray-900 border border-gray-200 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all text-xl font-black shadow-sm"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-black text-xl">{quantity}</span>
                      <button 
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-12 h-12 rounded-xl bg-white text-gray-900 border border-gray-200 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all text-xl font-black shadow-sm"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Estimé</p>
                      <p className="text-4xl font-black text-blue-600">{totalPrice} DA</p>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="group w-full bg-gray-900 text-white font-black text-xl py-6 rounded-3xl hover:bg-blue-600 shadow-2xl shadow-gray-200 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        Confirmer la commande
                        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7m0 0l-7 7m7-7H3"/>
                        </svg>
                      </>
                    )}
                  </button>
                  
                  <p className="mt-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                    Paiement Sécurisé à la livraison
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-20 px-6 border-t border-gray-50">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="text-2xl font-black tracking-tighter flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm">DZ</div>
            <span>STORE</span>
          </div>
          <p className="text-gray-400 text-sm font-medium mb-10 text-center max-w-md">
            Votre destination préférée pour les gadgets tech en Algérie. Livraison rapide et service de qualité.
          </p>
          <div className="flex gap-8 mb-10">
            {['Facebook', 'Instagram', 'TikTok'].map(s => (
              <a key={s} href="#" className="text-xs font-black uppercase tracking-widest text-gray-900 hover:text-blue-600 transition-colors">{s}</a>
            ))}
          </div>
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
            © 2024 DZ-STORE · L'ALGERIE LIVRÉE CHEZ VOUS
          </div>
        </div>
      </footer>
    </div>
  );
}
