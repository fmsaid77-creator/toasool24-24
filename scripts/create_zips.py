import os
import zipfile
import shutil
import subprocess

def run_build():
    print("Building application with vite...")
    subprocess.run(["npm", "run", "build"], check=True)

def create_zips():
    os.makedirs("public/downloads", exist_ok=True)
    
    # 1. Build dist zip (just the compiled distribution)
    build_zip_path = "public/downloads/tawasol24-build.zip"
    print(f"Creating {build_zip_path}...")
    with zipfile.ZipFile(build_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk("dist"):
            dirs[:] = [d for d in dirs if d != 'downloads']
            if 'downloads' in root.split(os.sep):
                continue
            for file in files:
                if file.endswith('.zip'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, "dist")
                zf.write(full_path, rel_path)
    print(f"Created {build_zip_path} ({os.path.getsize(build_zip_path)} bytes)")

    # 2. Source code zip
    source_zip_path = "public/downloads/tawasol24-project-source.zip"
    print(f"Creating {source_zip_path}...")
    ignore_dirs = {'.git', 'node_modules', 'dist', '.aistudio', '__pycache__', '.vite'}
    ignore_files = {'package-lock.json', '.DS_Store'}
    
    with zipfile.ZipFile(source_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk("."):
            # prune ignore dirs
            dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith('.')]
            if any(part in ignore_dirs for part in root.split(os.sep)):
                continue
            for file in files:
                if file in ignore_files or file.endswith('.zip') or file.startswith('.'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ".")
                if rel_path.startswith("public/downloads"):
                    continue
                zf.write(full_path, rel_path)
    print(f"Created {source_zip_path} ({os.path.getsize(source_zip_path)} bytes)")

    # 3. Create a README guide for Android & Deployment
    readme_content = """# منصة تواصل 24 - Tawasol 24 Messenger
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
"""

    with open("ANDROID_AND_DEPLOY_GUIDE.md", "w", encoding="utf-8") as f:
        f.write(readme_content)

    # 4. Full package (dist + source + readme)
    full_zip_path = "public/downloads/tawasol24-complete-package.zip"
    print(f"Creating {full_zip_path}...")
    with zipfile.ZipFile(full_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Add README
        zf.write("ANDROID_AND_DEPLOY_GUIDE.md", "ANDROID_AND_DEPLOY_GUIDE.md")
        
        # Add dist folder
        for root, dirs, files in os.walk("dist"):
            dirs[:] = [d for d in dirs if d != 'downloads']
            if 'downloads' in root.split(os.sep):
                continue
            for file in files:
                if file.endswith('.zip'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.join("build-dist", os.path.relpath(full_path, "dist"))
                zf.write(full_path, rel_path)
                
        # Add source files
        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith('.')]
            if any(part in ignore_dirs for part in root.split(os.sep)):
                continue
            for file in files:
                if file in ignore_files or file.endswith('.zip') or file.startswith('.'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.join("source-code", os.path.relpath(full_path, "."))
                if rel_path.startswith(os.path.join("source-code", "public/downloads")):
                    continue
                zf.write(full_path, rel_path)
                
    print(f"Created {full_zip_path} ({os.path.getsize(full_zip_path)} bytes)")

if __name__ == "__main__":
    run_build()
    create_zips()
