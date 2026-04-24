import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Book, BookOpen, Copy, Check, Loader2, Moon, Sun, ChevronRight, X, Filter, AlertCircle, RefreshCw, FolderOpen } from 'lucide-react';

/**
 * JANA SEARCH - ULTIMATE WEB VERSION
 * Includes: Tailwind CSS Auto-Injection, Smart Search, 
 * Auto-load + Manual Fallback.
 */

const normalizeArabic = (text) => {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u0652]/g, "") 
    .replace(/[أإآ]/g, "ا")         
    .replace(/ة/g, "ه")             
    .replace(/ى/g, "ي")             
    .trim();
};

const STATUS_COLORS = {
  success: ["صحيح", "حسن", "متفق عليه", "حسن صحيح", "حسن لغيره", "إسناده صحيح", "صحيح بشواهده", "الصحيحة", "صحيح لغيره"],
  danger: ["ضعيف", "ضعيف جدا", "موضوع", "منكر", "باطل", "إسناده ضعيف", "لا أصل له"]
};

export default function App() {
  const [allData, setAllData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHadith, setSelectedHadith] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [activeBook, setActiveBook] = useState('الكل');
  
  const fileInputRef = useRef(null);

  // 1. Inject Tailwind CDN immediately to ensure it's not "ugly"
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // 2. Load Database logic
  const processRawData = (text) => {
    const cleanJson = text.trim().replace(/^\uFEFF/, '');
    if (!cleanJson) throw new Error("Data file is empty.");
    return JSON.parse(cleanJson);
  };

  useEffect(() => {
    const autoLoad = async () => {
      setIsLoading(true);
      try {
        // Try multiple path variants for StackBlitz environments
        const paths = ['./data/TblDetailPath.txt', '/data/TblDetailPath.txt'];
        let success = false;
        
        for (let path of paths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              const text = await response.text();
              setAllData(processRawData(text));
              success = true;
              break;
            }
          } catch (e) { continue; }
        }
        
        if (!success) setError("fallback"); // Trigger manual upload UI
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    autoLoad();
  }, []);

  const handleManualUpload = async (e) => {
    const files = Array.from(e.target.files);
    const indexFile = files.find(f => f.name.includes('TblDetailPath.txt'));
    if (!indexFile) {
      alert("Please select the folder containing 'TblDetailPath.txt'");
      return;
    }
    setIsLoading(true);
    try {
      const text = await indexFile.text();
      setAllData(processRawData(text));
      setError(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text, highlight) => {
    if (!text) return "";
    let formatted = text.replace(/<br\s*\/?>/gi, "\n");
    STATUS_COLORS.success.forEach(status => {
      const regex = new RegExp(`\\( ${status} \\)`, 'g');
      formatted = formatted.replace(regex, `<span class="text-emerald-600 font-bold dark:text-emerald-400">( ${status} )</span>`);
    });
    STATUS_COLORS.danger.forEach(status => {
      const regex = new RegExp(`\\( ${status} \\)`, 'g');
      formatted = formatted.replace(regex, `<span class="text-red-500 font-bold dark:text-red-400">( ${status} )</span>`);
    });
    if (highlight && highlight.length > 2) {
      const q = normalizeArabic(highlight);
      // We search normalized but highlight original
      const searchRegex = new RegExp(`(${highlight})`, 'gi');
      formatted = formatted.replace(searchRegex, `<mark class="bg-yellow-200 dark:bg-emerald-900 text-black dark:text-white rounded px-0.5">$1</mark>`);
    }
    return formatted;
  };

  const availableBooks = useMemo(() => {
    const books = new Set(['الكل']);
    allData.forEach(item => {
      if (item.path) books.add(item.path.split('>')[0].trim());
    });
    return Array.from(books);
  }, [allData]);

  const filteredResults = useMemo(() => {
    if (searchTerm.length < 3 && activeBook === 'الكل') return [];
    const q = normalizeArabic(searchTerm);
    return allData.filter(item => {
      const matchesBook = activeBook === 'الكل' || (item.path && item.path.startsWith(activeBook));
      const desc = normalizeArabic(item.Description);
      return matchesBook && (q === "" || desc.includes(q));
    }).slice(0, 50); 
  }, [searchTerm, allData, activeBook]);

  const copyToClipboard = (text) => {
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' '); 
    const el = document.createElement('textarea');
    el.value = cleanText + "\n\nالمصدر: الجنى الداني";
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white" dir="rtl">
        <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
        <p className="text-xl font-bold font-arabic">جاري تحضير المكتبة...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-stone-100 text-slate-900'}`} dir="rtl">
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-500 blur-[120px] rounded-full"></div>
         <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500 blur-[120px] rounded-full"></div>
      </div>

      <nav className={`sticky top-0 z-40 shadow-xl border-b backdrop-blur-md ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-emerald-800/90 border-emerald-900 text-white'}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2 rounded-2xl shadow-lg">
              <BookOpen size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-black font-arabic tracking-tight">الجنى الداني</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            {isDarkMode ? <Sun size={24} className="text-amber-400" /> : <Moon size={24} />}
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        
        {error === "fallback" || allData.length === 0 ? (
          <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-emerald-100 dark:border-slate-800">
            <FolderOpen size={64} className="mx-auto text-emerald-600 mb-6" />
            <h2 className="text-2xl font-black mb-4">لم يتم العثور على البيانات</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              يرجى اختيار مجلد <b>data</b> من جهازك لتفعيل البحث.
            </p>
            <input type="file" ref={fileInputRef} multiple webkitdirectory="true" onChange={handleManualUpload} className="hidden" />
            <button 
              onClick={() => fileInputRef.current.click()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-3xl font-bold text-lg shadow-lg transition-transform active:scale-95"
            >
              اختيار المجلد الآن
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Search Box */}
            <div className={`p-8 rounded-[3rem] shadow-2xl border backdrop-blur-md ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/80 border-stone-200'}`}>
              <div className="relative mb-8">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={28} />
                <input
                  type="text"
                  placeholder="ابحث عن حديث، كلمة، أو رقم..."
                  className={`w-full pr-16 pl-8 py-7 rounded-[2rem] border-2 outline-none transition-all text-2xl font-arabic ${
                    isDarkMode 
                      ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' 
                      : 'bg-stone-50 border-stone-100 focus:border-emerald-600 focus:bg-white'
                  }`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                <Filter size={20} className="text-slate-400 flex-shrink-0" />
                {availableBooks.map(book => (
                  <button
                    key={book}
                    onClick={() => setActiveBook(book)}
                    className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                      activeBook === book
                        ? 'bg-emerald-600 text-white shadow-xl'
                        : 'bg-slate-200/50 dark:bg-slate-800 text-slate-500 hover:bg-emerald-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {book}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredResults.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedHadith(item)}
                  className={`p-8 rounded-[2.5rem] border-r-[8px] transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] ${
                    isDarkMode 
                      ? 'bg-slate-900 border-emerald-500 border-y border-l border-slate-800' 
                      : 'bg-white border-emerald-600 border-y border-l border-stone-100 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-center mb-6">
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black px-4 py-1.5 rounded-full border border-emerald-500/10">
                      {item.path ? item.path.split('>').pop().trim() : 'عام'}
                    </span>
                    <ChevronRight size={20} className="text-slate-300 rotate-180" />
                  </div>
                  <div 
                    className="text-2xl leading-relaxed font-arabic line-clamp-3 text-slate-700 dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: formatText(item.Description, searchTerm) }}
                  />
                </div>
              ))}
            </div>
            
            {searchTerm.length >= 3 && filteredResults.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <Search size={100} className="mx-auto mb-6 opacity-5" />
                <p className="text-2xl font-bold">عذراً، لم نجد ما تبحث عنه</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reader Modal */}
      {selectedHadith && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
              <button 
                onClick={() => copyToClipboard(selectedHadith.Description)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all font-black ${
                  copyFeedback ? 'bg-emerald-500 text-white' : 'bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {copyFeedback ? <Check size={20} /> : <Copy size={20} />}
                <span>{copyFeedback ? 'تم النسخ' : 'نسخ النص'}</span>
              </button>
              <button onClick={() => setSelectedHadith(null)} className="p-3 text-slate-400 hover:text-red-500 transition-colors">
                <X size={36} />
              </button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-grow">
               <div className="mb-8 flex items-center gap-2 text-emerald-600 font-black text-sm uppercase tracking-widest opacity-60">
                 <Book size={16} /> {selectedHadith.path}
               </div>
               <div 
                className="text-3xl sm:text-5xl leading-[1.8] font-arabic text-slate-800 dark:text-slate-100 selection:bg-emerald-200 dark:selection:bg-emerald-900"
                dangerouslySetInnerHTML={{ __html: formatText(selectedHadith.Description, searchTerm) }}
              />
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;900&display=swap');
        .font-arabic { font-family: 'Amiri', serif; }
        body { font-family: 'Noto Sans Arabic', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b98122; border-radius: 20px; border: 3px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b98155; }
      `}} />
    </div>
  );
}