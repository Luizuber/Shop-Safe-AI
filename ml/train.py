"""Train real models, evaluate on disjoint groups, export portable JSON.

No page in the phishing dataset is ever visited. Only the two official datasets
are downloaded. Raw data stays in ignored ml/data; review author fields unused.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import re
import unicodedata
import urllib.request
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, quote

import numpy as np
import pandas as pd
import sklearn
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score, brier_score_loss,
                             confusion_matrix, precision_recall_fscore_support, roc_auc_score)
from sklearn.model_selection import GroupShuffleSplit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'backand/backend-api/src/analysis/ml/models'
DATA = ROOT / 'ml/data'
SEED = 42
BUCKETS = 2048
NUMERIC = 11
SOURCES = {
    'security': {
        'url': 'https://archive.ics.uci.edu/static/public/967/phiusiil%2Bphishing%2Burl%2Bdataset.zip',
        'citation': 'Prasad, A.; Chandra, S. (2024). PhiUSIIL Phishing URL (Website). UCI, dataset 967.',
        'license': 'CC-BY-4.0',
    },
    'sentiment': {
        'url': 'https://raw.githubusercontent.com/americanas-tech/b2w-reviews01/main/B2W-Reviews01.csv',
        'citation': 'Real, L.; Oshiro, M.; Mafra, A. B2W-Reviews01: An Open Product Reviews Corpus (2019). B2W Digital.',
        'license': 'CC-BY-NC-SA-4.0 (academic/non-commercial model)',
    },
}


def fetch(kind: str) -> Path:
    DATA.mkdir(parents=True, exist_ok=True)
    path = DATA / ('phiusiil.zip' if kind == 'security' else 'b2w.csv')
    if not path.exists():
        print(f'Downloading official {kind} dataset...', flush=True)
        request = urllib.request.Request(SOURCES[kind]['url'], headers={'User-Agent': 'ShopSafe-TCC-training/1.0'})
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = response.read(110_000_000)
        if len(payload) >= 110_000_000:
            raise ValueError('Dataset exceeds download limit')
        path.write_bytes(payload)
    return path


def normalize_url(raw: str) -> tuple[str, str, bool]:
    parsed = urlsplit(raw if '://' in raw else 'https://' + raw)
    host = (parsed.hostname or '').lower().encode('idna').decode('ascii')
    if not host or parsed.scheme.lower() not in ('http', 'https'):
        raise ValueError('Invalid URL')
    path = quote(parsed.path or '/', safe="/:@!$&'()*+,;=-._~%[]").lower()
    return host, path[:2048], parsed.scheme.lower() == 'https'


def fnv(text: str) -> int:
    value = 2166136261
    for char in text:
        value = ((value ^ ord(char)) * 16777619) & 0xffffffff
    return value


def url_features(raw: str) -> dict[int, float]:
    host, path, https = normalize_url(raw)
    # Domain-only v2: product slugs and optional www must not change domain risk.
    host = host.removeprefix('www.')
    entropy = -sum((n / len(host)) * math.log2(n / len(host)) for n in Counter(host).values())
    numbers = [int(https), len(host) / 100, 0,
               sum(c.isdigit() for c in host) / len(host), host.count('-') / 10,
               host.count('.') / 10, int(bool(re.fullmatch(r'[0-9.]+', host))),
               int('xn--' in host), entropy / 5, 0, 0]
    features = {i: float(v) for i, v in enumerate(numbers) if v}
    text = host
    hashed = Counter(fnv(text[i:i+n]) % BUCKETS for n in (3, 4) for i in range(len(text)-n+1))
    norm = math.sqrt(sum(n*n for n in hashed.values())) or 1
    features.update({NUMERIC + key: count / norm for key, count in hashed.items()})
    return features


def url_matrix(urls: list[str]) -> csr_matrix:
    indices, values, pointers = [], [], [0]
    for raw in urls:
        feature = url_features(raw)
        indices.extend(feature.keys())
        values.extend(feature.values())
        pointers.append(len(indices))
    return csr_matrix((values, indices, pointers), shape=(len(urls), NUMERIC + BUCKETS))


def text_normalize(text: str) -> str:
    text = ''.join(c for c in unicodedata.normalize('NFD', text.lower()) if unicodedata.category(c) != 'Mn')
    return ' '.join(re.findall(r'[a-z0-9]+', text))


def split(groups: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    train_validation, test = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=SEED).split(groups, groups=groups))
    tr, va = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=SEED+1).split(train_validation, groups=groups[train_validation]))
    train, validation = train_validation[tr], train_validation[va]
    assert not set(groups[train]) & set(groups[test])
    assert not set(groups[train]) & set(groups[validation])
    assert not set(groups[validation]) & set(groups[test])
    return train, validation, test


def metrics(labels, scores, threshold=.5) -> dict:
    prediction = scores >= threshold
    p, r, f, _ = precision_recall_fscore_support(labels, prediction, average='binary', zero_division=0)
    return {'samples': len(labels), 'threshold': threshold, 'accuracy': accuracy_score(labels, prediction),
            'precision': p, 'recall': r, 'f1': f, 'rocAuc': roc_auc_score(labels, scores),
            'averagePrecision': average_precision_score(labels, scores),
            'brierScore': brier_score_loss(labels, scores),
            'confusionMatrix': confusion_matrix(labels, prediction, labels=[0, 1]).tolist()}


def save(kind: str, artifact: dict, report: dict, fixtures: list) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    weights_hash = hashlib.sha256(json.dumps([artifact['coefficients'], artifact['intercept']]).encode()).hexdigest()
    artifact.update({'schemaVersion': 1, 'featureVersion': 'security-domain-v2' if kind == 'security' else 'sentiment-v1',
                     'version': f'{kind}-v{2 if kind == "security" else 1}-{weights_hash[:12]}',
                     'trainedAt': datetime.now(timezone.utc).isoformat(),
                     'source': SOURCES[kind], 'testMetrics': report['test'],
                     'trainingSamples': report['trainSamples']})
    encoded = json.dumps(artifact, ensure_ascii=True, allow_nan=False, separators=(',', ':'))
    (OUT / f'{kind}.json').write_text(encoded, encoding='utf-8')
    report.update({'artifactSha256': hashlib.sha256(encoded.encode()).hexdigest(),
                   'version': artifact['version'], 'sklearnVersion': sklearn.__version__,
                   'source': SOURCES[kind], 'seed': SEED,
                   'limitations': 'Retrospective dataset; not an audit, not proof of legitimacy, no temporal validation.'})
    reports = ROOT / 'ml/reports'
    reports.mkdir(exist_ok=True)
    (reports / f'{kind}.json').write_text(json.dumps(report, indent=2, allow_nan=False), encoding='utf-8')
    (OUT / f'{kind}.parity.json').write_text(json.dumps(fixtures, ensure_ascii=True, allow_nan=False), encoding='utf-8')
    print(json.dumps({'model': kind, 'test': report['test'], 'version': artifact['version']}), flush=True)


def train_security(limit: int) -> None:
    path = fetch('security')
    with zipfile.ZipFile(path) as archive:
        file = next(name for name in archive.namelist() if name.lower().endswith('.csv'))
        frame = pd.read_csv(io.BytesIO(archive.read(file)), usecols=['URL', 'label'])
    records = []
    for row in frame.itertuples(index=False):
        try:
            host, url_path, https = normalize_url(str(row.URL))
            # Conservative suffix grouping (co.uk/com.br groups stay together).
            group = '.'.join(host.split('.')[-2:])
            url = ('https' if https else 'http') + '://' + host + url_path
            records.append((url, 1-int(row.label), group, host.removeprefix('www.')))
        except (ValueError, UnicodeError):
            pass
    clean = pd.DataFrame(records, columns=['url', 'target', 'group', 'host'])
    conflicts = clean.groupby('host').target.nunique()
    clean = clean[~clean.host.isin(conflicts[conflicts > 1].index)].drop_duplicates('host')
    if limit and len(clean) > limit:
        clean = clean.sample(limit, random_state=SEED)
    clean = clean.reset_index(drop=True)
    urls, labels, groups = clean.url.tolist(), clean.target.to_numpy(), clean.group.to_numpy()
    train, validation, test = split(groups)
    print(f'Extracting URL features: {len(clean)} samples', flush=True)
    x = url_matrix(urls)
    model = LogisticRegression(solver='liblinear', C=2, max_iter=500, class_weight='balanced', random_state=SEED)
    print('Training URL classifier...', flush=True)
    model.fit(x[train], labels[train])
    report = {'dataSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'rows': len(clean),
              'trainSamples': len(train), 'split': '64/16/20 grouped by conservative hostname suffix; hosts deduplicated; mixed-label hosts removed',
              'validation': metrics(labels[validation], model.predict_proba(x[validation])[:, 1]),
              'test': metrics(labels[test], model.predict_proba(x[test])[:, 1]),
              'operatingThresholdTest': metrics(labels[test], model.predict_proba(x[test])[:, 1], threshold=.8),
              'classes': {'0': 'benign_url', '1': 'phishing_url'},
              'iterations': model.n_iter_.tolist()}
    report['datasetBias'] = 'Retrospective dataset may encode HTTPS/hostname collection artifacts. Path intentionally excluded after false positives on legitimate ecommerce product URLs. Not proof of ecommerce fraud accuracy.'
    fixtures = [{'input': urls[i], 'features': url_features(urls[i]), 'probability': float(model.predict_proba(x[i:i+1])[0, 1])} for i in test[:8]]
    save('security', {'kind': 'logistic-url', 'hashBuckets': BUCKETS,
                     'numericFeatures': NUMERIC, 'coefficients': model.coef_[0].tolist(),
                     'intercept': float(model.intercept_[0]), 'threshold': .8,
                     'positiveClass': 'phishing'}, report, fixtures)


def train_sentiment(limit: int) -> None:
    path = fetch('sentiment')
    with path.open(encoding='utf-8-sig') as source:
        header = source.readline()
    delimiter = ';' if header.count(';') > header.count(',') else ','
    frame = pd.read_csv(path, sep=delimiter, usecols=['product_id', 'overall_rating', 'review_text'], dtype={'product_id': str}, low_memory=False)
    frame = frame.dropna(subset=['product_id', 'overall_rating', 'review_text'])
    frame = frame[frame.overall_rating.isin([1, 2, 4, 5])].copy()
    frame['text'] = frame.review_text.map(text_normalize)
    frame = frame[frame.text.str.len().between(20, 600)]
    frame['target'] = (frame.overall_rating >= 4).astype(int)
    conflicts = frame.groupby('text').target.nunique()
    frame = frame[~frame.text.isin(conflicts[conflicts > 1].index)].drop_duplicates('text')
    if limit and len(frame) > limit:
        frame = frame.sample(limit, random_state=SEED)
    frame = frame.reset_index(drop=True)
    labels, groups = frame.target.to_numpy(), frame.product_id.astype(str).to_numpy()
    train, validation, test = split(groups)
    vectorizer = TfidfVectorizer(max_features=12000, ngram_range=(1, 2), min_df=3,
                                 token_pattern=r'(?u)\b[a-z0-9]+\b', sublinear_tf=True)
    x_train = vectorizer.fit_transform(frame.text.iloc[train])
    model = LogisticRegression(solver='liblinear', C=2, max_iter=500, class_weight='balanced', random_state=SEED)
    print(f'Training Portuguese sentiment: {len(frame)} samples', flush=True)
    model.fit(x_train, labels[train])
    x_val = vectorizer.transform(frame.text.iloc[validation])
    x_test = vectorizer.transform(frame.text.iloc[test])
    report = {'dataSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'rows': len(frame),
              'trainSamples': len(train), 'split': '64/16/20 by product_id; normalized texts deduplicated and conflicting labels removed',
              'validation': metrics(labels[validation], model.predict_proba(x_val)[:, 1]),
              'test': metrics(labels[test], model.predict_proba(x_test)[:, 1]),
              'classes': {'0': 'rating_1_or_2', '1': 'rating_4_or_5'},
              'labelLimit': 'Star rating is a noisy proxy for sentiment. Rating 3 excluded. Does not detect fake reviews.'}
    fixtures = [{'input': str(frame.review_text.iloc[i]), 'probability': float(model.predict_proba(vectorizer.transform([frame.text.iloc[i]]))[0, 1])} for i in test[:8]]
    save('sentiment', {'kind': 'tfidf-logistic', 'vocabulary': {k: int(v) for k, v in vectorizer.vocabulary_.items()},
                      'idf': vectorizer.idf_.tolist(), 'coefficients': model.coef_[0].tolist(),
                      'intercept': float(model.intercept_[0]), 'abstainBelow': .65,
                      'positiveClass': 'positive_review'}, report, fixtures)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', choices=['all', 'security', 'sentiment'], default='all')
    parser.add_argument('--limit', type=int, default=100000, help='0 uses all valid rows')
    args = parser.parse_args()
    if args.model in ('all', 'security'):
        train_security(args.limit)
    if args.model in ('all', 'sentiment'):
        train_sentiment(args.limit)
