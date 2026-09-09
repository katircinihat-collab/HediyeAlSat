import { useEffect, useId, useState } from "react";
import { dailyQuoteForDate } from "../data/dailyQuotes";
import "./DailyQuote.css";

function millisecondsUntilTomorrow(now = new Date()) {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.max(1000, tomorrow.getTime() - now.getTime());
}

function Village({ accent }) {
  return <g className="dq-scene__village">
    {[105, 455, 865, 1260, 1650].map((x, index) => <g key={x} transform={`translate(${x} ${index % 2 ? 45 : 58})`}>
      <rect y="48" width="122" height="76" rx="5" fill={index % 2 ? "#fff1dc" : "#fffaf2"}/>
      <path d="M-12 54 61 4l76 50" fill={index % 2 ? accent : "#405968"} stroke="rgba(255,255,255,.45)" strokeWidth="5"/>
      <rect x="52" y="83" width="25" height="41" rx="4" fill="#855f50"/>
      <rect x="17" y="77" width="22" height="25" rx="9" fill="#b9dce5"/><rect x="91" y="77" width="22" height="25" rx="9" fill="#b9dce5"/>
      <rect x="96" y="10" width="14" height="31" rx="2" fill="#46545a"/>
    </g>)}
  </g>;
}

function Trees({ family, accent }) {
  const autumn = family === "forest";
  return <g className="dq-scene__trees">
    {[30, 275, 365, 690, 790, 1080, 1160, 1470, 1550, 1840].map((x, index) => <g key={x} transform={`translate(${x} ${58 + (index % 3) * 14})`}>
      <rect x="31" y="45" width="7" height="66" rx="3" fill="#705c4b"/>
      <circle cx="34" cy="35" r={34 + (index % 2) * 8} fill={autumn && index % 2 ? "#e8a34d" : index % 3 ? "#73a878" : accent} opacity=".88"/>
      <circle cx="13" cy="55" r="22" fill={autumn ? "#d97856" : "#8dbc83"} opacity=".9"/>
    </g>)}
  </g>;
}

function Landscape({ design, gradientId }) {
  const { family, sky, ground, accent, variant } = design;
  const night = family === "night";
  return <svg className="dq-scene" viewBox="0 0 1920 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop stopColor={sky}/><stop offset="1" stopColor={ground}/></linearGradient>
      <filter id={`${gradientId}-blur`}><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <rect width="1920" height="300" fill={`url(#${gradientId})`}/>
    <circle cx={1550 - (variant % 5) * 115} cy="62" r="31" fill={night ? "#fff4c9" : "#ffd47e"} opacity=".9"/>
    {night && Array.from({ length: 18 }, (_, index) => <circle key={index} cx={(index * 113 + 45) % 1900} cy={18 + (index % 4) * 25} r={index % 3 === 0 ? 2.2 : 1.3} fill="#fff" opacity=".8"/>)}
    <path d="M0 205 Q220 112 430 205 T850 205 T1280 205 T1710 205 T2130 205 V300 H0Z" fill={night ? "#263c52" : "rgba(255,255,255,.42)"}/>
    {family === "coast" && <><path d="M0 211 Q410 195 780 220 T1500 207 T1920 214 V300 H0Z" fill="#8fd4df"/><path d="M0 238 Q500 220 940 242 T1920 235" fill="none" stroke="#fff" strokeWidth="5" opacity=".7"/><path d="m340 177 30-48 31 48z" fill="#fff"/><path d="M370 129v51" stroke="#557485" strokeWidth="4"/></>}
    {family === "sunrise" && <><circle cx="960" cy="170" r="82" fill="#ffd27d" opacity=".42" filter={`url(#${gradientId}-blur)`}/><path d="M0 227 320 145l250 82 350-103 330 103 340-82 330 82V300H0Z" fill="rgba(115,104,113,.16)"/></>}
    {family === "gifts" && <g opacity=".92"><rect x="115" y="188" width="84" height="72" rx="8" fill={accent}/><path d="M157 188v72M115 212h84" stroke="#fff4d3" strokeWidth="9"/><rect x="1670" y="181" width="94" height="79" rx="8" fill="#e8a75c"/><path d="M1717 181v79M1670 207h94" stroke="#fff7e3" strokeWidth="9"/><path d="M157 188c-35-27-43 19 0 5 43 14 35-32 0-5M1717 181c-38-29-45 20 0 5 45 15 38-34 0-5" fill="none" stroke="#fff4d3" strokeWidth="8"/></g>}
    {family === "village" && <Village accent={accent}/>}
    {["garden", "forest", "meadow", "village"].includes(family) && <Trees family={family} accent={accent}/>}
    {family === "garden" && <g fill={accent} opacity=".8">{[145,220,340,520,710,1180,1360,1510,1740].map((x, index)=><g key={x} transform={`translate(${x} ${235-(index%2)*10})`}><circle r="8"/><circle cx="10" cy="7" r="8"/><circle cx="-9" cy="8" r="8"/><circle cy="16" r="7"/><circle cy="8" r="4" fill="#ffd75f"/></g>)}</g>}
    {family === "meadow" && <g fill="none" stroke={accent} strokeWidth="4" opacity=".6">{[100,230,370,540,720,920,1100,1300,1510,1730,1850].map((x,index)=><path key={x} d={`M${x} 272q${index%2?12:-12}-37 ${index%2?28:-28}-48M${x} 272q${index%2?-9:9}-25 ${index%2?-22:22}-34`}/>)}</g>}
    <path d="M0 258 Q240 236 450 255 T900 253 T1360 255 T1920 248 V300H0Z" fill={night ? "#1b3540" : "#78a96f"} opacity=".95"/>
    <path d="M0 278 Q330 256 630 279 T1260 275 T1920 276 V300H0Z" fill={night ? "#142b35" : "#527f59"}/>
  </svg>;
}

function DailyQuote() {
  const [dailyContent, setDailyContent] = useState(() => dailyQuoteForDate());
  const gradientId = `daily-quote-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    let timer;
    const scheduleNextDay = () => {
      timer = window.setTimeout(() => {
        setDailyContent(dailyQuoteForDate());
        scheduleNextDay();
      }, millisecondsUntilTomorrow());
    };
    scheduleNextDay();
    return () => window.clearTimeout(timer);
  }, []);
  const { design } = dailyContent;
  return <section className={`daily-quote daily-quote--${design.textTheme}`} style={{ "--dq-accent": design.accent, "--dq-ink": design.ink }} aria-labelledby="daily-quote-title">
    <Landscape design={design} gradientId={gradientId}/>
    <div className="daily-quote__copy">
      <div className="daily-quote__eyebrow"><span/><h2 id="daily-quote-title">Günün Sözü</h2><span/></div>
      <blockquote>“{dailyContent.quote}”</blockquote>
      <p>{dailyContent.subtitle}</p>
    </div>
  </section>;
}

export default DailyQuote;
