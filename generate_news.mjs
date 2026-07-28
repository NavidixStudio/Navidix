import { GoogleGenAI } from '@google/genai';
import Parser from 'rss-parser';
import fs from 'fs/promises';

// مقداردهی اولیه کلید API و RSS Parser
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const parser = new Parser();

// منابع معتبر خبری هوش مصنوعی
const RSS_FEEDS = [
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'
];

// تصاویر کاور باکیفیت و مرتبط با AI برای بک‌آپ
const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1617791160505-6f00504e3519?q=80&w=800&auto=format&fit=crop'
];

async function generateSEOArticles() {
    console.log("⚡ در حال دریافت جدیدترین اخبار AI...");
    let rawItems = [];

    // ۱. دریافت اخبار خام از RSS
    for (const url of RSS_FEEDS) {
        try {
            const feed = await parser.parseURL(url);
            if (feed.items) {
                rawItems.push(...feed.items.slice(0, 2)); // ۲ خبر برتر از هر منبع
            }
        } catch (e) {
            console.error(`خطا در دریافت RSS از ${url}:`, e.message);
        }
    }

    const processedNews = [];

    // ۲. بازنویسی سئوشده با Gemini
    for (let i = 0; i < Math.min(rawItems.length, 4); i++) {
        const item = rawItems[i];
        console.log(`🧠 در حال پردازش مقاله ${i + 1} با Gemini...`);

        const prompt = `
تو یک سردبیر تخصصی رسانه هوش مصنوعی (برند Navidix) و متخصص SEO هستی.
خبر زیر را خوانده و آن را به یک مقاله کوتاه جذاب، روان و سئوشده به زبان فارسی تبدیل کن.

عنوان خبر: ${item.title}
متن خبر: ${item.contentSnippet || item.content || ''}

خروجی را "دقیقاً و فقط" به فرمت JSON زیر بده بدون هیچ توضیح اضافه:
{
  "title": "عنوان فارسی جذاب و کلیک‌خور (حاوی کلمات کلیدی سئو)",
  "summary": "خلاصه ۲ الی ۳ خطی مقاله برای نمایش در کارت خبر",
  "fullText": "متن کامل مقاله (حدود ۳ تا ۴ پاراگراف تحلیلی، روان و کامل جهت نمایش در مدال سایت)",
  "keyword": "یک کلمه کلیدی انگلیسی ۱ یا ۲ کلمه‌ای برای جستجوی تصویر (مثال: quantum, ai robot, datacenter)"
}
`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const cleanText = response.text.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanText);

            // انتخاب کاور تصویر
            const coverImage = FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];

            processedNews.push({
                id: i + 1,
                title: parsed.title,
                summary: parsed.summary,
                fullText: parsed.fullText,
                coverImage: coverImage,
                sourceUrl: item.link
            });

        } catch (err) {
            console.error("خطا در پردازش مقاله:", err.message);
        }
    }

    // ۳. ذخیره خروجی در فایل news.json
    if (processedNews.length > 0) {
        await fs.writeFile('news.json', JSON.stringify(processedNews, null, 2), 'utf-8');
        console.log("✅ فایل news.json با موفقیت به‌روزرسانی شد!");
    }
}

generateSEOArticles();