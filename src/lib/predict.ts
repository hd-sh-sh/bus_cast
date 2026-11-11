import modelAsset from "@/assets/bus_model.onnx.asset.json";
import modelInfo from "@/data/model_info.json";
import stopsData from "@/data/stop_metadata.json";

export type Level = "여유" | "보통" | "혼잡";
export type BusStop = { stop_id: number; stop_name: string; peak_hour: number; avg_total: number };
export const STOPS = stopsData as BusStop[];

const ORT_VERSION = "1.31.1";
type Ort = typeof import("onnxruntime-web");
let sessionPromise: Promise<{ ort: Ort; session: import("onnxruntime-web").InferenceSession }> | null = null;

// 브라우저에서만 호출 (버튼 클릭 시)
function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-web");
      ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      const session = await ort.InferenceSession.create(modelAsset.url);
      return { ort, session };
    })().catch((e) => { sessionPromise = null; throw e; });
  }
  return sessionPromise;
}

const featureValue = (f: string, stop: BusStop, hour: number) => {
  if (f === "hour") return hour;
  if (f === "stop_id") return stop.stop_id;
  if (f === "avg_total") return stop.avg_total;
  throw new Error(`알 수 없는 입력 항목: ${f}`);
};

/** 여러 시간대를 한 번에 예측 (model_info.json의 입력 순서/이름/형식 그대로) */
export async function predictHours(stop: BusStop, hours: number[]): Promise<Level[]> {
  const { ort, session } = await getSession();
  const feats = modelInfo.features;
  const data = new Float32Array(hours.flatMap((h) => feats.map((f) => featureValue(f, stop, h))));
  const input = new ort.Tensor("float32", data, [hours.length, feats.length]);
  const out = await session.run({ [modelInfo.input_name]: input }, [session.outputNames[0]!]);
  const labels = out[session.outputNames[0]!]!.data as ArrayLike<number | bigint>;
  return Array.from(labels, (v) => {
    const l = (modelInfo.labels as Record<string, string>)[String(Number(v))];
    if (!l) throw new Error(`알 수 없는 예측 값: ${v}`);
    return l as Level;
  });
}
