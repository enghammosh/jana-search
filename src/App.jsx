import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { Search, Book, BookOpen, Copy, Check, Moon, Sun, ChevronRight, X, Filter, FolderOpen, Bookmark, ShieldCheck, ArrowRight, ArrowLeft, BookmarkPlus, BookmarkCheck, Printer, FolderHeart, CheckSquare, CheckCircle2, Menu, Library, Share2, ZoomIn, ZoomOut, Info, Mail, FileText, ShieldAlert, ListChecks, Trash2, Edit2, Smartphone, Sparkles, Languages, MessageCircleQuestion, Bot, Upload, Settings } from 'lucide-react';
import HelpModal from './HelpModal';
import IntroModal from './IntroModal';
// ==========================================
// --- Error Boundary to prevent White Screens ---
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crashed:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800" dir="ltr">
          <ShieldAlert size={64} className="text-red-500 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
          <p className="mb-6 text-slate-600">The application crashed. Here are the details:</p>
          <pre className="bg-white p-6 rounded-xl shadow-lg border border-red-200 text-red-600 max-w-4xl overflow-auto text-sm text-left">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-lg font-bold shadow-md hover:bg-slate-700">
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// --- IndexedDB Database Helpers ---
// ==========================================
const DB_NAME = 'JanaDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'hadiths';

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getDbCount = async (db) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const populateDatabase = async (db, rawData) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear(); 
    
    rawData.forEach((item) => {
      if (item[1] && item[1].trim() !== '') {
        store.add({ 
          Path: item[0] || 'عام', 
          Description: item[1] 
        });
      }
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getAllFromDB = async (db) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// ==========================================
// --- General Helpers ---
// ==========================================
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

// ==========================================
// --- AI Engine ---
// ==========================================
const getAiResponse = async (prompt, history = [], apiKey = "", selectedModel = "gemini-nano") => {
  
  // 1. Try On-Device Gemini Nano if selected (or as a fallback if no API key)
  if (selectedModel === "gemini-nano" || !apiKey) {
    if (typeof window !== 'undefined') {
      const ModelClass = window.LanguageModel || window.ai?.languageModel;
      if (ModelClass) {
        try {
          let isAvailable = false;
          if (typeof ModelClass.availability === 'function') {
            const status = await ModelClass.availability();
            isAvailable = (status === 'available' || status === 'readily');
          } else if (typeof ModelClass.capabilities === 'function') {
            const caps = await ModelClass.capabilities();
            isAvailable = (caps.available !== 'no');
          } else {
            isAvailable = true;
          }

          if (isAvailable) {
            const session = await ModelClass.create();
            let fullPrompt = prompt;
            if (history.length > 0) {
              fullPrompt = history.map(msg => `${msg.role === 'user' ? 'المستخدم' : 'المساعد الذكي'}: ${msg.text}`).join('\n\n') + `\n\nالمستخدم: ${prompt}`;
            }
            const result = await session.prompt(fullPrompt);
            session.destroy();
            return { text: result, model: 'Local: Gemini Nano' };
          }
        } catch (e) {
          console.log('Local AI execution failed, falling back...', e);
        }
      }
    }
    
    // If Nano was requested but failed/unavailable, and they have no API key
    if (!apiKey || apiKey.trim().length < 10) {
      return { text: "عذراً، الذكاء الاصطناعي المحلي (Gemini Nano) غير مفعل في متصفحك، ولا يوجد مفتاح API للاتصال السحابي.", model: 'System' };
    }
  }

  // 2. Cloud API Execution
  if (!apiKey || apiKey.trim().length < 10) {
    return { text: "عذراً، لم يتم العثور على مفتاح API صالح لدعم ميزات الذكاء الاصطناعي.", model: 'System' };
  }
  
  // If Nano failed but they provided an API key, fallback to Flash
  const targetCloudModel = selectedModel === "gemini-nano" ? "gemini-2.5-flash" : selectedModel;
  
  try {
    let contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetCloudModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!response.ok) {
        const errorText = await response.text();
        let exactError = `HTTP Error: ${response.status}`;
        try {
            const errObj = JSON.parse(errorText);
            if (errObj.error && errObj.error.message) { exactError = errObj.error.message; }
        } catch (e) {}
        console.error("API Rejected Request:", exactError);
        return { text: `**فشل الاتصال بجوجل!**\nالسبب: ${exactError}\n\nيرجى التأكد من أن مفتاح API صحيح وصالح وتأكد من نسخه كاملاً.`, model: 'Error' };
    }

    const textData = await response.text();
    try {
        const data = JSON.parse(textData);
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أتمكن من توليد إجابة في الوقت الحالي.";
        return { text: textResponse, model: `API: ${targetCloudModel}` };
    } catch (parseError) {
        return { text: "عذراً، حدث خطأ أثناء قراءة إجابة الذكاء الاصطناعي.", model: 'Error' };
    }
  } catch (e) {
    console.error("AI Network Error:", e);
    return { text: "حدث خطأ في الاتصال بالإنترنت أو بمحرك الذكاء الاصطناعي. يرجى المحاولة لاحقاً.", model: 'Error' };
  }
};

const formatAiText = (text) => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/\n/g, '<br />')
    // AI Reference Button
    .replace(/\[\s*(\d+)\s*\]/g, '<button type="button" class="hadith-ref-link inline-block align-baseline text-amber-700 bg-amber-100 border border-amber-300 hover:bg-amber-200 px-1.5 py-0 rounded text-sm font-bold mx-0.5 cursor-pointer shadow-sm transition-colors" data-target="$1">[$1]</button>');
};

function MainApp() {
  // --- Core States ---
  const [showSplash, setShowSplash] = useState(true);
  const [allData, setAllData] = useState([]); // Hybrid Memory Logic
  const [loadingMessage, setLoadingMessage] = useState('جاري تجهيز المكتبة...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsFileUpload, setNeedsFileUpload] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Storage & AI Configuration States
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('jana_gemini_api_key') || '');
  const [selectedAiModel, setSelectedAiModel] = useState(() => localStorage.getItem('jana_gemini_model') || 'gemini-nano');
  const [hasAiCapabilities, setHasAiCapabilities] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Search & AI States
  const [searchMode, setSearchMode] = useState('normal'); // normal, ai, fatwa
  const [searchInput, setSearchInput] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');   
  const [isSearching, setIsSearching] = useState(false);
  
  // AI Fatwa & Action States
  const [aiFatwaResult, setAiFatwaResult] = useState(null);
  const [aiActionModal, setAiActionModal] = useState(null); 
  const [fatwaChatInput, setFatwaChatInput] = useState('');
  const [isFatwaChatLoading, setIsFatwaChatLoading] = useState(false);

// --- AI Availability Check ---
  useEffect(() => {
    const checkAiAvailability = async () => {
      let localAiAvailable = false;
      if (typeof window !== 'undefined') {
         const ModelClass = window.LanguageModel || window.ai?.languageModel;
         if (ModelClass) {
           try {
             if (typeof ModelClass.availability === 'function') {
                const status = await ModelClass.availability();
                localAiAvailable = (status === 'available' || status === 'readily');
             } else if (typeof ModelClass.capabilities === 'function') {
                const cap = await ModelClass.capabilities();
                localAiAvailable = cap.available !== 'no';
             }
           } catch (e) {}
         }
      }
      const hasKey = userApiKey && userApiKey.trim().length > 10;
      const available = localAiAvailable || hasKey;
      
      setHasAiCapabilities(available);
      
      if (!available && (searchMode === 'ai' || searchMode === 'fatwa')) {
        setSearchMode('normal');
      }
    };
    checkAiAvailability();
  }, [userApiKey, searchMode]);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedHadith, setSelectedHadith] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [fontSize, setFontSize] = useState(20); 
  
  // Navigation State
  const [selectedBooks, setSelectedBooks] = useState([]); 
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('search'); 
  const [layoutMode, setLayoutMode] = useState('grid'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Reading Mode State
  const [readingBook, setReadingBook] = useState(null);
  const [bookContent, setBookContent] = useState([]);
  const [readingIndex, setReadingIndex] = useState(0);

  // Smart Scrolling States
  const scrollContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const browseScrollRef = useRef(0); // Remembers where we were in the library

  // Favorites / LocalStorage State
  const [savedGroups, setSavedGroups] = useState(() => {
    const saved = localStorage.getItem('jana_groups');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return {}; }
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
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const uiStateRef = useRef({});
  const backPressCountRef = useRef(0);

  useEffect(() => {
    uiStateRef.current = { 
      viewMode, selectedHadith, aiActionModal, isMobileMenuOpen, showAboutModal, showSaveModal, 
      activeGroup, groupAction, showPrivacyModal, showTermsModal, showSettingsModal, showHelpModal 
    };
  });

  // --- Hardware Back Button Logic (PWA / Mobile) ---
  useEffect(() => {
    window.history.pushState({ app: 'jana' }, '');

    const handlePopState = (e) => {
      const state = uiStateRef.current;
      const isDeepState = state.viewMode !== 'search' || state.selectedHadith || state.aiActionModal || state.isMobileMenuOpen || 
                          state.showAboutModal || state.showSaveModal || state.activeGroup || 
                          state.groupAction.type || state.showPrivacyModal || state.showTermsModal || state.showSettingsModal || state.showHelpModal;

      if (isDeepState) {
        window.history.pushState({ app: 'jana' }, ''); 
        if (state.isMobileMenuOpen) setIsMobileMenuOpen(false);
        else if (state.showIntroModal) setShowIntroModal(false);
        else if (state.showHelpModal) setShowHelpModal(false);
        else if (state.showPrivacyModal) setShowPrivacyModal(false);
        else if (state.showTermsModal) setShowTermsModal(false);
        else if (state.showAboutModal) setShowAboutModal(false);
        else if (state.showSettingsModal) setShowSettingsModal(false);
        else if (state.groupAction.type) setGroupAction({type: null, groupName: ''});
        else if (state.showSaveModal) setShowSaveModal(null);
        else if (state.aiActionModal) setAiActionModal(null);
        else if (state.selectedHadith) setSelectedHadith(null);
        else if (state.viewMode === 'read') setViewMode('browse');
        else if (state.viewMode === 'favorites' && state.activeGroup) setActiveGroup(null);
        else if (state.viewMode !== 'search') setViewMode('search');
      } else {
        if (backPressCountRef.current === 0) {
           window.history.pushState({ app: 'jana' }, ''); 
           backPressCountRef.current = 1;
           showToast('اضغط مرتين متتاليتين للخروج من التطبيق');
           setTimeout(() => { backPressCountRef.current = 0; }, 2000);
        } else {
           window.history.go(-1); 
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- PWA Install Prompt Logic ---
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const promptDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (isStandalone) return; 

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!promptDismissed) setShowPwaPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (isIOS && !promptDismissed) { setTimeout(() => setShowPwaPrompt(true), 4000); }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isIOS]);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowPwaPrompt(false);
    } else if (isIOS) {
      showToast('في الآيفون: اضغط على أيقونة (المشاركة) بالأسفل ثم (إضافة للشاشة الرئيسية)');
    }
  };

  const dismissPwaPrompt = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowPwaPrompt(false);
  };

  // --- Hybrid Database Initialization (With Auto-Retry for Slow Internet) ---
  const initializeLibrary = async () => {
    setIsLoading(true);
    try {
      const db = await openDatabase();
      const count = await getDbCount(db);
      
      if (count === 0) {
         let success = false;
         let retryCount = 0;
         const maxRetries = 5; // سيحاول 5 مرات قبل الاستسلام
         
         while (!success && retryCount < maxRetries) {
             try {
               if (retryCount === 0) {
                  setLoadingMessage('جاري تحميل قاعدة البيانات لأول مرة (حوالي 30 ميجابايت)...');
               } else {
                  setLoadingMessage(`بطء في الاتصال، جاري إعادة المحاولة (${retryCount}/${maxRetries})...`);
               }
               
               const response = await fetch(`${window.location.origin}/jana_final_db.json`);
               if (!response.ok) throw new Error("JSON not found or network error");
               
               const rawData = await response.json(); 
               setLoadingMessage('جاري تخزين البيانات محلياً للعمل بدون إنترنت...');
               await populateDatabase(db, rawData);
               success = true;
             } catch (serverErr) {
               retryCount++;
               if (retryCount >= maxRetries) {
                  throw new Error("Failed to download database after multiple attempts");
               }
               // الانتظار 3 ثوانٍ قبل المحاولة التالية
               await new Promise(resolve => setTimeout(resolve, 3000));
             }
         }
      }

      setLoadingMessage('جاري رفع البيانات إلى الذاكرة العشوائية (RAM)...');
      const records = await getAllFromDB(db);
      setAllData(records);
    } catch (err) {
      console.error("Initialization failed:", err);
      setError("fallback"); // سيؤدي هذا لتشغيل شاشة الخطأ الحمراء بدلاً من رفع الملف
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => setShowSplash(false), 2500);
    initializeLibrary();
  }, []);



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

  const availableBooks = useMemo(() => {
    const books = new Set();
    allData.forEach(item => { if (item.path || item.Path) books.add((item.path || item.Path).split('>')[0].trim()); });
    return Array.from(books).sort();
  }, [allData]);

  // --- AI Actions & Try/Catch Protection ---
  const handleAiAction = async (item, actionType) => {
    setAiActionModal({ type: actionType, item, loading: true, result: '', modelName: '' });
    try {
        const cleanHadith = item.Description.replace(/<[^>]*>?/gm, '');
        let prompt = actionType === 'explain' 
          ? `أنت مساعد ذكاء اصطناعي ولست مفتياً. قم بشرح هذا الحديث النبوي بناءً على المعاني المعتبرة بأسلوب سهل ومختصر، مع بيان الفوائد المستفادة:\n\n"${cleanHadith}"`
          : `Translate the following Arabic Hadith to clear, accurate English, preserving its Islamic context and deep meaning:\n\n"${cleanHadith}"`;

        const resultObj = await getAiResponse(prompt, [], userApiKey, selectedAiModel);
        setAiActionModal({ type: actionType, item, loading: false, result: resultObj.text, modelName: resultObj.model });
    } catch (err) {
        console.error("AI Action Error:", err);
        setAiActionModal({ type: actionType, item, loading: false, result: 'حدث خطأ غير متوقع أثناء معالجة الطلب.', modelName: 'Error' });
    }
  };

  const handleFatwaMessageClick = (e) => {
    if (e.target.classList.contains('hadith-ref-link')) {
      const targetIdx = parseInt(e.target.getAttribute('data-target'), 10) - 1;
      const el = document.getElementById(`fatwa-hadith-${targetIdx}`);
      const scrollContainer = document.getElementById('main-scroll-container');
      
      if (el && scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const yOffset = 100;
        const scrollTop = scrollContainer.scrollTop + elRect.top - containerRect.top - yOffset;
        scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
        
        el.classList.add('ring-4', 'ring-amber-500', 'scale-[1.02]');
        setTimeout(() => el.classList.remove('ring-4', 'ring-amber-500', 'scale-[1.02]'), 1500);
      }
    }
  };

  const executeSearch = async () => {
    setShowFilters(false);
    setAiFatwaResult(null);
    
    if (!searchInput.trim()) {
       setSearchTerm('');
       return;
    }

    if (searchMode === 'normal') {
      setSearchTerm(searchInput);
    } 
    else if (searchMode === 'ai') {
      setIsSearching(true);
      const prompt = `أنا أقوم بالبحث في قاعدة بيانات للأحاديث النبوية. المستخدم يبحث عن الموضوع التالي: "${searchInput}". 
      قم بتحليل المقصد الشرعي لهذا البحث، واستخرج 5 إلى 7 كلمات مفتاحية (جذور كلمات، مصطلحات شرعية دقيقة، وألفاظ نبوية فصحى) من المحتمل جداً وجودها في متون الأحاديث التي تتناول هذا الموضوع. 
      لا تكتب أي مقدمات أو شروحات، فقط اكتب الكلمات المفتاحية مفصولة بمسافة واحدة.`;
      
      const keywordsObj = await getAiResponse(prompt, [], userApiKey, selectedAiModel);
      setSearchTerm(keywordsObj.text.replace(/[.,،"']/g, '').trim());
      setIsSearching(false);
    }
    else if (searchMode === 'fatwa') {
      setIsSearching(true);
      const keywordPrompt = `أنت خبير في الفقه والحديث. قام المستخدم بطرح هذا السؤال الشرعي: "${searchInput}".
      لفهم هذا السؤال والبحث عن الأحاديث المناسبة له، استنبط 'الموضوع الفقهي الأساسي' واستخرج 5 إلى 8 كلمات مفتاحية (جذور، مرادفات فصحى، مصطلحات فقهية وألفاظ نبوية) تدل على هذا الموضوع.
      مثال: إذا كان السؤال 'حكم تارك الصلاة'، تكون الكلمات: 'ترك صلاة كفر يشرك يكفر عهد'.
      أعطني الكلمات المفتاحية فقط مفصولة بمسافة وبدون أي كلام آخر.`;
      
      const keywordsStrObj = await getAiResponse(keywordPrompt, [], userApiKey, selectedAiModel);
      let searchWords = keywordsStrObj.text.replace(/[.,،"']/g, '').trim().split(/\s+/).filter(w => w.length > 2);
      
      if (searchWords.length === 0) searchWords = normalizeArabic(searchInput).split(/\s+/).filter(w => w.length > 2);

      // AI Fatwa Memory-Based Scoring
      const scoredHadiths = [];
      allData.forEach(item => {
        const itemDesc = item.Description || '';
        const isGreen = STATUS_COLORS.success.some(s => itemDesc.includes(`( ${s} )`));
        if (isGreen) {
           let score = 0;
           const normalizedDesc = normalizeArabic(itemDesc);
           searchWords.forEach(word => { if (normalizedDesc.includes(normalizeArabic(word))) score++; });
           if (score > 0) scoredHadiths.push({ item, score });
        }
      });

      scoredHadiths.sort((a, b) => b.score - a.score);
      const topHadiths = scoredHadiths.slice(0, 10).map(h => h.item);
      
      if (topHadiths.length === 0) {
         setAiFatwaResult({
           originalPrompt: "", text: "أنا مساعد ذكاء اصطناعي ولست مفتياً. لم أتمكن من العثور على أحاديث مطابقة لسؤالك.",
           hadiths: [], messages: [{ role: 'model', text: "أنا مساعد ذكاء اصطناعي ولست مفتياً. لم أتمكن من العثور على أحاديث مطابقة لسؤالك." }],
           modelName: 'System'
         });
         setIsSearching(false);
         return;
      }

      const hadithTexts = topHadiths.map((h, index) => `الحديث [${index + 1}]:\n${h.Description.replace(/<[^>]*>?/gm, '')}`).join("\n\n---\n\n");
      const fatwaPrompt = `أنت مساعد ذكاء اصطناعي (AI Agent) ولست عالماً أو مفتياً. 
      يجب أن تبدأ إجابتك حرفياً: "أنا مساعد ذكاء اصطناعي، ويرجى استشارة أهل العلم للفتوى المعتمدة."
      ثم أجب على سؤال المستخدم التالي: "${searchInput}"
      اعتمد في إجابتك حصراً على نصوص الأحاديث التالية:
      ${hadithTexts}
      أثناء الشرح، استشهد بالأحاديث وادمج أرقامها بداخل سياق كلامك بين أقواس مربعة. مثال: "كما جاء في الحديث [1] أن...".
      في النهاية، ضع ملخصاً بعنوان "**خلاصة الحكم:**".`;
      
      const resultObj = await getAiResponse(fatwaPrompt, [], userApiKey, selectedAiModel);
      setAiFatwaResult({ originalPrompt: fatwaPrompt, text: resultObj.text, hadiths: topHadiths, messages: [{ role: 'model', text: resultObj.text }], modelName: resultObj.model });
      setIsSearching(false);
    }
  };

  const handleFatwaChatSubmit = async () => {
    if (!fatwaChatInput.trim() || isFatwaChatLoading) return;
    const userMsg = { role: 'user', text: fatwaChatInput };
    const historyToPass = [{ role: 'user', text: aiFatwaResult.originalPrompt }, ...aiFatwaResult.messages];
    setAiFatwaResult(prev => ({ ...prev, messages: [...prev.messages, userMsg] }));
    setFatwaChatInput('');
    setIsFatwaChatLoading(true);
    const aiReplyObj = await getAiResponse(userMsg.text, historyToPass, userApiKey, selectedAiModel);
    setAiFatwaResult(prev => ({ ...prev, messages: [...prev.messages, { role: 'model', text: aiReplyObj.text }], modelName: aiReplyObj.model }));
    setIsFatwaChatLoading(false);
  };

  // --- Deferring States for Instant Button Responsiveness ---
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredSelectedBooks = useDeferredValue(selectedBooks);
  const deferredSelectedStatuses = useDeferredValue(selectedStatuses);

  // --- Stable Engine: Synchronous useMemo Search for Normal & Groups ---
  const filteredResults = useMemo(() => {
    const q = normalizeArabic(deferredSearchTerm);
    
    // Explicit condition to FIX Empty Groups Issue:
    if (viewMode === 'favorites' && activeGroup) {
      let res = savedGroups[activeGroup] || [];
      if (!deferredSearchTerm && deferredSelectedBooks.length === 0 && deferredSelectedStatuses.length === 0) return res;
      
      return res.filter(item => {
        const itemDesc = item.Description || '';
        const matchesBook = deferredSelectedBooks.length === 0 || deferredSelectedBooks.some(b => (item.path || item.Path || '').startsWith(b));
        const matchesStatus = deferredSelectedStatuses.length === 0 || deferredSelectedStatuses.some(s => itemDesc.includes(`( ${s} )`));
        const matchesSearch = q === "" || normalizeArabic(itemDesc).includes(q);
        return matchesBook && matchesStatus && matchesSearch;
      });
    }

    // Normal Search Logic:
    if (searchMode === 'fatwa') return []; 
    if (viewMode === 'search' && deferredSearchTerm.length < 2 && deferredSelectedBooks.length === 0 && deferredSelectedStatuses.length === 0) return [];

    if (searchMode === 'ai' && hasAiCapabilities) {
      const searchWords = q.split(/\s+/).filter(w => w.length > 1);
      const scoredResults = [];
      allData.forEach(item => {
        const itemDesc = item.Description || '';
        const matchesBook = deferredSelectedBooks.length === 0 || deferredSelectedBooks.some(b => (item.path || item.Path || '').startsWith(b));
        const matchesStatus = deferredSelectedStatuses.length === 0 || deferredSelectedStatuses.some(s => itemDesc.includes(`( ${s} )`));
        
        if (matchesBook && matchesStatus) {
           let score = 0;
           const normDesc = normalizeArabic(itemDesc);
           searchWords.forEach(word => { if (normDesc.includes(word)) score++; });
           if (score > 0) scoredResults.push({ item, score });
        }
      });
      scoredResults.sort((a, b) => b.score - a.score);
      return scoredResults.slice(0, 70).map(r => r.item);
    } else {
      return allData.filter(item => {
        const itemDesc = item.Description || '';
        const matchesBook = deferredSelectedBooks.length === 0 || deferredSelectedBooks.some(b => (item.path || item.Path || '').startsWith(b));
        const matchesStatus = deferredSelectedStatuses.length === 0 || deferredSelectedStatuses.some(s => itemDesc.includes(`( ${s} )`));
        const matchesSearch = q === "" || normalizeArabic(itemDesc).includes(q);
        return matchesBook && matchesStatus && matchesSearch;
      }).slice(0, 70); 
    }
  }, [deferredSearchTerm, allData, deferredSelectedBooks, deferredSelectedStatuses, viewMode, searchMode, activeGroup, savedGroups, hasAiCapabilities]);

  // --- Utilities ---
  const toggleStatus = (status) => setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  const toggleBook = (book) => setSelectedBooks(prev => prev.includes(book) ? prev.filter(b => b !== book) : [...prev, book]);

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
      try { 
        await navigator.share({ title: 'حديث من الجنى الداني', text: textToShare }); 
      } catch (e) {
        if (e.name !== 'AbortError') {
          copyToClipboardRaw(textToShare, 'share');
          showToast('لم يتمكن المتصفح من فتح نافذة المشاركة، تم النسخ بدلاً من ذلك.');
        }
      }
    } else { 
      copyToClipboardRaw(textToShare, 'share'); 
      showToast('المشاركة غير مدعومة في هذا المتصفح، تم النسخ بدلاً من ذلك.');
    }
  };

  const handlePrintSpecific = (itemsToPrint) => {
    setPrintItems(itemsToPrint);
    setTimeout(() => { window.print(); setPrintItems([]); }, 500); 
  };

  // --- Group Logic ---
  const handleSaveToGroup = (groupName) => {
    if (!groupName) return;
    const currentGroup = savedGroups[groupName] || [];
    if (currentGroup.some(h => h.Description === showSaveModal.Description)) {
      showToast('الحديث موجود بالفعل في هذه المجموعة!'); setShowSaveModal(null); return;
    }
    setSavedGroups(prev => ({ ...prev, [groupName]: [...currentGroup, showSaveModal] }));
    setShowSaveModal(null); setNewGroupName(''); showToast('تم الحفظ بنجاح');
  };

  const confirmDuplicateGroup = () => {
    let newName = `${groupAction.groupName} (نسخة)`; let counter = 1;
    while (savedGroups[newName]) { newName = `${groupAction.groupName} (نسخة ${counter})`; counter++; }
    setSavedGroups(prev => ({ ...prev, [newName]: prev[groupAction.groupName] }));
    setGroupAction({type: null, groupName: ''}); showToast('تم تكرار المجموعة بنجاح');
  };

  const handleRenameGroup = () => {
     const trimmed = editGroupName.trim();
     if (!trimmed || trimmed === groupAction.groupName) { setGroupAction({type: null, groupName: ''}); return; }
     if (savedGroups[trimmed]) { showToast('هذا الاسم موجود مسبقاً!'); return; }
     const newGroups = { ...savedGroups };
     newGroups[trimmed] = newGroups[groupAction.groupName];
     delete newGroups[groupAction.groupName];
     setSavedGroups(newGroups);
     if (activeGroup === groupAction.groupName) setActiveGroup(trimmed);
     setGroupAction({type: null, groupName: ''}); showToast('تم تغيير الاسم بنجاح');
  };

  const handleDeleteGroup = () => {
     const newGroups = { ...savedGroups }; delete newGroups[groupAction.groupName]; setSavedGroups(newGroups);
     if (activeGroup === groupAction.groupName) setActiveGroup(null);
     setGroupAction({type: null, groupName: ''}); showToast('تم حذف المجموعة');
  };

  const toggleSelection = (item) => setSelectedItems(prev => prev.some(i => i.Description === item.Description) ? prev.filter(i => i.Description !== item.Description) : [...prev, item]);

  const copySelectedItems = () => {
    if (selectedItems.length === 0) return;
    const combinedText = selectedItems.map(item => {
      let cleanText = item.Description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
      return `${cleanText}\n[ الكتاب: ${formatBookName(item.path || item.Path)} ]`;
    }).join('\n\n-------------------------\n\n');
    copyToClipboardRaw(`${combinedText}\n\nالمصدر: الجنى الداني من دوحة الألباني`, 'multi');
    setIsSelectionMode(false); setSelectedItems([]);
  };

  const navigateTo = (view) => { setViewMode(view); setSearchInput(''); setSearchTerm(''); if (view === 'favorites') setActiveGroup(null); };

  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setIsAtBottom(Math.abs(scrollHeight - scrollTop - clientHeight) <= 5);
    }
  };

  const handleMainScroll = (e) => {
    if (viewMode === 'browse') {
       browseScrollRef.current = e.target.scrollTop;
    }
  };

  useEffect(() => {
    if (viewMode === 'read' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0; setTimeout(checkScrollPosition, 50);
    } else if (viewMode === 'browse') {
      const container = document.getElementById('main-scroll-container');
      if (container) {
         // Restore scroll position in the library exactly where user left off
         container.scrollTop = browseScrollRef.current;
      }
    }
  }, [readingIndex, viewMode, fontSize, bookContent]);

  const handleSmartNext = () => {
    if (!scrollContainerRef.current) return;
    if (isAtBottom) { if (readingIndex < bookContent.length - 1) setReadingIndex(p => p + 1);
    } else scrollContainerRef.current.scrollBy({ top: scrollContainerRef.current.clientHeight * 0.85, behavior: 'smooth' });
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-emerald-800 flex flex-col items-center justify-center text-white transition-opacity duration-1000" style={{ zIndex: 9999 }}>
        <div className="bg-white/10 p-8 rounded-[2rem] shadow-2xl backdrop-blur-md border border-emerald-500/30 mb-8 animate-bounce"><BookOpen size={90} strokeWidth={1.5} className="text-emerald-300 drop-shadow-lg" /></div>
        <h1 className="text-5xl font-bold font-arabic tracking-wide gold-text-shadow mb-4 text-white">الجنى الداني</h1>
        <p className="text-2xl text-emerald-200 font-arabic gold-text-shadow">من دوحة الألباني</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`h-screen overflow-hidden flex flex-col items-center justify-center transition-colors ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-emerald-900'}`} dir="rtl">
        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-8 rounded-[2rem] shadow-xl border border-emerald-200 dark:border-emerald-800/50 mb-8 animate-bounce"><BookOpen size={70} className="text-emerald-600 dark:text-emerald-400" /></div>
        <p className="text-2xl font-bold font-arabic tracking-wide mb-6">{loadingMessage}</p>
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
      <div id="main-scroll-container" onScroll={handleMainScroll} className="print:hidden relative h-screen overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300" dir="rtl">
        
        {/* Multi-Selection Bottom Bar */}
        {isSelectionMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-emerald-800 text-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-full" style={{ zIndex: 40 }}>
            <div className="flex items-center gap-3 font-bold font-arabic">
              <CheckSquare size={24} className="text-emerald-300" /> تم تحديد ({selectedItems.length}) أحاديث
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
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewMode('search'); setSearchMode('normal'); }}>
              <div className="bg-white/20 p-2 rounded-xl shadow-inner border border-white/10 gold-edge relative">
                <Library size={28} className="text-white" />
                {hasAiCapabilities && <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5"><Sparkles size={10} className="text-white"/></div>}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-arabic leading-none tracking-tight gold-text-shadow text-white">الجنى الداني</h1>
                <p className="text-sm font-bold uppercase mt-1.5 text-emerald-100 gold-text-shadow font-arabic flex items-center gap-1">
                  من دوحة الألباني {hasAiCapabilities && <span className="text-xs bg-emerald-900/50 px-1 rounded border border-emerald-700">AI</span>}
                </p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => setShowIntroModal(true)} className="p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 hover:bg-white/10 text-emerald-100"><BookOpen size={20} /> <span className="font-arabic">المقدمة</span></button>
              <button onClick={() => navigateTo('favorites')} className={`p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${viewMode === 'favorites' ? 'bg-emerald-900 dark:bg-slate-800 text-white' : 'hover:bg-white/10 text-emerald-100'}`}><FolderHeart size={20} /> <span className="font-arabic">مجموعاتي</span></button>
              <button onClick={() => navigateTo('browse')} className={`p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${viewMode === 'browse' ? 'bg-emerald-900 dark:bg-slate-800 text-white' : 'hover:bg-white/10 text-emerald-100'}`}><Library size={20} /> <span className="font-arabic">المكتبة</span></button>
              <button onClick={() => setShowAboutModal(true)} className="p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 hover:bg-white/10 text-emerald-100"><Info size={20} /> <span className="font-arabic">عن التطبيق</span></button>
              <button onClick={() => setShowHelpModal(true)} className="p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 hover:bg-white/10 text-emerald-100"><BookOpen size={20} /> <span className="font-arabic">دليل الاستخدام</span></button>
              <div className="w-px h-6 bg-white/20 mx-2"></div>
              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                <button onClick={() => setFontSize(prev => Math.min(prev + 2, 40))} className="p-1.5 hover:bg-white/20 rounded-lg text-emerald-100" title="تكبير الخط"><ZoomIn size={18}/></button>
                <button onClick={() => setFontSize(prev => Math.max(prev - 2, 14))} className="p-1.5 hover:bg-white/20 rounded-lg text-emerald-100" title="تصغير الخط"><ZoomOut size={18}/></button>
              </div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-emerald-100 hover:text-white ml-2">
                {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
              </button>
            </div>
            <div className="md:hidden flex items-center"><button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><Menu size={26} /></button></div>
          </div>
        </nav>

        <main className={`relative max-w-6xl mx-auto px-4 sm:px-6 py-8`} style={{ zIndex: 10 }}>
        {error === "fallback" || allData.length === 0 ? (
            <div className="max-w-lg mx-auto text-center bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800">
              <div className="bg-rose-50 dark:bg-rose-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldAlert size={40} className="text-rose-600" /></div>
              <h2 className="text-2xl font-bold mb-4 font-arabic text-slate-900 dark:text-white">تعذر الاتصال بالمكتبة</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-arabic text-sm leading-relaxed">لم نتمكن من تحميل قاعدة البيانات. يرجى التأكد من اتصالك بالإنترنت.</p>
              <button onClick={() => window.location.reload()} className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg font-arabic hover:bg-emerald-600 transition-colors shadow-md">إعادة المحاولة</button>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* --- Toolbar / Search Box --- */}
              {(viewMode === 'search' || (viewMode === 'favorites' && activeGroup)) && (
                <div className="p-4 sm:p-6 rounded-[2rem] shadow-sm border bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 transition-all">
                  
                  {/* AI Search Mode Tabs */}
                  {viewMode === 'search' && hasAiCapabilities && (
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl mb-6 relative overflow-x-auto no-scrollbar border dark:border-slate-700">
                      <button onClick={() => {setSearchMode('normal'); setSearchInput(''); setSearchTerm('');}} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm font-arabic flex justify-center items-center gap-2 whitespace-nowrap transition-all ${searchMode === 'normal' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
                        <Search size={18} /> بحث عادي
                      </button>
                      <button onClick={() => {setSearchMode('ai'); setSearchInput(''); setSearchTerm('');}} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm font-arabic flex justify-center items-center gap-2 whitespace-nowrap transition-all ${searchMode === 'ai' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
                        <Sparkles size={18} /> بحث ذكي
                      </button>
                      <button onClick={() => {setSearchMode('fatwa'); setSearchInput(''); setSearchTerm('');}} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm font-arabic flex justify-center items-center gap-2 whitespace-nowrap transition-all ${searchMode === 'fatwa' ? 'bg-white dark:bg-slate-800 shadow-sm text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
                        <MessageCircleQuestion size={18} /> سؤال وفتوى
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-4 items-stretch">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder={
                          searchMode === 'ai' ? "اكتب موضوعاً ليبحث عنه الذكاء الاصطناعي... (مثل: بر الوالدين)" :
                          searchMode === 'fatwa' ? "اسأل سؤالك الشرعي للبحث عن الفتوى مدعمة بالأحاديث (مثل: حكم تارك الصلاة)..." :
                          "اكتب كلمة للبحث الفوري المباشر..."
                        }
                        className={`w-full pr-5 pl-20 py-4 rounded-[1.5rem] border-2 outline-none transition-all font-arabic bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white dark:placeholder-slate-400
                          ${searchMode === 'ai' ? 'border-blue-200 dark:border-blue-900/50 focus:border-blue-500' : 
                            searchMode === 'fatwa' ? 'border-amber-200 dark:border-amber-900/50 focus:border-amber-500' : 
                            'border-slate-200 dark:border-slate-600 focus:border-emerald-500'}`}
                        style={{ fontSize: '18px' }}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') executeSearch(); }}
                      />
                      {searchInput && (
                        <button onClick={() => {setSearchInput(''); setSearchTerm(''); setAiFatwaResult(null);}} className="absolute left-16 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-rose-500"><X size={18} /></button>
                      )}
                      <button onClick={executeSearch} className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-xl transition-colors shadow-sm
                          ${searchMode === 'ai' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200' : 
                            searchMode === 'fatwa' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200' : 
                            'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'}`}>
                         <Search size={22} strokeWidth={2.5} />
                      </button>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      {!isSearching && filteredResults.length > 0 && searchMode !== 'fatwa' && (
                        <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`p-4 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-2 font-bold font-arabic ${isSelectionMode ? 'bg-amber-50 border-amber-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}>
                           <ListChecks size={20} /> <span className="hidden sm:inline">تحديد</span>
                        </button>
                      )}

                      {viewMode === 'favorites' && activeGroup && (
                        <button onClick={() => handlePrintSpecific(filteredResults)} className="px-4 py-4 rounded-[1.5rem] border-2 border-emerald-600 bg-emerald-50 text-emerald-700 transition-all flex items-center justify-center gap-2 font-bold hover:bg-emerald-600 hover:text-white"><Printer size={20} /></button>
                      )}

                      <button onClick={() => setShowFilters(!showFilters)} className={`px-5 py-4 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-2 font-bold ${selectedBooks.length > 0 || selectedStatuses.length > 0 || showFilters ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}>
                        <Filter size={20} /> <span className="font-arabic hidden sm:inline">تصفية</span>
                      </button>
                    </div>
                  </div>

                  {/* Filters Menu */}
                  {showFilters && (
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-in fade-in space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 font-arabic border-b border-slate-100 dark:border-slate-700 pb-2"><ShieldCheck size={18} className="text-emerald-500" /> تصفية بدرجة الحديث:</h3>
                        <div className="space-y-4">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                            <p className="text-xs font-bold text-emerald-700 mb-3 font-arabic">مقبول:</p>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_COLORS.success.map(s => ( <button key={s} onClick={() => toggleStatus(s)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${selectedStatuses.includes(s) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-slate-800 border-emerald-200 text-slate-700 dark:text-slate-300'}`}>{s}</button> ))}
                            </div>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
                            <p className="text-xs font-bold text-rose-700 mb-3 font-arabic">مردود:</p>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_COLORS.danger.map(s => ( <button key={s} onClick={() => toggleStatus(s)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${selectedStatuses.includes(s) ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white dark:bg-slate-800 border-rose-200 text-slate-700 dark:text-slate-300'}`}>{s}</button> ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 mb-3 border-b pb-2 font-arabic"><Book size={18} className="inline text-emerald-600 mr-2" /> تحديد المصادر:</h3>
                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                          <button onClick={() => setSelectedBooks([])} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${selectedBooks.length === 0 ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'}`}>الكل</button>
                          {availableBooks.map(b => ( <button key={b} onClick={() => toggleBook(b)} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${selectedBooks.includes(b) ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'}`}>{b}</button> ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- Global Loading Indicator for Search/AI --- */}
              {isSearching && (
                 <div className="col-span-full flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in">
                    <div className="relative mb-6">
                      <div className={`w-16 h-16 rounded-full border-4 border-t-transparent animate-spin ${searchMode === 'normal' ? 'border-emerald-500' : searchMode === 'ai' ? 'border-blue-500' : 'border-amber-500'}`}></div>
                      {searchMode !== 'normal' && <div className="absolute inset-0 flex items-center justify-center animate-pulse"><Sparkles className={searchMode === 'ai' ? 'text-blue-500' : 'text-amber-500'} size={24} /></div>}
                    </div>
                    <p className="font-arabic font-bold text-lg text-slate-700 dark:text-slate-300">
                      {searchMode === 'normal' ? 'يجري البحث الفوري في الأحاديث...' : searchMode === 'ai' ? 'جاري التحليل الفقهي للموضوع وتوليد الكلمات...' : 'يتم استنباط الإجابة والبحث عن الأحاديث المناسبة...'}
                    </p>
                 </div>
              )}

              {/* --- AI Fatwa Result Card --- */}
              {searchMode === 'fatwa' && aiFatwaResult && !isSearching && (
                 <div className="space-y-8 animate-in slide-in-from-bottom-8">
                   <div className="bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700/50 rounded-[2rem] p-6 shadow-xl relative">
                      <div className="absolute -top-6 -right-2 bg-gradient-to-l from-amber-500 to-amber-600 text-white px-6 py-2 rounded-2xl shadow-lg flex items-center gap-2 font-bold font-arabic text-sm">
                         <Bot size={20} /> إجابة ومناقشة المساعد الذكي
                      </div>
                      
                      {/* Chat Messages List */}
                      <div className="mt-8 space-y-8" onClick={handleFatwaMessageClick}>
                        {aiFatwaResult.messages.map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                             {msg.role === 'user' ? (
                               <div className="p-4 rounded-2xl max-w-[95%] sm:max-w-[85%] bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100 rounded-tl-none shadow-sm border border-amber-200 dark:border-amber-800">
                                 <div style={{ fontSize: `${Math.max(16, fontSize - 2)}px` }} className="leading-relaxed font-arabic font-bold text-justify" dangerouslySetInnerHTML={{ __html: formatAiText(msg.text) }} />
                               </div>
                             ) : (
                               <div className="w-full">
                                 <div style={{ fontSize: `${fontSize}px` }} className="leading-relaxed font-arabic text-justify text-slate-800 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: formatAiText(msg.text) }} />
                               </div>
                             )}
                          </div>
                        ))}
                        {isFatwaChatLoading && (
                          <div className="flex flex-col items-start w-full">
                             <div className="flex items-center gap-2 text-amber-600 py-4">
                               <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce"></div>
                               <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                               <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                             </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Input */}
                      <div className="mt-8 flex flex-col w-full">
                        <div className="flex gap-2 sm:gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 w-full">
                          <input
                            type="text"
                            value={fatwaChatInput}
                            onChange={e => setFatwaChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleFatwaChatSubmit()}
                            placeholder="ناقش المساعد أو استفسر..."
                            className="flex-1 min-w-0 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 font-arabic text-slate-900 dark:text-white text-sm sm:text-base"
                          />
                          <button onClick={handleFatwaChatSubmit} disabled={isFatwaChatLoading || !fatwaChatInput.trim()} className="shrink-0 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 sm:px-6 py-3 rounded-xl font-bold font-arabic transition-colors flex items-center justify-center gap-2 shadow-sm">
                            <span className="hidden sm:inline">إرسال</span> <ArrowLeft size={18} />
                          </button>
                        </div>
                        {aiFatwaResult.modelName && (
                          <div className="mt-2 text-left w-full" dir="ltr">
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 select-none">
                              Powered by: {aiFatwaResult.modelName}
                            </span>
                          </div>
                        )}
                      </div>
                   </div>
                   
                   {aiFatwaResult.hadiths && aiFatwaResult.hadiths.length > 0 && (
                     <div className="mt-8">
                       <h3 className="text-xl font-bold font-arabic mb-6 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                         <ShieldCheck size={28} /> الأحاديث الصحيحة المعتمد عليها في الإجابة:
                       </h3>
                       <div className={layoutMode === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-8'}>
                          {aiFatwaResult.hadiths.map((item, idx) => {
                            const isSelected = selectedItems.some(i => i.Description === item.Description);
                            const isSaved = isHadithSaved(item);
                            return (
                              <div id={`fatwa-hadith-${idx}`} key={idx} onClick={() => isSelectionMode ? toggleSelection(item) : setSelectedHadith(item)}
                                className={`group p-6 sm:p-8 rounded-[2rem] border-r-[8px] border-y border-l transition-all duration-500 cursor-pointer hover:shadow-lg ${layoutMode === 'list' ? 'flex flex-col md:flex-row md:items-start gap-4' : 'flex flex-col'} ${
                                  isSelected ? 'bg-amber-50 border-amber-500 scale-[0.98]' : 'border-emerald-700 bg-white dark:bg-slate-800 hover:-translate-y-1'
                                }`}
                              >
                                <div className={`flex justify-between items-center ${layoutMode === 'list' ? 'md:flex-col md:w-1/4 md:items-start md:border-l mb-0' : 'mb-6'}`}>
                                  <div className="flex items-center gap-2">
                                     <span className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold px-2 py-1 rounded-md text-xs">[{idx + 1}]</span>
                                     <span className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 font-arabic">{formatBookName(item.path || item.Path)}</span>
                                  </div>
                                  <div className={`flex items-center gap-2 ${layoutMode === 'list' ? 'md:mt-4' : ''}`}>
                                    {isSelectionMode ? (
                                      <div className={`p-2 rounded-full border-2 ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 text-transparent'}`}><Check size={18} /></div>
                                    ) : (
                                      <>
                                        {hasAiCapabilities && (
                                          <>
                                            <button onClick={(e) => { e.stopPropagation(); handleAiAction(item, 'explain'); }} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors shadow-sm border border-blue-100 dark:border-blue-800" title="شرح الذكاء الاصطناعي"><Sparkles size={18} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleAiAction(item, 'translate'); }} className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100 dark:border-indigo-800" title="الترجمة للإنجليزية"><Languages size={18} /></button>
                                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                          </>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); setShowSaveModal(item); }} className={`p-2 rounded-full transition-colors ${isSaved ? 'text-emerald-600' : 'bg-slate-100 text-slate-400 hover:text-emerald-600'}`}><BookmarkPlus size={18} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboardRaw(getCleanText(item), idx); }} className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-emerald-600">{copyFeedback === idx ? <Check size={18} /> : <Copy size={18} />}</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div 
                                  style={{ fontSize: `${fontSize}px` }}
                                  className={`leading-loose font-arabic text-slate-800 dark:text-white ${layoutMode === 'list' ? 'md:w-3/4 line-clamp-3' : 'line-clamp-4 flex-grow'}`}
                                  dangerouslySetInnerHTML={{ __html: formatText(item.Description, searchTerm) }}
                                />
                              </div>
                            );
                          })}
                       </div>
                     </div>
                   )}
                 </div>
              )}

              {/* --- Regular / AI Results Grid --- */}
              {(viewMode === 'search' || (viewMode === 'favorites' && activeGroup)) && !isSearching && searchMode !== 'fatwa' && (
                <>
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
                                  {hasAiCapabilities && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); handleAiAction(item, 'explain'); }} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors shadow-sm border border-blue-100 dark:border-blue-800" title="شرح الذكاء الاصطناعي"><Sparkles size={18} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleAiAction(item, 'translate'); }} className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100 dark:border-indigo-800" title="الترجمة للإنجليزية"><Languages size={18} /></button>
                                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                    </>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); setShowSaveModal(item); }} className={`p-2 rounded-full transition-colors ${isSaved ? 'text-emerald-600' : 'bg-slate-100 text-slate-400 hover:text-emerald-600'}`}><BookmarkPlus size={18} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); copyToClipboardRaw(getCleanText(item), idx); }} className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-emerald-600">{copyFeedback === idx ? <Check size={18} /> : <Copy size={18} />}</button>
                                </>
                              )}
                            </div>
                          </div>
                          <div 
                            style={{ fontSize: `${fontSize}px` }}
                            className={`leading-loose font-arabic text-slate-800 dark:text-white ${layoutMode === 'list' ? 'md:w-3/4 line-clamp-3' : 'line-clamp-4 flex-grow'}`}
                            dangerouslySetInnerHTML={{ __html: formatText(item.Description, searchTerm) }}
                          />
                        </div>
                      );
                    })}
                    {(viewMode === 'search' && searchTerm && filteredResults.length === 0) && (
                      <div className="col-span-full text-center py-24 text-slate-400 font-arabic">
                         <Search size={80} className="mx-auto mb-6 opacity-20" />
                         <p className="text-xl font-bold">لا توجد نتائج تطابق بحثك</p>
                         {searchMode === 'ai' && <p className="text-sm mt-2 text-blue-500">جرب كتابة الموضوع بطريقة أخرى</p>}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* --- Library Browse View --- */}
              {viewMode === 'browse' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in">
                  {availableBooks.map((book, i) => (
                    <div key={i} onClick={() => {
                        const h = allData.filter(item => (item.path||item.Path||'').startsWith(book));
                        setBookContent(h); setReadingBook(book); setReadingIndex(0); setViewMode('read');
                      }} 
                      className="bg-white dark:bg-slate-800/80 p-6 rounded-[2rem] border dark:border-slate-700 cursor-pointer hover:shadow-lg hover:border-emerald-500 group flex flex-col justify-between min-h-[160px]"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors"><Library size={24} /></div>
                        <h3 className="text-lg font-bold font-arabic leading-tight text-slate-900 dark:text-white">{book}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- Reading View (Exact Restored Layout + AI Buttons) --- */}
              {viewMode === 'read' && bookContent.length > 0 && (
                <div className="animate-in fade-in zoom-in-95 duration-500 max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-6 gap-3">
                    <button onClick={() => setViewMode('browse')} className="p-3 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-400 transition-colors shrink-0 shadow-sm">
                       <ArrowRight size={22} />
                    </button>
                    <h2 className="text-xl sm:text-2xl font-black font-arabic text-emerald-800 dark:text-emerald-300 dark:[text-shadow:0_0_6px_rgba(255,215,0,0.7)] text-center truncate flex-1">
                      {readingBook}
                    </h2>
                    <div className="flex gap-1.5 shrink-0">
                      {hasAiCapabilities && <button onClick={() => handleAiAction(bookContent[readingIndex], 'explain')} className="p-3 rounded-full border dark:border-slate-700 bg-white dark:bg-slate-800 hover:text-blue-600 shadow-sm" title="شرح الذكاء الاصطناعي"><Sparkles size={20} /></button>}
                      <button onClick={() => setShowSaveModal(bookContent[readingIndex])} className="p-3 rounded-full border dark:border-slate-700 bg-white dark:bg-slate-800 hover:text-emerald-600 shadow-sm" title="حفظ">
                        {isHadithSaved(bookContent[readingIndex]) ? <BookmarkCheck size={20} className="text-emerald-500"/> : <BookmarkPlus size={20} />}
                      </button>
                      <button onClick={() => copyToClipboardRaw(getCleanText(bookContent[readingIndex]), 'reader')} className="p-3 rounded-full border dark:border-slate-700 bg-white dark:bg-slate-800 hover:text-emerald-600 shadow-sm" title="نسخ">
                        {copyFeedback === 'reader' ? <Check size={20} className="text-emerald-500"/> : <Copy size={20} />}
                      </button>
                      <button onClick={() => handlePrintSpecific([bookContent[readingIndex]])} className="p-3 rounded-full border dark:border-slate-700 bg-white dark:bg-slate-800 hover:text-emerald-600 shadow-sm" title="طباعة">
                        <Printer size={20} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800/90 rounded-[2rem] shadow-lg border dark:border-slate-700 flex flex-col w-full overflow-hidden" style={{ height: '65vh', minHeight: '400px', maxHeight: '800px' }}>
                    <div ref={scrollContainerRef} onScroll={checkScrollPosition} className="p-6 sm:p-10 overflow-y-auto flex-grow custom-scrollbar relative">
                      <div className="absolute top-4 left-4 px-3 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg font-mono text-xs font-bold text-slate-500 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600">
                        {readingIndex + 1} / {bookContent.length}
                      </div>
                      <div style={{ fontSize: `${fontSize}px`, marginTop: '10px' }} className="leading-loose font-arabic text-justify text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: formatText(bookContent[readingIndex].Description, '') }} />
                    </div>
                    <div className="p-4 sm:p-5 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                      <button onClick={handleSmartNext} disabled={isAtBottom && readingIndex === bookContent.length - 1} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors font-bold shadow-sm"><ArrowRight size={20} /> التالي</button>
                      <button onClick={() => setReadingIndex(p => Math.max(0, p - 1))} disabled={readingIndex === 0} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors font-bold shadow-sm">السابق <ArrowLeft size={20} /></button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- Favorites Landing View --- */}
              {viewMode === 'favorites' && !activeGroup && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-8">
                     <FolderHeart size={32} className="text-emerald-600" />
                     <h2 className="text-3xl font-bold font-arabic text-slate-900 dark:text-white">مجموعاتي المحفوظة</h2>
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
                            <h3 className="text-2xl font-bold font-arabic mb-2 text-slate-900 dark:text-white">{groupName}</h3>
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

              {/* Header for Active Group */}
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
            </div>
          )}
        </main>

        {/* --- PWA Install Prompt Banner --- */}
        {showPwaPrompt && (
          <div className="fixed bottom-4 left-4 right-4 z-[400] animate-in slide-in-from-bottom-full font-arabic">
            <div className="max-w-md mx-auto bg-emerald-800 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 border border-emerald-600">
               <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-xl hidden sm:block"><Smartphone size={24} /></div>
                 <div>
                   <h4 className="font-bold text-lg leading-tight">تثبيت التطبيق</h4>
                   <p className="text-xs text-emerald-200 mt-1">أضف التطبيق لشاشتك لتجربة أسرع بدون إنترنت.</p>
                 </div>
               </div>
               <div className="flex items-center gap-2 shrink-0">
                 <button onClick={handleInstallPwa} className="px-4 py-2 bg-white text-emerald-800 font-bold rounded-xl text-sm hover:bg-slate-100 transition-colors">تثبيت</button>
                 <button onClick={dismissPwaPrompt} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
               </div>
            </div>
          </div>
        )}
      </div>
      {/* END MAIN WRAPPER */}

      {/* ========================================================================= */}
      {/* --- ALL OVERLAYS AND MODALS (Hidden during print) --- */}
      {/* ========================================================================= */}
      <div className={printItems.length > 0 ? 'hidden' : 'block'}>
        
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
                 <div className="w-full h-px bg-white/10 my-2"></div>
                 <button onClick={() => { setShowIntroModal(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors"><BookOpen size={24} className="text-emerald-300" /> مقدمة الجنى الداني</button>
                 <button onClick={() => { setShowSettingsModal(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors"><Settings size={24} className="text-emerald-300" /> إعدادات الذكاء الاصطناعي</button>
                 <button onClick={() => { setShowAboutModal(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors"><Info size={24} className="text-emerald-300" /> عن التطبيق والشروط</button>
                 <button onClick={() => { setShowHelpModal(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors"><BookOpen size={24} className="text-emerald-300" /> دليل الاستخدام</button>
                 <div className="w-full h-px bg-white/10 my-2"></div>
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl text-white">
                   <span className="font-arabic font-bold text-lg">حجم الخط:</span>
                   <div className="flex gap-2">
                      <button onClick={() => setFontSize(prev => Math.min(prev + 2, 40))} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><ZoomIn size={24}/></button>
                      <button onClick={() => setFontSize(prev => Math.max(prev - 2, 14))} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><ZoomOut size={24}/></button>
                   </div>
                 </div>
                 <button onClick={() => { setIsDarkMode(!isDarkMode); setIsMobileMenuOpen(false); }} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-arabic font-bold text-lg transition-colors">
                   <span>الوضع الداكن</span>
                   {isDarkMode ? <Sun size={24} className="text-amber-400" /> : <Moon size={24} />}
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Settings Modal (AI Configuration) --- */}
        {showSettingsModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 font-arabic" style={{ zIndex: 500 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowSettingsModal(false)}></div>
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-emerald-100 dark:border-slate-700 animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><Settings size={28} className="text-slate-500" /> إعدادات الذكاء الاصطناعي</h2>
                  <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
               </div>
               
               <div className="space-y-6">
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                    <p className="mb-3">لتفعيل ميزات الذكاء الاصطناعي (البحث الذكي، الفتوى، الشرح والترجمة) في حال عدم دعم متصفحك للمحرك الداخلي، يمكنك الحصول على مفتاح API مجاني من جوجل:</p>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      انقر هنا للانتقال إلى موقع Google AI Studio <ChevronRight size={14}/>
                    </a>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">مفتاح API (Gemini API Key):</label>
                    <input 
                       type="password" 
                       value={userApiKey} 
                       onChange={e => {
                         setUserApiKey(e.target.value);
                         localStorage.setItem('jana_gemini_api_key', e.target.value);
                       }} 
                       placeholder="الصق المفتاح الخاص بك هنا..." 
                       className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-sm font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400" 
                    />
                 </div>

                 <div className="mt-4">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">اختر نموذج الذكاء الاصطناعي (Model):</label>
                    <select
                       value={selectedAiModel}
                       onChange={e => {
                         setSelectedAiModel(e.target.value);
                         localStorage.setItem('jana_gemini_model', e.target.value);
                       }}
                       className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-sm font-bold text-slate-800 dark:text-slate-100"
                       dir="ltr"
                    >
                       <option value="gemini-nano">Gemini Nano (محلي بالكامل - بدون إنترنت)</option>
                       <option value="gemini-3.6-flash">gemini-3.6-flash (سريع وممتاز - مستحسن)</option>
                       <option value="gemini-3.5-flash">gemini-3.5-flash (مستقر وعام)</option>
                       <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (سريع جداً وخفيف)</option>
                       <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (احترافي ودقيق)</option>
                    </select>
                 </div>
                 
                 <div className="flex items-start sm:items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                   <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                   <p>يتم حفظ هذه الإعدادات والمفتاح محلياً في جهازك فقط ولن يتم إرسالها لأي جهة سوى خوادم Google.</p>
                 </div>
                 
                 <button onClick={() => setShowSettingsModal(false)} className="w-full py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm text-lg">حفظ وإغلاق</button>
               </div>
            </div>
          </div>
        )}

        {/* --- AI Action Modal (Explain / Translate) --- */}
        {aiActionModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 300 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in" onClick={() => setAiActionModal(null)}></div>
            <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col bg-white dark:bg-slate-800 border-2 animate-in zoom-in-95
               ${aiActionModal.type === 'explain' ? 'border-blue-400 dark:border-blue-800' : 'border-indigo-400 dark:border-indigo-800'}
            `}>
              <div className={`px-6 py-5 border-b dark:border-slate-700 flex justify-between items-center text-white
                 ${aiActionModal.type === 'explain' ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-500'}
              `}>
                <div className="flex items-center gap-3 font-bold font-arabic text-lg">
                   {aiActionModal.type === 'explain' ? <Sparkles size={24} /> : <Languages size={24} />}
                   {aiActionModal.type === 'explain' ? 'شرح الحديث النبوي' : 'الترجمة الاحترافية (Translation)'}
                </div>
                <button onClick={() => setAiActionModal(null)} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 sm:p-8 overflow-y-auto flex-grow custom-scrollbar relative flex flex-col">
                 {aiActionModal.loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 flex-grow">
                       <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4 ${aiActionModal.type === 'explain' ? 'border-blue-500' : 'border-indigo-500'}`}></div>
                       <p className="font-arabic font-bold text-lg animate-pulse">جاري صياغة {aiActionModal.type === 'explain' ? 'الشرح' : 'الترجمة'} بذكاء...</p>
                    </div>
                 ) : (
                    <div className="space-y-6 flex flex-col flex-grow">
                       <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
                          <p className="text-sm font-bold text-slate-400 mb-2 font-arabic">الحديث الأصلي:</p>
                          <div style={{ fontSize: `${Math.max(16, fontSize - 2)}px` }} className="font-arabic leading-loose text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: formatText(aiActionModal.item.Description) }} />
                       </div>
                       <div className="flex-grow">
                          <p className={`text-sm font-bold mb-3 font-arabic flex items-center gap-2 ${aiActionModal.type === 'explain' ? 'text-blue-600' : 'text-indigo-600'}`}>
                            <Bot size={18} /> {aiActionModal.type === 'explain' ? 'التوضيح والفوائد:' : 'English Translation:'}
                          </p>
                          <div 
                             style={{ fontSize: `${fontSize}px` }} 
                             className={`leading-relaxed text-slate-900 dark:text-white text-justify ${aiActionModal.type === 'translate' ? 'font-sans' : 'font-arabic'}`} 
                             dir={aiActionModal.type === 'translate' ? 'ltr' : 'rtl'}
                             dangerouslySetInnerHTML={{ __html: formatAiText(aiActionModal.result) }}
                          />
                       </div>
                       
                       {/* AI Model Name Indicator */}
                       {aiActionModal.modelName && (
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-left shrink-0" dir="ltr">
                             <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 select-none">
                               Powered by: {aiActionModal.modelName}
                             </span>
                          </div>
                       )}
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
                   {/* AI Buttons in Modal */}
                   {hasAiCapabilities && (
                     <>
                       <button onClick={() => { setSelectedHadith(null); handleAiAction(selectedHadith, 'explain'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                         <Sparkles size={18}/> <span className="font-arabic hidden sm:inline">شرح ذكي</span>
                       </button>
                       <button onClick={() => { setSelectedHadith(null); handleAiAction(selectedHadith, 'translate'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                         <Languages size={18}/> <span className="font-arabic hidden sm:inline">ترجمة</span>
                       </button>
                       <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                     </>
                   )}

                   <button onClick={() => setShowSaveModal(selectedHadith)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border dark:border-slate-600 shadow-sm hover:bg-slate-50 transition-colors text-slate-900 dark:text-white">
                     {isHadithSaved(selectedHadith) ? (
                       <><BookmarkCheck size={18} className="text-emerald-600"/> <span className="font-arabic hidden sm:inline">محفوظ</span></>
                     ) : (
                       <><BookmarkPlus size={18} className="text-emerald-700"/> <span className="font-arabic hidden sm:inline">حفظ</span></>
                     )}
                   </button>
                   <button onClick={() => copyToClipboardRaw(getCleanText(selectedHadith), 'modal')} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border dark:border-slate-600 shadow-sm hover:bg-slate-50 transition-colors text-slate-900 dark:text-white">
                     {copyFeedback === 'modal' ? <Check size={18} className="text-emerald-600"/> : <Copy size={18} className="text-emerald-700"/>} <span className="font-arabic hidden sm:inline">نسخ</span>
                   </button>
                   <button onClick={() => handleShare(selectedHadith)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border dark:border-slate-600 shadow-sm hover:bg-slate-50 transition-colors text-slate-900 dark:text-white">
                     <Share2 size={18} className="text-blue-600"/> <span className="font-arabic hidden sm:inline">مشاركة</span>
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
                 <div style={{ fontSize: `${fontSize + 4}px` }} className="leading-loose font-arabic text-justify selection:bg-emerald-200 text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: formatText(selectedHadith.Description, searchTerm) }} />
              </div>
            </div>
          </div>
        )}

        {/* --- About Modal (Scrolling enabled) --- */}
        {showAboutModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 font-arabic" style={{ zIndex: 200 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowAboutModal(false)}></div>
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-2xl border border-emerald-100 dark:border-slate-700 text-center animate-in zoom-in-95 overflow-y-auto max-h-[85vh] custom-scrollbar">
              <Library size={60} className="mx-auto text-emerald-600 mb-4 gold-edge" />
              <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">الجنى الداني من دوحة الألباني</h2>
              <p className="text-slate-500 mb-6 text-sm font-mono">الإصدار 2026.9</p>
              
              <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-8 bg-emerald-50 dark:bg-slate-900 p-5 rounded-xl border border-emerald-100 dark:border-slate-700 space-y-4 text-justify">
                <p>
                نسأل الله أن يتقبل هذا العمل خالصاً لوجهه الكريم. تم تطويره كجهد مستمر لتسهيل الوصول إلى تراث الشيخ المحدث محمد ناصر الدين الألباني رحمه الله تعالى والبحث فيه، امتداداً للبرنامج القديم الذي لم يعد متوفراً في متجر جوجل بعد توقف تطويره منذ سنوات، مع المحافظة على نفس المصادر والتخريجات والكتب. نسأل الله العلي القدير أن يتقبل هذا العمل صدقة جارية، وأن يجعله علماً يُنتفع به. نسألكم الدعاء بظهر الغيب.
                  <br/>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-2 block text-slate-900 dark:text-white">قام بتطويره: المهندس معاذ مأمون حموش</span>
                </p>
                <hr className="border-emerald-200 dark:border-slate-700" />
                <p dir="ltr" className="font-sans text-left">
                ​We ask Allah to accept this work purely for His Honorable sake. It was developed as a continuous effort to facilitate access to and search within the legacy of the Muhaddith, Sheikh Muhammad Nasir al-Din al-Albani, may Allah have mercy on him. This serves as an extension of the old application, which is no longer available on the Google Play Store after its development ceased years ago, while maintaining the exact same sources, references (Takhrijat), and books. We ask Allah the Almighty to accept this work as an ongoing charity (Sadaqah Jariyah) and as beneficial knowledge. We kindly ask you to keep us in your unseen prayers.
                  <br/>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-2 block text-slate-900 dark:text-white">Developed by: Eng. Moaz Mamoun Hammosh</span>
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
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setGroupAction({type: null, groupName: ''})}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 font-arabic animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-900 dark:text-white">تغيير اسم المجموعة</h3><button onClick={() => setGroupAction({type: null, groupName: ''})} className="text-slate-400 hover:text-rose-500"><X size={24}/></button></div>
              <div className="space-y-4">
                <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} placeholder="الاسم الجديد..." className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-slate-900 dark:text-white dark:placeholder-slate-400" />
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
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setGroupAction({type: null, groupName: ''})}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 font-arabic animate-in fade-in zoom-in-95 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">تأكيد الحذف</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">هل أنت متأكد من حذف مجموعة <b className="text-slate-800 dark:text-slate-200">"{groupAction.groupName}"</b>؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex w-full gap-3 mt-2">
                <button onClick={handleDeleteGroup} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm">حذف نهائي</button>
                <button onClick={() => setGroupAction({type: null, groupName: ''})} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm">إلغاء</button>
              </div>
            </div>
          </div>
        )}

        {/* --- Group Duplicate Modal --- */}
        {groupAction.type === 'duplicate' && (
          <div className="fixed inset-0 flex items-center justify-center p-4 font-arabic" style={{ zIndex: 300 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setGroupAction({type: null, groupName: ''})}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><Copy size={32} /></div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">تكرار المجموعة</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">هل تريد إنشاء نسخة مطابقة من مجموعة <b className="text-slate-800 dark:text-slate-200">"{groupAction.groupName}"</b>؟</p>
              <div className="flex w-full gap-3 mt-2">
                <button onClick={confirmDuplicateGroup} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm">نعم، إنشاء نسخة</button>
                <button onClick={() => setGroupAction({type: null, groupName: ''})} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm">إلغاء</button>
              </div>
            </div>
          </div>
        )}

        {/* --- Save to Group Modal --- */}
        {showSaveModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 font-arabic" style={{ zIndex: 400 }}>
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowSaveModal(null)}></div>
             <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white"><BookmarkPlus size={24} className="text-emerald-500"/> حفظ الحديث في مجموعة</h3>
                   <button onClick={() => setShowSaveModal(null)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
                </div>
                
                <div className="space-y-6">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">إضافة إلى مجموعة موجودة:</label>
                     <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {Object.keys(savedGroups).length > 0 ? Object.keys(savedGroups).map(g => (
                           <button key={g} onClick={() => handleSaveToGroup(g)} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-sm transition-colors border border-transparent dark:border-slate-600 hover:border-emerald-300 flex items-center gap-2 shadow-sm">
                             <FolderHeart size={16} className="text-emerald-600 dark:text-emerald-400" /> {g}
                           </button>
                        )) : <p className="text-sm text-slate-400 italic">لا توجد مجموعات سابقة.</p>}
                     </div>
                   </div>
                   
                   <div className="relative pt-6 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-slate-200 dark:before:bg-slate-700">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">أو إنشاء مجموعة جديدة:</label>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                           type="text" 
                           value={newGroupName} 
                           onChange={e => setNewGroupName(e.target.value)} 
                           placeholder="اكتب اسم المجموعة الجديدة..." 
                           className="w-full sm:flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400" 
                        />
                        <button 
                           onClick={() => handleSaveToGroup(newGroupName)} 
                           disabled={!newGroupName.trim()} 
                           className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm whitespace-nowrap"
                        >
                           إنشاء وحفظ
                        </button>
                     </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl font-arabic font-bold animate-in slide-in-from-bottom-4 flex items-center gap-2 border border-slate-700" style={{ zIndex: 600 }}>
            <CheckCircle2 size={18} className="text-emerald-400" />
            {toastMessage}
          </div>
        )}

        {/* --- Help Modal --- */}
        <HelpModal 
           isOpen={showHelpModal} 
           onClose={() => setShowHelpModal(false)} 
           />

           {/* --- Introduction Modal --- */}
           <IntroModal
              isOpen={showIntroModal}
              onClose={() => setShowIntroModal(false)}
           />

      </div>

      {/* --- INVISIBLE PRINT ENGINE --- */}
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
        
        .custom-scrollbar::-webkit-scrollbar { width: 14px; height: 14px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background-color: rgba(148, 163, 184, 0.4); border-radius: 100px; 
          border: 4px solid transparent; background-clip: content-box; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(148, 163, 184, 0.7); }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(71, 85, 105, 0.4); }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(71, 85, 105, 0.8); }
        
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        
        .gold-edge { filter: drop-shadow(0px 0px 3px rgba(255, 215, 0, 0.7)); }
        .gold-text-shadow { text-shadow: 0px 0px 4px rgba(255, 215, 0, 0.6); }
        
        ::selection { background-color: rgba(16, 185, 129, 0.25); color: inherit; }
        .dark ::selection { background-color: rgba(16, 185, 129, 0.35); color: inherit; }
        
        @media print {
           @page { margin: 2cm; }
           body, html, #root { background: white !important; height: auto !important; overflow: visible !important; position: relative !important; }
        }
      `}} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}