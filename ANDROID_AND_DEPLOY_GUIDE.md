# منصة تواصل 24 - Tawasol 24 Messenger
دليل تشغيل وبناء التطبيق وتحويله لتطبيق أندرويد (Android APK)

## محتويات هذا الملف المضغوط:
1. مجلد `dist/`: بناء الإنتاج الجاهز (Production Build) المحتوي على ملفات HTML, CSS, JavaScript والموارد.
2. الكود المصدري الكامل للمشروع (Source Code):
   - `src/`: واجهات React 19 + TypeScript + Tailwind CSS
   - `server.ts`: خادم Express مع WebSocket للمراسلة الفورية وحفظ المحادثات
   - `package.json`, `vite.config.ts`, `tsconfig.json`: إعدادات المشروع

---

## 1. تشغيل المشروع محلياً (Local Development):
1. فك ضغط الملف.
2. تأكد من تثبيت Node.js (الإصدار 18 أو 20 أو أحدث).
3. افتح سطر الأوامر (Terminal) في مجلد المشروع ونفذ:
   ```bash
   npm install
   npm run dev
   ```
4. سيفتح التطبيق على: `http://localhost:3000`

---

## 2. إعادة بناء المشروع (Rebuild):
```bash
npm run build
```
سيتم توليد ملفات البناء الجاهزة داخل مجلد `dist/`.

---

## 3. تحويل التطبيق إلى تطبيق أندرويد (Android APK):
يمكنك تحويل تطبيق تواصل 24 إلى تطبيق أندرويد بعدة طرق سهلة:

### الطريقة الأولى: باستخدام Capacitor (الأسهل والأحدث):
1. داخل مجلد المشروع، قم بتثبيت Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Tawasol 24" "com.tawasol24.app" --web-dir dist
   ```
2. أضف منصة أندرويد:
   ```bash
   npx cap add android
   ```
3. انقل ملفات البناء:
   ```bash
   npx cap copy
   ```
4. افتح المشروع في Android Studio لتوليد ملف الـ APK:
   ```bash
   npx cap open android
   ```
   من قائمة Android Studio: اختر `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.

### الطريقة الثانية: تطبيق Android WebView جاهز في Android Studio:
1. أنشئ تطبيق أندرويد جديد (Empty Views Activity) في Android Studio.
2. ضع ملفات مجلد `dist/` داخل مجلد `app/src/main/assets/www`.
3. اضبط `WebView` في `MainActivity.java` أو `MainActivity.kt` ليقوم بتحميل:
   `webView.loadUrl("file:///android_asset/www/index.html")`
   أو قم بتوجيهه إلى رابط المنصة المنشور مباشرة:
   `webView.loadUrl("https://ais-pre-turpldaj6psjjp2qwngett-691604538697.europe-west2.run.app")`
4. قم بعمل Build APK.

### الطريقة الثالثة: تثبيته مباشرة كتطبيق PWA على هاتف الأندرويد:
التطبيق يدعم تقنية Progressive Web App (PWA) بالكامل، حيث يمكنك:
1. فتح رابط المنصة في متصفح كروم على هاتف الأندرويد.
2. الضغط على خيارات المتصفح (الثلاث نقاط).
3. اختيار "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق" (Install App).
4. سيظهر تطبيق "تواصل 24" في قائمة تطبيقات هاتفك كأي تطبيق أندرويد عادي.
