"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";

// Algerian Wilayas (58)
const WILAYAS = [
  "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna",
  "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira",
  "11 - Tamanghasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou",
  "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
  "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine",
  "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
  "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arreridj", "35 - Boumerdès",
  "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
  "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma",
  "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - El M'Ghair", "50 - El Meniaa",
  "51 - Ouled Djellal", "52 - Bordj Baji Mokhtar", "53 - Béni Abbès", "54 - Timimoun", "55 - Touggourt",
  "56 - Djanet", "57 - In Salah", "58 - In Guezzam"
];

const PRODUCT = {
  name: "SmartWatch Ultra Pro Max",
  price: 7900, // DA
  oldPrice: 12500, // DA
  shippingFee: 600, // DA
  image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=1000&auto=format&fit=crop",
};

export default function LandingPage() {
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
    const formElement = document.getElementById("order-form-section");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6" dir="ltr">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-10 text-center border border-gray-100 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Commande Reçue !</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Merci <span className="font-bold text-gray-900">{fullName}</span>, votre commande a été enregistrée avec succès. Notre équipe vous appellera au <span className="font-bold text-gray-900">{phone}</span> pour confirmer l'envoi.
          </p>
          
          <div className="bg-gray-50 rounded-2xl p-6 text-left mb-8 space-y-4 border border-gray-100">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Résumé</span>
              <span className="text-gray-900 font-black">#DZ-{Math.floor(Math.random() * 9000) + 1000}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Produit</span>
              <span className="font-bold text-gray-900">{PRODUCT.name} <span className="text-orange-500">x{quantity}</span></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Destination</span>
              <span className="font-bold text-gray-900">{commune}, {wilaya.split(' - ')[1]}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-gray-900">Total à payer</span>
              <span className="font-black text-2xl text-green-600">{totalPrice} DA</span>
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
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-orange-100 selection:text-orange-900" dir="ltr">
      {/* Top Banner */}
      <div className="bg-orange-600 text-white py-2 px-4 text-center text-xs font-bold tracking-widest uppercase">
        🔥 Offre Spéciale : -40% Aujourd'hui Seulement 🔥
      </div>

      {/* Header */}
      <header className="sticky top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white rotate-3 shadow-lg shadow-orange-200">DZ</div>
            <span className="hidden sm:block">MARKET</span>
          </div>
          <button 
            onClick={handleScrollToForm}
            className="bg-gray-900 text-white px-8 py-3 rounded-full text-sm font-black hover:bg-orange-600 transition-all shadow-lg shadow-gray-200 active:scale-95"
          >
            COMMANDER
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 lg:pt-24 lg:pb-40 px-6 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-orange-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 space-y-10">
            <div className="inline-flex flex-wrap gap-2">
              <span className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                🚚 Livraison 58 Wilayas
              </span>
              <span className="bg-green-50 text-green-600 border border-green-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                💵 Paiement à la livraison
              </span>
            </div>
            
            <h1 className="text-6xl lg:text-8xl font-black leading-[1] tracking-tight text-gray-900">
              L'élégance <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">Connectée.</span>
            </h1>
            
            <p className="text-lg text-gray-500 max-w-lg leading-relaxed font-medium">
              Découvrez la nouvelle SmartWatch Ultra Pro. Une technologie de pointe dans un design robuste et raffiné. Conçue pour ceux qui exigent le meilleur.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <button 
                onClick={handleScrollToForm}
                className="group w-full sm:w-auto bg-orange-600 text-white text-xl font-black px-12 py-6 rounded-[2rem] hover:bg-orange-700 transition-all shadow-2xl shadow-orange-200 active:scale-95 flex items-center justify-center gap-4"
              >
                Acheter Maintenant
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              </button>
              
              <div className="flex flex-col items-center sm:items-start">
                <div className="flex items-center -space-x-3 mb-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-sm">
                      <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="User" />
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-full border-4 border-white bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-black shadow-sm">
                    +2k
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Adopté par plus de 2,400 Algériens</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-transparent rounded-[4rem] rotate-6 scale-95 opacity-50"></div>
            <div className="relative aspect-square rounded-[3.5rem] overflow-hidden shadow-2xl group border-8 border-white">
              <Image 
                src={PRODUCT.image}
                alt={PRODUCT.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-[2s]"
                priority
                unoptimized
              />
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl">
                <span className="text-xs font-black text-gray-400 block uppercase mb-1">Prix Promo</span>
                <span className="text-2xl font-black text-orange-600">{PRODUCT.price} DA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-gray-50 border-y border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto no-scrollbar">
          <div className="flex justify-between items-center min-w-[800px] gap-8">
            {[
              { label: "Qualité Garantie", icon: "💎" },
              { label: "Support 7j/7", icon: "📞" },
              { label: "Paiement Sécurisé", icon: "🔒" },
              { label: "Retour Facile", icon: "🔄" },
              { label: "Stock en Algérie", icon: "🇩🇿" }
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3 whitespace-nowrap">
                <span className="text-2xl">{b.icon}</span>
                <span className="font-black text-xs uppercase tracking-widest text-gray-500">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-orange-600 font-black text-xs uppercase tracking-[0.3em]">Avantages</span>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-gray-900">Conçu pour votre style de vie.</h2>
            <p className="text-gray-500 text-lg">Le compagnon idéal pour le sport, le travail et vos moments de détente.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Écran Retina", desc: "Un affichage net et lumineux, même en plein soleil algérien.", icon: "📱" },
              { title: "Étanchéité IP68", desc: "Résiste à la pluie, à la poussière et aux éclaboussures.", icon: "💧" },
              { title: "Suivi Santé Pro", desc: "Mesurez votre rythme cardiaque, oxygène et sommeil.", icon: "❤️" },
              { title: "Appels Bluetooth", desc: "Répondez directement depuis votre poignet avec clarté.", icon: "🎙️" },
              { title: "Notifications", desc: "Ne manquez jamais un message Facebook, WhatsApp ou SMS.", icon: "🔔" },
              { title: "Plusieurs Cadrans", desc: "Personnalisez l'affichage selon votre tenue du jour.", icon: "🎨" }
            ].map((benefit, i) => (
              <div key={i} className="group bg-white p-10 rounded-[2.5rem] border border-gray-100 hover:border-orange-200 hover:shadow-[0_20px_50px_rgba(249,115,22,0.1)] transition-all duration-500">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:bg-orange-50 group-hover:scale-110 transition-all">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-black mb-4 text-gray-900">{benefit.title}</h3>
                <p className="text-gray-500 leading-relaxed font-medium">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Order Form Section */}
      <section id="order-form-section" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row border border-gray-100">
            {/* Form Info Left */}
            <div className="lg:w-[40%] bg-gray-900 p-12 lg:p-16 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/20 blur-3xl rounded-full"></div>
              <div className="relative z-10 space-y-8">
                <h2 className="text-4xl font-black leading-tight">Commandez maintenant & payez après.</h2>
                <p className="text-gray-400 font-medium">Remplissez vos informations. Nous vous livrons partout en Algérie en 24h à 72h.</p>
                
                <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:bg-orange-600 transition-colors">📍</div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider">Livraison</h4>
                      <p className="text-xs text-gray-500">À domicile ou au bureau</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:bg-orange-600 transition-colors">🤝</div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider">Confiance</h4>
                      <p className="text-xs text-gray-500">Vérifiez avant de payer</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 p-8 bg-orange-600 rounded-3xl shadow-xl shadow-orange-900/20">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-orange-200 text-xs font-black uppercase mb-1">Prix exclusif</p>
                      <p className="text-4xl font-black">{PRODUCT.price} DA</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-200 line-through text-sm">{PRODUCT.oldPrice} DA</p>
                      <div className="bg-white text-orange-600 px-2 py-1 rounded-lg text-[10px] font-black mt-1">SAVE 40%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Right */}
            <div className="lg:w-[60%] p-12 lg:p-16">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black">01</div>
                <h3 className="text-2xl font-black">Formulaire d'achat</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nom et Prénom</label>
                    <input 
                      type="text" 
                      required 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Mohamed Amine"
                      className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-orange-500 focus:bg-white outline-none transition-all bg-gray-50 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Téléphone</label>
                    <input 
                      type="tel" 
                      required 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05 / 06 / 07 -- -- -- --"
                      className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-orange-500 focus:bg-white outline-none transition-all bg-gray-50 font-bold"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Wilaya</label>
                      <select 
                        required 
                        value={wilaya}
                        onChange={(e) => setWilaya(e.target.value)}
                        className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-orange-500 focus:bg-white outline-none transition-all bg-gray-50 font-bold appearance-none cursor-pointer"
                      >
                        <option value="">Choisir...</option>
                        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Commune</label>
                      <input 
                        type="text" 
                        required 
                        value={commune}
                        onChange={(e) => setCommune(e.target.value)}
                        placeholder="Ex: Kouba"
                        className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-orange-500 focus:bg-white outline-none transition-all bg-gray-50 font-bold"
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
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total à payer</p>
                      <p className="text-4xl font-black text-orange-600">{totalPrice} DA</p>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="group w-full bg-gray-900 text-white font-black text-xl py-6 rounded-3xl hover:bg-orange-600 shadow-2xl shadow-gray-200 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-70"
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
                  
                  <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Transaction Sécurisée · Paiement Cash</span>
                  </div>
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
            <span>MARKET</span>
          </div>
          <p className="text-gray-400 text-sm font-medium mb-10 text-center max-w-md">
            Le numéro #1 de l'e-commerce en Algérie. Qualité, Rapidité et Fiabilité.
          </p>
          <div className="flex gap-8 mb-10">
            {['Facebook', 'Instagram', 'TikTok'].map(s => (
              <a key={s} href="#" className="text-xs font-black uppercase tracking-widest text-gray-900 hover:text-orange-600 transition-colors">{s}</a>
            ))}
          </div>
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
            © 2024 DZ-MARKET · L'ALGERIE LIVRÉE CHEZ VOUS
          </div>
        </div>
      </footer>
    </div>
  );
}
