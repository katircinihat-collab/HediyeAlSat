import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeGiftTaxonomy, taxonomy } from '../src/seo/giftTaxonomy.js';
import pages from '../src/seo/seoPages.js';
import { matchesListingToSeoPage as matches, uniqueShowcaseListings } from '../src/seo/listingMatcher.js';
const read = path => fs.readFileSync(path, 'utf8');
const listing = { id: 'real-listing', onay: true, aktif: true, stok: 2, fiyat: 200, baslik: 'Seramik obje', hedefKisiler: ['sevgili', 'kadin'], ozelGunler: ['dogum-gunu'], giftStyles: ['kisiye-ozel'] };
for (const [field, options] of Object.entries(taxonomy)) {
  test(`valid ${field} values normalize without duplication`, () => {
    const id = Object.keys(options)[0];
    assert.deepEqual(normalizeGiftTaxonomy({ [field]: [id, id, ' ' + id + ' ', '<script>', {}, 'unknown'] })[field], [id]);
    assert.deepEqual(normalizeGiftTaxonomy({ [field]: 'arbitrary' })[field], []);
  });
}
for (const slug of ['sevgiliye-hediye', 'kadina-hediye', 'dogum-gunu-hediyeleri', 'sevgiliye-dogum-gunu-hediyesi', 'kadina-kisiye-ozel-hediye', '500-tl-alti-hediyeler']) {
  test(`real listing matches ${slug}`, () => assert.equal(matches(listing, pages[slug]), true));
}
for (const slug of ['anneye-hediye', 'babaya-hediye', 'sevgiliye-yil-donumu-hediyesi', '100-tl-alti-hediyeler', 'romantik-hediyeler']) {
  test(`irrelevant listing excluded from ${slug}`, () => assert.equal(matches(listing, pages[slug]), false));
}
for (const mutation of [{ onay: false }, { aktif: false }, { stok: 0 }, { silindi: true }, { deleted: true }, { fiyat: -1 }, { fiyat: 'invalid' }, { yayinda: false }]) {
  test(`ineligible ${JSON.stringify(mutation)} excluded`, () => assert.equal(matches({ ...listing, ...mutation }, pages['sevgiliye-hediye']), false));
}
test('edits update matching and no duplicate listing IDs are returned', () => {
  assert.equal(matches({ ...listing, hedefKisiler: ['baba'] }, pages['sevgiliye-hediye']), false);
  assert.equal(uniqueShowcaseListings([listing, listing], pages['sevgiliye-hediye']).length, 1);
  assert.deepEqual(uniqueShowcaseListings([], pages['sevgiliye-hediye']), []);
});
test('legacy inference is limited, deterministic and explicit empty selections win', () => {
  const legacy = { id: 'legacy', onay: true, fiyat: 100, baslik: 'El yapımı vazo', kategori: 'Hediyelik Ürünler' };
  assert.equal(matches(legacy, pages['el-yapimi-hediyeler']), true);
  assert.equal(matches(legacy, pages['anneye-hediye']), false);
  assert.equal(matches({ ...legacy, giftStyles: [] }, pages['el-yapimi-hediyeler']), false);
  assert.deepEqual(uniqueShowcaseListings([legacy], pages['el-yapimi-hediyeler']), uniqueShowcaseListings([legacy], pages['el-yapimi-hediyeler']));
});
test('50 routes retained, editorial-only pages stay indexable and do not acquire arbitrary products', () => {
  assert.equal(Object.keys(pages).length, 50);
  assert.equal(Object.values(pages).filter(p => p.showcaseEnabled).length, 47);
  for (const slug of ['anlamli-hediyeler', 'ilginc-hediyeler', 'son-dakika-hediyeleri']) {
    assert.equal(pages[slug].indexable, true);
    assert.equal(matches(listing, pages[slug]), false);
  }
});
test('create and edit share normalized attributes and existing ProductCard is reused', () => {
  for (const file of ['src/components/AddListing.jsx', 'src/pages/EditListing.jsx']) {
    assert.match(read(file), /<GiftAttributes/);
    assert.match(read(file), /\.\.\.normalizeGiftTaxonomy\(ilan\)/);
  }
  assert.match(read('src/pages/SeoLandingPage.jsx'), /<ProductCard/);
  assert.match(read('src/services/seoListings.js'), /limit\(200\)/);
});
test('Tanı page is indexable, has real links and reuses the existing tour', () => {
  const page = read('src/pages/MeetHediyeAlSat.jsx');
  for (const route of ['/ilanlar', '/kapismalar', '/kura', '/a4-tasarimlar', '/profil', '/#ozel-gunler', '/hediye-fikirleri', '/magaza-olustur', '/ilan-ver']) assert.ok(page.includes(route));
  assert.match(page, /startWelcomeTour\(true\)/);
  assert.match(page, /platform komisyonu yalnızca %4/);
  assert.match(page, /XP para değildir/);
  assert.doesNotMatch(page, /noindex|Hediye Ağacı|Sürpriz Kutusu|en düşük komisyon|aggregateRating|receiverUid/);
  assert.match(page, /BreadcrumbList/);
  assert.match(read('public/sitemap.xml'), /https:\/\/hediyealsat.com\/hediyealsati-tani/);
  assert.match(read('src/components/Footer.jsx'), /to="\/hediyealsati-tani"/);
});
test('account logout and scroll/escape/outside interaction retain safe auth', () => {
  const navbar = read('src/components/Navbar.jsx');
  assert.match(navbar, /scrollY > 20 && !menuAcik/);
  assert.match(navbar, /event.key === "Escape"/);
  assert.match(navbar, /!menuRef.current.contains\(e.target\)/);
  for (const file of ['src/components/Navbar.jsx', 'src/pages/Profile.jsx']) {
    assert.match(read(file), /await signOut\(auth\)/);
    assert.match(read(file), /Çıkış Yap/);
  }
  assert.match(read('src/styles/layout/navbar.css'), /max-height: min\(620px, 65dvh\)/);
});
