import React, { useState } from 'react';
import { Play, Mic, Waves, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onStart: () => void;
  onNavigate: (page: 'about' | 'privacy') => void;
}

export function LandingPage({ onStart, onNavigate }: Props) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const content = {
    zh: {
      heroTitle: "新世代智能提詞機",
      heroSubtitle: "VoxSync - 演講者的極致助手",
      heroDesc: "完全不需手動操作，透過 AI 語音跟隨技術，精準隨您的語速推進字句。只需開口，系統即刻同步。",
      startBtn: "開始免費使用",
      featuresTitle: "為什麼選擇 VoxSync？",
      features: [
        { title: "語音自動跟隨", desc: "不需要點擊滑鼠或踩踏板，念到哪裡，提詞機自動捲動到哪裡。" },
        { title: "防呆與暫停", desc: "停頓喝水或是忘詞也不必擔心，提詞機會聰明地等待您繼續。" },
        { title: "無縫多語言支援", desc: "支援中文與英文演講，無論是產品發表、線上直播或課程錄製皆適用。" }
      ],
      seoTitle: "專為專業演講打造的最強提詞解決方案",
      seoDesc: "VoxSync 是目前市場上最聰明的線上提詞機 (Teleprompter) 服務，採用最新的語音辨識技術，徹底解決傳統提詞機需要配合固定速度的痛點。適用於 YouTube 創作者、企業發表會講者、以及線上課程講師，我們讓您能以最自信、最自然的語速表達所想。",
      about: "關於我們",
      privacy: "隱私權政策"
    },
    en: {
      heroTitle: "Next-Gen AI Teleprompter",
      heroSubtitle: "VoxSync - The Ultimate Assistant for Speakers",
      heroDesc: "No manual scrolling required. Powered by AI voice-tracking technology, the text flows perfectly with your speaking pace. Just start talking.",
      startBtn: "Start for Free",
      featuresTitle: "Why Choose VoxSync?",
      features: [
        { title: "Auto Voice Tracking", desc: "No more clicking or pedaling. The prompter scrolls exactly to where you are reading." },
        { title: "Smart Pause", desc: "Need a drink? The prompter intelligently waits for you without running out of sync." },
        { title: "Multilingual Support", desc: "Seamless support for English and Chinese, perfect for global product launches or content creation." }
      ],
      seoTitle: "The Most Advanced Voice-Synced Teleprompter",
      seoDesc: "VoxSync is the market's smartest online teleprompter software. By leveraging modern speech recognition, we eliminate the pain of rigid auto-scrolling. Perfect for YouTubers, corporate presenters, and online educators, VoxSync empowers you to speak beautifully at your own natural pace without distractions.",
      about: "About Us",
      privacy: "Privacy Policy"
    }
  };

  const t = content[lang];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans flex flex-col">
      <header className="px-6 sm:px-12 py-6 flex justify-between items-center border-b border-gray-800 bg-[#0f0f0f]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
            <Mic size={20} className="text-[#0a0a0a]" />
          </div>
          <span className="font-bold text-2xl tracking-tighter text-white">VoxSync</span>
        </div>
        <div className="flex gap-4">
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as 'zh' | 'en')}
            className="bg-transparent border border-gray-700 text-sm font-medium text-gray-300 rounded px-2 py-1 outline-none"
          >
            <option value="zh">繁體中文</option>
            <option value="en">English</option>
          </select>
          <button onClick={onStart} className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold text-sm tracking-wide hover:bg-amber-400 transition-colors">
            {t.startBtn}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-widest uppercase mb-8">
            <Waves size={14} />
            {t.heroSubtitle}
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
            {t.heroTitle}
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.heroDesc}
          </p>
          <button 
            onClick={onStart} 
            className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors shadow-lg hover:shadow-white/20"
          >
            <Play fill="currentColor" size={20} />
            {t.startBtn}
          </button>
        </motion.div>

        <div className="mt-32 max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-left w-full">
          {t.features.map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="p-6 bg-[#0f0f0f] border border-gray-800 rounded-2xl"
            >
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle2 size={24} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        <section className="mt-32 max-w-3xl mx-auto text-left w-full pb-20">
          <h2 className="text-3xl font-bold text-white mb-6 border-b border-gray-800 pb-4">{t.seoTitle}</h2>
          <p className="text-gray-400 leading-relaxed text-lg">
            {t.seoDesc}
          </p>
        </section>
      </main>

      <footer className="py-8 border-t border-gray-800 bg-[#0f0f0f] mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© 2026 VoxSync AI Lab. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => onNavigate('about')} className="hover:text-amber-500 transition-colors">{t.about}</button>
            <button onClick={() => onNavigate('privacy')} className="hover:text-amber-500 transition-colors">{t.privacy}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
