package com.kyoon.resumeagent.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

@Service
public class JobCrawlerService {

    public String crawl(String url) {
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
                    .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                    .header("Accept-Encoding", "gzip, deflate, br")
                    .header("Connection", "keep-alive")
                    .header("Upgrade-Insecure-Requests", "1")
                    .header("Sec-Fetch-Dest", "document")
                    .header("Sec-Fetch-Mode", "navigate")
                    .header("Sec-Fetch-Site", "none")
                    .header("Sec-Fetch-User", "?1")
                    .header("sec-ch-ua", "\"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\"")
                    .header("sec-ch-ua-mobile", "?0")
                    .header("sec-ch-ua-platform", "\"Windows\"")
                    .referrer("https://www.google.com")
                    .timeout(15000)
                    .followRedirects(true)
                    .get();

            doc.select("script, style, header, footer, nav, .blind").remove();
            String text = doc.body().text();

            if (text.length() < 200) {
                throw new RuntimeException("DYNAMIC_SITE");
            }

            return text;

        } catch (RuntimeException e) {
            if (e.getMessage().equals("DYNAMIC_SITE")) {
                throw new RuntimeException("이 사이트는 직접 붙여넣기를 이용해주세요.");
            }
            throw new RuntimeException("크롤링 실패: " + e.getMessage());
        } catch (Exception e) {
            throw new RuntimeException("크롤링 실패: " + e.getMessage());
        }
    }
}