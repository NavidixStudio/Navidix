import os
import json
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
            xml_data = urllib.request.urlopen(req).read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"خطا در دریافت RSS از {source['name']}: {e}")
            
    return news_items[:6]

def generate_article_with_gemini(item):
    prompt = f"""
    شما سردبیر ارشد مجله تخصصی Navidix هستید. 
    بر اساس این تیتر خبری انگلیسی: "{item['title']}" از منبع {item['source']}، یک مقاله تحلیلی جامع، عمیق و مفصل به زبان فارسی (حداقل ۵۰۰ تا ۷۰۰ کلمه) بنویسید.

    مقاله باید کاملاً حرفه‌ای و دارای بخش‌بندی‌های زیر در متن باشد:
    ۱. مقدمه و جریانات اخیر
    ۲. کالبدشکافی فنی و جزئیات تکنولوژی
    ۳. ابعاد اقتصادی و تاثیر بر بازار هوش مصنوعی
    ۴. چشم‌انداز آینده و نتیجه‌گیری

    فرمت خروجی را دقیقاً و فقط به صورت JSON معتبر زیر ارسال کن (بدون هیچ کد مارک‌داون اضافی):

    {{
        "title_fa": "تیتر جذاب، جذاب و تخصصی فارسی",
        "summary_fa": "خلاصه جذاب دو خطی برای کارت مقاله",
        "content_fa": "### ۱. مقدمه و جریانات اخیر\nمتن مفصل مقدمه...\n\n### ۲. کالبدشکافی فنی\nمتن مفصل بخش فنی...\n\n### ۳. ابعاد اقتصادی و تاثیر بر بازار\nمتن تحلیل بازار...\n\n### ۴. چشم‌انداز آینده\nنتیجه‌گیری نهایی...",
        "source_name": "{item['source']}",
        "source_link": "{item['link']}",
        "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
    }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"خطا در ساخت مقاله برای {item['title']}: {e}")
        return None

print("🚀 شروع تولید مقالات تحلیلی مفصل...")
raw_news = fetch_rss_news()
generated_articles = []

for item in raw_news:
    print(f"در حال تحلیل و نگارش مقاله مفصل برای: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        generated_articles.append(article)

if generated_articles:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump(generated_articles, f, ensure_ascii=False, indent=4)
    print(f"✅ با موفقیت {len(generated_articles)} مقاله مفصل ذخیره شد.")import os
import json
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
            xml_data = urllib.request.urlopen(req).read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"خطا در دریافت RSS از {source['name']}: {e}")
            
    return news_items[:6]

def generate_article_with_gemini(item):
    prompt = f"""
    شما سردبیر ارشد مجله تخصصی Navidix هستید. 
    بر اساس این تیتر خبری انگلیسی: "{item['title']}" از منبع {item['source']}، یک مقاله تحلیلی جامع، عمیق و مفصل به زبان فارسی (حداقل ۵۰۰ تا ۷۰۰ کلمه) بنویسید.

    مقاله باید کاملاً حرفه‌ای و دارای بخش‌بندی‌های زیر در متن باشد:
    ۱. مقدمه و جریانات اخیر
    ۲. کالبدشکافی فنی و جزئیات تکنولوژی
    ۳. ابعاد اقتصادی و تاثیر بر بازار هوش مصنوعی
    ۴. چشم‌انداز آینده و نتیجه‌گیری

    فرمت خروجی را دقیقاً و فقط به صورت JSON معتبر زیر ارسال کن (بدون هیچ کد مارک‌داون اضافی):

    {{
        "title_fa": "تیتر جذاب، جذاب و تخصصی فارسی",
        "summary_fa": "خلاصه جذاب دو خطی برای کارت مقاله",
        "content_fa": "### ۱. مقدمه و جریانات اخیر\nمتن مفصل مقدمه...\n\n### ۲. کالبدشکافی فنی\nمتن مفصل بخش فنی...\n\n### ۳. ابعاد اقتصادی و تاثیر بر بازار\nمتن تحلیل بازار...\n\n### ۴. چشم‌انداز آینده\nنتیجه‌گیری نهایی...",
        "source_name": "{item['source']}",
        "source_link": "{item['link']}",
        "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
    }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"خطا در ساخت مقاله برای {item['title']}: {e}")
        return None

print("🚀 شروع تولید مقالات تحلیلی مفصل...")
raw_news = fetch_rss_news()
generated_articles = []

for item in raw_news:
    print(f"در حال تحلیل و نگارش مقاله مفصل برای: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        generated_articles.append(article)

if generated_articles:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump(generated_articles, f, ensure_ascii=False, indent=4)
    print(f"✅ با موفقیت {len(generated_articles)} مقاله مفصل ذخیره شد.")import os
import json
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
            xml_data = urllib.request.urlopen(req).read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"خطا در دریافت RSS از {source['name']}: {e}")
            
    return news_items[:6]

def generate_article_with_gemini(item):
    prompt = f"""
    شما سردبیر ارشد مجله تخصصی Navidix هستید. 
    بر اساس این تیتر خبری انگلیسی: "{item['title']}" از منبع {item['source']}، یک مقاله تحلیلی جامع، عمیق و مفصل به زبان فارسی (حداقل ۵۰۰ تا ۷۰۰ کلمه) بنویسید.

    مقاله باید کاملاً حرفه‌ای و دارای بخش‌بندی‌های زیر در متن باشد:
    ۱. مقدمه و جریانات اخیر
    ۲. کالبدشکافی فنی و جزئیات تکنولوژی
    ۳. ابعاد اقتصادی و تاثیر بر بازار هوش مصنوعی
    ۴. چشم‌انداز آینده و نتیجه‌گیری

    فرمت خروجی را دقیقاً و فقط به صورت JSON معتبر زیر ارسال کن (بدون هیچ کد مارک‌داون اضافی):

    {{
        "title_fa": "تیتر جذاب، جذاب و تخصصی فارسی",
        "summary_fa": "خلاصه جذاب دو خطی برای کارت مقاله",
        "content_fa": "### ۱. مقدمه و جریانات اخیر\nمتن مفصل مقدمه...\n\n### ۲. کالبدشکافی فنی\nمتن مفصل بخش فنی...\n\n### ۳. ابعاد اقتصادی و تاثیر بر بازار\nمتن تحلیل بازار...\n\n### ۴. چشم‌انداز آینده\nنتیجه‌گیری نهایی...",
        "source_name": "{item['source']}",
        "source_link": "{item['link']}",
        "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
    }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"خطا در ساخت مقاله برای {item['title']}: {e}")
        return None

print("🚀 شروع تولید مقالات تحلیلی مفصل...")
raw_news = fetch_rss_news()
generated_articles = []

for item in raw_news:
    print(f"در حال تحلیل و نگارش مقاله مفصل برای: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        generated_articles.append(article)

if generated_articles:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump(generated_articles, f, ensure_ascii=False, indent=4)
    print(f"✅ با موفقیت {len(generated_articles)} مقاله مفصل ذخیره شد.")import os
import json
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
            xml_data = urllib.request.urlopen(req).read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"خطا در دریافت RSS از {source['name']}: {e}")
            
    return news_items[:6]

def generate_article_with_gemini(item):
    prompt = f"""
    شما سردبیر ارشد مجله تخصصی Navidix هستید. 
    بر اساس این تیتر خبری انگلیسی: "{item['title']}" از منبع {item['source']}، یک مقاله تحلیلی جامع، عمیق و مفصل به زبان فارسی (حداقل ۵۰۰ تا ۷۰۰ کلمه) بنویسید.

    مقاله باید کاملاً حرفه‌ای و دارای بخش‌بندی‌های زیر در متن باشد:
    ۱. مقدمه و جریانات اخیر
    ۲. کالبدشکافی فنی و جزئیات تکنولوژی
    ۳. ابعاد اقتصادی و تاثیر بر بازار هوش مصنوعی
    ۴. چشم‌انداز آینده و نتیجه‌گیری

    فرمت خروجی را دقیقاً و فقط به صورت JSON معتبر زیر ارسال کن (بدون هیچ کد مارک‌داون اضافی):

    {{
        "title_fa": "تیتر جذاب، جذاب و تخصصی فارسی",
        "summary_fa": "خلاصه جذاب دو خطی برای کارت مقاله",
        "content_fa": "### ۱. مقدمه و جریانات اخیر\nمتن مفصل مقدمه...\n\n### ۲. کالبدشکافی فنی\nمتن مفصل بخش فنی...\n\n### ۳. ابعاد اقتصادی و تاثیر بر بازار\nمتن تحلیل بازار...\n\n### ۴. چشم‌انداز آینده\nنتیجه‌گیری نهایی...",
        "source_name": "{item['source']}",
        "source_link": "{item['link']}",
        "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
    }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"خطا در ساخت مقاله برای {item['title']}: {e}")
        return None

print("🚀 شروع تولید مقالات تحلیلی مفصل...")
raw_news = fetch_rss_news()
generated_articles = []

for item in raw_news:
    print(f"در حال تحلیل و نگارش مقاله مفصل برای: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        generated_articles.append(article)

if generated_articles:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump(generated_articles, f, ensure_ascii=False, indent=4)
    print(f"✅ با موفقیت {len(generated_articles)} مقاله مفصل ذخیره شد.")import os
import json
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
            xml_data = urllib.request.urlopen(req).read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"خطا در دریافت RSS از {source['name']}: {e}")
            
    return news_items[:6]

def generate_article_with_gemini(item):
    prompt = f"""
    شما سردبیر ارشد مجله تخصصی Navidix هستید. 
    بر اساس این تیتر خبری انگلیسی: "{item['title']}" از منبع {item['source']}، یک مقاله تحلیلی جامع، عمیق و مفصل به زبان فارسی (حداقل ۵۰۰ تا ۷۰۰ کلمه) بنویسید.

    مقاله باید کاملاً حرفه‌ای و دارای بخش‌بندی‌های زیر در متن باشد:
    ۱. مقدمه و جریانات اخیر
    ۲. کالبدشکافی فنی و جزئیات تکنولوژی
    ۳. ابعاد اقتصادی و تاثیر بر بازار هوش مصنوعی
    ۴. چشم‌انداز آینده و نتیجه‌گیری

    فرمت خروجی را دقیقاً و فقط به صورت JSON معتبر زیر ارسال کن (بدون هیچ کد مارک‌داون اضافی):

    {{
        "title_fa": "تیتر جذاب، جذاب و تخصصی فارسی",
        "summary_fa": "خلاصه جذاب دو خطی برای کارت مقاله",
        "content_fa": "### ۱. مقدمه و جریانات اخیر\nمتن مفصل مقدمه...\n\n### ۲. کالبدشکافی فنی\nمتن مفصل بخش فنی...\n\n### ۳. ابعاد اقتصادی و تاثیر بر بازار\nمتن تحلیل بازار...\n\n### ۴. چشم‌انداز آینده\nنتیجه‌گیری نهایی...",
        "source_name": "{item['source']}",
        "source_link": "{item['link']}",
        "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
    }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"خطا در ساخت مقاله برای {item['title']}: {e}")
        return None

print("🚀 شروع تولید مقالات تحلیلی مفصل...")
raw_news = fetch_rss_news()
generated_articles = []

for item in raw_news:
    print(f"در حال تحلیل و نگارش مقاله مفصل برای: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        generated_articles.append(article)

if generated_articles:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump(generated_articles, f, ensure_ascii=False, indent=4)
    print(f"✅ با موفقیت {len(generated_articles)} مقاله مفصل ذخیره شد.")import os
import json
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
            xml_data = urllib.request.urlopen(req).read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                if title and link:
                    news_items.append({"title": title, "link": link, "source": source["name"]})
        except Exception as e:
            print(f"خطا در دریافت RSS از {source['name']}: {e}")
            
    return news_items[:6]

def generate_article_with_gemini(item):
    prompt = f"""
    شما سردبیر ارشد مجله تخصصی Navidix هستید. 
    بر اساس این تیتر خبری انگلیسی: "{item['title']}" از منبع {item['source']}، یک مقاله تحلیلی جامع، عمیق و مفصل به زبان فارسی (حداقل ۵۰۰ تا ۷۰۰ کلمه) بنویسید.

    مقاله باید کاملاً حرفه‌ای و دارای بخش‌بندی‌های زیر در متن باشد:
    ۱. مقدمه و جریانات اخیر
    ۲. کالبدشکافی فنی و جزئیات تکنولوژی
    ۳. ابعاد اقتصادی و تاثیر بر بازار هوش مصنوعی
    ۴. چشم‌انداز آینده و نتیجه‌گیری

    فرمت خروجی را دقیقاً و فقط به صورت JSON معتبر زیر ارسال کن (بدون هیچ کد مارک‌داون اضافی):

    {{
        "title_fa": "تیتر جذاب، جذاب و تخصصی فارسی",
        "summary_fa": "خلاصه جذاب دو خطی برای کارت مقاله",
        "content_fa": "### ۱. مقدمه و جریانات اخیر\nمتن مفصل مقدمه...\n\n### ۲. کالبدشکافی فنی\nمتن مفصل بخش فنی...\n\n### ۳. ابعاد اقتصادی و تاثیر بر بازار\nمتن تحلیل بازار...\n\n### ۴. چشم‌انداز آینده\nنتیجه‌گیری نهایی...",
        "source_name": "{item['source']}",
        "source_link": "{item['link']}",
        "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
    }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"خطا در ساخت مقاله برای {item['title']}: {e}")
        return None

print("🚀 شروع تولید مقالات تحلیلی مفصل...")
raw_news = fetch_rss_news()
generated_articles = []

for item in raw_news:
    print(f"در حال تحلیل و نگارش مقاله مفصل برای: {item['title']}")
    article = generate_article_with_gemini(item)
    if article:
        generated_articles.append(article)

if generated_articles:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump(generated_articles, f, ensure_ascii=False, indent=4)
    print(f"✅ با موفقیت {len(generated_articles)} مقاله مفصل ذخیره شد.")ر
