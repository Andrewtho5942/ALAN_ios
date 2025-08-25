import { Box, Det, Track } from './types.tsx'

export function convertBoxToPixels(normalizedBox:Box, sizeRef:any): Box {
    return(
        {
            'xmin': normalizedBox.xmin * sizeRef.current.w,
            'ymin': normalizedBox.ymin * sizeRef.current.h,
            'xmax': normalizedBox.xmax * sizeRef.current.w,
            'ymax': normalizedBox.ymax * sizeRef.current.h,
        }
    )
}

const IOU_GATE = 0.1;       // Overlap required to match an object
const ALPHA = 0.7;          // Controls the window length for averaging. Higher -> more reactive
const MAX_MISSES = 5;       // Max number of missed matches before the track is dropped
const HITS_TO_CONFIRM = 2;  // Number of hits to match before a track is confirmed and shown on screen

let nextId = 1;

function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.xmin, b.xmin);
  const y1 = Math.max(a.ymin, b.ymin);
  const x2 = Math.min(a.xmax, b.xmax);
  const y2 = Math.min(a.ymax, b.ymax);
  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  const inter = w * h;
  const areaA = Math.max(0, a.xmax - a.xmin) * Math.max(0, a.ymax - a.ymin);
  const areaB = Math.max(0, b.xmax - b.xmin) * Math.max(0, b.ymax - b.ymin);
  const denom = areaA + areaB - inter;
  return denom <= 0 ? 0 : inter / denom;
}

function cxcyScale(b: Box) {
  const cx = (b.xmin + b.xmax) * 0.5;
  const cy = (b.ymin + b.ymax) * 0.5;
  const s = Math.sqrt(Math.max(1e-9, (b.xmax - b.xmin) * (b.ymax - b.ymin)));
  return { cx, cy, s };
}

function fromCxCyS(cx: number, cy: number, s: number, ar: number): Box {
  // keep aspect ratio from last box; if ar=1, s is side of a square
  const w = s * Math.sqrt(ar);
  const h = s / Math.sqrt(ar);
  const xmin = Math.max(0, Math.min(1, cx - w / 2));
  const ymin = Math.max(0, Math.min(1, cy - h / 2));
  const xmax = Math.max(0, Math.min(1, cx + w / 2));
  const ymax = Math.max(0, Math.min(1, cy + h / 2));
  return { ymin, xmin, ymax, xmax };
}

export class GreedyTracker {
  tracks: Track[] = [];

  update(dets: Det[], tsSec: number, sendToESP: any): Track[] {
    const dt = this._dt(tsSec);

    // predict bounding boxes
    const predicted: Box[] = this.tracks.map(t => {
      const { cx, cy, s } = cxcyScale(t.box);
      const ar = Math.max(1e-6, (t.box.xmax - t.box.xmin) / Math.max(1e-6, t.box.ymax - t.box.ymin));
      const cxp = cx + t.v.dx * dt;
      const cyp = cy + t.v.dy * dt;
      const sp = Math.max(1e-6, s + t.v.ds * dt);
      return fromCxCyS(cxp, cyp, sp, ar);
    });

    // build IoU matrix (tracks x dets), -inf for label mismatch/gating
    const M = this.tracks.length, N = dets.length;
    const usedDet = new Array(N).fill(false);
    const usedTrk = new Array(M).fill(false);
    const pairs: Array<[number, number, number]> = [];

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        if (this.tracks[i].label && dets[j].label && this.tracks[i].label !== dets[j].label) continue;
        const ov = iou(predicted[i], dets[j].box);
        if (ov >= IOU_GATE) pairs.push([i, j, ov]);
      }
    }

    // greedy match by IoU amount
    pairs.sort((a, b) => b[2] - a[2]);
    const matches: Array<[number, number]> = [];
    for (const [ti, dj] of pairs) {
      if (!usedTrk[ti] && !usedDet[dj]) {
        usedTrk[ti] = true; usedDet[dj] = true;
        matches.push([ti, dj]);
      }
    }

    // update matched tracks
    for (const [ti, dj] of matches) {
      const t = this.tracks[ti];
      const det = dets[dj];
      // EMA blend
      const pb = predicted[ti];
      const mb: Box = {
        ymin: ALPHA * det.box.ymin + (1 - ALPHA) * pb.ymin,
        xmin: ALPHA * det.box.xmin + (1 - ALPHA) * pb.xmin,
        ymax: ALPHA * det.box.ymax + (1 - ALPHA) * pb.ymax,
        xmax: ALPHA * det.box.xmax + (1 - ALPHA) * pb.xmax,
      };

      // velocity from cxcy s change
      const { cx: cx0, cy: cy0, s: s0 } = cxcyScale(t.box);
      const { cx: cx1, cy: cy1, s: s1 } = cxcyScale(mb);
      const invDt = dt > 1e-6 ? (1 / dt) : 0;
      t.v.dx = (cx1 - cx0) * invDt;
      t.v.dy = (cy1 - cy0) * invDt;
      t.v.ds = (s1 - s0) * invDt;

      t.box = mb;
      t.label = t.label || det.label;
      t.label_conf = ALPHA * det.score + (1 - ALPHA) * t.label_conf

      t.age += 1;
      t.hits += 1;
      t.misses = 0;
      if (!t.confirmed && t.hits >= HITS_TO_CONFIRM) t.confirmed = true;
      t.lastSeenTs = tsSec;
    }

    // create new tracks for unmatched detections
    for (let j = 0; j < N; j++) {
      if (usedDet[j]) continue;
      const d = dets[j];
      this.tracks.push({
        id: nextId++,
        label: d.label,
        label_conf: d.score,
        box: d.box,
        v: { dx: 0, dy: 0, ds: 0 },
        age: 1, hits: 1, misses: 0,
        confirmed: false,
        lastSeenTs: tsSec,
        locked: false
      });
    }

    // age/remove unmatched tracks
    this.tracks.forEach((t, idx) => {
      if (!usedTrk[idx]) {
        t.age += 1;
        t.misses += 1;
      }
    });

    let lockedt = this.tracks.find(t => t.locked);
    if (lockedt && (lockedt.misses > MAX_MISSES)) {
      sendToESP('m', { 'l': 0, 'r': 0 });
    }

    this.tracks = this.tracks.filter(t =>
      t.misses <= MAX_MISSES
    );


    return this.tracks;
  }

  private _lastTs = 0;
  private _dt(ts: number): number {
    if (this._lastTs === 0) { this._lastTs = ts; return 0.033; }
    const dt = Math.max(1e-3, Math.min(0.2, ts - this._lastTs));
    this._lastTs = ts;
    return dt;
  }
}
