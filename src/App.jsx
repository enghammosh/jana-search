import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Book, BookOpen, Copy, Check, Loader2, Moon, Sun, ChevronRight, X, Filter, AlertCircle, RefreshCw, FolderOpen, LayoutGrid, ChevronLeft, Bookmark, ShieldCheck, ArrowRight, ArrowLeft, List, BookmarkPlus, BookmarkCheck, Printer, FolderHeart, CheckSquare, CheckCircle2 } from 'lucide-react';

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

// الدالة المسؤولة عن إظهار اسم الكتاب والمجلد
const formatBookName = (path) => {
  if (!path) return 'عام';
  const parts = path.split('>');
  if (parts.length > 1) {
    return `${parts[0].trim()} - ${parts[parts.length - 1].trim()}`;
  }
  return parts[0].trim();
};

export default function App() {
  const [allData, setAllData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHadith, setSelectedHadith] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Search & Browse State
  const [selectedBooks, setSelectedBooks] = useState([]); 
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('search'); // 'search' | 'browse' | 'read' | 'favorites'
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'list'
  
  // Reading Mode State
  const [readingBook, setReadingBook] = useState(null);
  const [bookContent, setBookContent] = useState([]);
  const [readingIndex, setReadingIndex] = useState(0);

  // Favorites & Groups State
  const [savedGroups, setSavedGroups] = useState({}); 
  const [showSaveModal, setShowSaveModal] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);

  // Multi-Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isPrintingSelection, setIsPrintingSelection] = useState(false);
  const touchTimer = useRef(null);
  
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // دالة للتحقق مما إذا كان الحديث محفوظاً في أي مجموعة
  const isHadithSaved = (hadith) => {
    if (!hadith) return false;
    return Object.values(savedGroups).some(group => 
      group.some(h => h.Description === hadith.Description)
    );
  };

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
      formatted = formatted.replace(searchRegex, `<mark class="bg-amber-200 dark:bg-emerald-900/80 text-amber-900 dark:text-emerald-100 rounded px-1 shadow-sm">$1</mark>`);
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

  const executeSearch = () => {
    setShowFilters(false);
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

  const sourceData = viewMode === 'favorites' && activeGroup ? savedGroups[activeGroup] : allData;
  
  const filteredResults = useMemo(() => {
    if (viewMode === 'search' && searchTerm.length < 3 && selectedBooks.length === 0 && selectedStatuses.length === 0) return [];
    
    const q = normalizeArabic(searchTerm);
    return sourceData.filter(item => {
      const itemPath = item.path || item.Path || '';
      const itemDesc = item.Description || '';
      
      const matchesBook = selectedBooks.length === 0 || selectedBooks.some(book => itemPath.startsWith(book));
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.some(status => itemDesc.includes(`( ${status} )`));
      const desc = normalizeArabic(itemDesc);
      const matchesSearch = q === "" || desc.includes(q);
      
      return matchesBook && matchesStatus && matchesSearch;
    }).slice(0, 70); 
  }, [searchTerm, sourceData, selectedBooks, selectedStatuses, viewMode]);

  const copyToClipboardRaw = (text, id = 'modal') => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
    showToast('تم النسخ بنجاح');
  };

  const copyToClipboard = (item, id = 'modal') => {
    let cleanText = item.Description.replace(/<br\s*\/?>/gi, '\n');
    cleanText = cleanText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim(); 
    const bookPath = formatBookName(item.path || item.Path);
    copyToClipboardRaw(`${cleanText}\n\n[ الكتاب: ${bookPath} ]\nالمصدر: الجنى الداني من تراث الشيخ الألباني`, id);
  };

  const handleSaveToGroup = (groupName) => {
    if (!groupName) return;
    const currentGroup = savedGroups[groupName] || [];
    
    // Check for duplicates
    const isDuplicate = currentGroup.some(h => h.Description === showSaveModal.Description);
    if (isDuplicate) {
      showToast('الحديث موجود بالفعل في هذه المجموعة!');
      setShowSaveModal(null);
      return;
    }

    setSavedGroups(prev => ({
      ...prev,
      [groupName]: [...currentGroup, showSaveModal]
    }));
    setShowSaveModal(null);
    setNewGroupName('');
    showToast('تم الحفظ للمجموعة بنجاح');
  };

  const printGroupToPDF = () => {
    window.print();
  };

  // --- Multi-Select Logic ---
  const handlePointerDown = (e, item) => {
    touchTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      toggleSelection(item);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600); // 600ms hold triggers selection mode
  };

  const handlePointerUpOrMove = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  };

  const toggleSelection = (item) => {
    setSelectedItems(prev => 
      prev.some(i => i.Description === item.Description)
        ? prev.filter(i => i.Description !== item.Description)
        : [...prev, item]
    );
  };

  const copySelectedItems = () => {
    if (selectedItems.length === 0) return;
    const combinedText = selectedItems.map(item => {
      let cleanText = item.Description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
      const bookPath = formatBookName(item.path || item.Path);
      return `${cleanText}\n[ الكتاب: ${bookPath} ]`;
    }).join('\n\n-------------------------\n\n');
    
    copyToClipboardRaw(`${combinedText}\n\nالمصدر: الجنى الداني من تراث الشيخ الألباني`, 'multi');
    setIsSelectionMode(false);
    setSelectedItems([]);
  };

  const printSelectedItems = () => {
    setIsPrintingSelection(true);
    setTimeout(() => {
      window.print();
      setIsPrintingSelection(false);
      setIsSelectionMode(false);
      setSelectedItems([]);
    }, 100);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-emerald-900'}`} dir="rtl">
        <div className="relative mb-8">
           <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
           <BookOpen className="absolute inset-0 m-auto text-emerald-600 dark:text-emerald-400" size={28} />
        </div>
        <p className="text-xl font-bold font-arabic tracking-wide animate-pulse">جاري فتح المكتبة...</p>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 print:bg-white print:text-black" dir="rtl">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-arabic font-bold animate-in slide-in-from-bottom-4 flex items-center gap-2 border border-slate-700">
            <CheckCircle2 size={18} className="text-emerald-400" />
            {toastMessage}
          </div>
        )}

        {/* Multi-Selection Bottom Bar */}
        {isSelectionMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-emerald-800 text-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-[150] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-full print:hidden">
            <div className="flex items-center gap-3 font-bold font-arabic">
              <CheckSquare size={24} className="text-emerald-300" />
              تم تحديد ({selectedItems.length}) أحاديث
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => { setIsSelectionMode(false); setSelectedItems([]); }} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition-all text-sm">
                إلغاء التحديد
              </button>
              <button onClick={printSelectedItems} disabled={selectedItems.length === 0} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold transition-all text-sm flex items-center justify-center gap-2">
                <Printer size={16} /> طباعة
              </button>
              <button onClick={copySelectedItems} disabled={selectedItems.length === 0} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold transition-all text-sm flex items-center justify-center gap-2">
                <Copy size={16} /> نسخ
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={`sticky top-0 z-40 border-b backdrop-blur-xl bg-emerald-800 dark:bg-slate-900 border-emerald-900 dark:border-slate-800 shadow-lg text-white transition-all print:hidden ${isSelectionMode ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => {setSearchTerm(''); setViewMode('search');}}>
              <div className="bg-white/20 p-2 rounded-xl shadow-inner border border-white/10">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-arabic leading-none tracking-tight">الجنى الداني</h1>
                <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-1 text-emerald-100">تراث الألباني</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => { setViewMode('favorites'); setActiveGroup(null); }}
                className={`p-2 sm:p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${viewMode === 'favorites' ? 'bg-emerald-900 dark:bg-slate-800 text-white' : 'hover:bg-white/10 text-emerald-100'}`}
                title="مجموعاتي"
              >
                <FolderHeart size={20} />
                <span className="hidden sm:inline font-arabic">مجموعاتي</span>
              </button>
              <button 
                onClick={() => setViewMode(viewMode === 'search' ? 'browse' : 'search')}
                className={`p-2 sm:p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${viewMode === 'browse' || viewMode === 'read' ? 'bg-emerald-900 dark:bg-slate-800 text-white' : 'hover:bg-white/10 text-emerald-100'}`}
                title="تصفح المكتبة"
              >
                <LayoutGrid size={20} />
                <span className="hidden sm:inline font-arabic">المكتبة</span>
              </button>
              <div className="w-px h-6 bg-white/20 mx-1 sm:mx-2"></div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 sm:p-2.5 hover:bg-white/10 rounded-xl transition-all text-emerald-100 hover:text-white">
                {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </nav>

        {/* Hidden Print Container for Selected Items Only */}
        {isPrintingSelection && (
           <div className="hidden print:block p-8">
              <h1 className="text-2xl font-bold font-arabic mb-8 pb-4 border-b">الأحاديث المختارة - الجنى الداني</h1>
              {selectedItems.map((item, idx) => (
                  <div key={idx} className="mb-8 pb-8 border-b border-gray-300 break-inside-avoid">
                      <p className="font-bold text-sm text-gray-600 mb-2">{formatBookName(item.path || item.Path)}</p>
                      <p className="text-xl leading-relaxed font-arabic" dangerouslySetInnerHTML={{ __html: formatText(item.Description) }}></p>
                  </div>
              ))}
           </div>
        )}

        <main className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:m-0 ${isPrintingSelection ? 'print:hidden' : ''}`}>
          
          {error === "fallback" || allData.length === 0 ? (
            <div className="max-w-lg mx-auto text-center bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 print:hidden">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <FolderOpen size={40} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 font-arabic text-emerald-900 dark:text-white">المكتبة غير متصلة</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-arabic">
                يرجى اختيار مجلد <b>data</b> من جهازك لتفعيل محرك البحث.
              </p>
              <input type="file" ref={fileInputRef} multiple webkitdirectory="true" onChange={handleManualUpload} className="hidden" />
              <button 
                onClick={() => fileInputRef.current.click()}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-2xl font-bold text-lg shadow-md transition-transform active:scale-95 font-arabic"
              >
                استيراد البيانات الآن
              </button>
            </div>
          ) : (
            <div className="space-y-8 print:space-y-4">
              
              {/* Search & Toolbar Module */}
              {(viewMode === 'search' || (viewMode === 'favorites' && activeGroup)) && (
                <div className="p-5 sm:p-6 rounded-[2rem] shadow-sm border bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 transition-all print:hidden">
                  
                  {/* Top Toolbar */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-grow">
                      <button onClick={executeSearch} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-xl transition-colors">
                         <Search size={20} />
                      </button>
                      <input
                        type="text"
                        placeholder="ابحث بكلمة، راوي، أو جملة..."
                        className="w-full pr-16 pl-12 py-4 rounded-[1.5rem] border-2 outline-none transition-all text-xl font-arabic bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-900 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') executeSearch(); }}
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute left-5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                          <X size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700">
                         <button onClick={() => setLayoutMode('grid')} className={`p-2.5 rounded-xl transition-all ${layoutMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`} title="عرض شبكي">
                           <LayoutGrid size={20} />
                         </button>
                         <button onClick={() => setLayoutMode('list')} className={`p-2.5 rounded-xl transition-all ${layoutMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`} title="عرض قائمة">
                           <List size={20} />
                         </button>
                      </div>

                      {viewMode === 'favorites' && activeGroup && (
                        <button onClick={printGroupToPDF} className="px-5 py-4 rounded-[1.5rem] border-2 border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500/50 dark:text-emerald-400 transition-all flex items-center justify-center gap-2 font-bold hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white">
                          <Printer size={20} />
                          <span className="hidden sm:inline font-arabic">طباعة PDF</span>
                        </button>
                      )}

                      <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-6 py-4 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                          selectedBooks.length > 0 || selectedStatuses.length > 0 || showFilters
                            ? 'bg-emerald-700 border-emerald-700 text-white shadow-md dark:bg-emerald-600 dark:border-emerald-600' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                  </div>

                  {/* Advanced Filters */}
                  {showFilters && (
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 space-y-6">
                      
                      {/* Detailed Authenticity Filter */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 font-arabic border-b border-slate-100 dark:border-slate-700 pb-2">
                          <ShieldCheck size={18} className="text-emerald-500 dark:text-emerald-400" />
                          تصفية بدرجة الحديث بدقة:
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-3 font-arabic">مقبول (صحيح وحسن):</p>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_COLORS.success.map(status => {
                                const isSelected = selectedStatuses.includes(status);
                                return (
                                  <button
                                    key={status}
                                    onClick={() => toggleStatus(status)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                                      isSelected
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-500'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-3 font-arabic">مردود (ضعيف وموضوع):</p>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_COLORS.danger.map(status => {
                                const isSelected = selectedStatuses.includes(status);
                                return (
                                  <button
                                    key={status}
                                    onClick={() => toggleStatus(status)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                                      isSelected
                                        ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border-rose-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-rose-400 dark:hover:border-rose-500'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          
                          {selectedStatuses.length > 0 && (
                            <button onClick={() => setSelectedStatuses([])} className="text-xs font-bold text-rose-500 hover:underline font-arabic flex items-center gap-1 mt-2">
                              <X size={14}/> إزالة فلاتر الدرجة
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Books Filter */}
                      <div>
                        <div className="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 font-arabic">
                            <Book size={18} className="text-emerald-600 dark:text-emerald-400" />
                            تحديد المصادر:
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                          <button
                            onClick={() => setSelectedBooks([])}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                              selectedBooks.length === 0
                                ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            الكل (البحث الشامل)
                          </button>
                          {availableBooks.map(book => {
                            const isSelected = selectedBooks.includes(book);
                            return (
                              <button
                                key={book}
                                onClick={() => toggleBook(book)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                                  isSelected
                                    ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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

              {/* Favorites & Groups Landing View */}
              {viewMode === 'favorites' && !activeGroup && (
                <div className="space-y-6 print:hidden">
                  <div className="flex items-center gap-3 mb-8">
                     <FolderHeart size={32} className="text-emerald-600 dark:text-emerald-400" />
                     <h2 className="text-3xl font-bold font-arabic text-slate-800 dark:text-white">مجموعاتي المحفوظة</h2>
                  </div>
                  
                  {Object.keys(savedGroups).length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                       <BookmarkPlus size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                       <p className="text-xl font-bold text-slate-500 font-arabic">لم تقم بإنشاء أي مجموعات بعد.</p>
                       <p className="text-slate-400 mt-2 font-arabic">اضغط على أيقونة الحفظ في أي حديث لإنشاء مجموعة جديدة.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(savedGroups).map(([groupName, hadiths]) => (
                        <div 
                          key={groupName}
                          onClick={() => setActiveGroup(groupName)}
                          className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-xl hover:border-emerald-500 transition-all flex flex-col items-center text-center group"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <FolderOpen size={32} />
                          </div>
                          <h3 className="text-2xl font-bold font-arabic mb-2 dark:text-white">{groupName}</h3>
                          <span className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full text-sm font-bold">
                            {hadiths.length} أحاديث
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'favorites' && activeGroup && (
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => setActiveGroup(null)} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:text-emerald-600 print:hidden">
                    <ChevronRight size={24} />
                  </button>
                  <h2 className="text-2xl font-bold font-arabic text-slate-800 dark:text-white print:text-black print:text-3xl">مجموعة: {activeGroup}</h2>
                </div>
              )}

              {/* Browse Section (Grid of Books) */}
              {viewMode === 'browse' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-6 print:hidden">
                  {availableBooks.map((book, i) => (
                    <div 
                      key={i}
                      onClick={() => openBookForReading(book)}
                      className="bg-white dark:bg-slate-800/80 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 transition-all cursor-pointer hover:shadow-lg hover:border-emerald-500 group flex flex-col justify-between min-h-[160px]"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all shadow-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 group-hover:bg-emerald-700 group-hover:text-white">
                          <Bookmark size={24} />
                        </div>
                        <h3 className="text-lg font-bold font-arabic dark:text-white text-slate-800 leading-tight">{book}</h3>
                      </div>
                      <div className="mt-4 flex items-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                        <span className="font-arabic">اقرأ المكتبة</span>
                        <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reader Mode */}
              {viewMode === 'read' && bookContent.length > 0 && (
                <div className="animate-in fade-in zoom-in-95 duration-500 max-w-3xl mx-auto print:hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <button 
                      onClick={() => setViewMode('browse')} 
                      className="flex items-center gap-2 font-bold font-arabic px-4 py-2 rounded-xl transition-colors bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                      <ChevronRight size={18} />
                      العودة للمكتبة
                    </button>
                    <div className="text-center flex-grow px-2">
                      <h2 className="text-xl font-bold font-arabic text-emerald-800 dark:text-emerald-400 truncate">{readingBook}</h2>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowSaveModal(bookContent[readingIndex])} 
                        className={`px-3 py-2 rounded-xl font-bold border shadow-sm transition-colors ${
                          isHadithSaved(bookContent[readingIndex]) 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700' 
                            : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-emerald-600 border-slate-200 dark:border-slate-700'
                        }`}
                        title={isHadithSaved(bookContent[readingIndex]) ? "محفوظ مسبقاً - إضافته لمجموعة أخرى؟" : "حفظ للمجموعة"}
                      >
                        {isHadithSaved(bookContent[readingIndex]) ? <BookmarkCheck size={20} /> : <BookmarkPlus size={20} />}
                      </button>
                      <button 
                        onClick={() => window.print()} 
                        className="px-3 py-2 rounded-xl font-bold border bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-emerald-600 border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
                        title="طباعة الحديث"
                      >
                        <Printer size={20} />
                      </button>
                      <div className="px-4 py-2 rounded-xl font-bold font-mono text-sm border bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 shadow-sm text-center">
                        {readingIndex + 1} / {bookContent.length}
                      </div>
                    </div>
                  </div>

                  {/* Reader Paper/Card */}
                  <div className="bg-white dark:bg-slate-800/90 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[60vh] relative overflow-hidden">
                    <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar">
                      <div 
                        className="text-xl sm:text-2xl leading-[2] font-arabic text-justify text-slate-800 dark:text-slate-100"
                        dangerouslySetInnerHTML={{ __html: formatText(bookContent[readingIndex].Description, '') }}
                      />
                    </div>
                    <div className="p-5 sm:p-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <button 
                        onClick={() => setReadingIndex(prev => Math.min(bookContent.length - 1, prev + 1))}
                        disabled={readingIndex === bookContent.length - 1}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <ArrowLeft size={20} />
                        <span className="font-bold font-arabic hidden sm:inline text-base">التالي</span>
                      </button>
                      <div className="flex flex-col items-center">
                         <span className="font-bold text-slate-400 dark:text-slate-400 font-arabic text-base">
                           الحديث {readingIndex + 1}
                         </span>
                         <button 
                           onClick={() => copyToClipboard(bookContent[readingIndex], 'reader')}
                           className="mt-1 text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 text-xs font-bold flex items-center gap-1"
                         >
                           {copyFeedback === 'reader' ? <Check size={14} /> : <Copy size={14} />} 
                           {copyFeedback === 'reader' ? 'نسخ بنجاح' : 'نسخ'}
                         </button>
                      </div>
                      <button 
                        onClick={() => setReadingIndex(prev => Math.max(0, prev - 1))}
                        disabled={readingIndex === 0}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <span className="font-bold font-arabic hidden sm:inline text-base">السابق</span>
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results / Group Results Container */}
              {(viewMode === 'search' || (viewMode === 'favorites' && activeGroup)) && (
                <div className={layoutMode === 'list' ? 'flex flex-col gap-4 print:gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-8 print:block print:space-y-6'}>
                  {filteredResults.map((item, idx) => {
                    const isSelected = selectedItems.some(i => i.Description === item.Description);
                    const isSaved = isHadithSaved(item);
                    
                    return (
                      <div 
                        key={idx}
                        onPointerDown={(e) => handlePointerDown(e, item)}
                        onPointerUp={handlePointerUpOrMove}
                        onPointerMove={handlePointerUpOrMove}
                        onPointerLeave={handlePointerUpOrMove}
                        onClick={() => {
                          if (isSelectionMode) toggleSelection(item);
                          else setSelectedHadith(item);
                        }}
                        className={`group p-6 sm:p-8 rounded-[2rem] border-r-[8px] border-y border-l transition-all cursor-pointer hover:shadow-lg print:break-inside-avoid print:border print:border-gray-300 print:shadow-none print:translate-y-0 print:rounded-none ${layoutMode === 'list' ? 'flex flex-col md:flex-row md:items-start gap-4' : 'flex flex-col'} ${
                          isSelected 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-600 scale-[0.98]' 
                            : 'border-emerald-700 dark:border-emerald-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:-translate-y-1'
                        }`}
                      >
                        <div className={`flex justify-between items-center ${layoutMode === 'list' ? 'md:flex-col md:w-1/4 md:items-start md:border-l md:dark:border-slate-700 md:pl-4 mb-0' : 'mb-6'} print:mb-2`}>
                          <span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30 font-arabic print:bg-transparent print:border-none print:text-black print:p-0 print:text-sm">
                            {formatBookName(item.path || item.Path)}
                          </span>
                          
                          <div className={`flex items-center gap-2 print:hidden ${layoutMode === 'list' ? 'md:mt-4' : ''}`}>
                            {isSelectionMode ? (
                              <div className={`p-2 rounded-full border-2 ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 text-transparent'}`}>
                                <Check size={18} />
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowSaveModal(item); }}
                                  className={`p-2 rounded-full transition-colors ${
                                    isSaved 
                                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                                  }`}
                                  title={isSaved ? "محفوظ مسبقاً - إضافته لمجموعة أخرى؟" : "حفظ للمجموعة"}
                                >
                                  {isSaved ? <BookmarkCheck size={18} /> : <BookmarkPlus size={18} />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(item, idx); }}
                                  className="p-2 rounded-full transition-colors bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                                  title="نسخ سريع"
                                >
                                  {copyFeedback === idx ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                                <div className="p-2 rounded-full transition-colors bg-slate-100 dark:bg-slate-900 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                  <ChevronLeft size={18} />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div 
                          className={`text-lg sm:text-xl leading-[2] font-arabic text-slate-800 dark:text-slate-100 print:text-black print:text-xl print:leading-relaxed ${layoutMode === 'list' ? 'md:w-3/4 line-clamp-3 md:line-clamp-none' : 'line-clamp-4 flex-grow'}`}
                          dangerouslySetInnerHTML={{ __html: formatText(item.Description, searchTerm) }}
                        />
                      </div>
                    );
                  })}

                  {(viewMode === 'search' && (searchTerm.length >= 3 || selectedBooks.length > 0 || selectedStatuses.length > 0)) && filteredResults.length === 0 && (
                    <div className="col-span-full text-center py-24 text-slate-400 dark:text-slate-500 print:hidden">
                      <Search size={80} className="mx-auto mb-6 opacity-20" />
                      <p className="text-xl font-bold font-arabic">لا توجد نتائج تطابق بحثك</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Modal for Saving to Group */}
        {showSaveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:hidden">
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-arabic dark:text-white">حفظ الحديث</h3>
                <button onClick={() => setShowSaveModal(null)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
              </div>
              
              <div className="space-y-4 font-arabic">
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">إضافة لمجموعة جديدة:</label>
                  <div className="flex flex-col gap-3">
                    <input 
                      type="text" 
                      value={newGroupName} 
                      onChange={e => setNewGroupName(e.target.value)} 
                      placeholder="اسم المجموعة (مثال: أحاديث الصلاة)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 dark:text-white"
                    />
                    <button 
                      onClick={() => handleSaveToGroup(newGroupName)}
                      disabled={!newGroupName.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
                    >
                      حفظ المجموعة
                    </button>
                  </div>
                </div>

                {Object.keys(savedGroups).length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">أو اختر مجموعة سابقة:</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                      {Object.keys(savedGroups).map(group => (
                        <button 
                          key={group} 
                          onClick={() => handleSaveToGroup(group)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-emerald-500 dark:hover:border-emerald-500 dark:text-white transition-colors flex-grow text-center"
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal for Reading/Viewing Selected Hadith */}
        {selectedHadith && !isSelectionMode && (viewMode === 'search' || viewMode === 'favorites') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <button 
                  onClick={() => copyToClipboard(selectedHadith, 'modal')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-bold text-sm ${
                    copyFeedback === 'modal'
                    ? 'bg-emerald-700 text-white' 
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                  }`}
                >
                  {copyFeedback === 'modal' ? <Check size={18} /> : <Copy size={18} />}
                  <span className="font-arabic">{copyFeedback === 'modal' ? 'تم النسخ بنجاح' : 'نسخ النص'}</span>
                </button>
                <button 
                  onClick={() => setSelectedHadith(null)} 
                  className="p-2 rounded-full transition-all bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-grow">
                 <div className="mb-6 flex items-center gap-2 font-bold text-sm uppercase font-arabic text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/60 inline-flex px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700" dir="ltr">
                   <Bookmark size={16} /> 
                   <span>{formatBookName(selectedHadith.path || selectedHadith.Path)}</span>
                 </div>
                 <div 
                  className="text-xl sm:text-2xl leading-[2] font-arabic text-justify text-slate-900 dark:text-slate-100 selection:bg-emerald-200 dark:selection:bg-emerald-900"
                  dangerouslySetInnerHTML={{ __html: formatText(selectedHadith.Description, searchTerm) }}
                />
              </div>
              
              <div className="p-4 text-center border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                 <p className="text-xs text-slate-400 dark:text-slate-500 font-bold opacity-80 font-arabic">موسوعة الجنى الداني • الألباني</p>
              </div>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
          .font-arabic { font-family: 'Amiri', serif; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
          .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
          ::selection { background-color: rgba(16, 185, 129, 0.25); color: inherit; }
          .dark ::selection { background-color: rgba(16, 185, 129, 0.35); color: inherit; }
        `}} />
      </div>
    </div>
  );
}