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

# موضوعات داغ و پیشرفته روز فناوری برای مواقعی که سرورهای ابری گیت‌هاب بلاک میشن
fallback_topics = [
    "Breakthrough in Quantum Computing error correction algorithms",
    "New AI chip architecture reduces data center power consumption by 50 percent",
    "Autonomous AI agents transforming software engineering workflows",
    "Multimodal AI models achieving human-level reasoning in complex physics simulations",
    "Humanoid robots deployed in commercial automotive manufacturing lines"
]

def fetch_rss_news():
    news_items = []
    rss_sources = [
        {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
        {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml"}
    ]
    for source in rss_sources:
        try:
            req = urllib.request.Request(source["url"], headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            xml_data = urllib.request.urlopen(req, timeout=10).read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall('.//item')[:2]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"هشدار: خطا در دریافت RSS از {source['name']}: {e}")
            
    # پشتیبان فوق‌العاده برای جلوگیری از خالی ماندن سایت
    if not news_items:
        print("🔄 استفاده از موضوعات پشتیبان هوش مصنوعی...")
        for topic in fallback_topics[:2]:
            news_items.append({"title": topic, "link": "https://techcrunch.com", "source": "Tech News"})
            
    return news_items[:3]

def clean_json_string(text):
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    return text

def generate_article_with_gemini(item):
    prompt = f"""
    شما سردبیر ارشد مجله تخصصی Navidix هستید.
    بر اساس این موضوع/تیتر: "{item['title']}" از منبع {item['source']}، یک مقاله تحلیلی جامع، مفصل و عمیق به زبان فارسی (حداقل ۵۰۰ کلمه) بنویسید.

    متن مقاله (`content_fa`) باید شامل ۴ بخش زیر با تیتر فرعی باشد:
    ### ۱. مقدمه و ابعاد فنی
    ### ۲. کالبدشکافی تکنولوژی
    ### ۳. تاثیر بر بازار و اقتصاد
    ### ۴. چشم‌انداز آینده

    خروجی را دقیقاً و فقط در فرمت JSON معتبر زیر ارائه دهید:

    {{
        "title_fa": "تیتر جذاب و تخصصی فارسی",
        "summary_fa": "خلاصه دو خطی جذاب برای کارت مقاله",
        "content_fa": "### ۱. مقدمه و ابعاد فنی\\nمتن مفصل مقدمه...\\n\\n### ۲. کالبدشکافی تکنولوژی\\nمتن مفصل بخش فنی...\\n\\n### ۳. تاثیر بر بازار\\nمتن تحلیل بازار...\\n\\n### ۴. چشم‌انداز آینده\\nنتیجه‌گیری نهایی...",
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

print("🚀 شروع تولید مقالات جدید...")
raw_news = fetch_rss_news()
new_generated_articles = []

for item in raw_news:
    print(f"در حال نگارش مقاله برای: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        new_generated_articles.append(article)

existing_articles = []
if os.path.exists('news.js'):
    try:
        with open('news.js', 'r', encoding='utf-8') as f:
            content = f.read()
            match = re.search(r'window\.dynamicNews\s*=\s*(\[.*?\]);', content, re.DOTALL)
            if match:
                existing_articles = json.loads(match.group(1))
    except Exception as e:
        print(f"خطا در خواندن news.js قبلی: {e}")

all_articles = new_generated_articles + existing_articles
all_articles = all_articles[:15]

if all_articles:
    js_content = f"window.dynamicNews = {json.dumps(all_articles, ensure_ascii=False, indent=4)};"
    with open('news.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"✅ با موفقیت مجموعاً {len(all_articles)} مقاله در news.js ذخیره شد.")
else:
    print("⚠️ هیچ مقاله‌ای ساخته نشد.")
