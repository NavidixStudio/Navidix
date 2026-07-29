import os
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
import google.generativeai as genai

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("❌ API Key پیدا نشد!")
    exit(1)

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

rss_sources = [
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
    {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml"},
    {"name": "Wired", "url": "https://www.wired.com/feed/rss"}
]

def fetch_rss_news():
    news_items = []
    for source in rss_sources:
        try:
            req = urllib.request.Request(source["url"], headers={'User-Agent': 'Mozilla/5.0'})
            xml_data = urllib.request.urlopen(req, timeout=10).read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"خطا در دریافت RSS از {source['name']}: {e}")
            
    return news_items[:7]

def clean_json_string(text):
    """استخراج دقیق JSON از بین پاسخ‌های متنی Gemini"""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    return text

def generate_article_with_gemini(item):
    prompt = f"""
    شما سردبیر ارشد مجله تخصصی و تحلیلی Navidix هستید.
    بر اساس این تیتر خبری: "{item['title']}" از منبع {item['source']}، یک مقاله تحلیلی بسیار مفصل، تخصصی و جاندار به زبان فارسی بنویسید.

    الزامات نگارش مقاله:
    - مقاله باید کاملاً طولانی و عمیق باشد (حداقل ۵۰۰ تا ۷۰۰ کلمه).
    - متن مقاله (`content_fa`) باید شامل ۴ بخش با تیترهای فرعی شفاف به صورت زیر باشد:
      ### ۱. مقدمه و ابعاد فنی موضوع
      ### ۲. کالبدشکافی تکنولوژی و معماری
      ### ۳. تاثیر بر بازار هوش مصنوعی و اقتصاد
      ### ۴. چشم‌انداز آینده و نتیجه‌گیری
    - لحن مقاله باید سینمایی، تخصصی و جذاب باشد.

    خروجی را دقیقاً و فقط در فرمت JSON معتبر زیر ارائه دهید (بدون هیچ حرف یا توضیح اضافی قبل و بعد آن):

    {{
        "title_fa": "تیتر جذاب و تخصصی فارسی",
        "summary_fa": "خلاصه دو خطی جذاب برای کارت مقاله",
        "content_fa": "### ۱. مقدمه و ابعاد فنی موضوع\\nمتن مفصل مقدمه...\\n\\n### ۲. کالبدشکافی تکنولوژی\\nمتن مفصل بخش فنی...\\n\\n### ۳. تاثیر بر بازار\\nمتن تحلیل بازار...\\n\\n### ۴. چشم‌انداز آینده\\nنتیجه‌گیری نهایی...",
        "source_name": "{item['source']}",
        "source_link": "{item['link']}",
        "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
    }}
    """
    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        json_str = clean_json_string(raw_text)
        return json.loads(json_str)
    except Exception as e:
        print(f"خطا در ساخت مقاله برای {item['title']}: {e}")
        return None

print("🚀 شروع تولید مقالات تحلیلی مفصل...")
raw_news = fetch_rss_news()
generated_articles = []

for item in raw_news:
    print(f"در حال نگارش مقاله برای: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        generated_articles.append(article)

if generated_articles:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump(generated_articles, f, ensure_ascii=False, indent=4)
    print(f"✅ با موفقیت {len(generated_articles)} مقاله ذخیره شد.")
else:
    print("⚠️ هیچ مقاله‌ای تولید نشد.")
