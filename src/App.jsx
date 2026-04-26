import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Book, BookOpen, Copy, Check, Moon, Sun, ChevronRight, X, Filter, FolderOpen, Bookmark, ShieldCheck, ArrowRight, ArrowLeft, BookmarkPlus, BookmarkCheck, Printer, FolderHeart, CheckSquare, CheckCircle2, Menu, Library, Share2, ZoomIn, ZoomOut, Info, Mail, FileText, ShieldAlert, ListChecks, Trash2, Edit2 } from 'lucide-react';

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

const formatBookName = (path) => {
  if (!path) return 'عام';
  const parts = path.split('>');
  if (parts.length > 1) {
    return `${parts[0].trim()} - ${parts[parts.length - 1].trim()}`;
  }
  return parts[0].trim();
};

export default function App() {
  // --- States ---
  const [showSplash, setShowSplash] = useState(true);
  const [allData, setAllData] = useState([]);
  const [searchInput, setSearchInput] = useState(''); // Input value
  const [searchTerm, setSearchTerm] = useState('');   // Executed search
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedHadith, setSelectedHadith] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [fontSize, setFontSize] = useState(20); // Base font size for results
  
  // Navigation State
  const [selectedBooks, setSelectedBooks] = useState([]); 
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('search'); // 'search'|'browse'|'read'|'favorites'
  const [layoutMode, setLayoutMode] = useState('grid'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Legal Modals State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Reading Mode State
  const [readingBook, setReadingBook] = useState(null);
  const [bookContent, setBookContent] = useState([]);
  const [readingIndex, setReadingIndex] = useState(0);

  // --- Smart Scrolling State ---
  const scrollContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Favorites / LocalStorage State
  const [savedGroups, setSavedGroups] = useState(() => {
    const saved = localStorage.getItem('jana_groups');
    if (saved) {
      try { 
        return JSON.parse(saved); 
      } catch (e) {
        return {};
      }
    }
    return {};
  }); 
  const [showSaveModal, setShowSaveModal] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);

  // Group Management State
  const [groupAction, setGroupAction] = useState({ type: null, groupName: '' });
  const [editGroupName, setEditGroupName] = useState('');

  // Multi-Selection & Print State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [printItems, setPrintItems] = useState([]); 
  
  const fileInputRef = useRef(null);

  // --- Splash Screen Effect ---
  useEffect(() => {
    setTimeout(() => setShowSplash(false), 2500);
  }, []);

  // --- Smart Scroll Tracker ---
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // السماحية 5 بكسل لتجنب أخطاء التقريب في الشاشات المختلفة
      setIsAtBottom(Math.abs(scrollHeight - scrollTop - clientHeight) <= 5);
    }
  };

  // إعادة التمرير للأعلى عند تغيير الحديث أو حجم الخط، وإعادة فحص الموقع
  useEffect(() => {
    if (viewMode === 'read' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      // مهلة بسيطة لضمان رسم النص الجديد قبل حساب الأبعاد
      setTimeout(checkScrollPosition, 50);
    }
  }, [readingIndex, viewMode, fontSize, bookContent]);

  const handleSmartNext = () => {
    if (!scrollContainerRef.current) return;

    if (isAtBottom) {
      // إذا وصلنا للأسفل، انتقل للحديث التالي
      if (readingIndex < bookContent.length - 1) {
        setReadingIndex(p => p + 1);
      }
    } else {
      // إذا لم نصل للأسفل، قم بتمرير النص لأسفل بمقدار 85% من الشاشة (للحفاظ على السياق)
      scrollContainerRef.current.scrollBy({
        top: scrollContainerRef.current.clientHeight * 0.85,
        behavior: 'smooth'
      });
    }
  };

  // --- Handle Screen Resize ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Save to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('jana_groups', JSON.stringify(savedGroups));
  }, [savedGroups]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isHadithSaved = (hadith) => {
    if (!hadith) return false;
    return Object.values(savedGroups).some(group => 
      group.some(h => h.Description === hadith.Description)
    );
  };

  const processRawData = (text) => JSON.parse(text.trim().replace(/^\uFEFF/, ''));

  useEffect(() => {
    const autoLoad = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${window.location.origin}/data/TblDetailPath.txt`);
        if (response.ok) {
          setAllData(processRawData(await response.text()));
        } else setError("fallback");
      } catch (err) { setError("fallback"); } 
      finally { setIsLoading(false); }
    };
    autoLoad();
  }, []);

  const handleManualUpload = async (e) => {
    const files = Array.from(e.target.files);
    const indexFile = files.find(f => f.name.includes('TblDetailPath.txt'));
    if (!indexFile) return alert("الرجاء اختيار مجلد data");
    setIsLoading(true);
    try {
      setAllData(processRawData(await indexFile.text()));
      setError(null);
    } catch (err) { alert("حدث خطأ."); } 
    finally { setIsLoading(false); }
  };

  const formatText = (text, highlight) => {
    if (!text) return "";
    let formatted = text.replace(/<br\s*\/?>/gi, "\n");
    STATUS_COLORS.success.forEach(status => {
      formatted = formatted.replace(new RegExp(`\\( ${status} \\)`, 'g'), `<span class="text-emerald-600 dark:text-emerald-400 font-bold">( ${status} )</span>`);
    });
    STATUS_COLORS.danger.forEach(status => {
      formatted = formatted.replace(new RegExp(`\\( ${status} \\)`, 'g'), `<span class="text-rose-600 dark:text-rose-400 font-bold">( ${status} )</span>`);
    });
    if (highlight && highlight.length > 2) {
      const searchRegex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      formatted = formatted.replace(searchRegex, `<mark class="bg-amber-200 dark:bg-emerald-900/80 text-amber-900 dark:text-emerald-100 rounded px-1">$1</mark>`);
    }
    return formatted;
  };

  const availableBooks = useMemo(() => {
    const books = new Set();
    allData.forEach(item => { if (item.path || item.Path) books.add((item.path || item.Path).split('>')[0].trim()); });
    return Array.from(books).sort();
  }, [allData]);

  const executeSearch = () => {
    setSearchTerm(searchInput);
    setShowFilters(false);
  };

  const sourceData = viewMode === 'favorites' && activeGroup ? savedGroups[activeGroup] : allData;
  
  const filteredResults = useMemo(() => {
    if (viewMode === 'search' && searchTerm.length < 3 && selectedBooks.length === 0 && selectedStatuses.length === 0) return [];
    const q = normalizeArabic(searchTerm);
    return sourceData.filter(item => {
      const itemDesc = item.Description || '';
      const matchesBook = selectedBooks.length === 0 || selectedBooks.some(b => (item.path || item.Path || '').startsWith(b));
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.some(s => itemDesc.includes(`( ${s} )`));
      const matchesSearch = q === "" || normalizeArabic(itemDesc).includes(q);
      return matchesBook && matchesStatus && matchesSearch;
    }).slice(0, 70); 
  }, [searchTerm, sourceData, selectedBooks, selectedStatuses, viewMode]);

  // --- Copy, Share & Print Logic ---
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

  const getCleanText = (item) => {
    let cleanText = item.Description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim(); 
    const bookPath = formatBookName(item.path || item.Path);
    return `${cleanText}\n\n[ الكتاب: ${bookPath} ]\nالمصدر: الجنى الداني من دوحة الألباني`;
  };

  const handleShare = async (item) => {
    const textToShare = getCleanText(item);
    if (navigator.share) {
      try { await navigator.share({ title: 'حديث من الجنى الداني', text: textToShare }); } 
      catch (e) { console.log('Share canceled'); }
    } else {
      copyToClipboardRaw(textToShare, 'share');
    }
  };

  const handlePrintSpecific = (itemsToPrint) => {
    setPrintItems(itemsToPrint);
    setTimeout(() => {
      window.print();
      setPrintItems([]);
    }, 500); 
  };

  // --- Group Save Logic ---
  const handleSaveToGroup = (groupName) => {
    if (!groupName) return;
    const currentGroup = savedGroups[groupName] || [];
    if (currentGroup.some(h => h.Description === showSaveModal.Description)) {
      showToast('الحديث موجود بالفعل في هذه المجموعة!');
      setShowSaveModal(null);
      return;
    }
    setSavedGroups(prev => ({ ...prev, [groupName]: [...currentGroup, showSaveModal] }));
    setShowSaveModal(null);
    setNewGroupName('');
    showToast('تم الحفظ للمجموعة بنجاح');
  };

  const confirmDuplicateGroup = () => {
    let newName = `${groupAction.groupName} (نسخة)`;
    let counter = 1;
    while (savedGroups[newName]) {
       newName = `${groupAction.groupName} (نسخة ${counter})`;
       counter++;
    }
    setSavedGroups(prev => ({ ...prev, [newName]: prev[groupAction.groupName] }));
    setGroupAction({type: null, groupName: ''});
    showToast('تم تكرار المجموعة بنجاح');
  };

  const handleRenameGroup = () => {
     const trimmed = editGroupName.trim();
     if (!trimmed || trimmed === groupAction.groupName) {
        setGroupAction({type: null, groupName: ''});
        return;
     }
     if (savedGroups[trimmed]) {
        showToast('هذا الاسم موجود مسبقاً!');
        return;
     }
     const newGroups = { ...savedGroups };
     newGroups[trimmed] = newGroups[groupAction.groupName];
     delete newGroups[groupAction.groupName];
     
     setSavedGroups(newGroups);
     if (activeGroup === groupAction.groupName) {
         setActiveGroup(trimmed);
     }
     
     setGroupAction({type: null, groupName: ''});
     showToast('تم تغيير الاسم بنجاح');
  };

  const handleDeleteGroup = () => {
     const newGroups = { ...savedGroups };
     delete newGroups[groupAction.groupName];
     setSavedGroups(newGroups);
     
     if (activeGroup === groupAction.groupName) {
         setActiveGroup(null);
     }
     
     setGroupAction({type: null, groupName: ''});
     showToast('تم حذف المجموعة');
  };

  // --- Multi-Select Handlers ---
  const toggleSelection = (item) => {
    setSelectedItems(prev => prev.some(i => i.Description === item.Description)
      ? prev.filter(i => i.Description !== item.Description)
      : [...prev, item]
    );
  };

  const copySelectedItems = () => {
    if (selectedItems.length === 0) return;
    const combinedText = selectedItems.map(item => {
      let cleanText = item.Description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
      return `${cleanText}\n[ الكتاب: ${formatBookName(item.path || item.Path)} ]`;
    }).join('\n\n-------------------------\n\n');
    copyToClipboardRaw(`${combinedText}\n\nالمصدر: الجنى الداني من دوحة الألباني`, 'multi');
    setIsSelectionMode(false);
    setSelectedItems([]);
  };

  const navigateTo = (view) => {
    setViewMode(view);
    setSearchInput('');
    setSearchTerm('');
    if (view === 'favorites') setActiveGroup(null);
  };

  // --- UI Renders ---
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-emerald-800 flex flex-col items-center justify-center text-white transition-opacity duration-1000" style={{ zIndex: 9999 }}>
        <div className="bg-white/10 p-8 rounded-[2rem] shadow-2xl backdrop-blur-md border border-emerald-500/30 mb-8 animate-bounce">
          <BookOpen size={90} strokeWidth={1.5} className="text-emerald-300 drop-shadow-lg" />
        </div>
        {/* Reverted Logo Color to White */}
        <h1 className="text-5xl font-bold font-arabic tracking-wide gold-text-shadow mb-4 text-white">الجنى الداني</h1>
        <p className="text-2xl text-emerald-200 font-arabic gold-text-shadow">من دوحة الألباني</p>
        
        <div className="absolute bottom-16 flex gap-2">
          <div className="w-3 h-3 bg-emerald-300 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-emerald-300 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-emerald-300 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`h-screen overflow-hidden flex flex-col items-center justify-center transition-colors ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-emerald-900'}`} dir="rtl">
        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-8 rounded-[2rem] shadow-xl border border-emerald-200 dark:border-emerald-800/50 mb-8 animate-bounce">
           <BookOpen size={70} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-2xl font-bold font-arabic tracking-wide mb-6">جاري فتح المكتبة...</p>
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      
      {/* MAIN SCROLLABLE CONTAINER */}
      <div className={`h-screen overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 ${printItems.length > 0 ? 'print:hidden' : ''}`} dir="rtl">
        
        {/* Multi-Selection Bottom Bar */}
        {isSelectionMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-emerald-800 text-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-full" style={{ zIndex: 40 }}>
            <div className="flex items-center gap-3 font-bold font-arabic">
              <CheckSquare size={24} className="text-emerald-300" />
              تم تحديد ({selectedItems.length}) أحاديث
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => { setIsSelectionMode(false); setSelectedItems([]); }} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition-all text-sm">إلغاء</button>
              <button onClick={() => handlePrintSpecific(selectedItems)} disabled={selectedItems.length === 0} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold transition-all text-sm flex items-center justify-center gap-2"><Printer size={16} /> طباعة</button>
              <button onClick={copySelectedItems} disabled={selectedItems.length === 0} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold transition-all text-sm flex items-center justify-center gap-2"><Copy size={16} /> نسخ</button>
            </div>
          </div>
        )}

        {/* --- Main Header Navigation --- */}
        <nav className={`sticky top-0 border-b backdrop-blur-xl bg-emerald-800 dark:bg-slate-900 border-emerald-900 dark:border-slate-800 shadow-lg text-white transition-all ${isSelectionMode ? 'opacity-50 pointer-events-none' : ''}`} style={{ zIndex: 30 }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            {/* Logo Area */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { navigateTo('search'); setIsMobileMenuOpen(false); }}>
              <div className="bg-white/20 p-2 rounded-xl shadow-inner border border-white/10 gold-edge">
                <Library size={28} className="text-white" />
              </div>
              <div>
                {/* Reverted Logo Color to White */}
                <h1 className="text-2xl sm:text-3xl font-bold font-arabic leading-none tracking-tight gold-text-shadow text-white">الجنى الداني</h1>
                <p className="text-sm font-bold uppercase mt-1.5 text-emerald-100 gold-text-shadow font-arabic">من دوحة الألباني</p>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => navigateTo('favorites')} className={`p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${viewMode === 'favorites' ? 'bg-emerald-900 dark:bg-slate-800 text-white' : 'hover:bg-white/10 text-emerald-100'}`}><FolderHeart size={20} /> <span className="font-arabic">مجموعاتي</span></button>
              <button onClick={() => navigateTo('browse')} className={`p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${viewMode === 'browse' ? 'bg-emerald-900 dark:bg-slate-800 text-white' : 'hover:bg-white/10 text-emerald-100'}`}><Library size={20} /> <span className="font-arabic">المكتبة</span></button>
              <button onClick={() => setShowAboutModal(true)} className="p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 hover:bg-white/10 text-emerald-100"><Info size={20} /> <span className="font-arabic">عن التطبيق</span></button>
              <div className="w-px h-6 bg-white/20 mx-2"></div>
              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                <button onClick={() => setFontSize(prev => Math.min(prev + 2, 40))} className="p-1.5 hover:bg-white/20 rounded-lg text-emerald-100" title="تكبير الخط"><ZoomIn size={18}/></button>
                <button onClick={() => setFontSize(prev => Math.max(prev - 2, 14))} className="p-1.5 hover:bg-white/20 rounded-lg text-emerald-100" title="تصغير الخط"><ZoomOut size={18}/></button>
              </div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-emerald-100 hover:text-white ml-2">
                {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <Menu size={26} />
              </button>
            </div>
          </div>
        </nav>

        <main className={`relative max-w-6xl mx-auto px-4 sm:px-6 py-8`} style={{ zIndex: 10 }}>
          {error === "fallback" || allData.length === 0 ? (
            <div className="max-w-lg mx-auto text-center bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><FolderOpen size={40} className="text-emerald-600" /></div>
              <h2 className="text-2xl font-bold mb-4 font-arabic">المكتبة غير متصلة</h2>
              <input type="file" ref={fileInputRef} multiple webkitdirectory="true" onChange={handleManualUpload} className="hidden" />
              <button onClick={() => fileInputRef.current.click()} className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg font-arabic hover:bg-emerald-600 transition-colors">استيراد البيانات الآن</button>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* --- Toolbar / Search Box --- */}
              {(viewMode === 'search' || (viewMode === 'favorites' && activeGroup)) && (
                <div className="p-4 sm:p-6 rounded-[2rem] shadow-sm border bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 transition-all">
                  
                  <div className="flex flex-col md:flex-row gap-4 items-stretch">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="اكتب كلمة، راوي، للبحث..."
                        className="w-full pr-5 pl-20 py-4 rounded-[1.5rem] border-2 outline-none transition-all font-arabic bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:border-emerald-500 text-slate-900 dark:text-white"
                        style={{ fontSize: '18px' }}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') executeSearch(); }}
                      />
                      {searchInput && (
                        <button onClick={() => {setSearchInput(''); setSearchTerm('');}} className="absolute left-16 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-rose-500">
                          <X size={18} />
                        </button>
                      )}
                      <button onClick={executeSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-emerald-100 dark:bg-emerald-200 text-slate-900 hover:bg-emerald-200 dark:hover:bg-emerald-300 rounded-xl transition-colors shadow-sm">
                         <Search size={22} strokeWidth={2.5} />
                      </button>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 shrink-0">
                      {filteredResults.length > 0 && (
                        <button 
                           onClick={() => setIsSelectionMode(!isSelectionMode)} 
                           className={`p-4 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-2 font-bold font-arabic ${isSelectionMode ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
                           title="تحديد متعدد"
                        >
                           <ListChecks size={20} /> <span className="hidden sm:inline">تحديد</span>
                        </button>
                      )}

                      {viewMode === 'favorites' && activeGroup && (
                        <button onClick={() => handlePrintSpecific(filteredResults)} className="px-4 py-4 rounded-[1.5rem] border-2 border-emerald-600 bg-emerald-50 text-emerald-700 transition-all flex items-center justify-center gap-2 font-bold hover:bg-emerald-600 hover:text-white">
                          <Printer size={20} />
                        </button>
                      )}

                      <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-5 py-4 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-2 font-bold ${selectedBooks.length > 0 || selectedStatuses.length > 0 || showFilters ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
                      >
                        <Filter size={20} />
                        <span className="font-arabic hidden sm:inline">تصفية</span>
                      </button>
                    </div>
                  </div>

                  {/* Filters Menu */}
                  {showFilters && (
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-in fade-in space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 font-arabic border-b border-slate-100 dark:border-slate-700 pb-2">
                          <ShieldCheck size={18} className="text-emerald-500" /> تصفية بدرجة الحديث:
                        </h3>
                        <div className="space-y-4">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                            <p className="text-xs font-bold text-emerald-700 mb-3 font-arabic">مقبول:</p>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_COLORS.success.map(s => (
                                <button key={s} onClick={() => toggleStatus(s)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${selectedStatuses.includes(s) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-slate-800 border-emerald-200 text-slate-700 dark:text-slate-300'}`}>{s}</button>
                              ))}
                            </div>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
                            <p className="text-xs font-bold text-rose-700 mb-3 font-arabic">مردود:</p>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_COLORS.danger.map(s => (
                                <button key={s} onClick={() => toggleStatus(s)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${selectedStatuses.includes(s) ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white dark:bg-slate-800 border-rose-200 text-slate-700 dark:text-slate-300'}`}>{s}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 mb-3 border-b pb-2 font-arabic"><Book size={18} className="inline text-emerald-600 mr-2" /> تحديد المصادر:</h3>
                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                          <button onClick={() => setSelectedBooks([])} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${selectedBooks.length === 0 ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'}`}>الكل</button>
                          {availableBooks.map(b => (
                            <button key={b} onClick={() => toggleBook(b)} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${selectedBooks.includes(b) ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'}`}>{b}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- Favorites Landing View --- */}
              {viewMode === 'favorites' && !activeGroup && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-8">
                     <FolderHeart size={32} className="text-emerald-600" />
                     <h2 className="text-3xl font-bold font-arabic">مجموعاتي المحفوظة</h2>
                  </div>
                  {Object.keys(savedGroups).length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                       <BookmarkPlus size={64} className="mx-auto text-slate-300 mb-4" />
                       <p className="text-xl font-bold text-slate-500 font-arabic">لم تقم بإنشاء أي مجموعات بعد.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(savedGroups).map(([groupName, hadiths]) => (
                        <div key={groupName} className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-emerald-500 transition-all flex flex-col text-center overflow-hidden">
                          <div className="p-8 cursor-pointer flex-grow flex flex-col items-center group" onClick={() => setActiveGroup(groupName)}>
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><FolderOpen size={32} /></div>
                            <h3 className="text-2xl font-bold font-arabic mb-2 dark:text-white">{groupName}</h3>
                            <span className="bg-slate-100 dark:bg-slate-900 text-slate-500 px-3 py-1 rounded-full text-sm font-bold">{hadiths.length} أحاديث</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 p-3 flex justify-center gap-6">
                             <button onClick={(e) => { e.stopPropagation(); setEditGroupName(groupName); setGroupAction({type: 'rename', groupName}); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="تعديل الاسم"><Edit2 size={18}/></button>
                             <button onClick={(e) => { e.stopPropagation(); setGroupAction({type: 'duplicate', groupName}); }} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="تكرار المجموعة"><Copy size={18}/></button>
                             <button onClick={(e) => { e.stopPropagation(); setGroupAction({type: 'delete', groupName}); }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="حذف المجموعة"><Trash2 size={18}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Header for Active Group with Edit/Delete Controls */}
              {viewMode === 'favorites' && activeGroup && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setActiveGroup(null)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-600 transition-colors"><ChevronRight size={24} /></button>
                    <h2 className="text-2xl sm:text-3xl font-bold font-arabic flex items-center gap-3">
                       <FolderOpen className="text-emerald-500 hidden sm:block" size={28} />
                       <span className="text-emerald-700 dark:text-emerald-400">{activeGroup}</span>
                    </h2>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                     <button onClick={() => { setEditGroupName(activeGroup); setGroupAction({type: 'rename', groupName: activeGroup}); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/50 dark:hover:text-blue-400 transition-colors">
                        <Edit2 size={18}/>
                        <span className="font-bold text-sm font-arabic">تعديل الاسم</span>
                     </button>
                     <button onClick={() => setGroupAction({type: 'delete', groupName: activeGroup})} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/50 dark:hover:text-rose-400 transition-colors">
                        <Trash2 size={18}/>
                        <span className="font-bold text-sm font-arabic">حذف</span>
                     </button>
                  </div>
                </div>
              )}

              {/* --- Library Browse View --- */}
              {viewMode === 'browse' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in">
                  {availableBooks.map((book, i) => (
                    <div key={i} onClick={() => {
                        const h = allData.filter(item => (item.path||item.Path||'').startsWith(book));
                        setBookContent(h); setReadingBook(book); setReadingIndex(0); setViewMode('read');
                      }} 
                      className="bg-white dark:bg-slate-800/80 p-6 rounded-[2rem] border cursor-pointer hover:shadow-lg hover:border-emerald-500 group flex flex-col justify-between min-h-[160px]"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white"><Library size={24} /></div>
                        <h3 className="text-lg font-bold font-arabic leading-tight">{book}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- Reading View --- */}
              {viewMode === 'read' && bookContent.length > 0 && (
                <div className="animate-in fade-in zoom-in-95 duration-500 max-w-3xl mx-auto">
                  <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4 items-center">
                    <button onClick={() => setViewMode('browse')} className="flex items-center gap-2 font-bold font-arabic px-4 py-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ChevronRight size={18} /> العودة</button>
                    <h2 className="text-2xl font-black font-arabic text-emerald-800 dark:text-emerald-300 dark:[text-shadow:0_0_6px_rgba(255,215,0,0.7)] text-center truncate flex-1 px-2">{readingBook}</h2>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => setShowSaveModal(bookContent[readingIndex])} className="px-3 py-2 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 hover:text-emerald-600 transition-colors" title="حفظ">
                        {isHadithSaved(bookContent[readingIndex]) ? <BookmarkCheck size={20} className="text-emerald-500"/> : <BookmarkPlus size={20} />}
                      </button>
                      <button onClick={() => copyToClipboardRaw(getCleanText(bookContent[readingIndex]), 'reader')} className="px-3 py-2 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 hover:text-emerald-600 transition-colors" title="نسخ">
                        {copyFeedback === 'reader' ? <Check size={20} className="text-emerald-500"/> : <Copy size={20} />}
                      </button>
                      <button onClick={() => handlePrintSpecific([bookContent[readingIndex]])} className="px-3 py-2 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 hover:text-emerald-600 transition-colors" title="طباعة">
                        <Printer size={20} />
                      </button>
                      <div className="px-4 py-2 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm shadow-sm">
                        {readingIndex + 1} / {bookContent.length}
                      </div>
                    </div>
                  </div>
                  
                  {/* Fixed Height Container with Inner Scroll. Inline style ensures zero jumping */}
                  <div className="bg-white dark:bg-slate-800/90 rounded-[2rem] shadow-lg border dark:border-slate-700 flex flex-col w-full overflow-hidden" style={{ height: '65vh', minHeight: '400px', maxHeight: '800px' }}>
                    <div 
                      ref={scrollContainerRef}
                      onScroll={checkScrollPosition}
                      className="p-6 sm:p-10 overflow-y-auto flex-grow custom-scrollbar"
                    >
                      <div style={{ fontSize: `${fontSize}px` }} className="leading-loose font-arabic text-justify" dangerouslySetInnerHTML={{ __html: formatText(bookContent[readingIndex].Description, '') }} />
                    </div>
                    
                    {/* Fixed Bottom Bar */}
                    <div className="p-5 flex items-center justify-between border-t bg-slate-50 dark:bg-slate-900/50 shrink-0 rounded-b-[2rem]">
                      <button 
                         onClick={handleSmartNext} 
                         disabled={isAtBottom && readingIndex === bookContent.length - 1} 
                         className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                      >
                         <ArrowRight size={20} /> التالي
                      </button>
                      <button 
                         onClick={() => setReadingIndex(p => Math.max(0, p - 1))} 
                         disabled={readingIndex === 0} 
                         className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                      >
                         السابق <ArrowLeft size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- Results Grid/List --- */}
              {(viewMode === 'search' || (viewMode === 'favorites' && activeGroup)) && (
                <div className={layoutMode === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-8'}>
                  {filteredResults.map((item, idx) => {
                    const isSelected = selectedItems.some(i => i.Description === item.Description);
                    const isSaved = isHadithSaved(item);
                    return (
                      <div key={idx} onClick={() => isSelectionMode ? toggleSelection(item) : setSelectedHadith(item)}
                        className={`group p-6 sm:p-8 rounded-[2rem] border-r-[8px] border-y border-l transition-all cursor-pointer hover:shadow-lg ${layoutMode === 'list' ? 'flex flex-col md:flex-row md:items-start gap-4' : 'flex flex-col'} ${
                          isSelected ? 'bg-amber-50 border-amber-500 scale-[0.98]' : 'border-emerald-700 bg-white dark:bg-slate-800 hover:-translate-y-1'
                        }`}
                      >
                        <div className={`flex justify-between items-center ${layoutMode === 'list' ? 'md:flex-col md:w-1/4 md:items-start md:border-l mb-0' : 'mb-6'}`}>
                          <span className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 font-arabic">{formatBookName(item.path || item.Path)}</span>
                          <div className={`flex items-center gap-2 ${layoutMode === 'list' ? 'md:mt-4' : ''}`}>
                            {isSelectionMode ? (
                              <div className={`p-2 rounded-full border-2 ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 text-transparent'}`}><Check size={18} /></div>
                            ) : (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); setShowSaveModal(item); }} className={`p-2 rounded-full transition-colors ${isSaved ? 'text-emerald-600' : 'bg-slate-100 text-slate-400 hover:text-emerald-600'}`}><BookmarkPlus size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); copyToClipboardRaw(getCleanText(item), idx); }} className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-emerald-600">{copyFeedback === idx ? <Check size={18} /> : <Copy size={18} />}</button>
                              </>
                            )}
                          </div>
                        </div>
                        <div 
                          style={{ fontSize: `${fontSize}px` }}
                          className={`leading-loose font-arabic text-slate-800 dark:text-slate-100 ${layoutMode === 'list' ? 'md:w-3/4 line-clamp-3' : 'line-clamp-4 flex-grow'}`}
                          dangerouslySetInnerHTML={{ __html: formatText(item.Description, searchTerm) }}
                        />
                      </div>
                    );
                  })}
                  {(viewMode === 'search' && searchTerm && filteredResults.length === 0) && (
                    <div className="col-span-full text-center py-24 text-slate-400 font-arabic"><Search size={80} className="mx-auto mb-6 opacity-20" /><p className="text-xl font-bold">لا توجد نتائج تطابق بحثك</p></div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* --- ALL OVERLAYS AND MODALS (Hidden during print to prevent black backgrounds) --- */}
      {/* ========================================================================= */}
      <div className={printItems.length > 0 ? 'print:hidden' : ''}>
        
        {/* --- Elegant Side Drawer (Sidebar) for Mobile Menu --- */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 md:hidden" style={{ zIndex: 100 }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="absolute top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-emerald-900 dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-emerald-800 dark:border-slate-800" dir="rtl">
              <div className="p-6 flex items-center justify-between border-b border-white/10">
                <span className="text-white font-bold font-arabic text-xl gold-text-shadow">القائمة الرئيسية</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-grow">
                 <button onClick={() => { navigateTo('search'); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors"><Search size={24} className="text-emerald-300" /> البحث الرئيسي</button>
                 <button onClick={() => { navigateTo('browse'); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors"><Library size={24} className="text-emerald-300" /> تصفح المكتبة</button>
                 <button onClick={() => { navigateTo('favorites'); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors"><FolderHeart size={24} className="text-emerald-300" /> مجموعاتي المحفوظة</button>
                 <button onClick={() => { setShowAboutModal(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors"><Info size={24} className="text-emerald-300" /> عن التطبيق والشروط</button>
                 <div className="w-full h-px bg-white/10 my-2"></div>
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl text-white">
                   <span className="font-arabic font-bold text-lg">حجم الخط:</span>
                   <div className="flex gap-2">
                      <button onClick={() => setFontSize(prev => Math.min(prev + 2, 40))} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><ZoomIn size={24}/></button>
                      <button onClick={() => setFontSize(prev => Math.max(prev - 2, 14))} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><ZoomOut size={24}/></button>
                   </div>
                 </div>
                 <button onClick={() => { setIsDarkMode(!isDarkMode); setIsMobileMenuOpen(false); }} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors">
                   <span>الوضع المظلم</span>
                   {isDarkMode ? <Sun size={24} className="text-amber-400" /> : <Moon size={24} />}
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Save Group Modal --- */}
        {showSaveModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowSaveModal(null)}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-emerald-100 dark:border-slate-700 font-arabic animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">حفظ الحديث</h3><button onClick={() => setShowSaveModal(null)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button></div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">إضافة لمجموعة جديدة:</label>
                  <div className="flex flex-col gap-3">
                    <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="اسم المجموعة..." className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                    <button onClick={() => handleSaveToGroup(newGroupName)} disabled={!newGroupName.trim()} className="w-full bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold disabled:opacity-50">حفظ المجموعة</button>
                  </div>
                </div>
                {Object.keys(savedGroups).length > 0 && (
                  <div className="pt-4 border-t dark:border-slate-700">
                    <label className="block text-sm font-bold mb-3">أو اختر مجموعة سابقة:</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                      {Object.keys(savedGroups).map(group => (
                        <button key={group} onClick={() => handleSaveToGroup(group)} className="bg-slate-100 dark:bg-slate-700 border border-transparent dark:border-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-emerald-500 flex-grow text-center transition-colors">{group}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- Selected Hadith Modal --- */}
        {selectedHadith && !isSelectionMode && (viewMode === 'search' || viewMode === 'favorites') && (
          <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 200 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedHadith(null)}></div>
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col bg-white dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 animate-in zoom-in-95">
              <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-900/50">
                <div className="flex flex-wrap gap-2">
                   <button onClick={() => setShowSaveModal(selectedHadith)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border dark:border-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                     {isHadithSaved(selectedHadith) ? (
                       <><BookmarkCheck size={18} className="text-emerald-600"/> <span className="font-arabic hidden sm:inline text-slate-700 dark:text-slate-300">محفوظ</span></>
                     ) : (
                       <><BookmarkPlus size={18} className="text-emerald-700"/> <span className="font-arabic hidden sm:inline text-slate-700 dark:text-slate-300">حفظ</span></>
                     )}
                   </button>
                   <button onClick={() => copyToClipboardRaw(getCleanText(selectedHadith), 'modal')} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border dark:border-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                     {copyFeedback === 'modal' ? <Check size={18} className="text-emerald-600"/> : <Copy size={18} className="text-emerald-700"/>} <span className="font-arabic hidden sm:inline text-slate-700 dark:text-slate-300">نسخ</span>
                   </button>
                   <button onClick={() => handleShare(selectedHadith)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border dark:border-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                     <Share2 size={18} className="text-blue-600"/> <span className="font-arabic hidden sm:inline text-slate-700 dark:text-slate-300">مشاركة</span>
                   </button>
                   <button onClick={() => handlePrintSpecific([selectedHadith])} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border dark:border-slate-600 shadow-sm hover:bg-slate-50 transition-colors text-slate-700 dark:text-slate-300">
                     <Printer size={18} />
                   </button>
                </div>
                <button onClick={() => setSelectedHadith(null)} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:text-rose-500 flex-shrink-0 ml-2 transition-colors"><X size={24} /></button>
              </div>
              <div className="p-6 sm:p-10 overflow-y-auto flex-grow custom-scrollbar">
                 <div className="mb-6 inline-flex items-center gap-2 font-bold text-sm font-arabic text-emerald-800 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 px-3 py-1.5 rounded-lg border dark:border-emerald-800">
                   <Bookmark size={16} /> <span>{formatBookName(selectedHadith.path || selectedHadith.Path)}</span>
                 </div>
                 <div style={{ fontSize: `${fontSize + 4}px` }} className="leading-loose font-arabic text-justify selection:bg-emerald-200" dangerouslySetInnerHTML={{ __html: formatText(selectedHadith.Description, searchTerm) }} />
              </div>
            </div>
          </div>
        )}

        {/* --- About Modal --- */}
        {showAboutModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 font-arabic" style={{ zIndex: 200 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowAboutModal(false)}></div>
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-2xl border border-emerald-100 dark:border-slate-700 text-center animate-in zoom-in-95">
              <Library size={60} className="mx-auto text-emerald-600 mb-4 gold-edge" />
              <h2 className="text-2xl font-bold mb-2">الجنى الداني من دوحة الألباني</h2>
              <p className="text-slate-500 mb-6 text-sm font-mono">الإصدار 2026.1</p>
              
              <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-8 bg-emerald-50 dark:bg-slate-900 p-5 rounded-xl border border-emerald-100 dark:border-slate-700 space-y-4 text-justify">
                <p>
                  هذا التطبيق صدقة جارية، ونسأل الله أن يتقبل هذا العمل خالصاً لوجهه الكريم. تم تطويره كجهد مستمر لتسهيل الوصول والبحث في تراث الشيخ المحدث محمد ناصر الدين الألباني رحمه الله تعالى. نسألكم الدعاء بظهر الغيب.
                  <br/>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-2 block">قام بتطويره: المهندس معاذ مأمون حموش</span>
                </p>
                <hr className="border-emerald-200 dark:border-slate-700" />
                <p dir="ltr" className="font-sans text-left">
                  This application is an ongoing charity (Sadaqah Jariyah), and we ask Allah to accept this work entirely for His Honorable sake. It was developed as a continuous effort to facilitate access to and search within the legacy of the Muhaddith, Sheikh Muhammad Nasir al-Din al-Albani, may Allah have mercy on him. We ask you to keep us in your prayers.
                  <br/>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-2 block">Developed by: Eng. Moaz Mamoun Hammosh</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={() => setShowPrivacyModal(true)} className="p-4 border dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors">
                  <ShieldAlert size={24} className="text-blue-500" /> سياسة الخصوصية
                </button>
                <button onClick={() => setShowTermsModal(true)} className="p-4 border dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors">
                  <FileText size={24} className="text-amber-500" /> الشروط والأحكام
                </button>
                <a href="mailto:Mhammosh@outlook.com" className="col-span-2 p-4 border dark:border-slate-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700 flex flex-col items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm transition-colors">
                  <Mail size={24} /> تبليغ عن مشكلة (إيميل)
                </a>
              </div>

              <button onClick={() => setShowAboutModal(false)} className="w-full py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إغلاق</button>
            </div>
          </div>
        )}

        {/* --- Privacy Policy Modal --- */}
        {showPrivacyModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 font-arabic" style={{ zIndex: 250 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowPrivacyModal(false)}></div>
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-2xl border border-emerald-100 dark:border-slate-700 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><ShieldAlert size={28} className="text-blue-500" /> سياسة الخصوصية</h2>
                 <button onClick={() => setShowPrivacyModal(false)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
              </div>
              <div className="text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed text-justify mb-8 text-sm">
                <p>نحن نحترم خصوصيتك لأبعد الحدود. تم تصميم هذا التطبيق ليعمل محلياً بالكامل على متصفحك أو جهازك (Offline).</p>
                <ul className="list-disc list-inside space-y-2 pr-4">
                   <li>لا يتم جمع أو تخزين أو إرسال أي بيانات شخصية إلى أي خوادم خارجية.</li>
                   <li>تُحفظ جميع "المجموعات" والبيانات المحفوظة في ذاكرة التخزين المؤقتة للمتصفح (LocalStorage) الخاص بك فقط.</li>
                   <li>لا يتم تتبع عمليات البحث الخاصة بك أو مشاركتها مع أي جهة كانت.</li>
                </ul>
              </div>
              <button onClick={() => setShowPrivacyModal(false)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors">موافق</button>
            </div>
          </div>
        )}

        {/* --- Terms & Conditions Modal --- */}
        {showTermsModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 font-arabic" style={{ zIndex: 250 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}></div>
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-2xl border border-emerald-100 dark:border-slate-700 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><FileText size={28} className="text-amber-500" /> الشروط والأحكام</h2>
                 <button onClick={() => setShowTermsModal(false)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
              </div>
              <div className="text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed text-justify mb-8 text-sm">
                <p>باستخدامك لتطبيق "الجنى الداني"، فإنك توافق على الشروط التالية:</p>
                <ul className="list-disc list-inside space-y-2 pr-4">
                   <li>هذا التطبيق هو وقف خيري مجاني بالكامل، يُسمح باستخدامه للبحث العلمي والشخصي.</li>
                   <li>نحن نسعى جاهدين لضمان دقة البيانات بناءً على تراث الشيخ الألباني رحمه الله، ولكن التطبيق يُقدم "كما هو" لتسهيل البحث. وننصح بالرجوع للمصادر الأصلية للتوثيق الأكاديمي الدقيق.</li>
                   <li>يُرجى تحري الدقة والموثوقية عند نسخ أو مشاركة الأحاديث ونسبتها إلى مصادرها الصحيحة المذكورة.</li>
                </ul>
              </div>
              <button onClick={() => setShowTermsModal(false)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors">موافق</button>
            </div>
          </div>
        )}

        {/* --- Group Rename Modal --- */}
        {groupAction.type === 'rename' && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setGroupAction({type: null, groupName: ''})}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 font-arabic animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">تغيير اسم المجموعة</h3><button onClick={() => setGroupAction({type: null, groupName: ''})} className="text-slate-400 hover:text-rose-500"><X size={24}/></button></div>
              <div className="space-y-4">
                <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} placeholder="الاسم الجديد..." className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                <div className="flex w-full gap-3 mt-2">
                  <button onClick={handleRenameGroup} disabled={!editGroupName.trim()} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors shadow-sm">حفظ</button>
                  <button onClick={() => setGroupAction({type: null, groupName: ''})} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-xl font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-600 shadow-sm">إلغاء</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Group Delete Modal --- */}
        {groupAction.type === 'delete' && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setGroupAction({type: null, groupName: ''})}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 font-arabic animate-in fade-in zoom-in-95 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <h3 className="text-xl font-bold mb-2">تأكيد الحذف</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">هل أنت متأكد من حذف مجموعة <b>"{groupAction.groupName}"</b>؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex w-full gap-3 mt-2">
                <button onClick={handleDeleteGroup} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm">حذف نهائي</button>
                <button onClick={() => setGroupAction({type: null, groupName: ''})} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm">إلغاء</button>
              </div>
            </div>
          </div>
        )}

        {/* --- Group Duplicate Modal --- */}
        {groupAction.type === 'duplicate' && (
          <div className="fixed inset-0 flex items-center justify-center p-4 font-arabic" style={{ zIndex: 200 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setGroupAction({type: null, groupName: ''})}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><Copy size={32} /></div>
              <h3 className="text-xl font-bold mb-2">تكرار المجموعة</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">هل تريد إنشاء نسخة مطابقة من مجموعة <b>"{groupAction.groupName}"</b>؟</p>
              <div className="flex w-full gap-3 mt-2">
                <button onClick={confirmDuplicateGroup} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm">نعم، إنشاء نسخة</button>
                <button onClick={() => setGroupAction({type: null, groupName: ''})} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm">إلغاء</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl font-arabic font-bold animate-in slide-in-from-bottom-4 flex items-center gap-2 border border-slate-700" style={{ zIndex: 300 }}>
            <CheckCircle2 size={18} className="text-emerald-400" />
            {toastMessage}
          </div>
        )}
      </div>

      {/* --- INVISIBLE PRINT ENGINE (Guarantee Perfect Printing Always) --- */}
      {printItems.length > 0 && (
         <div className="hidden print:block text-black bg-white min-h-screen p-8" dir="rtl">
            <div className="text-center mb-10 border-b-2 border-black pb-4">
               <h1 className="text-4xl font-bold font-arabic mb-3">الجنى الداني</h1>
               <h2 className="text-3xl font-arabic">من دوحة الألباني</h2>
            </div>
            
            {printItems.map((item, idx) => (
               <div key={idx} className="mb-12 pb-8 border-b border-gray-300" style={{ pageBreakInside: 'avoid' }}>
                  <p className="text-xl font-bold text-gray-800 mb-4 font-arabic bg-gray-100 inline-block px-4 py-2 rounded-lg border border-gray-300">
                    {formatBookName(item.path || item.Path)}
                  </p>
                  <div 
                    style={{ fontSize: `${fontSize}px`, lineHeight: '2.5' }} 
                    className="font-arabic text-justify text-black" 
                    dangerouslySetInnerHTML={{ __html: formatText(item.Description) }} 
                  />
               </div>
            ))}
         </div>
      )}

      {/* --- Global Styles --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
        .font-arabic { font-family: 'Amiri', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        /* Elegant Floating Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { 
          width: 14px; 
          height: 14px;
        }
        .custom-scrollbar::-webkit-scrollbar-track { 
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background-color: rgba(148, 163, 184, 0.4); 
          border-radius: 100px; 
          border: 4px solid transparent; 
          background-clip: content-box; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.7); 
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { 
          background-color: rgba(71, 85, 105, 0.4); 
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background-color: rgba(71, 85, 105, 0.8); 
        }
        
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        
        /* Gold Edges Styling */
        .gold-edge { filter: drop-shadow(0px 0px 3px rgba(255, 215, 0, 0.7)); }
        .gold-text-shadow { text-shadow: 0px 0px 4px rgba(255, 215, 0, 0.6); }
        
        ::selection { background-color: rgba(16, 185, 129, 0.25); color: inherit; }
        .dark ::selection { background-color: rgba(16, 185, 129, 0.35); color: inherit; }
        
        /* Fix Print Layout Globally */
        @media print {
           @page { margin: 2cm; }
           body, html, #root { 
             background: white !important; 
             height: auto !important; 
             overflow: visible !important; 
             position: relative !important;
           }
           .print\\:hidden { display: none !important; }
           .print\\:block { display: block !important; }
        }
      `}} />
    </div>
  );
}