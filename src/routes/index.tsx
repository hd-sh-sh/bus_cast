import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, Cloud, CloudRain, Star, Search, Share2 } from "lucide-react";
import { STOPS, predictHours, type Level, type BusStop } from "@/lib/predict";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "버스캐스트 | 오늘 내 버스, 몇 도일까?" },
      { name: "description", content: "강남구 등굣길 버스 혼잡도를 날씨처럼 알려주는 버스캐스트" },
      { property: "og:title", content: "버스캐스트" },
      { property: "og:description", content: "강남구 등굣길 버스 혼잡도를 날씨처럼 알려드려요" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const INFO: Record<Level, { name: string; tip: string; Icon: typeof Sun; share: string }> = {
  여유: { name: "맑음", tip: "여유롭게 출발하세요", Icon: Sun, share: "여유롭게 탈 수 있어요" },
  보통: { name: "구름", tip: "조금 일찍 나가면 앉을 수 있어요", Icon: Cloud, share: "조금 일찍 나가면 앉을 수 있어요" },
  혼잡: { name: "소나기", tip: "한 대 보내거나 다른 정류장을 이용해 보세요", Icon: CloudRain, share: "한 대 보내는 걸 추천해요" },
};
const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

function Index() {
  const [dark, setDark] = useState(false);
  const [favs, setFavs] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [stop, setStop] = useState<BusStop>(STOPS[0]!);
  const [hour, setHour] = useState(8);
  const [result, setResult] = useState<{ level: Level; stop: BusStop; hour: number; hourly: { hour: number; level: Level }[]; key: number } | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const f: number[] = JSON.parse(localStorage.getItem("bc-favs2") || "[]");
    setFavs(f);
    const first = STOPS.find((s) => s.stop_id === f[0]);
    if (first) setStop(first);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const toggleFav = (id: number) => {
    const n = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(n); localStorage.setItem("bc-favs2", JSON.stringify(n));
  };
  const list = useMemo(() => STOPS.filter((s) => s.stop_name.includes(query.trim()))
    .sort((a, b) => Number(favs.includes(b.stop_id)) - Number(favs.includes(a.stop_id))).slice(0, 50), [query, favs]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const run = async () => {
    setLoading(true); setError(false);
    try {
      const hours = Array.from({ length: 17 }, (_, i) => 6 + i);
      const levels = await predictHours(stop, [hour, ...hours]);
      setResult({ level: levels[0]!, stop, hour, hourly: hours.map((h, i) => ({ hour: h, level: levels[i + 1]! })), key: Date.now() });
    } catch (e) {
      console.error("[버스캐스트] 예측 실패:", e);
      setError(true); setResult(null);
    } finally { setLoading(false); }
  };
  const share = async () => {
    if (!result) return;
    const t = `버스캐스트: ${result.stop.stop_name}정류장 ${result.hour}시는 ${INFO[result.level].name}! ${INFO[result.level].share}`;
    try { await navigator.clipboard.writeText(t); } catch { /* ignore */ }
    setToast("복사됐어요"); setTimeout(() => setToast(""), 1800);
  };

  const w = result?.level;
  const rainy = w === "혼잡";
  const drops = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ l: Math.random() * 100, d: 0.6 + Math.random() * 0.8, delay: Math.random() * 2, i })), []);
  const stars = useMemo(() => Array.from({ length: 50 }, (_, i) => ({ l: Math.random() * 100, t: Math.random() * 100, d: 1.5 + Math.random() * 3, i })), []);
  const R = result ? INFO[result.level] : null;

  return (
    <div data-w={w} className={`sky relative min-h-screen overflow-hidden text-foreground ${rainy && !dark ? "rainy-text" : ""}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {dark && stars.map((s) => <span key={s.i} className="star" style={{ left: `${s.l}%`, top: `${s.t}%`, animationDuration: `${s.d}s` }} />)}
        {rainy && drops.map((d) => <span key={d.i} className="drop" style={{ left: `${d.l}%`, animationDuration: `${d.d}s`, animationDelay: `${d.delay}s` }} />)}
      </div>

      <main className="relative mx-auto flex max-w-md flex-col gap-6 px-5 pb-10 pt-8">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-4xl">버스캐스트</h1>
            <p className="mt-1 text-sm text-muted-foreground">오늘 내 버스, 몇 도일까?</p>
          </div>
          <button aria-label="다크 모드" onClick={() => setDark(!dark)} className="glass rounded-full p-3">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        <section className="glass relative rounded-3xl p-5">
          <label className="text-sm text-muted-foreground">정류장 찾기</label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-glass px-3 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={open ? query : stop.stop_name} onFocus={() => { setOpen(true); setQuery(""); }}
              onChange={(e) => setQuery(e.target.value)} placeholder="예: 역삼"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground" />
          </div>
          {open && (
            <ul className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto">
              {list.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">찾는 정류장이 없어요</li>}
              {list.map((s) => (
                <li key={s.stop_id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-glass">
                  <button className="flex flex-1 items-center gap-2 text-left" onClick={() => { setStop(s); setOpen(false); }}>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px]">강남구</span>{s.stop_name}<span className="text-[10px] text-muted-foreground">{s.stop_id}</span>
                  </button>
                  <button aria-label="즐겨찾기" onClick={() => toggleFav(s.stop_id)}>
                    <Star className={`h-5 w-5 ${favs.includes(s.stop_id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass rounded-3xl p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">시간대 선택</span>
            <span className="font-display text-4xl">{pad(hour)}</span>
          </div>
          <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(+e.target.value)} className="mt-3 w-full" />
        </section>

        <button disabled={loading} onClick={() => { setOpen(false); void run(); }}
          className="w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-70">
          {loading ? "하늘을 살펴보는 중..." : "오늘의 버스 날씨 보기"}
        </button>

        {loading && <p className="glass rounded-3xl p-5 text-center text-sm animate-pulse">하늘을 살펴보는 중...</p>}
        {error && !loading && <p role="alert" className="glass rounded-3xl p-5 text-center text-sm">예보를 불러오지 못했어요. 다시 눌러 주세요</p>}
        {result && R && !loading && (
          <>
            <section key={result.key} className="glass rise flex flex-col items-center gap-3 rounded-3xl p-6 text-center">
              <R.Icon className="h-24 w-24" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">{result.stop.stop_name} · {pad(result.hour)}</p>
              <p className="font-display text-3xl">{R.name} · {result.level}</p>
              <p className="text-sm text-muted-foreground">{R.tip}</p>
              <button onClick={share} className="glass mt-2 flex items-center gap-2 rounded-full px-4 py-2 text-sm active:scale-95">
                <Share2 className="h-4 w-4" /> 공유하기
              </button>
            </section>

            <section key={result.key + 1} className="glass rise rounded-3xl p-5" style={{ animationDelay: "0.15s" }}>
              <p className="mb-3 text-sm text-muted-foreground">시간별 예보</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {result.hourly.map(({ hour: h, level }) => {
                  const I = INFO[level].Icon;
                  return (
                    <div key={h} className={`flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-3 ${h === result.hour ? "border-2 border-primary bg-glass" : "border-2 border-transparent"}`}>
                      <span className="text-xs">{h}시</span><I className="h-6 w-6" /><span className="text-xs text-muted-foreground">{INFO[level].name}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          청정 강남 운영 시스템 | 강남구 학교로 찾아가는 디지털 미래인재 프로젝트
        </footer>
      </main>

      {toast && <div className="glass fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-sm">{toast}</div>}
    </div>
  );
}
