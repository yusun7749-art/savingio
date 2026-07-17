from __future__ import annotations
import re, unittest
from pathlib import Path
from factory.rebuild_pilot import TOPICS, OUT, main

ROOT=Path(__file__).resolve().parents[2]

class RebuildPilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): main()

    def test_exactly_five_new_pages(self):
        self.assertEqual(5,len(TOPICS))
        self.assertEqual(5,len(list(OUT.glob('*.html'))))

    def test_every_page_owns_complete_contract(self):
        for topic in TOPICS:
            with self.subTest(topic=topic['file']):
                text=(OUT/topic['file']).read_text(encoding='utf-8')
                self.assertEqual(1,len(re.findall(r'<h1\b',text,re.I)))
                self.assertEqual(1,text.count('data-factory-hero="true"'))
                self.assertEqual(1,text.count('savingio-brain-data.js?v=12'))
                self.assertEqual(1,text.count('savingio-brain-navigation.js?v=12'))
                self.assertEqual(1,text.count('class="rb-related"'))
                self.assertIn('name="viewport"',text)
                self.assertIn('article-rebuild-v1.css?v=1',text)
                self.assertNotIn('factory-remodel-v1',text)
                self.assertNotIn('savingio-article-dna',text)

    def test_search_intents_cover_human_phrases(self):
        pages=''.join(p.read_text(encoding='utf-8') for p in OUT.glob('*.html'))
        for phrase in ('아랫집 누수','윗집누수','일배책 누수','수도계량기 누수','장기충당금','장충금'):
            self.assertIn(phrase,pages)

    def test_calculators_are_only_added_where_relevant(self):
        mapped={t['file']:bool(t.get('calc')) for t in TOPICS}
        for name,expected in mapped.items():
            text=(OUT/name).read_text(encoding='utf-8')
            self.assertEqual(expected,'class="rb-section rb-calc"' in text)

    def test_css_has_desktop_and_mobile_layouts(self):
        css=(ROOT/'css/article-rebuild-v1.css').read_text(encoding='utf-8')
        for token in ('width:min(calc(100% - 36px),920px)','grid-template-columns:repeat(2','@media(max-width:700px)','grid-template-columns:1fr'):
            self.assertIn(token,css)

if __name__=='__main__': unittest.main()
