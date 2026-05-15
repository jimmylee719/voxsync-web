import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  page: 'about' | 'privacy';
  onBack: () => void;
}

export function LegalPage({ page, onBack }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans">
       <header className="px-6 py-6 border-b border-gray-800 bg-[#0f0f0f] sticky top-0">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium">回首頁/Back to Home</span>
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {page === 'about' ? (
          <div className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-8">關於我們 About Us</h1>
            <section className="space-y-6 text-gray-400 leading-relaxed">
              <p>
                歡迎來到 VoxSync。我們是一個熱愛技術與設計的小小實驗室：<strong>Skadoosh AI Lab</strong>。<br /> 
                我們相信每個人都有精彩的故事和知識值得分享。然而，在面對鏡頭或觀眾時，繁雜的講稿記憶與傳統需要腳踏板操控的提詞機，往往讓人無法以最自然、最自信的方式表達。
              </p>
              <p>
                因此，我們打造了 VoxSync。這是一個結合最新 AI 語音辨識技術與流暢前端互動的智能提詞器。它能夠聽辨您的聲音，自動推進演講內容。不需要滑鼠，不需要特殊的遙控器，只需要您專注於演講。
              </p>
              <p>
                如果你有任何回饋、商業合作，或是發現任何使用上的問題，歡迎隨時與我們聯繫。<br />
                <strong>聯絡信箱 Contact Us:</strong> <a href="mailto:skadoosh.ai.lab@gmail.com" className="text-amber-500 hover:underline">skadoosh.ai.lab@gmail.com</a>
              </p>
            </section>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-8">隱私權政策 Privacy Policy</h1>
            <section className="space-y-6 text-gray-400 leading-relaxed">
               <p><strong>最後更新日期: 2026/05/15</strong></p>
               <p>
                 VoxSync（以下簡稱「我們」）非常重視您的隱私權。為了讓您能夠安心的使用我們的智能提詞服務，特此向您說明我們的隱私權保護政策（Privacy Policy），以保障您的權益。
               </p>

               <h3 className="text-2xl text-white font-semibold mt-8 mb-4">1. 資料的收集與使用 (Data Collection & Usage)</h3>
               <p>
                 VoxSync 的核心功能為「語音自動跟隨提詞」，為了提供此服務，我們需要使用您裝置上的麥克風。<strong>請注意：我們所有的語音辨識機制皆在您的瀏覽器或設備端直接透過標準 Web Speech API 進行處理。我們不會將您的語音音訊或錄音檔案上傳、存儲或傳輸到任何外部伺服器。</strong>
               </p>

               <h3 className="text-2xl text-white font-semibold mt-8 mb-4">2. 講稿內容的安全性 (Script Data Security)</h3>
               <p>
                 您在 VoxSync 編輯器中輸入或上傳的演講稿內容（包含 txt, docx, pdf 等），僅會暫存於您當前使用的瀏覽器之本地儲存空間 (Local Storage/State)。我們並未架設後端資料庫來收集、備份或分析您的演講文字。關閉瀏覽器或清除快取後，未儲存的講稿可能會遺失，藉此保證您個人的機密資料絕不會外流。
               </p>

               <h3 className="text-2xl text-white font-semibold mt-8 mb-4">3. 第三方服務與分析 (Third-Party Services)</h3>
               <p>
                 為提升服務品質，我們可能會使用匿名的網頁分析工具（如 Google Analytics 等）來了解網站的整體流量與使用狀況，但此類工具所搜集之數據不包含任何可識別您個人身份的資訊。
               </p>

               <h3 className="text-2xl text-white font-semibold mt-8 mb-4">4. 聯絡我們 (Contact Us)</h3>
               <p>
                 若您對本隱私權政策有任何疑問或建議，請透過以下方式與我們聯繫：<br />
                 Email: <a href="mailto:skadoosh.ai.lab@gmail.com" className="text-amber-500 hover:underline">skadoosh.ai.lab@gmail.com</a>
               </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
