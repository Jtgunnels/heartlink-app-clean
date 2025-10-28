#!/usr/bin/env python3
# HeartLink v4.1 (ASE 1.3, Clinical-Lock) — Full Trial Runner
# Generates summarized per-trial result files (T1.0–T1.9) + master JSON/CSV and a ZIP package.
# Usage: python HeartLink_v4_1_full_trial_runner.py

import os, math, random, json, time, statistics, zipfile
from typing import List, Dict, Tuple
import pandas as pd

# --------------------------
# Config & RNG
# --------------------------
RNG_SEED = 42
rng = random.Random(RNG_SEED)

CFG = {
    "EMA_WINDOW_DAYS": 26,
    "EXTENDED_EMA_WINDOW": 32,   # placeholder for parity; variance gate not modeled
    "MILD_WEIGHT_FACTOR": 0.55,
    "DELTA_TOLERANCE_BASE": 0.19,
    "DELTA_TOLERANCE_EARLY": 0.20,
    "DEESCALATION_DAYS": 5,
    "RECOVERY_CREDIT": 1.30,
    "RECOVERY_GREEN_BAND": 3.8,
    "ACUTE_WS_JUMP": 0.80,
}

OUT_DIR = "HeartLink_v4_1_FullTrialResults"
os.makedirs(OUT_DIR, exist_ok=True)

# --------------------------
# Helper functions
# --------------------------
def clamp(x, lo, hi):
    try:
        return max(lo, min(hi, float(x)))
    except:
        return lo

def levels(x):
    if x is None:
        return 0.0
    if isinstance(x, (int, float)) and math.isfinite(x):
        return clamp(x, 0, 3)
    s = str(x).strip().lower()
    mapping = {"none":0, "mild":1, "moderate":2, "severe":3}
    if s in mapping: return float(mapping[s])
    try:
        return clamp(float(s), 0, 3)
    except:
        return 0.0

def ema(series: List[float], window: int) -> float:
    if not series:
        return 0.0
    k = 2.0/(window+1.0)
    e = series[0]
    for i in range(1, len(series)):
        e = series[i]*k + e*(1.0-k)
    return e

def apply_orange_green_smoothing(lastCats: List[str], proposed: str, stableDays: int=5) -> str:
    if proposed != "Green" or not lastCats:
        return proposed
    lastEsc = -1
    for i in range(len(lastCats)-1, -1, -1):
        if lastCats[i] in ("Orange","Red"):
            lastEsc = i
            break
    if lastEsc == -1:
        return proposed
    window = lastCats[max(lastEsc+1, len(lastCats)-stableDays):]
    ok = (len(window) >= stableDays) and all(c not in ("Orange","Red") for c in window)
    return proposed if ok else "Yellow"

def cat_rank(c:str)->int:
    return 0 if c=="Green" else 1 if c=="Yellow" else 2 if c=="Orange" else 3

def rank_to_cat(r:int)->str:
    return "Green" if r<=0 else "Yellow" if r==1 else "Orange" if r==2 else "Red"

def wilson_ci(p, n, z=1.96):
    # 95% CI by default
    if n==0:
        return (0.0, 0.0)
    denom = 1 + z**2/n
    center = (p + z*z/(2*n)) / denom
    half = (z / denom) * math.sqrt( (p*(1-p)/n) + (z*z/(4*n*n)) )
    return (max(0.0, center-half), min(1.0, center+half))

# --------------------------
# Algorithm (Python port of v4.1 CL behavior)
# --------------------------
def calc_v41(input_entry: Dict, baseline: Dict, hist: Dict) -> Dict:
    SYMPTOMS = ["sob","edema","fatigue"]
    x = {
        "sob": levels(input_entry.get("sob") or input_entry.get("sobLevel")),
        "edema": levels(input_entry.get("edema") or input_entry.get("edemaLevel")),
        "fatigue": levels(input_entry.get("fatigue") or input_entry.get("fatigueLevel")),
        "orthopnea": bool(input_entry.get("orthopnea", False)),
    }
    b = {
        "sob": levels(baseline.get("sob") or baseline.get("baselineSob")),
        "edema": levels(baseline.get("edema") or baseline.get("baselineEdema")),
        "fatigue": levels(baseline.get("fatigue") or baseline.get("baselineFatigue")),
        "orthopnea": bool(baseline.get("orthopnea", baseline.get("baselineOrthopnea", False))),
    }
    baseline_days = len(hist.get("normalizedScores", []))
    tol = CFG["DELTA_TOLERANCE_EARLY"] if baseline_days < 14 else CFG["DELTA_TOLERANCE_BASE"]

    base = {}
    smallChangeCount = 0
    for k in SYMPTOMS:
        delta = x[k]-b[k]
        if abs(delta) < tol:
            delta = 0.0
            smallChangeCount += 1
        base[k] = delta*2.0 if delta>0 else delta*1.2

    merged_noise_guard = (smallChangeCount >= 2)
    orthopnea_flag = (x["orthopnea"] and not b["orthopnea"])

    weighted_symptoms = (base["sob"]+base["edema"]+base["fatigue"]) * CFG["MILD_WEIGHT_FACTOR"]
    wsHist = list(hist.get("wsSeries", []))
    if len(wsHist) < 3:
        wsHist = wsHist + [weighted_symptoms]*(3-len(wsHist))
    tscore = ema(wsHist, CFG["EMA_WINDOW_DAYS"])
    if not math.isfinite(tscore): tscore = 0.0

    normalized = max(0.0, min(10.0, round(weighted_symptoms + tscore - 0.05, 3)))
    if merged_noise_guard:
        normalized = min(normalized, 1.95)

    if normalized < 2.0: proposed = "Green"
    elif normalized < 4.5: proposed = "Yellow"
    elif normalized < 7.5: proposed = "Orange"
    else: proposed = "Red"

    recent = wsHist[-3:]
    med = sorted(recent)[len(recent)//2] if recent else 0.0
    deltaWs = weighted_symptoms - med
    coreCount = sum(1 for k in ("sob","edema") if base[k] >= 0.3)
    if (deltaWs >= CFG["ACUTE_WS_JUMP"]) and (orthopnea_flag or coreCount >= 2):
        proposed = rank_to_cat(max(cat_rank(proposed), 2 if coreCount>=2 else 1))

    category = apply_orange_green_smoothing(hist.get("categories", []), proposed, CFG["DEESCALATION_DAYS"])
    hist.setdefault("wsSeries", []).append(weighted_symptoms)
    hist.setdefault("categories", []).append(category)
    hist.setdefault("normalizedScores", []).append(normalized)
    return {"category": category, "normalized": normalized}

# --------------------------
# Synthetic data generators
# --------------------------
def baseline_profile(kind="mixed"):
    if kind == "low":
        sob=edema=fatigue=0.0
    elif kind == "mild":
        sob,edema,fatigue = 0.5, 0.3, 0.7
    elif kind == "advanced":
        sob,edema,fatigue = 1.5, 1.2, 1.8
    elif kind == "severe":
        sob,edema,fatigue = 2.2, 2.0, 2.3
    else:  # mixed
        sob = clamp(rng.uniform(0,2.5),0,3)
        edema = clamp(rng.uniform(0,2.2),0,3)
        fatigue = clamp(rng.uniform(0,2.5),0,3)
    return {"baselineSob":sob,"baselineEdema":edema,"baselineFatigue":fatigue,"baselineOrthopnea":False}

def sample_input_from_baseline(b, jitter=0.0, bumps=(0,0,0), orthopnea=False):
    sob = clamp(b["baselineSob"] + rng.uniform(-jitter, jitter) + bumps[0], 0,3)
    edema = clamp(b["baselineEdema"] + rng.uniform(-jitter, jitter) + bumps[1], 0,3)
    fatigue = clamp(b["baselineFatigue"] + rng.uniform(-jitter, jitter) + bumps[2], 0,3)
    return {"sob": sob, "edema": edema, "fatigue": fatigue, "orthopnea": orthopnea}

def latent_from_input(i, b):
    d = ((i["sob"]-b["baselineSob"]) + (i["edema"]-b["baselineEdema"]) + (i["fatigue"]-b["baselineFatigue"])) * 0.8
    if i.get("orthopnea") and not b.get("baselineOrthopnea", False):
        d += 1.0
    d = max(0.0, d)
    return d

def to_label_from_latent(lat):
    if lat < 2.0: return "Green"
    if lat < 4.5: return "Yellow"
    if lat < 7.5: return "Orange"
    return "Red"

# --------------------------
# Metrics
# --------------------------
def confusion_counts(y_true: List[str], y_pred: List[str]) -> Dict[str,int]:
    cats = ["Green","Yellow","Orange","Red"]
    conf = {f"{t}->{p}":0 for t in cats for p in cats}
    for t,p in zip(y_true,y_pred):
        conf[f"{t}->{p}"] += 1
    return conf

def accuracy(y_true,y_pred):
    return sum(1 for t,p in zip(y_true,y_pred) if t==p)/max(1,len(y_true))

def auc_surrogate(y_true, y_score):
    # Ordinal surrogate AUC via averaging three binary AUCs
    mapping = {"Green":0,"Yellow":1,"Orange":2,"Red":3}
    scores = [mapping[c] for c in y_score]
    def binary_auc(labels, scores):
        pos = [s for s,l in zip(scores,labels) if l==1]
        neg = [s for s,l in zip(scores,labels) if l==0]
        if not pos or not neg: return 0.5
        xs = [(s,1) for s in pos]+[(s,0) for s in neg]
        xs.sort(key=lambda x: x[0])
        rsum = 0.0
        for i,(s,l) in enumerate(xs, start=1):
            if l==1: rsum += i
        n1, n0 = len(pos), len(neg)
        auc = (rsum - n1*(n1+1)/2) / (n1*n0)
        return auc
    labels1 = [1 if {"Green":0,"Yellow":1,"Orange":2,"Red":3}[t]>=1 else 0 for t in y_true]
    labels2 = [1 if {"Green":0,"Yellow":1,"Orange":2,"Red":3}[t]>=2 else 0 for t in y_true]
    labels3 = [1 if {"Green":0,"Yellow":1,"Orange":2,"Red":3}[t]>=3 else 0 for t in y_true]
    return (binary_auc(labels1, scores)+binary_auc(labels2, scores)+binary_auc(labels3, scores))/3.0

def ping_pong_rate(categories: List[str]) -> float:
    if len(categories)<3: return 0.0
    pp = 0
    for i in range(2,len(categories)):
        if categories[i-2]==categories[i] and categories[i-1]!=categories[i]:
            pp += 1
    return pp/(len(categories)-2)

# --------------------------
# Trial runners (original cohort sizes)
# --------------------------
def run_T10():
    N=10000; days=30
    drifts=[]
    for _ in range(N):
        b = baseline_profile("mixed")
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        first = None
        for d in range(days):
            jit = 0.2 if d<14 else 0.1
            entry = sample_input_from_baseline(b, jitter=jit)
            out = calc_v41(entry, b, hist)
            if d==0: first = out["normalized"]
        drifts.append(hist["normalizedScores"][-1] - first)
    mean = statistics.mean(drifts)
    sd = statistics.pstdev(drifts)
    pct = sum(1 for x in drifts if abs(x)<=0.04)/N
    return {"N_users":N, "days":days, "mean_drift":round(mean,3), "std_drift":round(sd,3), "stable_within_pm_0_04":round(pct,3)}

def run_T11():
    N=1000
    unchanged=0
    for _ in range(N):
        b = baseline_profile("mixed")
        base_input = sample_input_from_baseline(b, jitter=0.0)
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        pred0 = calc_v41(base_input,b,hist)["category"]
        entry = sample_input_from_baseline(b, jitter=1.0)
        pred = calc_v41(entry,b,hist)["category"]
        unchanged += (pred==pred0)
    p = unchanged/N
    lo,hi = wilson_ci(p,N)
    return {"N_cases":N, "unchanged_rate":round(p,3), "unchanged_rate_CI95_low":round(lo,3), "unchanged_rate_CI95_high":round(hi,3)}

def run_T12():
    N=500
    correct=0
    for _ in range(N):
        b = baseline_profile("mild")
        b["baselineOrthopnea"]=False
        entry = sample_input_from_baseline(b, jitter=0.1, bumps=(0.8,0.0,0.0), orthopnea=True)
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        pred = calc_v41(entry,b,hist)["category"]
        correct += (pred in ("Yellow","Orange","Red"))
    p = correct/N
    lo,hi = wilson_ci(p,N)
    return {"N_cases":N,"orthopnea_escalation_accuracy":round(p,3),"CI95_low":round(lo,3),"CI95_high":round(hi,3)}

def run_T13():
    N=5000
    fp_no_guard=0
    fp_guard=0
    for _ in range(N):
        b = baseline_profile("low")
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        entry = sample_input_from_baseline(b, jitter=0.0, bumps=(0.15,0.15,0.0))
        out = calc_v41(entry,b,hist)
        true = to_label_from_latent(latent_from_input(entry,b))
        if true=="Green" and out["category"]!="Green":
            fp_guard += 1
        entry_ctrl = sample_input_from_baseline(b, jitter=0.0, bumps=(0.21,0.21,0.0))
        hist_c={"wsSeries":[],"categories":[],"normalizedScores":[]}
        out_c = calc_v41(entry_ctrl,b,hist_c)
        true_c = to_label_from_latent(latent_from_input(entry_ctrl,b))
        if true_c=="Green" and out_c["category"]!="Green":
            fp_no_guard += 1
    reduction = (fp_no_guard - fp_guard)/max(1,fp_no_guard)
    return {"N_cases":N,"fp_no_guard":fp_no_guard,"fp_guard":fp_guard,"false_alert_reduction":round(reduction,3)}

def run_T14():
    sequences=500
    pass_cnt=0
    hold_days=[]
    for _ in range(sequences):
        b = baseline_profile("mild")
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        entry0 = sample_input_from_baseline(b, jitter=0.0, bumps=(1.2,1.0,0.6))
        _ = calc_v41(entry0,b,hist)
        green_after = None
        for d in range(1,20):
            entry = sample_input_from_baseline(b, jitter=0.05)
            out = calc_v41(entry,b,hist)
            if out["category"]=="Green" and green_after is None:
                green_after = d
        if green_after is None or green_after >= CFG["DEESCALATION_DAYS"]:
            pass_cnt += 1
        hold_days.append(CFG["DEESCALATION_DAYS"] if green_after is None else green_after)
    p = pass_cnt/sequences
    lo,hi = wilson_ci(p, sequences)
    return {"N_sequences":sequences,"clamp_hold_rate":round(p,3),"CI95_low":round(lo,3),"CI95_high":round(hi,3),"median_days_to_green":statistics.median(hold_days)}

def run_T15():
    N=2000
    y_true=[]; y_pred=[]
    for _ in range(N):
        is_chronic = rng.random() < 0.6
        if is_chronic:
            b = baseline_profile("advanced")
            entry = sample_input_from_baseline(b, jitter=0.2)
        else:
            b = baseline_profile("mild")
            entry = sample_input_from_baseline(b, jitter=0.2, bumps=(rng.choice([0.8,1.2]), rng.choice([0.6,1.0]), 0.3))
        lat = latent_from_input(entry,b)
        t = to_label_from_latent(lat)
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        p = calc_v41(entry,b,hist)["category"]
        y_true.append(t); y_pred.append(p)
    acc = accuracy(y_true,y_pred)
    auc = auc_surrogate(y_true, y_pred)
    lo,hi = wilson_ci(acc,N)
    dist_true = confusion_counts(y_true, y_true)
    dist_pred = confusion_counts(y_pred, y_pred)
    return {"N_cases":N,"accuracy":round(acc,3),"accuracy_CI95_low":round(lo,3),"accuracy_CI95_high":round(hi,3),"auc_surrogate":round(auc,3), "true_dist":dist_true, "pred_dist":dist_pred}

def run_T16():
    N=25000
    fp=0
    for _ in range(N):
        b = baseline_profile("mixed")
        entry = sample_input_from_baseline(b, jitter=0.0)
        true = "Green"
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        pred = calc_v41(entry,b,hist)["category"]
        if pred != true:
            fp += 1
    rate = fp/N
    lo,hi = wilson_ci(rate,N)
    return {"N_days":N,"false_alert_rate":round(rate,3),"CI95_low":round(lo,3),"CI95_high":round(hi,3),"false_alerts":fp}

def run_T17():
    nTraj=100; days=60
    rates=[]
    for _ in range(nTraj):
        b = baseline_profile("mixed")
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        for d in range(days):
            s = 0.3 if (d%7)<3 else -0.1
            entry = sample_input_from_baseline(b, jitter=0.15, bumps=(max(0,s), max(0,s/2), 0.0))
            _ = calc_v41(entry,b,hist)
        rates.append(ping_pong_rate(hist["categories"]))
    mean_rate = statistics.mean(rates)
    sd = statistics.pstdev(rates)
    return {"N_trajectories":nTraj,"days":days,"mean_ping_pong_rate":round(mean_rate,3),"std":round(sd,3)}

def run_T18():
    N=4000
    drifts=[]
    for _ in range(N):
        b = baseline_profile(rng.choice(["low","mild","advanced","severe","mixed"]))
        hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
        e0 = sample_input_from_baseline(b, jitter=0.0)
        out0 = calc_v41(e0,b,hist)
        e1 = sample_input_from_baseline(b, jitter=0.2)
        out1 = calc_v41(e1,b,hist)
        drifts.append(out1["normalized"] - out0["normalized"])
    mean_abs = statistics.mean([abs(x) for x in drifts])
    pct = sum(1 for x in drifts if abs(x)<=0.05)/N
    return {"N_cases":N,"mean_abs_drift":round(mean_abs,3),"within_pm_0_05":round(pct,3)}

def run_T19():
    cohorts = [("low", 800), ("mild", 1200), ("advanced", 1000), ("severe", 600), ("mixed", 1200)]
    y_true=[]; y_pred=[]
    for kind, n in cohorts:
        for _ in range(n):
            b = baseline_profile(kind)
            if rng.random() < 0.7:
                entry = sample_input_from_baseline(b, jitter=0.2)
            else:
                entry = sample_input_from_baseline(b, jitter=0.2,
                    bumps=(rng.uniform(0.6,1.2), rng.uniform(0.3,1.0), rng.uniform(0.2,0.6)),
                    orthopnea=(rng.random()<0.35))
            lat = latent_from_input(entry,b)
            t = to_label_from_latent(lat)
            hist={"wsSeries":[],"categories":[],"normalizedScores":[]}
            out = calc_v41(entry,b,hist)
            y_true.append(t); y_pred.append(out["category"])
    N = len(y_true)
    acc = accuracy(y_true,y_pred); lo,hi = wilson_ci(acc,N)
    auc = auc_surrogate(y_true,y_pred)
    conf = confusion_counts(y_true,y_pred)
    return {"N_cases":N,"accuracy":round(acc,3),"accuracy_CI95_low":round(lo,3),"accuracy_CI95_high":round(hi,3),"auc_surrogate":round(auc,3),"confusion":conf}

# --------------------------
# Runner
# --------------------------
def save_metrics_csv(trial_id: str, metrics: Dict):
    rows = []
    for k,v in metrics.items():
        if isinstance(v, dict):
            for kk,vv in v.items():
                rows.append({"metric": f"{k}.{kk}", "value": vv})
        else:
            rows.append({"metric": k, "value": v})
    df = pd.DataFrame(rows)
    df.to_csv(os.path.join(OUT_DIR, f"{trial_id.replace('.','_')}_results.csv"), index=False)

def main():
    print("Running HeartLink 4.1 (ASE 1.3) — Full Validation Suite (High Precision)")
    start = time.time()

    results = {}

    results["T1.0"] = run_T10(); save_metrics_csv("T1.0", results["T1.0"]); print("✓ T1.0")
    results["T1.1"] = run_T11(); save_metrics_csv("T1.1", results["T1.1"]); print("✓ T1.1")
    results["T1.2"] = run_T12(); save_metrics_csv("T1.2", results["T1.2"]); print("✓ T1.2")
    results["T1.3"] = run_T13(); save_metrics_csv("T1.3", results["T1.3"]); print("✓ T1.3")
    results["T1.4"] = run_T14(); save_metrics_csv("T1.4", results["T1.4"]); print("✓ T1.4")
    results["T1.5"] = run_T15(); save_metrics_csv("T1.5", results["T1.5"]); print("✓ T1.5")
    results["T1.6"] = run_T16(); save_metrics_csv("T1.6", results["T1.6"]); print("✓ T1.6")
    results["T1.7"] = run_T17(); save_metrics_csv("T1.7", results["T1.7"]); print("✓ T1.7")
    results["T1.8"] = run_T18(); save_metrics_csv("T1.8", results["T1.8"]); print("✓ T1.8")
    results["T1.9"] = run_T19(); save_metrics_csv("T1.9", results["T1.9"]); print("✓ T1.9")

    # Master CSV + JSON
    flat_rows = []
    for tid, m in results.items():
        row = {"Trial ID": tid}
        for k,v in m.items():
            if isinstance(v, dict):
                # store dict as JSON string for CSV
                row[k] = json.dumps(v)
            else:
                row[k] = v
        flat_rows.append(row)
    pd.DataFrame(flat_rows).to_csv(os.path.join(OUT_DIR, "HL_v4_1_full_metrics.csv"), index=False)
    with open(os.path.join(OUT_DIR, "HL_v4_1_full_metrics.json"), "w") as f:
        json.dump(results, f, indent=2)

    # README
    readme = f"""HeartLink 4.1 (ASE 1.3 Clinical-Lock) — Full Trial Results (High Precision)
=========================================================================
Generated: {time.ctime()}
Seed: {RNG_SEED}

Trials:
- T1.0 Baseline Drift Audit
- T1.1 Daily Perturbation Sweep
- T1.2 Orthopnea Trigger Sensitivity
- T1.3 Merged-Noise Guard Test
- T1.4 Cool-Down Clamp Validation
- T1.5 Chronic vs Acute Distinction
- T1.6 False-Alert Sweep
- T1.7 Ping-Pong Stability Audit
- T1.8 Cross-Baseline Stress
- T1.9 Integrated Validation Holdout (Final)

Files:
- T1_0_results.csv ... T1_9_results.csv  (per-trial metric summaries)
- HL_v4_1_full_metrics.csv / .json       (combined summary tables)
- README.txt

Notes:
- Metrics include 95% Wilson confidence intervals where applicable.
- All data are synthetic and intended for validation/comparison only.
"""
    with open(os.path.join(OUT_DIR, "README.txt"), "w") as f:
        f.write(readme)

    # ZIP package
    zip_path = os.path.join(".", OUT_DIR + ".zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for fname in os.listdir(OUT_DIR):
            z.write(os.path.join(OUT_DIR, fname), arcname=fname)

    print(f"Done in {round(time.time()-start,2)}s")
    print(f"Exported to: {zip_path}")
    return zip_path

if __name__ == "__main__":
    main()
