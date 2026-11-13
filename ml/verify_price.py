"""Generate a numerical parity fixture from sklearn, not market validation data."""
import json
from pathlib import Path

import numpy as np
from scipy.optimize import brentq
from scipy.special import ndtr
from sklearn.neighbors import KernelDensity

prices = np.array([5900, 6000, 6100, 6200, 6300, 6400], dtype=float)
logs = np.log(prices)
scale = min(logs.std(ddof=1), (np.quantile(logs, .75) - np.quantile(logs, .25)) / 1.34)
bandwidth = max(.03, .9 * scale * len(logs) ** (-.2))
model = KernelDensity(kernel='gaussian', bandwidth=bandwidth).fit(logs[:, None])
def cdf(x):
    return float(ndtr((x - logs) / bandwidth).mean())

fixture = {
    'purpose': 'Synthetic unit fixture for numerical parity ONLY, not pricing accuracy or a real market dataset',
    'prices': prices.tolist(), 'bandwidth': bandwidth,
    'lowerBound': float(np.exp(brentq(lambda x: cdf(x) - .025, logs.min()-8*bandwidth, logs.max()+8*bandwidth))),
    'upperBound': float(np.exp(brentq(lambda x: cdf(x) - .975, logs.min()-8*bandwidth, logs.max()+8*bandwidth))),
    'cases': [{'target': x, 'percentile': cdf(np.log(x)),
               'logDensity': float(model.score_samples([[np.log(x)]])[0])} for x in [659.9, 6150., 7200.]],
}
path = Path(__file__).resolve().parents[1] / 'backand/backend-api/src/analysis/ml/models/pricing.parity.json'
path.write_text(json.dumps(fixture, indent=2, allow_nan=False), encoding='utf-8')
print('Exported independent sklearn/scipy pricing parity fixture')
