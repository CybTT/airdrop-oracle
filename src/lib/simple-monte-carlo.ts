// Simplified Monte Carlo Engine with Auto-Distribution Logic
// User only provides: FDV range (millions), Drop% range (percentages)
// Distributions are determined automatically

export interface SimpleSimulationParams {
  nftSupply: number;
  fdvMinM: number;  // FDV min in MILLIONS
  fdvMaxM: number;  // FDV max in MILLIONS
  dropMinPct: number;  // Drop% min as percentage (e.g., 1 = 1%)
  dropMaxPct: number;  // Drop% max as percentage (e.g., 5 = 5%)
  numSimulations: number;
  seed?: number;
}

export interface SimpleSimulationResults {
  stats: SimpleStats;
  histogram: HistogramBin[];
  thresholdProbs: Record<number, number>;
  worstCase: number;
  bestCase: number;
  executionTimeMs: number;
}

export interface SimpleStats {
  mean: number;
  median: number;
  p5: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  min: number;
  max: number;
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  density: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Validate inputs
export function validateParams(params: SimpleSimulationParams): ValidationError[] {
  const errors: ValidationError[] = [];

  if (params.nftSupply <= 0) {
    errors.push({ field: 'nftSupply', message: 'NFT supply must be greater than 0' });
  }

  if (params.fdvMinM <= 0) {
    errors.push({ field: 'fdvMinM', message: 'FDV Min must be greater than 0' });
  }

  if (params.fdvMaxM <= 0) {
    errors.push({ field: 'fdvMaxM', message: 'FDV Max must be greater than 0' });
  }

  if (params.fdvMaxM <= params.fdvMinM) {
    errors.push({ field: 'fdvMaxM', message: 'FDV Max must be greater than FDV Min' });
  }

  if (params.dropMinPct <= 0 || params.dropMinPct >= 100) {
    errors.push({ field: 'dropMinPct', message: 'Drop% Min must be between 0 and 100' });
  }

  if (params.dropMaxPct <= 0 || params.dropMaxPct >= 100) {
    errors.push({ field: 'dropMaxPct', message: 'Drop% Max must be between 0 and 100' });
  }

  if (params.dropMaxPct <= params.dropMinPct) {
    errors.push({ field: 'dropMaxPct', message: 'Drop% Max must be greater than Drop% Min' });
  }

  if (params.numSimulations < 1000) {
    errors.push({ field: 'numSimulations', message: 'Simulations must be at least 1,000' });
  }

  return errors;
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

// Log-uniform: FDV = exp(U(ln(min), ln(max)))
function sampleLogUniform(min: number, max: number, u: number): number {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  return Math.exp(logMin + u * (logMax - logMin));
}

// Triangular with auto mode: mode = min + 0.20 * (max - min)
function sampleTriangularAutoMode(min: number, max: number, u: number): number {
  const mode = min + 0.20 * (max - min);
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
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
function createHistogram(values: Float64Array, numBins: number = 40): HistogramBin[] {
  const sorted = new Float64Array(values).sort();
  const minVal = Math.max(sorted[0], 0.01);
  const maxVal = sorted[sorted.length - 1];
  
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const binWidth = (logMax - logMin) / numBins;
  
  const bins: HistogramBin[] = [];
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

// Main simulation
export function runSimpleSimulation(
  params: SimpleSimulationParams,
  thresholds: number[] = [60, 120, 300]
): SimpleSimulationResults {
  const startTime = performance.now();
  
  // Convert inputs
  const fdvMin = params.fdvMinM * 1_000_000;  // Convert M to raw
  const fdvMax = params.fdvMaxM * 1_000_000;
  const dropMin = params.dropMinPct / 100;     // Convert % to decimal
  const dropMax = params.dropMaxPct / 100;
  
  // Initialize RNG
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(seed);
  
  // Allocate
  const values = new Float64Array(params.numSimulations);
  
  // Run simulation
  for (let i = 0; i < params.numSimulations; i++) {
    const u1 = rng.next();
    const u2 = rng.next();
    
    // FDV: log-uniform
    const fdv = sampleLogUniform(fdvMin, fdvMax, u1);
    
    // Drop%: triangular with mode biased low (20% into range)
    const dropPct = sampleTriangularAutoMode(dropMin, dropMax, u2);
    
    // Core formula
    values[i] = (fdv * dropPct) / params.nftSupply;
  }
  
  // Sort for statistics
  const sorted = new Float64Array(values).sort();
  
  // Stats
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  const mean = sum / values.length;
  
  const stats: SimpleStats = {
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
  
  // Anchors
  const worstCase = (fdvMin * dropMin) / params.nftSupply;
  const bestCase = (fdvMax * dropMax) / params.nftSupply;
  
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

// Default params
export const DEFAULT_PARAMS: SimpleSimulationParams = {
  nftSupply: 8888,
  fdvMinM: 100,      // 100M
  fdvMaxM: 500,      // 500M
  dropMinPct: 1,     // 1%
  dropMaxPct: 5,     // 5%
  numSimulations: 200000
};
