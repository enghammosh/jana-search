import React, { useState, useEffect } from 'react';
import { X, BookOpen, Loader2, Search, Library, FolderHeart, Sparkles, MessageCircleQuestion, Filter, BookmarkPlus, BookmarkCheck, Copy, Share2, Printer, Edit2, Trash2, Settings, Smartphone, Moon, ZoomIn, ZoomOut, ListChecks, Languages, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function HelpModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('ar');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch the appropriate Markdown file from the public folder whenever the tab changes
  useEffect(() => {
    if (!isOpen) return;
    
    setIsLoading(true);
    const fileName = activeTab === 'ar' ? '/guide_ar.md' : '/guide_en.md';
    
    fetch(fileName)
      .then(res => {
        if (!res.ok) throw new Error('File not found');
        return res.text();
      })
      .then(text => {
        setContent(text);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error loading guide:", err);
        setContent('⚠️ عذراً، تعذر تحميل ملف الدليل. يرجى التأكد من وجود ملفات guide_ar.md و guide_en.md في المجلد العام (public).');
        setIsLoading(false);
      });
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const isAr = activeTab === 'ar';

  // These styles map basic markdown elements to your beautiful Tailwind styling
  const markdownStyles = {
    h3: ({...props}) => <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4" {...props} />,
    h4: ({...props}) => <h4 className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-4 mt-8 border-b border-slate-200 dark:border-slate-700 pb-2" {...props} />,
    p: ({...props}) => <p className="mb-4 text-slate-700 dark:text-slate-300 leading-loose" {...props} />,
    ul: ({...props}) => <ul className={`list-disc space-y-3 mb-6 ${isAr ? 'pr-5' : 'pl-5'}`} {...props} />,
    ol: ({...props}) => <ol className={`list-decimal space-y-3 mb-6 ${isAr ? 'pr-5' : 'pl-5'}`} {...props} />,
    li: ({...props}) => <li className="text-slate-700 dark:text-slate-300 leading-loose" {...props} />,
    strong: ({...props}) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
    em: ({...props}) => <em className="text-slate-500 italic" {...props} />
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 600 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-emerald-100 dark:border-slate-700 flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-emerald-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-[2rem] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl">
              <BookOpen size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-arabic text-emerald-800 dark:text-emerald-400">
              دليل الاستخدام | User Guide
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:text-rose-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Language Tabs */}
        <div className="flex px-6 pt-4 gap-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <button 
            onClick={() => setActiveTab('ar')}
            className={`pb-3 px-4 font-bold font-arabic text-lg transition-colors border-b-2 ${activeTab === 'ar' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            عربي
          </button>
          <button 
            onClick={() => setActiveTab('en')}
            className={`pb-3 px-4 font-bold text-lg transition-colors border-b-2 ${activeTab === 'en' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            English
          </button>
        </div>

        {/* Scrollable Text Area powered by ReactMarkdown */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-grow custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-emerald-600">
               <Loader2 size={40} className="animate-spin mb-4" />
               <p className="font-bold font-arabic">جاري تحميل الدليل...</p>
            </div>
          ) : (
            <div dir={isAr ? "rtl" : "ltr"} className={isAr ? "font-arabic" : "font-sans"}>
              <ReactMarkdown components={markdownStyles}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}