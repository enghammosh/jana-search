import React, { useState } from 'react';
import { X, BookOpen, ZoomIn, ZoomOut } from 'lucide-react';

export default function IntroModal({ isOpen, onClose }) {
  // State to handle the full-screen image viewer
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // State to handle the text font size
  const [textFontSize, setTextFontSize] = useState(18);

  if (!isOpen) return null;

  // Placeholder name for your image - change "intro-photo.png" to your actual file path
  const imageSrc = "intro-photo.png"; 

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };

  return (
    <>
      {/* --- Main Introduction Modal --- */}
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 200 }} dir="rtl">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col animate-in zoom-in-95 border border-emerald-100 dark:border-slate-700">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-100 dark:bg-slate-800 rounded-t-[2rem]">
            <h2 className="text-2xl font-bold font-arabic flex items-center gap-2" style={{ color: '#03828F' }}>
              <BookOpen size={28} /> مقدمة الجنى الداني
            </h2>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-1 shadow-sm">
                <button onClick={() => setTextFontSize(prev => Math.min(prev + 2, 40))} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300 transition-colors" title="تكبير الخط"><ZoomIn size={20}/></button>
                <button onClick={() => setTextFontSize(prev => Math.max(prev - 2, 14))} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300 transition-colors" title="تصغير الخط"><ZoomOut size={20}/></button>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-colors text-slate-700 dark:text-slate-300">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 sm:p-10 overflow-y-auto flex-grow custom-scrollbar font-arabic leading-loose text-justify" style={{ fontSize: `${textFontSize}px` }}>
            
            <p className="text-center font-bold mb-6" style={{ color: '#1F4E79', fontSize: '22px' }}>بسم الله الرحمن الرحيم</p>
            
            <p className="mb-4" style={{ color: '#1F4E79' }}>
              إنّ الحمد لله نحمده ونستعينه ونستغفره ، ونعوذ بالله من شرور أنفسنا وسيئات أعمالنا من يهده الله فلا مضل له ومن يضلل فلا هادي له ، وأشهد أن لا إله إلا الله وحده لا شريك له وأشهد أن محمداً عبده ورسوله.
            </p>
            
            <p className="mb-4">
              <span style={{ color: '#1F4E79' }}>(</span><span style={{ color: 'red' }}>يَاأَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُونَ</span><span style={{ color: '#1F4E79' }}>).</span>
            </p>
            <p className="mb-4">
              <span style={{ color: '#1F4E79' }}>(</span><span style={{ color: 'red' }}>يَاأَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُمْ مِنْ نَفْسٍ وَاحِدَةٍ وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ مِنْهُمَا رِجَالًا كَثِيرًا وَنِسَاءً وَاتَّقُوا اللَّهَ الَّذِي تَسَاءَلُونَ بِهِ وَالْأَرْحَامَ إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا</span><span style={{ color: '#1F4E79' }}>).</span>
            </p>
            <p className="mb-4">
              <span style={{ color: '#1F4E79' }}>(</span><span style={{ color: 'red' }}>يَاأَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَقُولُوا قَوْلًا سَدِيدًا (70) يُصْلِحْ لَكُمْ أَعْمَالَكُمْ وَيَغْفِرْ لَكُمْ ذُنُوبَكُمْ وَمَنْ يُطِعِ اللَّهَ وَرَسُولَهُ فَقَدْ فَازَ فَوْزًا عَظِيمًا</span><span style={{ color: '#1F4E79' }}>).</span>
            </p>
            
            <p className="mb-4" style={{ color: '#1F4E79' }}>
              أما بعد، فإن أصدق الحديث كتاب الله، وخير الهدي هدي محمد صلى الله عليه وسلم، وشرّ الأمور محدثاتها، وكل محدثة بدعة وكل بدعة ضلالة وكل ضلالة في النار.
            </p>
            
            <p className="mb-4" style={{ color: '#1F4E79' }}>
              ثم أما بعد، فقد دخل الحاسوب كل بيت بل وكل مكان، وعزز وجوده فيه بأقوى المبررات. فما عاد اقتناؤه كماليا، ولا استعماله ترفيهيا. إنه بحق، وسيلة العلم والبحث والمعرفة حديثا، وبلا منازع. ولا يُنْكَر أن غياب القصد الجاد النافع قد ينحرف بالحاسوب واستخدامه عن المسار الصحيح ، لكن لا عبرة بالمخالف ... وما إخال أحدا ممن تعامل مع هذا الجهاز العجيب، إلا حَسِبَه، في لحظة من اللحظات، باباً من أبواب (السحر)، لفرط الدقة، وسرعة الأداء. (<span style={{ color: 'red' }}>وَلَا يُفْلِحُ السَّاحِرُ حَيْثُ أَتَى</span>) لكنَّ فلاح الحاسوب في أنَّ (سحره) حلال.
            </p>

            <p className="mb-4" style={{ color: '#1F4E79' }}>
              ولم يَعُدْ توظيف الحاسوب في أي علم أو فن أو حرفة أو مهارة، خياراً لأربابها ... بل تعداه إلى الحتم، فتراهم يوفضون إلى ذاك (السحر) يتعلمونه ويعملون به.
            </p>

            <p className="mb-4" style={{ color: '#1F4E79' }}>
              والعلوم الإسلامية كانت أكثر حفاوة، وأسعد حظا، وأوفر نصيبا، في التعامل معه، والإفادة منه. لوفرتها وغزارة مادتها وتنوع أبوابها. ولاتساع الرقعة التاريخية التي تحتلها في التجربة الإنسانية. فالقرآن وعلومه، والتفسير ورواياته، والحديث ودواوينه ورجالاته، والجرح والتعديل وكتب الرجال، ثم الفقه ومذاهبه، ومدارسه ومشاربه، وأصوله وفروعه. مع ما يتمم ذلك من علوم مساندة كاللغة، والنحو، والتاريخ والسير ... فأضحت مكتبة (الحاسوب) الإسلامية حافلة ببرامج، واكبت ثورة المعلوماتية، وأفادت من كل معطياتها. فاستحقت أن يسجل لها ثناء، ويسدى لمن أسهم بها شكر.
            </p>

            <p className="mb-4">
              <span style={{ color: '#1F4E79' }}>على أن طالب العلم، الباحث عن الحق، لا يزال يرى في تلك البرامج ثغرةً لم يَقُم عليها أحد، وخلةً لم يسدها جهد. إنها في مجال السنة النبوية المطهرة، وبالحصر في تمييز صحيحها من سقيمها. وأهمية هذا الأمر ليست بخافية ... فالسنة هي الوحي الثاني. وهي صنو كتاب الله في حجيتها، وهي مع الكتاب الكريم أصل الإسلام، عقيدة وعبادة، شريعة وسلوكا. أجل إن معظم البرامج المتداولة، إن لم نقل كلها، وحتى المتخصصة منها، تنتهي بالباحث، في حديث ما، إلى تخريجه من مظانه (أخرجه البخاري .. مسلم .. أحمد .. الترمذي .. النسائي .. الطبراني .. البيهقي .. إلخ) وإذا استثنينا الصحيحين، المُسَلَّم بصحة ما فيهما، فإن مثل هذه النتيجة تغدو ناقصة بالنسبة لطالب العلم. لا تبلُّ صداه ولا تنقع غليله..! لأن الغاية من البحث في الأحاديث الوقوف على درجتها (صحيح ـ حسن ـ ضعيف ـ موضوع ـ مرفوع ـ موقوف .. إلخ) إذ على ذلك مدار العمل بالنص أو تركه، والاحتجاج به أو سقوطه. وهذه هي الضالة المنشودة لكل باحث في الحديث الشريف ... وللشيخ محمد ناصر الدين الألباني رحمه الله كلام دقيق في تمام المنة صفحة337 يقول: </span>
              <strong style={{ color: '#2E74B5' }}>(... لأن التخريج بالنسبة لدرجة الحديث كالوسيلة مع الغاية، فما الفائدة من الإتيان بالوسيلة دون الغاية؟ وهذه مصيبة عامة لم ينج منها أكثر المؤلفين قديماً وحديثاً والله المستعان)</strong><span style={{ color: '#1F4E79' }}>.</span>
            </p>

            <p className="mb-4">
              <span style={{ color: '#1F4E79' }}>ومن بؤرة الميدان العلمي العملي، ومن معاناة البحث والدرس، ومن تَبَرُّمٍ وضيقٍ، بخلافٍ ذرَّ قرنه بين المسلمين، فأفسد وحدتهم وأذهب ريحهم، زينه لهم الجهل بالسنة، وكرسه فيهم عدم تميز صحيحها من سقيمها، استشعر لفيف من طلبة العلم مسيس الحاجة إلى سد تلك الثغرة .. وتحقيق أمنية منتظرة .. فتوافروا على تقديم هذا الجهد، وإخراج هذا العمل، مستفيدين من محاولات سبقت .. متطلعين إلى مشاركات تأتي .. عدتهم فيه الصبر والإخلاص .. ووسيلتهم إليه ما تحت أيديهم .. ومَكِنَتهم معه جهد المقل .. ولكن (</span>
              <span style={{ color: 'red' }}>وَمَا رَمَيْتَ إِذْ رَمَيْتَ وَلَكِنَّ اللَّهَ رَمَى</span>
              <span style={{ color: '#1F4E79' }}>). ولا جرم أن فارسَ ميدان السنة المعاصر، وابنَ بَجْدَتِها روايةً ودرايةً، وخِرِّيتَ تحقيقها وتصفيتها، محدث الشام الشيخ محمد ناصر الدين الألباني عليه رحمة الله، وجزاه بما هو أهل له. فما عرف القرن الماضي من غاصَ غَوْصَه، وحرص حِرْصَه، يتجسد ذلك في مشروعه الضخم الذي غذاه حياتَه (تقريب السنة بين يدي الأمة). في زمن غربة السنة، وفشو بدعة التقليد، وتعريف الحق بالرجال وليس العكس..!</span>
            </p>

            <p className="mb-4" style={{ color: '#1F4E79' }}>
              ومن هو الألباني؟ المُعَرَّفُ لا يُعرَّف .. فمن اشتهر بأعماله وآثاره، تغني عن ترجمته وأخباره. وها هي كتبه تزين صدر المكتبة .. وتحقيقاته تُوَشِّي حواشي الأسفار .. ومِنْ تَرِكَتهِ العلمية كانت مادة هذا العمل النافع والجهد المتواضع.
            </p>

            <ol className="list-decimal list-inside space-y-2 mb-6" style={{ color: '#1F4E79' }}>
              <li>كان الحرص شديدا أن يستوعب البرنامج كل مؤلفات الشيخ رحمه الله، إلا كتابا لم تنله الأيدي، رغم السعي، فهو غير مطبوع أو غير موجود مثل (مشكاة المصابيح، التحقيق الثاني، التعليقات الجياد .. وغيرها). أو كتابا استبعد لقلة أحاديثه، ولكونها مكررة في الكتب الأخرى، مثل ( التنكيل، ما دل عليه القرآن).</li>
              <li>حددنا مهمة البرنامج أن يوقف المستخدم على متن الحديث، والحكم عليه، مع الإحالة إلى مصادره في كتب الشيخ، بالرقم الخاص أو بالصفحة أو بالأمرين معا. لذلك اكتفينا، من كتب الشيخ في التحقيق مثل (السلسلتان، إرواء الغليل) بأخذ متن الحديث مع درجة الحكم عليه. ومن أراد دراسة السند طلبها في مظانها.</li>
              <li>ما ألفه الشيخ رحمه الله في موضوعات كاملة (ليس تحقيقاً) مثل (تمام المنة، حجة النبي صلى الله عليه وسلم، صفة صلاة النبي صلى الله عليه وسلم، الثمر المستطاب) أثبتت الكتب كاملة لتعدد الفوائد فيها، إضافة للتحقيقات الحديثية.</li>
              <li>الكتب التي حقق الشيخ أحاديثها، وهي لغيره مثل (فقه السيرة للغزالي، العقيدة الطحاوية، صحيح ابن خزيمة...) استخرجنا منها الأحاديث المحققة مع الحكم عليها.</li>
              <li>تم إثبات الأحكام على الأحاديث دون أي تدخل، حتى تلك التي تعارضت بين الكتب (ولذلك مسوغات ذكرها الشيخ في بعض مقدماته أو تعليقاته)، مراعاة لأمانة ودقة النقل، إلا ما صرح الشيخ بالعدول عنه، أو تغيير حكمه عليه، فنأخذ بآخر الأمرين.</li>
              <li>ستكون للبرنامج، بمشيئة الله، إصدارات جديدة تتلافى النقص، وتصحح الخطأ، وتستدرك الفائت، وتضيف الجديد.</li>
              <li>هذا جهد بشري، يعتوره النقص والخطأ، وما تُوقِعُ به السرعة، وقد وقع..! والمرء قليل بنفسه كثير بأخيه، فمرحى ثم مرحى، لمن وقف على خطأٍ، أو خطلٍ، أو خللٍ، فنصح وأصلح، واعتذر عنا ولنا، بحسن النية والضعف البشري.</li>
              <li>لما عزمنا وَسْمَ هذا العمل، استلهمنا فكرة التقريب من تسمية الشيخ لمشروعه القديم، فاعتبرنا عملنا تقريبا للتقريب، وتخيلنا جهد الشيخ سنين طويلة في خدمة الدين من خلال خدمة السنة، دوحة باسقة ذات ثمر، لم تبلغها كثير من الأيدي..! فأدنيناها ويسرنا جناها، بلمسة (سحر الكتروني) واستعرنا لفظ الكتاب الكريم، فقلنا:</li>
            </ol>

            <div className="text-center mt-12 mb-16">
              <h1 className="text-4xl font-bold" style={{ color: '#03828F' }}>الجنى الداني من دوحة الألباني</h1>
            </div>
            
            <p className="mb-12"></p>
            
            <p className="mb-4" style={{ color: '#1F4E79' }}>
              وها نحن أولاء نقدم هذا العمل لطلبة العلم، معينا لهم، بعد توفيق الله على التعامل الواعي مع سنة نبيهم، وهي الوحي الثاني، وعلى العمل بها على بصيرة. ونحتسبه عند الله، عملا صالحا خالصا لوجهه، يوم لا ينفع مال ولا بنون. وجعلنا حقوق هذا العمل لكل مسلم غيور حريص على نشر السنة الصحيحة والتحذير من كل ما لا يصح منها.
            </p>

            <p className="mb-4" style={{ color: '#1F4E79' }}>
              ومِنْ شُكْرِ الله على عونه وتوفيقه، وهو أهل الحمد والشكر، أن نزجي الشكر، دعوة صالحة بظهر الغيب، لكل من أسهم وتعاون وأعان. فجزى الله الجميع كل خير، وأجزل لهم المثوبة.
            </p>

            <p className="mb-8" style={{ color: '#1F4E79' }}>
              والله حسبنا ونعم الوكيل، وصلى الله وسلم على صفوته من خلقه وعلى آله وأصحابه ومن تبعهم بإحسان.
            </p>

            <div className="text-right mr-10">
              <strong className="text-xl" style={{ color: '#833C0B' }}>لفيف من طلبة العلم</strong>
            </div>
            
            <p className="mb-12"></p>
            
            {/* Explicit dividing line with double spacing (margin top & bottom) */}
            <hr className="my-24 border-slate-200 dark:border-slate-700" />

            {/* --- Document Image Section --- */}
            <div className="flex flex-col items-center">
            <h3 className="text-3xl font-bold font-arabic mt-8 mb-8" style={{ color: '#03828F' }}>شعر</h3>
              <div 
                className="cursor-pointer overflow-hidden rounded-xl border-2 border-emerald-200 dark:border-emerald-800 shadow-md hover:shadow-xl transition-all hover:border-emerald-500 dark:hover:border-emerald-500"
                onClick={() => { setIsImageExpanded(true); setZoomLevel(1); }}
              >
                <img 
                  src={imageSrc} 
                  alt="مقدمة الجنى الداني" 
                  className="w-full max-w-md object-contain transition-transform hover:scale-105 bg-white"
                />
              </div>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 italic">انقر على الصورة للتكبير</p>
            </div>

          </div>
        </div>
      </div>

      {/* --- Full-Screen Image Zoom Modal --- */}
      {isImageExpanded && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 sm:p-8" style={{ zIndex: 9999 }} onClick={() => setIsImageExpanded(false)}>
          
          {/* The Window Container */}
          <div className="relative w-full max-w-5xl h-[85vh] sm:h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-transparent dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            
            {/* Window Header with Controls */}
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 z-10 shrink-0">
              <h1 className="font-arabic font-bold text-lg" style={{ color: '#03828F' }}>شعر</h1>
              <div className="flex gap-2">
                <button onClick={handleZoomIn} className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full transition-colors shadow-sm">
                  <ZoomIn size={20} />
                </button>
                <button onClick={handleZoomOut} className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full transition-colors shadow-sm">
                  <ZoomOut size={20} />
                </button>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center"></div>
                <button onClick={() => setIsImageExpanded(false)} className="p-2 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-full transition-colors shadow-sm">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Zoomable Image Container */}
            <div 
              className="flex-1 w-full h-full flex items-center justify-center overflow-auto custom-scrollbar bg-slate-100/50 dark:bg-slate-900/50 p-4 relative"
              style={{ touchAction: 'none' }}
            >
              <img 
                src={imageSrc} 
                alt="شعر مكبرة" 
                className="max-w-none transition-transform duration-300 ease-out rounded-lg shadow-md bg-white"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', cursor: zoomLevel > 1 ? 'grab' : 'zoom-in' }}
              />
            </div>

          </div>
        </div>
      )}
    </>
  );
}