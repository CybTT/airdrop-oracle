// Advanced Monte Carlo Engine with User-Defined Custom Ranges
// Supports multiple distribution types per range

export type DistributionType = 'uniform' | 'linearDecreasing' | 'linearIncreasing' | 'predictionCentric';

export interface CustomRange {
  id: string;
  min: number;
  max: number;
  distributionType: DistributionType;
  // For prediction-centric (bell curve)
  expectedMin?: number;
  expectedMax?: number;
}

export interface AdvancedSimulationParams {
  nftSupply: number;
  fdvRanges: CustomRange[];  // FDV ranges in MILLIONS
  dropRanges: CustomRange[]; // Drop% ranges as percentages (0-100)
  numSimulations: number;
  seed?: number;
}

export interface AdvancedValidationError {
  field: string;
  rangeId?: string;
  message: string;
}

// Fast PRNG (xorshift128+)
class SeededRandom {
  private s0: number;
  private s1: number;

  constructor(seed: number) {
    this.s0 = seed >>> 0;
    this.s1 = (seed * 1812433253 + 1) >>> 0;
    for (let i = 0; i < 20; i++) this.next();
  }

  next(): number {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.s1 = s1;
    return (this.s0 >>> 0) / 4294967296;
  }
}

// Validate advanced params
export function validateAdvancedParams(params: AdvancedSimulationParams): AdvancedValidationError[] {
  const errors: AdvancedValidationError[] = [];

  if (params.nftSupply <= 0) {
    errors.push({ field: 'nftSupply', message: 'NFT supply must be greater than 0' });
  }

  if (params.fdvRanges.length === 0) {
    errors.push({ field: 'fdvRanges', message: 'At least one FDV range is required' });
  }

  if (params.dropRanges.length === 0) {
    errors.push({ field: 'dropRanges', message: 'At least one Airdrop % range is required' });
  }

  // Validate FDV ranges
  for (const range of params.fdvRanges) {
    if (range.min < 0) {
      errors.push({ field: 'fdvRanges', rangeId: range.id, message: 'FDV Min must be non-negative' });
    }
    if (range.max <= range.min) {
      errors.push({ field: 'fdvRanges', rangeId: range.id, message: 'FDV Max must be greater than Min' });
    }
    if (range.distributionType === 'predictionCentric') {
      if (range.expectedMin === undefined || range.expectedMax === undefined) {
        errors.push({ field: 'fdvRanges', rangeId: range.id, message: 'Expected range is required for Prediction-Centric' });
      } else {
        if (range.expectedMin < range.min || range.expectedMax > range.max) {
          errors.push({ field: 'fdvRanges', rangeId: range.id, message: 'Expected range must be within the main range' });
        }
        if (range.expectedMax <= range.expectedMin) {
          errors.push({ field: 'fdvRanges', rangeId: range.id, message: 'Expected Max must be greater than Expected Min' });
        }
      }
    }
  }

  // Validate Drop% ranges
  for (const range of params.dropRanges) {
    if (range.min <= 0) {
      errors.push({ field: 'dropRanges', rangeId: range.id, message: 'Drop% Min must be greater than 0' });
    }
    if (range.max > 100) {
      errors.push({ field: 'dropRanges', rangeId: range.id, message: 'Drop% Max cannot exceed 100' });
    }
    if (range.max <= range.min) {
      errors.push({ field: 'dropRanges', rangeId: range.id, message: 'Drop% Max must be greater than Min' });
    }
    if (range.distributionType === 'predictionCentric') {
      if (range.expectedMin === undefined || range.expectedMax === undefined) {
        errors.push({ field: 'dropRanges', rangeId: range.id, message: 'Expected range is required for Prediction-Centric' });
      } else {
        if (range.expectedMin < range.min || range.expectedMax > range.max) {
          errors.push({ field: 'dropRanges', rangeId: range.id, message: 'Expected range must be within the main range' });
        }
        if (range.expectedMax <= range.expectedMin) {
          errors.push({ field: 'dropRanges', rangeId: range.id, message: 'Expected Max must be greater than Expected Min' });
        }
      }
    }
  }

  if (params.numSimulations < 1000) {
    errors.push({ field: 'numSimulations', message: 'Simulations must be at least 1,000' });
  }

  return errors;
}

// ========== SAMPLING FUNCTIONS ==========

// Uniform sampling
function sampleUniform(min: number, max: number, u: number): number {
  return min + u * (max - min);
}

// Linear decreasing: highest probability at MIN, decreases toward MAX
// PDF ∝ (max - x)
// CDF: F(x) = 1 - ((max - x) / (max - min))^2
// Inverse CDF: x = max - sqrt((max - min)^2 * (1 - u))
function sampleLinearDecreasing(min: number, max: number, u: number): number {
  const range = max - min;
  return max - Math.sqrt(range * range * (1 - u));
}

// Linear increasing: lowest probability at MIN, increases toward MAX
// PDF ∝ (x - min)
// CDF: F(x) = ((x - min) / (max - min))^2
// Inverse CDF: x = min + range * sqrt(u)
function sampleLinearIncreasing(min: number, max: number, u: number): number {
  const range = max - min;
  return min + range * Math.sqrt(u);
}

// Box-Muller transform for normal distribution
function boxMuller(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Truncated normal (prediction-centric / bell curve)
// Uses rejection sampling with Box-Muller
function sampleTruncatedNormal(
  min: number,
  max: number,
  expectedMin: number,
  expectedMax: number,
  rng: SeededRandom
): number {
  const mean = (expectedMin + expectedMax) / 2;
  // Set std so ~70% falls within expected range
  // For normal: P(μ - σ < X < μ + σ) ≈ 68%
  const halfRange = (expectedMax - expectedMin) / 2;
  const std = halfRange > 0 ? halfRange : (max - min) / 4;
  
  // Rejection sampling (max 100 attempts)
  for (let i = 0; i < 100; i++) {
    const u1 = rng.next();
    const u2 = rng.next();
    const z = boxMuller(u1, u2);
    const sample = mean + z * std;
    if (sample >= min && sample <= max) {
      return sample;
    }
  }
  
  // Fallback to mean if rejection fails
  return Math.max(min, Math.min(max, mean));
}

// Sample from a single custom range
function sampleFromRange(range: CustomRange, rng: SeededRandom, scale: number = 1): number {
  const min = range.min * scale;
  const max = range.max * scale;
  const u = rng.next();
  
  switch (range.distributionType) {
    case 'uniform':
      return sampleUniform(min, max, u);
    case 'linearDecreasing':
      return sampleLinearDecreasing(min, max, u);
    case 'linearIncreasing':
      return sampleLinearIncreasing(min, max, u);
    case 'predictionCentric': {
      const expectedMin = (range.expectedMin ?? range.min) * scale;
      const expectedMax = (range.expectedMax ?? range.max) * scale;
      return sampleTruncatedNormal(min, max, expectedMin, expectedMax, rng);
    }
    default:
      return sampleUniform(min, max, u);
  }
}

// Calculate range weights proportional to width
function calculateRangeWeights(ranges: CustomRange[]): number[] {
  const widths = ranges.map(r => r.max - r.min);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  if (totalWidth === 0) return ranges.map(() => 1 / ranges.length);
  return widths.map(w => w / totalWidth);
}

// Pre-compute cumulative weights
function getCumulativeWeights(weights: number[]): number[] {
  const cumulative: number[] = [];
  let sum = 0;
  for (const w of weights) {
    sum += w;
    cumulative.push(sum);
  }
  return cumulative;
}

// Select range index based on cumulative weights
function selectRangeIndex(cumulativeWeights: number[], u: number): number {
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (u <= cumulativeWeights[i]) return i;
  }
  return cumulativeWeights.length - 1;
}

// Sample from multiple ranges (combined distribution)
function sampleFromRanges(
  ranges: CustomRange[],
  cumulativeWeights: number[],
  rng: SeededRandom,
  scale: number = 1
): number {
  const u = rng.next();
  const rangeIndex = selectRangeIndex(cumulativeWeights, u);
  return sampleFromRange(ranges[rangeIndex], rng, scale);
}

// Percentile from sorted array
function percentile(sorted: Float64Array, p: number): number {
  const n = sorted.length;
  const rank = (p / 100) * (n - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  if (upper >= n) return sorted[n - 1];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Histogram with log-scale bins
function createHistogram(values: Float64Array, numBins: number = 40) {
  const sorted = new Float64Array(values).sort();
  const minVal = Math.max(sorted[0], 0.01);
  const maxVal = sorted[sorted.length - 1];
  
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const binWidth = (logMax - logMin) / numBins;
  
  const bins: { binStart: number; binEnd: number; count: number; density: number }[] = [];
  for (let i = 0; i < numBins; i++) {
    const binStart = Math.pow(10, logMin + i * binWidth);
    const binEnd = Math.pow(10, logMin + (i + 1) * binWidth);
    bins.push({ binStart, binEnd, count: 0, density: 0 });
  }
  
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val < minVal) continue;
    const logVal = Math.log10(val);
    const binIndex = Math.min(Math.floor((logVal - logMin) / binWidth), numBins - 1);
    bins[binIndex].count++;
  }
  
  const total = values.length;
  for (const bin of bins) {
    bin.density = bin.count / total;
  }
  
  return bins;
}

// Binary search for threshold probabilities
function calcThresholdProbs(sorted: Float64Array, thresholds: number[]): Record<number, number> {
  const result: Record<number, number> = {};
  const n = sorted.length;
  
  for (const threshold of thresholds) {
    let left = 0;
    let right = n;
    while (left < right) {
      const mid = (left + right) >>> 1;
      if (sorted[mid] < threshold) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    result[threshold] = (n - left) / n;
  }
  
  return result;
}

// Main advanced simulation
export function runAdvancedSimulation(
  params: AdvancedSimulationParams,
  thresholds: number[] = [60, 120, 300]
) {
  const startTime = performance.now();
  
  // Calculate weights for each set of ranges
  const fdvWeights = calculateRangeWeights(params.fdvRanges);
  const dropWeights = calculateRangeWeights(params.dropRanges);
  const fdvCumulative = getCumulativeWeights(fdvWeights);
  const dropCumulative = getCumulativeWeights(dropWeights);
  
  // Initialize RNG
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(seed);
  
  // Allocate results array
  const values = new Float64Array(params.numSimulations);
  
  // Run simulation
  for (let i = 0; i < params.numSimulations; i++) {
    // Sample FDV (in millions, then convert to dollars)
    const fdvM = sampleFromRanges(params.fdvRanges, fdvCumulative, rng, 1);
    const fdv = fdvM * 1_000_000;
    
    // Sample Drop% (percentage, then convert to decimal)
    const dropPct = sampleFromRanges(params.dropRanges, dropCumulative, rng, 1);
    const dropDecimal = dropPct / 100;
    
    // Core formula: value_per_nft = (FDV × Drop%) / NFT_Supply
    values[i] = (fdv * dropDecimal) / params.nftSupply;
  }
  
  // Sort for statistics
  const sorted = new Float64Array(values).sort();
  
  // Calculate stats
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  const mean = sum / values.length;
  
  const stats = {
    mean,
    median: percentile(sorted, 50),
    p5: percentile(sorted, 5),
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    min: sorted[0],
    max: sorted[sorted.length - 1]
  };
  
  // Histogram
  const histogram = createHistogram(values);
  
  // Thresholds
  const thresholdProbs = calcThresholdProbs(sorted, thresholds);
  
  // Calculate worst/best case from all ranges
  const fdvMins = params.fdvRanges.map(r => r.min);
  const fdvMaxs = params.fdvRanges.map(r => r.max);
  const dropMins = params.dropRanges.map(r => r.min);
  const dropMaxs = params.dropRanges.map(r => r.max);
  
  const worstFdv = Math.min(...fdvMins) * 1_000_000;
  const bestFdv = Math.max(...fdvMaxs) * 1_000_000;
  const worstDrop = Math.min(...dropMins) / 100;
  const bestDrop = Math.max(...dropMaxs) / 100;
  
  const worstCase = (worstFdv * worstDrop) / params.nftSupply;
  const bestCase = (bestFdv * bestDrop) / params.nftSupply;
  
  const executionTimeMs = performance.now() - startTime;
  
  return {
    stats,
    histogram,
    thresholdProbs,
    worstCase,
    bestCase,
    executionTimeMs
  };
}

// Generate unique ID for ranges
export function generateRangeId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Default advanced params
export const DEFAULT_ADVANCED_PARAMS: AdvancedSimulationParams = {
  nftSupply: 8888,
  fdvRanges: [
    {
      id: generateRangeId(),
      min: 20,
      max: 100,
      distributionType: 'uniform'
    }
  ],
  dropRanges: [
    {
      id: generateRangeId(),
      min: 5,
      max: 25,
      distributionType: 'linearDecreasing'
    }
  ],
  numSimulations: 200000
};
