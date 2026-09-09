const designs = [
  ["garden", "#fff8f2", "#dff2dc", "#ef7466", "#436b52", "light"], ["village", "#fff7ed", "#d8eff5", "#e66b5b", "#355c68", "light"],
  ["coast", "#effaff", "#bde8ef", "#f48a69", "#176b7a", "light"], ["sunrise", "#fff3e5", "#ffd7bf", "#e86658", "#6f4b63", "light"],
  ["gifts", "#fff5f7", "#f7d8e2", "#e85f68", "#62495c", "light"], ["night", "#18233f", "#344a78", "#ffd27d", "#f7f1df", "dark"],
  ["forest", "#f3faef", "#cfe5cf", "#db725f", "#315c48", "light"], ["meadow", "#fffbed", "#d9efc4", "#eb765e", "#456247", "light"],
  ["coast", "#f2fbff", "#c7e9ff", "#e76c62", "#245e83", "light"], ["village", "#fff6f0", "#f4d8c6", "#df675e", "#5e4c4b", "light"],
  ["garden", "#fff5f1", "#f5d7df", "#db5f68", "#604b5a", "light"], ["sunrise", "#fff8e8", "#fbd9a9", "#e77352", "#6d533c", "light"],
  ["forest", "#f2f8f5", "#c8dfd8", "#de7161", "#365f5b", "light"], ["gifts", "#fff7ef", "#f9dfc8", "#e86558", "#654b4a", "light"],
  ["night", "#202744", "#514872", "#ffcc83", "#fff5e6", "dark"], ["meadow", "#f7fbef", "#dceac0", "#df6957", "#49633f", "light"],
  ["village", "#f4fbff", "#d5e8ef", "#df695b", "#385968", "light"], ["coast", "#eefbfa", "#bde6dc", "#e87362", "#236c68", "light"],
  ["garden", "#fff8f5", "#eadbd1", "#db6258", "#674d48", "light"], ["sunrise", "#fff2e9", "#f4c9ba", "#e15f58", "#73484d", "light"],
  ["forest", "#f3f8eb", "#cbdcb8", "#dc7058", "#405a3b", "light"], ["gifts", "#fff4f4", "#ead6ec", "#dc5e70", "#624b69", "light"],
  ["night", "#172b3d", "#315d6d", "#ffd17b", "#f4f5e8", "dark"], ["meadow", "#fff9ed", "#eeddb6", "#dc6855", "#68583e", "light"],
  ["coast", "#f0f9ff", "#c8dff1", "#e6685a", "#355f7a", "light"], ["village", "#fff8ed", "#e8dac2", "#df6757", "#614f42", "light"],
  ["garden", "#fff5f7", "#e7d7e5", "#d95d70", "#624c61", "light"], ["sunrise", "#fff6e8", "#f5cf9d", "#df6750", "#6e513b", "light"],
  ["forest", "#eff8f4", "#c7dfd1", "#dc6a5c", "#36594d", "light"], ["night", "#20213a", "#574667", "#ffd28a", "#fff4e5", "dark"]
];

const copy = [
  ["İyilik, paylaştıkça çoğalan en güzel hediyedir.", "Bugün bir kalbe küçük bir sevinç bırakın."],
  ["Küçük mutluluklar, günün en güzel hatırasıdır.", "Güzel bir anı sevdiklerinizle paylaşın."],
  ["Dostluk, uzakları yakın eden sıcaklıktır.", "Bir dostunuzu gülümsetmek için harika bir gün."],
  ["Umut, sabahın kalbimize bıraktığı ışıktır.", "Yeni güne güzel ihtimallerle başlayın."],
  ["Sevgiyle seçilen her şey biraz daha özeldir.", "Değer verdiğinizi küçük bir sürprizle anlatın."],
  ["Yıldızlar kadar çok olsun güzel dilekleriniz.", "Bu gece bir hayalinize yeniden inanın."],
  ["Doğa gibi yenilen, umut gibi yeşer.", "Kendinize taze bir başlangıç armağan edin."],
  ["Bir tebessüm, günün en zarif hediyesidir.", "Gülümsemenizi sevdiğiniz biriyle paylaşın."],
  ["Huzur, kalbin kıyısında sessizce büyür.", "Bugünün telaşında güzel bir anı fark edin."],
  ["Sıcak bir yuva, sevginin en güzel halidir.", "Ailenizle geçirdiğiniz anların kıymetini bilin."],
  ["Çiçekler gibi, güzel sözler de iz bırakır.", "İçten bir teşekkürle günü güzelleştirin."],
  ["Her gün, hayallere açılan yeni bir penceredir.", "Bugün istediğiniz yaşama küçük bir adım atın."],
  ["Güzel insanlar, yollarımıza ışık serper.", "Yanınızda olanlara değerlerini hissettirin."],
  ["Sürprizler, sıradan günlerin küçük bayramlarıdır.", "Beklenmedik bir mutluluk için bahaneye gerek yok."],
  ["Karanlıkta bile sevgi kendi yolunu aydınlatır.", "Kalbinizdeki ışığı paylaşmaktan vazgeçmeyin."],
  ["Hayaller, cesaretle atılan adımları sever.", "Küçük başlayın, güzel ilerleyin."],
  ["İyi hatırlanmak, en değerli armağandır.", "Bugüne sevgi dolu bir iz bırakın."],
  ["Mutluluk bazen bir esinti kadar yakındır.", "Durun, nefes alın ve anın tadını çıkarın."],
  ["Teşekkür, kalpten kalbe uzanan ince bir köprüdür.", "Minnetinizi söylemek için bugünü seçin."],
  ["Gün batarken bile yeni umutlar doğar.", "Biten her şeyin güzel bir başlangıcı olabilir."],
  ["Köklerin sevgiyle güçlüyse dalların göğe uzanır.", "Size güç veren insanları bugün hatırlayın."],
  ["Hediye, hatırlamanın renkli bir yoludur.", "Birini düşündüğünüzü içtenlikle gösterin."],
  ["Gece sessizdir; güzel hayaller hep konuşur.", "Yarın için kalbinizde iyi bir yer açın."],
  ["Paylaşılan sevinç, iki kalpte birden büyür.", "Mutluluğunuzu çoğaltacak birini bulun."],
  ["Yeni başlangıçlar, cesur kalpleri bekler.", "Bugün ilk adımı atmak için güzel bir gün."],
  ["Komşuluk, bir selamla başlayan sıcak bir hikâyedir.", "Yakınınızdaki birine içten bir merhaba deyin."],
  ["Değer vermek, sevgiyi görünür kılmaktır.", "Sevdiklerinize ne kadar özel olduklarını hissettirin."],
  ["Güneş her sabah umudu yeniden anlatır.", "Dünün yükünü bırakın, bugünün ışığını karşılayın."],
  ["Güven, güzel bağların sessiz temelidir.", "Sözünüzle ve sevginizle güveni büyütün."],
  ["Her yeni gün, kalbe bırakılmış bir armağandır.", "Bugünü sevgiyle açın, neşeyle paylaşın."]
];

export const dailyQuotes = Object.freeze(copy.map(([quote, subtitle], index) => {
  const [family, sky, ground, accent, ink, textTheme] = designs[index];
  return Object.freeze({ quote, subtitle, design: Object.freeze({ family, sky, ground, accent, ink, textTheme, variant: index }) });
}));

export function localDayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function dailyQuoteIndex(date = new Date()) {
  const dayNumber = localDayNumber(date);
  return ((dayNumber % dailyQuotes.length) + dailyQuotes.length) % dailyQuotes.length;
}

export function dailyQuoteForDate(date = new Date()) {
  return dailyQuotes[dailyQuoteIndex(date)];
}
