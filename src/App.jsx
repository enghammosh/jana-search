import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Book, BookOpen, Copy, Check, Loader2, Moon, Sun, ChevronRight, X, Filter, AlertCircle, RefreshCw, FolderOpen, LayoutGrid, ChevronLeft, Bookmark, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * JANA SEARCH - OPTIMIZED ACADEMIC VERSION + READING MODE
 * Fixed: Font sizes (realistic), Contrast/Coloring bugs, Removed CDN injection for native Tailwind support.
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

const MAIN_STATUSES = ['صحيح', 'حسن', 'ضعيف', 'موضوع'];

export default function App() {
  const [allData, setAllData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHadith, setSelectedHadith] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  
  // Search & Browse State
  const [selectedBooks, setSelectedBooks] = useState([]); 
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('search'); // 'search' | 'browse' | 'read'
  
  // Reading Mode State
  const [readingBook, setReadingBook] = useState(null);
  const [bookContent, setBookContent] = useState([]);
  const [readingIndex, setReadingIndex] = useState(0);
  
  const fileInputRef = useRef(null);

  const processRawData = (text) => {
    const cleanJson = text.trim().replace(/^\uFEFF/, '');
    return JSON.parse(cleanJson);
  };

  useEffect(() => {
    const autoLoad = async () => {
      setIsLoading(true);
      try {
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/data/TblDetailPath.txt`);
        if (response.ok) {
          const text = await response.text();
          setAllData(processRawData(text));
        } else {
          setError("fallback");
        }
      } catch (err) {
        setError("fallback");
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
      alert("الرجاء اختيار مجلد data الذي يحتوي على ملف TblDetailPath.txt");
      return;
    }
    setIsLoading(true);
    try {
      const text = await indexFile.text();
      setAllData(processRawData(text));
      setError(null);
    } catch (err) {
      alert("حدث خطأ أثناء قراءة الملف.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text, highlight) => {
    if (!text) return "";
    let formatted = text.replace(/<br\s*\/?>/gi, "\n");
    
    STATUS_COLORS.success.forEach(status => {
      const regex = new RegExp(`\\( ${status} \\)`, 'g');
      formatted = formatted.replace(regex, `<span class="text-emerald-600 dark:text-emerald-400 font-bold">( ${status} )</span>`);
    });
    
    STATUS_COLORS.danger.forEach(status => {
      const regex = new RegExp(`\\( ${status} \\)`, 'g');
      formatted = formatted.replace(regex, `<span class="text-rose-600 dark:text-rose-400 font-bold">( ${status} )</span>`);
    });

    if (highlight && highlight.length > 2) {
      const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(`(${escapedHighlight})`, 'gi');
      formatted = formatted.replace(searchRegex, `<mark class="bg-amber-200 dark:bg-indigo-900/60 text-amber-900 dark:text-amber-100 rounded px-1 shadow-sm">$1</mark>`);
    }
    return formatted;
  };

  const availableBooks = useMemo(() => {
    const books = new Set();
    allData.forEach(item => {
      const path = item.path || item.Path;
      if (path) books.add(path.split('>')[0].trim());
    });
    return Array.from(books).sort();
  }, [allData]);

  const toggleBook = (book) => {
    setSelectedBooks(prev => prev.includes(book) ? prev.filter(b => b !== book) : [...prev, book]);
  };

  const toggleStatus = (status) => {
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const openBookForReading = (bookName) => {
    const hadiths = allData.filter(item => {
      const p = item.path || item.Path || '';
      return p.startsWith(bookName);
    });
    setBookContent(hadiths);
    setReadingBook(bookName);
    setReadingIndex(0);
    setViewMode('read');
  };

  const filteredResults = useMemo(() => {
    if (searchTerm.length < 3 && selectedBooks.length === 0 && selectedStatuses.length === 0) return [];
    
    const q = normalizeArabic(searchTerm);
    return allData.filter(item => {
      const itemPath = item.path || item.Path || '';
      const itemDesc = item.Description || '';
      
      const matchesBook = selectedBooks.length === 0 || selectedBooks.some(book => itemPath.startsWith(book));
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.some(status => itemDesc.includes(`( ${status} )`));
      const desc = normalizeArabic(itemDesc);
      const matchesSearch = q === "" || desc.includes(q);
      
      return matchesBook && matchesStatus && matchesSearch;
    }).slice(0, 70); 
  }, [searchTerm, allData, selectedBooks, selectedStatuses]);

  const copyToClipboard = (text, id = 'modal') => {
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' '); 
    const el = document.createElement('textarea');
    el.value = cleanText + "\n\nالمصدر: الجنى الداني من تراث الشيخ الألباني";
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-indigo-900'}`} dir="rtl">
        <div className="relative mb-8">
           <div className="w-20 h-20 border-4 border-indigo-900/20 border-t-indigo-900 dark:border-indigo-400/20 dark:border-t-indigo-400 rounded-full animate-spin"></div>
           <BookOpen className="absolute inset-0 m-auto text-indigo-900 dark:text-indigo-400" size={28} />
        </div>
        <p className="text-xl font-bold font-arabic tracking-wide animate-pulse">جاري فتح كنوز المكتبة...</p>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300" dir="rtl">
        
        {/* Navigation */}
        <nav className="sticky top-0 z-40 border-b backdrop-blur-xl bg-indigo-900 dark:bg-slate-900 border-indigo-950 dark:border-slate-800 shadow-lg text-white transition-all">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => {setSearchTerm(''); setViewMode('search');}}>
              <div className="bg-white/10 p-2 rounded-xl shadow-inner border border-white/10">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-arabic leading-none tracking-tight">الجنى الداني</h1>
                <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1 text-amber-400">Albani Archive</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setViewMode(viewMode === 'search' ? 'browse' : 'search')}
                className={`p-2 sm:p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${viewMode === 'browse' || viewMode === 'read' ? 'bg-indigo-800 dark:bg-slate-800 text-white' : 'hover:bg-white/10 text-indigo-200'}`}
                title="تصفح الفهرس"
              >
                <LayoutGrid size={20} />
                <span className="hidden sm:inline font-arabic">الفهرس</span>
              </button>
              <div className="w-px h-6 bg-white/20 mx-1 sm:mx-2"></div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 sm:p-2.5 hover:bg-white/10 rounded-xl transition-all text-indigo-200 hover:text-white">
                {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
          
          {error === "fallback" || allData.length === 0 ? (
            <div className="max-w-lg mx-auto text-center bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <FolderOpen size={40} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 font-arabic text-indigo-900 dark:text-white">المكتبة غير متصلة</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-arabic">
                يرجى اختيار مجلد <b>data</b> من جهازك لتفعيل محرك البحث الأكاديمي.
              </p>
              <input type="file" ref={fileInputRef} multiple webkitdirectory="true" onChange={handleManualUpload} className="hidden" />
              <button 
                onClick={() => fileInputRef.current.click()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-lg shadow-md transition-transform active:scale-95 font-arabic"
              >
                استيراد البيانات الآن
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Search Module */}
              {viewMode === 'search' && (
                <div className="p-5 sm:p-6 rounded-[2rem] shadow-sm border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all">
                  <div className="relative flex flex-col md:flex-row gap-3">
                    <div className="relative flex-grow">
                      <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                      <input
                        type="text"
                        placeholder="ابحث بكلمة، راوي، أو جملة (يتم البحث في الكل افتراضياً)..."
                        className="w-full pr-14 pl-8 py-4 rounded-[1.5rem] border-2 outline-none transition-all text-xl font-arabic bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-900 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute left-5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                          <X size={18} />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-6 py-4 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                        selectedBooks.length > 0 || selectedStatuses.length > 0 || showFilters
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Filter size={20} />
                      <span className="font-arabic text-base">تصفية</span>
                      {(selectedBooks.length > 0 || selectedStatuses.length > 0) && (
                        <span className="bg-amber-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                          {selectedBooks.length + selectedStatuses.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Advanced Filters */}
                  {showFilters && (
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 space-y-6">
                      
                      {/* Authenticity Filter */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 font-arabic">
                          <ShieldCheck size={18} className="text-emerald-500" />
                          درجة الحديث:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {MAIN_STATUSES.map(status => {
                            const isSelected = selectedStatuses.includes(status);
                            const isPositive = status === 'صحيح' || status === 'حسن';
                            return (
                              <button
                                key={status}
                                onClick={() => toggleStatus(status)}
                                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                                  isSelected
                                    ? (isPositive ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-rose-600 border-rose-600 text-white shadow-sm')
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                                }`}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Books Filter */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 font-arabic">
                            <Book size={18} className="text-indigo-600 dark:text-indigo-400" />
                            المصادر والكتب (يتم البحث في الكل افتراضياً):
                          </h3>
                          {selectedBooks.length > 0 && (
                            <button 
                              onClick={() => setSelectedBooks([])}
                              className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors font-arabic"
                            >
                              <X size={14} /> مسح اختيار الكتب
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                          {availableBooks.map(book => {
                            const isSelected = selectedBooks.includes(book);
                            return (
                              <button
                                key={book}
                                onClick={() => toggleBook(book)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                {book}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Browse Section (Grid of Books) */}
              {viewMode === 'browse' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-6">
                  {availableBooks.map((book, i) => (
                    <div 
                      key={i}
                      onClick={() => openBookForReading(book)}
                      className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 transition-all cursor-pointer hover:shadow-lg hover:border-indigo-500 group flex flex-col justify-between min-h-[160px]"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all shadow-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white">
                          <Bookmark size={24} />
                        </div>
                        <h3 className="text-lg font-bold font-arabic dark:text-white text-slate-800 leading-tight">{book}</h3>
                      </div>
                      <div className="mt-4 flex items-center text-amber-600 font-bold text-sm">
                        <span className="font-arabic">اقرأ الكتاب</span>
                        <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Apple Books Style Reading Mode */}
              {viewMode === 'read' && bookContent.length > 0 && (
                <div className="animate-in fade-in zoom-in-95 duration-500 max-w-3xl mx-auto">
                  {/* Reader Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <button 
                      onClick={() => setViewMode('browse')} 
                      className="flex items-center gap-2 font-bold font-arabic px-4 py-2 rounded-xl transition-colors bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                      <ChevronRight size={18} />
                      العودة للمكتبة
                    </button>
                    <div className="text-center flex-grow px-2">
                      <h2 className="text-xl font-bold font-arabic text-indigo-900 dark:text-indigo-300 truncate">{readingBook}</h2>
                    </div>
                    <div className="px-4 py-2 rounded-xl font-bold font-mono text-sm border bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 shadow-sm text-center">
                      {readingIndex + 1} / {bookContent.length}
                    </div>
                  </div>

                  {/* Reader Paper/Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[60vh] relative overflow-hidden">
                    
                    {/* Content Area */}
                    <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar">
                      <div 
                        className="text-xl sm:text-2xl leading-loose font-arabic text-justify text-slate-900 dark:text-slate-100 selection:bg-amber-200 dark:selection:bg-indigo-900"
                        dangerouslySetInnerHTML={{ __html: formatText(bookContent[readingIndex].Description, '') }}
                      />
                    </div>

                    {/* Page Navigation Footer */}
                    <div className="p-5 sm:p-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                      <button 
                        onClick={() => setReadingIndex(prev => Math.min(bookContent.length - 1, prev + 1))}
                        disabled={readingIndex === bookContent.length - 1}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <ArrowLeft size={20} />
                        <span className="font-bold font-arabic hidden sm:inline text-base">التالي</span>
                      </button>

                      <span className="font-bold text-slate-400 dark:text-slate-500 font-arabic text-base">
                        الحديث {readingIndex + 1}
                      </span>

                      <button 
                        onClick={() => setReadingIndex(prev => Math.max(0, prev - 1))}
                        disabled={readingIndex === 0}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <span className="font-bold font-arabic hidden sm:inline text-base">السابق</span>
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results Grid */}
            {viewMode === 'search' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredResults.map((item, idx) => {
                  const itemPath = item.path || item.Path || '';
                  const bookName = itemPath ? itemPath.split('>').pop().trim() : 'عام';
                  
                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedHadith(item)}
                      className={`group p-8 rounded-[3rem] border-r-[10px] transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] flex flex-col ${
                        isDarkMode 
                          ? 'bg-slate-900/80 border-indigo-500 border-y border-l border-slate-800' 
                          : 'bg-white border-primary border-y border-l border-slate-100 shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <span className={`text-[11px] font-black px-4 py-1.5 rounded-full border font-arabic ${isDarkMode ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-primary border-indigo-100'}`}>
                          {bookName}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // يمنع فتح الحديث عند النقر على زر النسخ
                              copyToClipboard(item.Description, idx);
                            }}
                            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-emerald-400' : 'bg-slate-100 text-slate-400 hover:text-emerald-600'}`}
                            title="نسخ سريع"
                          >
                            {copyFeedback === idx ? <Check size={20} /> : <Copy size={20} />}
                          </button>
                          <div className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 group-hover:text-indigo-400' : 'bg-slate-100 text-slate-400 group-hover:text-primary'}`}>
                            <ChevronLeft size={20} />
                          </div>
                        </div>
                      </div>
                      <div 
                        className={`text-2xl leading-relaxed font-arabic line-clamp-4 flex-grow ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}
                        dangerouslySetInnerHTML={{ __html: formatText(item.Description, searchTerm) }}
                        />
                      </div>
                    );
                  })}

                  {/* Empty State */}
                  {(searchTerm.length >= 3 || selectedBooks.length > 0 || selectedStatuses.length > 0) && filteredResults.length === 0 && (
                    <div className="col-span-full text-center py-24 text-slate-400 dark:text-slate-500">
                      <Search size={80} className="mx-auto mb-6 opacity-20" />
                      <p className="text-xl font-bold font-arabic">لا توجد نتائج تطابق بحثك</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Reader Modal for Search Results */}
        {selectedHadith && viewMode === 'search' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
                <button 
                  onClick={() => copyToClipboard(selectedHadith.Description, 'modal')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-bold text-sm ${
                    copyFeedback === 'modal'
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm'
                  }`}
                >
                  {copyFeedback === 'modal' ? <Check size={18} /> : <Copy size={18} />}
                  <span className="font-arabic">{copyFeedback === 'modal' ? 'تم النسخ بنجاح' : 'نسخ النص'}</span>
                </button>
                <button 
                  onClick={() => setSelectedHadith(null)} 
                  className="p-2 rounded-full transition-all bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-grow">
                 <div className="mb-6 flex items-center gap-2 font-bold text-sm uppercase font-arabic text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 inline-flex px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/50" dir="ltr">
                   <Bookmark size={16} /> 
                   <span>{selectedHadith.path || selectedHadith.Path || "غير مصنف"}</span>
                 </div>
                 <div 
                  className="text-xl sm:text-2xl leading-loose font-arabic text-justify text-slate-900 dark:text-slate-100 selection:bg-amber-200 dark:selection:bg-indigo-900"
                  dangerouslySetInnerHTML={{ __html: formatText(selectedHadith.Description, searchTerm) }}
                />
              </div>
              
              <div className="p-4 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                 <p className="text-xs text-slate-400 dark:text-slate-500 font-bold opacity-80 font-arabic">موسوعة الجنى الداني • الألباني</p>
              </div>
            </div>
          </div>
        )}

        {/* Global Styles for native CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
          .font-arabic { font-family: 'Amiri', serif; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
          .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        `}} />
      </div>
    </div>
  );
}