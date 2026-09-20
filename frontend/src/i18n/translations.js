// frontend/src/i18n/translations.js
//
// 🆕 Translation dictionary. Har key ke 3 versions hain: hindi, english,
// hinglish. Naya text kahin bhi add karna ho, yahan ek naya key banayein
// aur teeno bhaasha mein professional tareeke se likhein.
//
// ABHI KE LIYE COVER KIYA GAYA HAI (Phase 1):
//   • Common/shared buttons aur labels (jo poori site mein baar-baar aate hain)
//   • Bottom Navs (Student + Teacher)
//   • Landing Page
//
// BAAKI PAGES (Login, Signup, Dashboard, Mock Test, Analysis, Admin Panel
// waghera) abhi purani Hinglish text hi dikhayenge chahe koi bhi language
// select ho — unhe agle steps mein, page-by-page convert karna hoga.
export const TRANSLATIONS = {
  // ── Common actions ──
  submit: { hindi: "सबमिट करें", english: "Submit", hinglish: "Submit Karein" },
  cancel: { hindi: "रद्द करें", english: "Cancel", hinglish: "Cancel Karein" },
  save: { hindi: "सेव करें", english: "Save", hinglish: "Save Karein" },
  edit: { hindi: "संपादित करें", english: "Edit", hinglish: "Edit Karein" },
  delete: { hindi: "हटाएं", english: "Delete", hinglish: "Delete Karein" },
  search: { hindi: "खोजें", english: "Search", hinglish: "Search Karein" },
  loading: { hindi: "लोड हो रहा है...", english: "Loading...", hinglish: "Load Ho Raha Hai..." },
  retry: { hindi: "दोबारा प्रयास करें", english: "Try Again", hinglish: "Dobara Try Karein" },
  back: { hindi: "वापस जाएं", english: "Back", hinglish: "Wapas Jaayein" },
  next: { hindi: "आगे बढ़ें", english: "Next", hinglish: "Aage Badhein" },
  yes: { hindi: "हां", english: "Yes", hinglish: "Haan" },
  no: { hindi: "नहीं", english: "No", hinglish: "Nahi" },
  optional: { hindi: "वैकल्पिक", english: "Optional", hinglish: "Optional" },

  // ── Auth ──
  login: { hindi: "लॉग इन करें", english: "Login", hinglish: "Login Karein" },
  logout: { hindi: "लॉग आउट करें", english: "Logout", hinglish: "Logout Karein" },
  signup: { hindi: "साइन अप करें", english: "Sign Up", hinglish: "Signup Karein" },
  email: { hindi: "ईमेल", english: "Email", hinglish: "Email" },
  password: { hindi: "पासवर्ड", english: "Password", hinglish: "Password" },
  phone_number: { hindi: "फ़ोन नंबर", english: "Phone Number", hinglish: "Phone Number" },
  forgot_password: { hindi: "पासवर्ड भूल गए?", english: "Forgot Password?", hinglish: "Password Bhool Gaye?" },

  // ── Nav labels (Student Bottom Nav) ──
  nav_home: { hindi: "होम", english: "Home", hinglish: "Home" },
  nav_mock_test: { hindi: "मॉक टेस्ट", english: "Mock Test", hinglish: "Mock Test" },
  nav_analysis: { hindi: "विश्लेषण", english: "Analysis", hinglish: "Analysis" },
  nav_current_affairs: { hindi: "करेंट अफेयर्स", english: "Current Affairs", hinglish: "Current Affairs" },
  nav_profile: { hindi: "प्रोफ़ाइल", english: "Profile", hinglish: "Profile" },

  // ── Nav labels (Teacher Bottom Nav) ──
  nav_teacher_home: { hindi: "होम", english: "Home", hinglish: "Home" },
  nav_batches: { hindi: "बैच", english: "Batches", hinglish: "Batches" },
  nav_content: { hindi: "कंटेंट", english: "Content", hinglish: "Content" },

  // ── Common page headers ──
  dashboard: { hindi: "डैशबोर्ड", english: "Dashboard", hinglish: "Dashboard" },
  my_profile: { hindi: "मेरी प्रोफ़ाइल", english: "My Profile", hinglish: "Meri Profile" },
  settings: { hindi: "सेटिंग्स", english: "Settings", hinglish: "Settings" },
  language: { hindi: "भाषा", english: "Language", hinglish: "Language" },

  // ── Landing Page ──
  landing_badge: {
    hindi: "सरकारी परीक्षा की तैयारी, अब स्मार्ट तरीके से",
    english: "Government Exam Prep, The Smart Way",
    hinglish: "Sarkari Exam Ki Taiyari, Ab Smart Tareeke Se",
  },
  landing_hero_title: {
    hindi: "हर मॉक टेस्ट के साथ, अपनी कमज़ोरी पहचानो",
    english: "Identify Your Weaknesses With Every Mock Test",
    hinglish: "Har Mock Test Ke Saath, Apni Kamzori Pehchano",
  },
  landing_hero_subtitle: {
    hindi: "यूपीएसएसएससी पीईटी, एसएससी, और अन्य सरकारी परीक्षाओं के लिए — मॉक टेस्ट, पिछले वर्षों के प्रश्नपत्र, करेंट अफेयर्स और विस्तृत विश्लेषण, सब एक ही जगह।",
    english: "For UPSSSC PET, SSC, and other government exams — mock tests, previous year papers, current affairs, and detailed analysis, all in one place.",
    hinglish: "UPSSSC PET, SSC, aur doosre sarkari exams ke liye — mock tests, previous year papers, current affairs aur detailed analysis, sab ek hi jagah.",
  },
  landing_cta_start: { hindi: "मुफ़्त में शुरू करें", english: "Get Started Free", hinglish: "Free Mein Shuru Karein" },
  landing_cta_login: { hindi: "पहले से खाता है? लॉग इन करें", english: "Already Have An Account? Login", hinglish: "Pehle Se Account Hai? Login" },
  landing_student_login: { hindi: "छात्र लॉग इन", english: "Student Login", hinglish: "Student Login" },
  landing_teacher_login: { hindi: "शिक्षक लॉग इन", english: "Teacher Login", hinglish: "Teacher Login" },
  landing_features_title: { hindi: "तैयारी के लिए जो कुछ भी चाहिए", english: "Everything You Need To Prepare", hinglish: "Sab Kuch Jo Taiyari Ke Liye Chahiye" },
  landing_features_subtitle: {
    hindi: "एक प्लेटफ़ॉर्म, जो छात्र और शिक्षक दोनों के लिए बना है",
    english: "One platform, built for both students and teachers",
    hinglish: "Ek platform, jo student aur teacher dono ke liye bana hai",
  },
  landing_feature_mock_title: { hindi: "फुल और मिनी मॉक टेस्ट", english: "Full & Mini Mock Tests", hinglish: "Full & Mini Mock Tests" },
  landing_feature_mock_desc: {
    hindi: "असली परीक्षा पैटर्न के अनुसार, टॉपिक-वाइज़ वेटेज के साथ — जितनी अभ्यास चाहिए उतनी।",
    english: "Matching the real exam pattern with topic-wise weightage — as much practice as you need.",
    hinglish: "Asli exam pattern ke hisaab se, topic-wise weightage ke saath — jitni practice chahiye utni.",
  },
  landing_feature_pyq_title: { hindi: "पिछले वर्षों के प्रश्नपत्र", english: "Previous Year Papers", hinglish: "Previous Year Papers" },
  landing_feature_pyq_desc: {
    hindi: "पिछले वर्षों के असली, हल किए गए प्रश्नपत्र — जानिए परीक्षा में कैसे पूछा जाता है।",
    english: "Real, solved papers from previous years — see exactly how questions are asked.",
    hinglish: "Purane saalon ke asli paper, solved — pata chale ki exam mein kaisa poocha jaata hai.",
  },
  landing_feature_ca_title: { hindi: "रोज़ाना करेंट अफेयर्स", english: "Daily Current Affairs", hinglish: "Daily Current Affairs" },
  landing_feature_ca_desc: {
    hindi: "रोज़ की जीके अपडेट्स, सीधे क्विज़ के साथ — अपने बैच के हिसाब से भी।",
    english: "Daily GK updates with built-in quizzes — even customized for your specific batch.",
    hinglish: "Roz ki GK updates, seedhe quiz ke saath — apne batch ke hisaab se bhi.",
  },
  landing_feature_analysis_title: { hindi: "विस्तृत विश्लेषण", english: "Detailed Analysis", hinglish: "Detailed Analysis" },
  landing_feature_analysis_desc: {
    hindi: "कौन सा टॉपिक कमज़ोर है, कौन सा मज़बूत — सब कुछ ग्राफ़ और आंकड़ों के साथ सामने।",
    english: "See which topics are weak and which are strong — all backed by clear graphs and numbers.",
    hinglish: "Kaunsa topic kamzor hai, kaunsa strong — sab kuch graph aur number ke saath saamne.",
  },
  landing_feature_rank_title: { hindi: "रैंक प्रेडिक्टर", english: "Rank Predictor", hinglish: "Rank Predictor" },
  landing_feature_rank_desc: {
    hindi: "अपना स्कोर डालें, अंदाज़ा लगाएं कि कितनी रैंक आ सकती है — पिछले वर्षों के डेटा के आधार पर।",
    english: "Enter your score to estimate your likely rank — based on previous years' data.",
    hinglish: "Apna score daalo, andaza lagao ki kitni rank aa sakti hai — purane data ke aadhar par.",
  },
  landing_feature_batch_title: { hindi: "अपना बैच, अपना शिक्षक", english: "Your Batch, Your Teacher", hinglish: "Apna Batch, Apna Teacher" },
  landing_feature_batch_desc: {
    hindi: "शिक्षक अपना खुद का बैच बनाता है, अपने छात्रों के लिए कस्टम कंटेंट देता है।",
    english: "Teachers create their own batch and provide custom content for their students.",
    hinglish: "Teacher apna khud ka batch banata hai, apne students ke liye custom content deta hai.",
  },
  landing_teacher_cta_title: { hindi: "क्या आप शिक्षक हैं?", english: "Are You A Teacher?", hinglish: "Aap Teacher Hain?" },
  landing_teacher_cta_desc: {
    hindi: "अपना बैच बनाएं, अपने छात्रों के लिए कस्टम टेस्ट और कंटेंट डालें — अपनी खुद की क्लास ऑनलाइन चलाएं।",
    english: "Create your batch, add custom tests and content for your students — run your own class online.",
    hinglish: "Apna batch banao, apne students ke liye custom test aur content daalo — apni khud ki class online chalao.",
  },
  landing_footer_tagline: {
    hindi: "कमज़ोरी खोजें, ताक़त बनाएं।",
    english: "Find weaknesses, build strength.",
    hinglish: "Find weaknesses, build strength.",
  },
};
