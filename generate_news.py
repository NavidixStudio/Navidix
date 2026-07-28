import os
import json
import urllib.request
import xml.etree.ElementTree as ET
import google.generativeai as genai

# تنظیمات Gemini API
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("❌ API Key پیدا نشد!")
    exit(1)

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

# لیست RSS Feedهای معتبر تکنولوژی جهان
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
            xml_data = urllib.request.urlopen(req).read()
            root = ET.fromstring(xml_data)
            
            # استخراج ۵ خبر اول هر منبع
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"خطا در دریافت RSS از {source['name']}: {e}")
            
    return news_items[:8] # انتخاب ۸ خبر مهم روز

def generate_article_with_gemini(item):
    prompt = f"""
    شما یک روزنامه‌نگار و تحلیل‌گر ارشد حوزه هوش مصنوعی و تکنولوژی برای برند Navidix هستید.
    بر اساس این تیتر خبری انگلیسی: "{item['title']}" منبع ({item['source']})، یک مقاله تحلیلی جامع و کامل به زبان فارسی بنویسید.

    الزامات بسیار مهم:
    1. title_fa: یک تیتر جذاب، تخصصی و سینمایی فارسی.
    2. summary_fa: خلاصه ۲ خطی جذاب برای کارت مقاله روی سایت.
    3. content_fa: یک مقاله بلند و کامل (حدود ۳۰۰ تا ۴۰۰ کلمه) در ۳ تا ۴ پاراگراف با ادبیات روان، فنی و کاملاً فارسی.
    4. پاسخ را فقط و فقط به فرمت JSON معتبر زیر خروجی دهید (بدون هیچ کد مارک‌داون دیگری):

    {{
        "title_fa": "تیتر فارسی",
        "summary_fa": "خلاصه ۲ خطی",
        "content_fa": "متن کامل مقاله بلند فارسی...",
        "source_name": "{item['source']}",
        "source_link": "{item['link']}",
        "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
    }}
    """
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(cleaned_text)
    except Exception as e:
        print(f"خطا در ساخت مقاله برای {item['title']}: {e}")
        return None

print("🚀 شروع فرآیند دریافت اخبار روزانه...")
raw_news = fetch_rss_news()
generated_articles = []

for item in raw_news:
    print(f"در حال پردازش: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        generated_articles.append(article)

if generated_articles:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump(generated_articles, f, ensure_ascii=False, indent=4)
    print(f"✅ با موفقیت {len(generated_articles)} خبر جدید در news.json ذخیره شد.")
