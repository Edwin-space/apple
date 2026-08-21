import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apple Update Archive',
  description: 'iPhone, Mac, iPad, Apple Watch 핵심 업데이트 아카이브',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <header className="siteHeader">
          <div className="shell headerInner">
            <a className="brand" href="/">Apple Update</a>
            <nav className="nav" aria-label="제품 카테고리">
              <a href="/category/iphone">iPhone</a>
              <a href="/category/mac">Mac</a>
              <a href="/category/ipad">iPad</a>
              <a href="/category/apple-watch">Apple Watch</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
