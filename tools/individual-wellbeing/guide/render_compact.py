from playwright.sync_api import sync_playwright
from pypdf import PdfReader
foot='<div style="font-family:Inter,sans-serif;font-size:6.5pt;color:#5C7285;width:100%;padding:0 0.45in;display:flex;justify-content:space-between"><span>Financial Wellbeing Resource Guide</span><span><span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    pg.goto('file:///home/claude/guide/compact.html'); pg.wait_for_timeout(500)
    pg.pdf(path='Financial-Wellbeing-Resource-Guide.pdf',format='Letter',print_background=True,display_header_footer=True,header_template='<span></span>',footer_template=foot,prefer_css_page_size=True)
    b.close()
print(len(PdfReader('Financial-Wellbeing-Resource-Guide.pdf').pages))
