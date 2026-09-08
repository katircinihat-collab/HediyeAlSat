import "./DailyQuote.css";

const quotes = [
  { text: "Küçük mutluluklar, büyük hayatların temelidir.", subtext: "Bugün sevdiklerinize küçük bir mutluluk hediye edin.", theme: "spring" },
  { text: "Paylaşılan sevinç, çoğalarak geri döner.", subtext: "İçten bir sürprizle güzel bir ana ortak olun.", theme: "sunny" },
  { text: "Sevgi, en güzel hediyenin görünmeyen kurdelesidir.", subtext: "Hediyenize kalbinizden küçük bir not ekleyin.", theme: "romantic" },
  { text: "Güzel anılar, birlikte geçirilen zamanla büyür.", subtext: "Bugün yeni bir hatıraya yer açın.", theme: "summer" },
  { text: "Bir tebessüm, günün en sıcak ışığıdır.", subtext: "Gülümsemenizi sevdiğiniz biriyle paylaşın.", theme: "sunny" },
  { text: "İyilik, sessizce büyüyen bir bahçedir.", subtext: "Küçük bir iyilikle bugünü güzelleştirin.", theme: "spring" },
  { text: "Sevgiyle seçilen her şey özeldir.", subtext: "Değer verdiğinizi hissettiren bir seçim yapın.", theme: "romantic" },
  { text: "Yağmur geçer, güzel hatıralar kalır.", subtext: "Bulutlu bir güne sıcak bir sürpriz bırakın.", theme: "rainy" },
  { text: "Mutluluk, hatırlandığını bilmektir.", subtext: "Bugün birini düşündüğünüzü ona hissettirin.", theme: "autumn" },
  { text: "Her yeni gün, sevgi için yeni bir fırsattır.", subtext: "Günün ilk güzel adımını siz atın.", theme: "spring" },
  { text: "Kalpten gelen bir teşekkür uzun süre hatırlanır.", subtext: "Minnetinizi küçük ama anlamlı bir jestle anlatın.", theme: "autumn" },
  { text: "En değerli armağan, samimi bir düşüncedir.", subtext: "Seçiminizde sevdiğiniz kişinin hikâyesi olsun.", theme: "winter" },
  { text: "Birlikte gülmek, hayatın en güzel hediyesidir.", subtext: "Bugün neşenizi paylaşacak bir neden bulun.", theme: "summer" },
  { text: "Sevgi, uzakları yakın eden sıcaklıktır.", subtext: "Aranızdaki mesafeyi içten bir jestle kısaltın.", theme: "night" },
  { text: "Güzel düşünceler, güzel günlere dönüşür.", subtext: "Bugün iyi bir dileği gerçeğe yaklaştırın.", theme: "sunny" },
  { text: "Hatırlamak, sevginin en zarif hâlidir.", subtext: "Özel bir günü beklemeden sevginizi gösterin.", theme: "romantic" },
  { text: "Her mevsimin kendine özgü bir mutluluğu vardır.", subtext: "Bugünün güzelliğini sevdiklerinizle keşfedin.", theme: "autumn" },
  { text: "Sıcacık bir yuva, sevgiyle kurulur.", subtext: "Evinize ve kalbinize neşe katacak bir an yaratın.", theme: "winter" },
  { text: "İçten bir söz, en soğuk günü bile ısıtır.", subtext: "Bugün güzel bir cümleyi paylaşmaktan çekinmeyin.", theme: "winter" },
  { text: "Umut, gecenin içindeki küçük bir ışıktır.", subtext: "Birinin gününe umut olacak bir iz bırakın.", theme: "night" },
  { text: "Nezaket, herkesin anlayabildiği bir dildir.", subtext: "Küçük bir incelikle büyük bir fark oluşturun.", theme: "rainy" },
  { text: "Sevdiklerimizle hayat daha renkli olur.", subtext: "Bugünün rengini birlikte seçin.", theme: "summer" },
  { text: "Mutlu anlar beklenmez, birlikte oluşturulur.", subtext: "Bugün güzel bir anın başlangıcı olun.", theme: "spring" },
  { text: "Kalbin yolu, küçük inceliklerden geçer.", subtext: "Sade ama düşünceli bir jest seçin.", theme: "romantic" },
  { text: "Dostluk, her mevsim yeşil kalan bir ağaçtır.", subtext: "Dostunuza yanında olduğunuzu hatırlatın.", theme: "autumn" },
  { text: "Güneş herkes için doğar, sevgi paylaşınca parlar.", subtext: "İçinizdeki sıcaklığı çevrenize taşıyın.", theme: "sunny" },
  { text: "Huzur, sevildiğini hissettiğin yerde başlar.", subtext: "Bugün birine güven veren bir iyilik yapın.", theme: "night" },
  { text: "En güzel sürprizler, içtenlikle hazırlanır.", subtext: "Küçük ayrıntılarla hediyenizi unutulmaz yapın.", theme: "summer" },
  { text: "Bir fincan sıcaklık, bir ömürlük sohbet başlatabilir.", subtext: "Bugün birlikte geçirilen zamana değer katın.", theme: "rainy" },
  { text: "Yeni başlangıçlar, umutla açan çiçekler gibidir.", subtext: "Sevdiklerinizle güzel bir başlangıcı kutlayın.", theme: "spring" }
];

function istanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function quoteForDate(date = new Date()) {
  const [year, month, day] = istanbulDateKey(date).split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  return quotes[((dayNumber % quotes.length) + quotes.length) % quotes.length];
}

function DailyQuote() {
  const quote = quoteForDate();

  return (
    <section className={`daily-quote daily-quote--${quote.theme}`} aria-labelledby="daily-quote-title">
      <div className="daily-quote__copy">
        <div className="daily-quote__heading-row">
          <span aria-hidden="true" />
          <h2 id="daily-quote-title">Günün Sözü</h2>
          <span aria-hidden="true" />
        </div>
        <blockquote>“{quote.text}”</blockquote>
        <p>{quote.subtext}</p>
      </div>

      <svg className="daily-quote__village" viewBox="0 0 1440 112" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs><filter id="daily-soft-shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#35453f" floodOpacity=".14"/></filter></defs>
        <circle className="daily-quote__sun" cx="1278" cy="18" r="14" />
        <path className="daily-quote__moon" d="M1270 5a15 15 0 1 0 14 23 13 13 0 1 1-14-23Z" />
        <g className="daily-quote__stars"><circle cx="1120" cy="12" r="1.5"/><circle cx="1190" cy="27" r="1"/><circle cx="1350" cy="16" r="1.5"/></g>
        <g className="daily-quote__clouds"><path d="M38 31c5-13 24-14 30-3 10-8 27 0 26 13H29c0-5 4-9 9-10Z"/><path d="M320 20c4-10 19-11 24-2 9-6 21 0 21 10h-53c0-4 3-7 8-8Z"/><path d="M1110 29c5-12 22-13 28-3 10-7 24 0 24 12h-61c0-5 4-8 9-9Z"/></g>
        <g className="daily-quote__birds"><path d="M222 33q6-6 12 0 6-6 12 0M913 27q5-5 10 0 5-5 10 0"/></g>
        <g className="daily-quote__rain"><path d="M70 40l-3 9m24-9-3 9m250-17-3 9m790-4-3 9m28-9-3 9m180-14-3 9"/></g>
        <path className="daily-quote__ground-back" d="M0 82c135-18 245 3 362-10 148-16 252 12 398-4 151-17 293 8 418-4 98-9 176-2 262 5v43H0Z"/>
        <g className="daily-quote__trees">
          {[45, 238, 350, 548, 625, 848, 1048, 1160, 1340].map((x, index) => <g key={x} transform={`translate(${x} ${49 + (index % 3) * 7}) scale(${index % 2 ? .46 : .56})`}><path className="trunk" d="M22 91V37m0 24L7 45m15 7 17-20"/><g className="crown"><circle cx="22" cy="25" r="26"/><circle cx="5" cy="45" r="20"/><circle cx="40" cy="46" r="21"/><circle cx="23" cy="52" r="25"/></g><g className="snow-crown"><path d="M-10 46Q5 13 22 27q18-24 48 19Z"/></g></g>)}
        </g>
        <g className="daily-quote__houses" filter="url(#daily-soft-shadow)">
          <g transform="translate(112 37) scale(.53)"><rect className="chimney" x="102" y="12" width="17" height="37" rx="2"/><path className="house" d="M12 55h142v80H12Z"/><path className="roof roof--red" d="M0 59 80 4l88 55-14 11-74-45-66 46Z"/><path className="snow-cap" d="M0 59 80 4l88 55-9 7-79-48L8 66Z"/><circle className="attic-window" cx="80" cy="50" r="11"/><rect className="door" x="69" y="94" width="25" height="41" rx="4"/><g className="windows"><rect x="28" y="83" width="25" height="24" rx="3"/><rect x="111" y="83" width="25" height="24" rx="3"/></g><path className="heart" d="M110 3c-8-9-21 3 0 18 21-15 8-27 0-18Z"/></g>
          <g transform="translate(410 49) scale(.5)"><rect className="chimney" x="90" y="5" width="14" height="31" rx="2"/><path className="house house--alt" d="M10 45h120v70H10Z"/><path className="roof roof--dark" d="M0 50 67 0l77 50-13 10-64-41-55 41Z"/><path className="snow-cap" d="M0 50 67 0l77 50-8 6-69-43L7 56Z"/><rect className="door door--blue" x="58" y="80" width="24" height="35" rx="9"/><g className="windows"><rect x="22" y="71" width="23" height="23" rx="8"/><rect x="96" y="71" width="22" height="23" rx="8"/></g><path className="heart" d="M96-3c-7-8-18 3 0 16 18-13 7-24 0-16Z"/></g>
          <g transform="translate(684 29) scale(.54)"><rect className="chimney" x="116" y="16" width="17" height="40" rx="2"/><path className="house house--cool" d="M12 63h150v88H12Z"/><path className="roof roof--dark" d="M0 67 84 0l94 67-16 10-78-54-70 55Z"/><path className="snow-cap" d="M0 67 84 0l94 67-10 7-84-59L8 74Z"/><rect className="door door--blue" x="73" y="105" width="27" height="46" rx="7"/><g className="windows"><rect x="28" y="94" width="27" height="27" rx="10"/><rect x="119" y="94" width="27" height="27" rx="10"/><rect x="73" y="52" width="26" height="27" rx="12"/></g><path className="heart" d="M124 5c-8-9-21 3 0 18 21-15 8-27 0-18Z"/></g>
          <g transform="translate(962 49) scale(.52)"><rect className="chimney" x="105" y="12" width="14" height="30" rx="2"/><path className="house" d="M8 46h151v70H8Z"/><path className="roof roof--red" d="M0 51 50 8h75l47 43-13 10-42-34H55L11 61Z"/><path className="snow-cap" d="M0 51 50 8h75l47 43-8 7-43-37H52L7 58Z"/><rect className="door" x="73" y="81" width="24" height="35" rx="4"/><g className="windows"><rect x="27" y="73" width="24" height="23" rx="3"/><rect x="116" y="73" width="24" height="23" rx="3"/></g></g>
          <g transform="translate(1220 39) scale(.54)"><rect className="chimney" x="101" y="9" width="16" height="34" rx="2"/><path className="house house--warm" d="M10 52h130v77H10Z"/><path className="roof roof--dark" d="M0 57 72 0l84 57-15 11-69-47-60 47Z"/><path className="snow-cap" d="M0 57 72 0l84 57-9 7L72 15 7 64Z"/><rect className="door" x="62" y="90" width="25" height="39" rx="8"/><g className="windows"><rect x="25" y="80" width="23" height="25" rx="9"/><rect x="103" y="80" width="23" height="25" rx="9"/></g><path className="heart" d="M110 0c-8-9-21 3 0 18 21-15 8-27 0-18Z"/></g>
        </g>
        <g className="daily-quote__shrubs">{[0,70,270,330,530,810,885,1080,1300,1370].map(x => <g key={x} transform={`translate(${x} 91) scale(.55)`}><ellipse cx="18" cy="16" rx="30" ry="18"/><ellipse cx="48" cy="14" rx="27" ry="20"/><ellipse cx="75" cy="18" rx="30" ry="17"/></g>)}</g>
        <g className="daily-quote__fences"><path d="M92 94v15m10-15v15m10-15v15m10-15v15m-35-9h42m475-6v15m10-15v15m10-15v15m10-15v15m-35-9h42m537-6v15m10-15v15m10-15v15m10-15v15m-35-9h42"/></g>
        <g className="daily-quote__flowers"><circle cx="292" cy="101" r="2.5"/><circle cx="307" cy="106" r="2.5"/><circle cx="577" cy="101" r="2.5"/><circle cx="849" cy="104" r="2.5"/><circle cx="1135" cy="102" r="2.5"/></g>
        <g className="daily-quote__leaves"><path d="M52 63q8-5 10 4-8 5-10-4Zm356 8q8-5 10 4-8 5-10-4Zm580-7q8-5 10 4-8 5-10-4Z"/></g>
        <path className="daily-quote__snow" d="M0 101c220-9 380 5 560-2 210-7 381 6 560-1 116-5 213-4 320 0v14H0Z"/>
        <rect className="daily-quote__ground" y="108" width="1440" height="4" />
      </svg>
    </section>
  );
}

export { quotes, quoteForDate, istanbulDateKey };
export default DailyQuote;
