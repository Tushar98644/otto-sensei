"""JobBERT-v2 job-title vectors for matching (docs/matching.md).

Runs the ONNX build of TechWolf/JobBERT-v2 (MIT) on the CPU: mean pooling, then the model's
"anchor" dense layer for titles, then a fixed basis that keeps 256 of its 1024 dimensions, stored
as int8. Never runs on a user request: the daily title vectors workflow and scripts/title-vectors.ts call it.

  python3 scripts/title-vectors.py fetch MODEL_DIR
  python3 scripts/title-vectors.py fit MODEL_DIR IN.json      (once: writes the basis and occupations)
  python3 scripts/title-vectors.py embed MODEL_DIR IN.json OUT.json

Needs onnxruntime, tokenizers, numpy and safetensors (pip install -r scripts/title-vectors.txt).
"""

import base64
import json
import os
import sys
import time
import urllib.request

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BASIS = os.path.join(HERE, "title-vectors.basis")
OCCUPATIONS = os.path.join(ROOT, "src", "lib", "job-feed", "occupations", "vectors.json")

DIMS = 256
TOP_OCCUPATIONS = 3
BATCH = 128
MAX_TOKENS = 48

# Pinned so every day's vectors come from the same weights as the stored basis.
ONNX_REPO = ("onnx-community/JobBERT-v2-ONNX", "c684fd620bf6673f19c713ce30a1a5fb6f169f27")
MODEL_FILES = {
    "onnx/model_int8.onnx": ONNX_REPO,
    "tokenizer.json": ONNX_REPO,
    "anchor.safetensors": ("TechWolf/JobBERT-v2", "a480476925abdf9d97621e56aa38abbb572fe343"),
}
ANCHOR_PATH = "2_Asym/140216480444672_Dense/model.safetensors"


def fetch(model_dir):
    for name, (repo, revision) in MODEL_FILES.items():
        target = os.path.join(model_dir, name)
        if os.path.exists(target):
            continue
        os.makedirs(os.path.dirname(target), exist_ok=True)
        path = ANCHOR_PATH if name == "anchor.safetensors" else name
        url = f"https://huggingface.co/{repo}/resolve/{revision}/{path}"
        print(f"Downloading {url}", file=sys.stderr)
        urllib.request.urlretrieve(url, target + ".part")
        os.replace(target + ".part", target)


class Model:
    def __init__(self, model_dir):
        import onnxruntime as ort
        from safetensors.numpy import load_file
        from tokenizers import Tokenizer

        self.tokenizer = Tokenizer.from_file(os.path.join(model_dir, "tokenizer.json"))
        self.tokenizer.enable_truncation(max_length=MAX_TOKENS)
        pad = self.tokenizer.token_to_id("<pad>")
        self.tokenizer.enable_padding(pad_id=pad, pad_token="<pad>")
        options = ort.SessionOptions()
        options.intra_op_num_threads = int(os.environ.get("TITLE_VECTOR_THREADS", "4"))
        self.session = ort.InferenceSession(
            os.path.join(model_dir, "onnx", "model_int8.onnx"),
            options,
            providers=["CPUExecutionProvider"],
        )
        dense = load_file(os.path.join(model_dir, "anchor.safetensors"))
        self.weight = dense["linear.weight"]
        self.bias = dense["linear.bias"]

    def embed(self, texts):
        out = []
        for start in range(0, len(texts), BATCH):
            batch = self.tokenizer.encode_batch(texts[start : start + BATCH])
            ids = np.array([item.ids for item in batch], dtype=np.int64)
            mask = np.array([item.attention_mask for item in batch], dtype=np.int64)
            hidden = self.session.run(None, {"input_ids": ids, "attention_mask": mask})[0]
            weights = mask[..., None].astype(np.float32)
            pooled = (hidden * weights).sum(1) / np.clip(weights.sum(1), 1e-9, None)
            vectors = np.tanh(pooled @ self.weight.T + self.bias)
            out.append(vectors / np.linalg.norm(vectors, axis=1, keepdims=True))
        return np.concatenate(out) if out else np.zeros((0, self.weight.shape[0]), np.float32)


def read_basis():
    return np.fromfile(BASIS, dtype="<f4").reshape(DIMS, -1)


def project(vectors, basis):
    cut = vectors @ basis.T
    return cut / np.clip(np.linalg.norm(cut, axis=1, keepdims=True), 1e-9, None)


def to_int8(vectors):
    peak = np.clip(np.abs(vectors).max(axis=1, keepdims=True), 1e-9, None)
    return np.round(vectors / peak * 127).astype(np.int8)


def from_int8(codes):
    floats = codes.astype(np.float32)
    return floats / np.clip(np.linalg.norm(floats, axis=1, keepdims=True), 1e-9, None)


def read_occupations():
    with open(OCCUPATIONS) as file:
        data = json.load(file)
    codes = np.frombuffer(base64.b64decode(data["vectors"]), dtype=np.int8)
    return data["codes"], from_int8(codes.reshape(len(data["codes"]), DIMS))


def fit(model_dir, source):
    """Fits the basis on occupation names and a sample of job titles, then writes each
    occupation's centre: its names weighted twice, Otto's own names and its shortest aliases."""
    with open(source) as file:
        data = json.load(file)
    model = Model(model_dir)
    texts, owners, weights = [], [], []
    for code, entry in data["occupations"].items():
        for text in entry["names"]:
            texts.append(text)
            owners.append(code)
            weights.append(2.0)
        for text in entry["others"]:
            texts.append(text)
            owners.append(code)
            weights.append(1.0)
    started = time.time()
    occupation_vectors = model.embed(texts)
    sample_vectors = model.embed(data["sample"])
    print(
        f"Embedded {len(texts) + len(data['sample'])} texts in {time.time() - started:.0f} s",
        file=sys.stderr,
    )
    stacked = np.concatenate([occupation_vectors, sample_vectors]).astype(np.float64)
    _, _, right = np.linalg.svd(stacked, full_matrices=False)
    basis = right[:DIMS].astype("<f4")
    basis.tofile(BASIS)

    codes = list(data["occupations"].keys())
    index = {code: i for i, code in enumerate(codes)}
    centres = np.zeros((len(codes), occupation_vectors.shape[1]), np.float64)
    for vector, code, weight in zip(occupation_vectors, owners, weights):
        centres[index[code]] += weight * vector
    centres /= np.clip(np.linalg.norm(centres, axis=1, keepdims=True), 1e-9, None)
    cut = to_int8(project(centres, basis))
    with open(OCCUPATIONS, "w") as file:
        json.dump(
            {
                "source": "TechWolf/JobBERT-v2 (MIT) over O*NET 31.0 and ESCO v1.2.1 occupation names",
                "dims": DIMS,
                "codes": codes,
                "vectors": base64.b64encode(cut.tobytes()).decode("ascii"),
            },
            file,
            separators=(",", ":"),
        )
        file.write("\n")
    report(stacked[: len(texts)], basis)


def report(vectors, basis):
    """How closely the stored int8 vectors keep the model's own similarities."""
    rng = np.random.default_rng(7)
    pick = vectors[rng.choice(len(vectors), size=min(1500, len(vectors)), replace=False)]
    full = pick @ pick.T
    stored = from_int8(to_int8(project(pick, basis)))
    cut = stored @ stored.T
    upper = np.triu_indices(len(pick), 1)
    print(
        f"Pearson r between full and stored similarity: {np.corrcoef(full[upper], cut[upper])[0, 1]:.4f}",
        file=sys.stderr,
    )
    np.fill_diagonal(full, -1)
    np.fill_diagonal(cut, -1)
    top_full = np.argsort(-full, axis=1)[:, :10]
    top_cut = np.argsort(-cut, axis=1)[:, :10]
    kept = np.mean([len(set(a) & set(b)) / 10 for a, b in zip(top_full, top_cut)])
    print(f"Ten nearest kept: {kept:.3f}", file=sys.stderr)


def nearest(vectors, centres, top):
    sims = vectors @ centres.T
    best = np.argsort(-sims, axis=1)[:, :top]
    return best, np.take_along_axis(sims, best, axis=1)


def embed(model_dir, source, target):
    with open(source) as file:
        keys = json.load(file)["keys"]
    model = Model(model_dir)
    basis = read_basis()
    codes, centres = read_occupations()
    started = time.time()
    vectors = to_int8(project(model.embed(keys), basis)) if keys else np.zeros((0, DIMS), np.int8)
    seconds = time.time() - started
    stored = from_int8(vectors) if keys else np.zeros((0, DIMS), np.float32)
    occupations, near = nearest(stored, centres, TOP_OCCUPATIONS)
    rows = []
    for i, key in enumerate(keys):
        rows.append(
            [
                key,
                base64.b64encode(vectors[i].tobytes()).decode("ascii"),
                [codes[j] for j in occupations[i]],
                [round(float(x), 4) for x in near[i]],
            ]
        )
    with open(target, "w") as file:
        json.dump({"dims": DIMS, "vectors": rows}, file, separators=(",", ":"))
    per_thousand = seconds / max(len(keys), 1) * 1000
    print(f"Embedded {len(keys)} titles in {seconds:.1f} s ({per_thousand:.1f} s per 1,000)", file=sys.stderr)


def main():
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    step, model_dir = sys.argv[1], sys.argv[2]
    if step == "fetch":
        fetch(model_dir)
    elif step == "fit":
        fit(model_dir, sys.argv[3])
    elif step == "embed":
        embed(model_dir, sys.argv[3], sys.argv[4])
    else:
        print(__doc__, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
