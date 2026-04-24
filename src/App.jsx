import React, { useState, useEffect, useMemo } from 'react';
import { Search, Book, BookOpen, Copy, Check, Loader2, Moon, Sun, ChevronRight, X, Filter, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * JANA SEARCH - WEB VERSION (AUTO-LOAD FIXED)
 * Replicates original "Jenna Danny" APK logic.
 * Automatically fetches the index from the project's public data folder.
 */

// Arabic normalization for search accuracy
const normalizeArabic = (text) => {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u0652]/g, "") // Remove Harakat
    .replace(/[أإآ]/g, "ا")         // Standardize Alef
    .replace(/ة/g, "ه")             // Standardize Teh Marbuta
    .replace(/ى/g, "ي")             // Standardize Alef Maksura
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

  // Automatic Data Loading on Mount - Fixed Fetch URL
  useEffect(() => {
    const loadDatabase = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Construct absolute URL relative to the current origin to fix parsing errors
        const baseUrl = window.location.origin;
        const targetUrl = `${baseUrl}/data/TblDetailPath.txt`;
        
        console.log("Attempting to fetch index from:", targetUrl);
        
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
          throw new Error(`تعذر العثور على ملف البيانات (Error ${response.status}). تأكد من رفع مجلد data داخل مجلد public.`);
        }

        const text = await response.text();
        // Remove BOM and clean whitespace
        const cleanJson = text.trim().replace(/^\uFEFF/, '');
        
        if (!cleanJson) {
          throw new Error("ملف البيانات فارغ.");
        }

        const json = JSON.parse(cleanJson);
        setAllData(json);
      } catch (err) {
        console.error("Fetch Error Details:", err);
        setError(err.message || "حدث خطأ غير متوقع أثناء تحميل البيانات.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDatabase();
  }, []);

  // Mirrors the original APK replace logic for status coloring
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
      const searchRegex = new RegExp(`(${highlight})`, 'gi');
      formatted = formatted.replace(searchRegex, `<mark class="bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded px-0.5">$1</mark>`);
    }

    return formatted;
  };

  const availableBooks = useMemo(() => {
    const books = new Set(['الكل']);
    allData.forEach(item => {
      if (item.path) {
        const rootBook = item.path.split('>')[0].trim();
        books.add(rootBook);
      }
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
    }).slice(0, 100); 
  }, [searchTerm, allData, activeBook]);

  const copyToClipboard = (text) => {
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' '); 
    const textArea = document.createElement("textarea");
    textArea.value = cleanText + "\n\nالمصدر: الجنى الداني من دوحة الألباني";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textArea);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} dir="rtl">
        <div className="relative scale-150 mb-10">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <BookOpen className="absolute inset-0 m-auto text-emerald-500" size={24} />
        </div>
        <p className="text-xl font-bold animate-pulse font-arabic">جاري تحميل المكتبة...</p>
        <p className="text-sm opacity-50 mt-2 font-arabic">يرجى الانتظار، يتم تحضير آلاف الأحاديث</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} dir="rtl">
        <div className="bg-red-500/10 p-6 rounded-full mb-6">
          <AlertCircle size={60} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4 font-arabic">عذراً، حدث خطأ في الوصول للبيانات</h2>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 mb-8 max-w-lg">
           <p className="text-red-600 dark:text-red-400 font-mono text-sm break-words">{error}</p>
        </div>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 font-arabic">
          يرجى التأكد من أن المجلد <b>data</b> موجود تماماً داخل مجلد <b>public</b>.
          <br />
          يجب أن يكون الملف متاحاً عبر الرابط: <code>/data/TblDetailPath.txt</code>
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <RefreshCw size={18} />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-stone-50 text-slate-900'}`} dir="rtl">
      
      {/* Navigation */}
      <nav className={`sticky top-0 z-40 shadow-lg border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-emerald-700 border-emerald-800 text-white'}`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2.5 rounded-2xl shadow-inner border border-white/20">
              <BookOpen size={28} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">الجنى الداني</h1>
              <p className="hidden sm:block text-[10px] opacity-60 font-bold uppercase tracking-widest leading-none mt-1">Albani Hadith Library</p>
            </div>
          </div>
          
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            {isDarkMode ? <Sun size={22} className="text-amber-400" /> : <Moon size={22} />}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Search Module */}
          <div className={`p-6 rounded-[2.5rem] shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="relative mb-8 group">
              <Search className={`absolute right-5 top-1/2 -translate-y-1/2 transition-colors ${searchTerm ? 'text-emerald-500' : 'text-slate-400'}`} size={24} />
              <input
                type="text"
                placeholder="ابحث عن حديث أو كلمة أو رقم..."
                className={`w-full pr-14 pl-6 py-6 rounded-3xl border-2 outline-none transition-all text-2xl font-arabic ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-700 focus:border-emerald-500' 
                    : 'bg-stone-50 border-stone-100 focus:border-emerald-600 focus:bg-white shadow-inner'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute left-5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
              <Filter size={18} className="text-slate-400 flex-shrink-0" />
              {availableBooks.map(book => (
                <button
                  key={book}
                  onClick={() => setActiveBook(book)}
                  className={`px-6 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border-2 ${
                    activeBook === book
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/20'
                      : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 hover:border-emerald-500'
                  }`}
                >
                  {book}
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredResults.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedHadith(item)}
                className={`p-6 rounded-[2rem] border-r-[6px] transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] ${
                  isDarkMode 
                    ? 'bg-slate-800 border-emerald-500 border-y border-l border-slate-700' 
                    : 'bg-white border-emerald-600 border-y border-l border-slate-50 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/10">
                    {item.path ? item.path.split('>').pop().trim() : 'عام'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono opacity-50">#{item.Id}</span>
                </div>
                <div 
                  className="text-xl leading-relaxed font-arabic line-clamp-3 text-slate-700 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: formatText(item.Description, searchTerm) }}
                />
              </div>
            ))}

            {searchTerm.length >= 3 && filteredResults.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-400">
                <Search size={80} className="mx-auto mb-6 opacity-5" />
                <p className="text-xl font-bold font-arabic">لا توجد نتائج تطابق بحثك</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reader Modal */}
      {selectedHadith && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <div className="p-6 border-b dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex gap-3">
                <button 
                  onClick={() => copyToClipboard(selectedHadith.Description)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-black text-sm ${
                    copyFeedback 
                    ? 'bg-emerald-500 text-white' 
                    : (isDarkMode ? 'bg-slate-700 text-emerald-400 hover:bg-slate-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')
                  }`}
                >
                  {copyFeedback ? <Check size={18} /> : <Copy size={18} />}
                  <span className="font-arabic">{copyFeedback ? 'تم النسخ' : 'نسخ الحديث'}</span>
                </button>
              </div>
              <button onClick={() => setSelectedHadith(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <X size={32} />
              </button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-grow bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-xs mb-8 opacity-60" dir="ltr">
                <Book size={14} />
                <span>{selectedHadith.path || "غير مصنف"}</span>
              </div>
              <div 
                className="text-2xl sm:text-4xl leading-[1.8] font-arabic text-slate-800 dark:text-slate-100 selection:bg-emerald-200 dark:selection:bg-emerald-900"
                dangerouslySetInnerHTML={{ __html: formatText(selectedHadith.Description, searchTerm) }}
              />
            </div>
            
            <div className="p-5 text-center bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700">
              <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase italic font-arabic">برنامج الجنى الداني • تراث الشيخ الألباني</p>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;900&display=swap');
        .font-arabic { font-family: 'Amiri', serif; }
        body { font-family: 'Noto Sans Arabic', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b98144; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b98188; }
        mark { background-color: #dbeafe; color: #1e40af; padding: 0 4px; border-radius: 6px; }
        .dark mark { background-color: #1e3a8a; color: #bfdbfe; }
      `}} />
    </div>
  );
}